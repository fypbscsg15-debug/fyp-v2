import json
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.interaction_check import InteractionCheck
from ..schemas.schemas import InteractionCheckResponse
from ..utils.auth import get_current_user
from ..utils.drug_interaction import check_drug_interactions
from ..utils.ocr import run_ocr
from ..utils.safety import check_contraindications, check_dosage_errors, check_duplicate_medicines

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


# ── OCR scan ──────────────────────────────────────────────────────────────────

@router.post("/scan")
async def scan_prescription(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        result = await run_ocr(image_bytes, file.filename or "prescription.jpg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR failed: {str(e)}")

    return result


# ── Drug interaction verify + save ────────────────────────────────────────────

class VerifyRequest(BaseModel):
    medicines: list[str]
    dosages: Optional[list[str]] = None
    patient_name: Optional[str] = None
    patient_age: Optional[str] = None
    patient_gender: Optional[str] = None


@router.post("/verify", response_model=InteractionCheckResponse)
def verify_prescription(
    body: VerifyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not body.medicines:
        raise HTTPException(status_code=400, detail="No medicines provided")

    cleaned_medicines = [m.strip() for m in body.medicines if m and m.strip()]

    try:
        interaction_alerts = check_drug_interactions(cleaned_medicines)
    except Exception as e:
        print(f"Interaction check failed: {e}")
        interaction_alerts = []

    try:
        contraindication_alerts = check_contraindications(
            cleaned_medicines,
            patient_age=body.patient_age,
            patient_gender=body.patient_gender
        )
    except Exception as e:
        print(f"Contraindication check failed: {e}")
        contraindication_alerts = []

    try:
        cleaned_dosages = []
        if body.dosages and len(body.dosages) == len(body.medicines):
            for m, d in zip(body.medicines, body.dosages):
                if m and m.strip():
                    cleaned_dosages.append(d)
        else:
            cleaned_dosages = body.dosages or []

        dosage_alerts = check_dosage_errors(
            cleaned_medicines,
            cleaned_dosages,
            db
        )
    except Exception as e:
        print(f"Dosage check failed: {e}")
        dosage_alerts = []

    try:
        duplicate_alerts = check_duplicate_medicines(
            cleaned_medicines,
            db
        )
    except Exception as e:
        print(f"Duplicate check failed: {e}")
        duplicate_alerts = []

    alerts = interaction_alerts + contraindication_alerts + dosage_alerts + duplicate_alerts
    total_pairs = len(cleaned_medicines) * (len(cleaned_medicines) - 1) // 2
    has_high    = any(a["severity"] == "high" for a in alerts)

    record = InteractionCheck(
        pharmacist_id  = current_user.pharmacist_id,
        medicines_json = json.dumps(body.medicines),
        alerts_json    = json.dumps(alerts),
        total_pairs    = total_pairs,
        alert_count    = len(alerts),
        has_high       = has_high,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "check_id":     record.check_id,
        "pharmacist_id": record.pharmacist_id,
        "medicines":    body.medicines,
        "alerts":       alerts,
        "total_pairs":  total_pairs,
        "alert_count":  len(alerts),
        "has_high":     has_high,
        "created_at":   record.created_at,
    }


# ── History ───────────────────────────────────────────────────────────────────

@router.get("/checks", response_model=list[InteractionCheckResponse])
def list_checks(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(InteractionCheck)
        .order_by(InteractionCheck.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in rows:
        result.append({
            "check_id":      r.check_id,
            "pharmacist_id": r.pharmacist_id,
            "medicines":     json.loads(r.medicines_json),
            "alerts":        json.loads(r.alerts_json),
            "total_pairs":   r.total_pairs,
            "alert_count":   r.alert_count,
            "has_high":      r.has_high,
            "created_at":    r.created_at,
        })
    return result
