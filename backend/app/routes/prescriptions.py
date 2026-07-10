import json
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.interaction_check import InteractionCheck
from ..models.patient import Patient
from ..models.prescription import Prescription
from ..models.prescription_drug import PrescriptionDrug
from ..models.drug import Drug
from ..models.alert import Alert
from ..models.staff_shift import StaffShift
from ..models.audit_log import AuditLog
from ..models.user import Pharmacist
from ..models.inventory import Inventory
from ..schemas.schemas import InteractionCheckResponse
from ..utils.auth import get_current_user
from ..utils.drug_interaction import check_drug_interactions
from ..utils.ocr import run_ocr
from ..utils.safety import check_contraindications, check_dosage_errors, check_duplicate_medicines

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


# ── OCR scan ──────────────────────────────────────────────────────────────────

@router.post("/scan")
async def scan_prescription(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        result = await run_ocr(image_bytes, file.filename or "prescription.jpg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR failed: {str(e)}")

    # Log action to AuditLog
    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    user_name = shift.staff_name if shift else current_user.name

    audit = AuditLog(
        user=user_name,
        action="Scanned Prescription",
        details=f"Scanned prescription image: {file.filename or 'prescription.jpg'}"
    )
    db.add(audit)
    db.commit()

    return result


# ── Drug interaction verify + save ────────────────────────────────────────────

class VerifyRequest(BaseModel):
    medicines: list[str]
    dosages: Optional[list[str]] = None
    frequencies: Optional[list[str]] = None
    durations: Optional[list[str]] = None
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

    # 1. Find or create Patient
    patient = None
    if body.patient_name:
        patient = db.query(Patient).filter(Patient.name.ilike(body.patient_name.strip())).first()
        if not patient:
            age_int = None
            if body.patient_age:
                try:
                    age_int = int(body.patient_age)
                except ValueError:
                    pass
            g_val = None
            if body.patient_gender:
                g_lower = body.patient_gender.strip().lower()
                if g_lower in ["male", "female", "other"]:
                    g_val = g_lower
            patient = Patient(
                name=body.patient_name.strip(),
                age=age_int,
                gender=g_val
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

    if not patient:
        patient = db.query(Patient).filter(Patient.name == "Anonymous Patient").first()
        if not patient:
            patient = Patient(name="Anonymous Patient", age=0, gender="other")
            db.add(patient)
            db.commit()
            db.refresh(patient)

    # 2. Create Prescription
    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    active_user = shift.staff_name if shift else current_user.name
    active_db_user = db.query(Pharmacist).filter(Pharmacist.name == active_user).first()
    active_pharmacist_id = active_db_user.pharmacist_id if active_db_user else current_user.pharmacist_id

    rx = Prescription(
        patient_id=patient.patient_id,
        pharmacist_id=active_pharmacist_id,
        status="error" if has_high else "verified",
        ocr_extracted_text=json.dumps(body.medicines),
        is_emergency=False
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)

    # 3. Create PrescriptionDrug records
    if body.dosages and len(body.dosages) == len(body.medicines):
        dosages_list = body.dosages
    else:
        dosages_list = ["" for _ in body.medicines]

    if body.frequencies and len(body.frequencies) == len(body.medicines):
        frequencies_list = body.frequencies
    else:
        frequencies_list = ["" for _ in body.medicines]

    if body.durations and len(body.durations) == len(body.medicines):
        durations_list = body.durations
    else:
        durations_list = ["" for _ in body.medicines]

    for med, dose, freq, dur in zip(body.medicines, dosages_list, frequencies_list, durations_list):
        if not med or not med.strip():
            continue
        drug_rec = db.query(Drug).filter(
            (Drug.brand_name.ilike(f"%{med.strip()}%")) | 
            (Drug.generic_name.ilike(f"%{med.strip()}%"))
        ).first()
        
        rx_drug = PrescriptionDrug(
            prescription_id=rx.prescription_id,
            drug_id=drug_rec.drug_id if drug_rec else None,
            drug_name_raw=med.strip(),
            dosage=dose.strip() if dose else None,
            frequency=freq.strip() if freq else None,
            duration=dur.strip() if dur else None
        )
        db.add(rx_drug)
    db.commit()

    # 4. Save Alerts
    for alert in alerts:
        db_alert = Alert(
            prescription_id=rx.prescription_id,
            alert_type=alert.get("category", "interaction"),
            severity=alert.get("severity", "medium"),
            message=alert.get("title", "") + ": " + alert.get("description", ""),
            acknowledged=False,
            resolved=False
        )
        db.add(db_alert)
    db.commit()

    # 5. Create InteractionCheck record
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
    # Log action to AuditLog
    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    user_name = shift.staff_name if shift else current_user.name

    audit = AuditLog(
        user=user_name,
        action="Prescription Verified",
        prescription_id=rx.prescription_id,
        details=f"Verified prescription for patient: {body.patient_name or 'Anonymous Patient'}. Medicines: {', '.join(body.medicines)}"
    )
    db.add(audit)
    db.commit()

    return {
        "check_id":     record.check_id,
        "prescription_id": rx.prescription_id,
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
    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    active_user = shift.staff_name if shift else current_user.name
    active_db_user = db.query(Pharmacist).filter(Pharmacist.name == active_user).first()
    active_pharmacist_id = active_db_user.pharmacist_id if active_db_user else current_user.pharmacist_id

    rows = (
        db.query(InteractionCheck)
        .filter(InteractionCheck.pharmacist_id == active_pharmacist_id)
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


import re

def estimate_dispensed_quantity(frequency: str, duration: str) -> int:
    if not frequency or not duration:
        return 10  # fallback default
    
    # 1. Parse frequency
    freq_val = 1
    freq = frequency.lower().strip()
    if any(x in freq for x in ["once", "1x", "1/day", "once a day", "1 time a day", "1 time daily", "1 times daily", "1x daily"]):
        freq_val = 1
    elif any(x in freq for x in ["twice", "2x", "2/day", "twice a day", "2 times a day", "2 time daily", "2 times daily", "2x daily"]):
        freq_val = 2
    elif any(x in freq for x in ["three", "3x", "3/day", "three times a day", "3 times a day", "3 time daily", "3 times daily", "3x daily"]):
        freq_val = 3
    elif any(x in freq for x in ["four", "4x", "4/day", "four times a day", "4 times a day", "4 time daily", "4 times daily", "4x daily"]):
        freq_val = 4
    elif any(x in freq for x in ["five", "5x", "5/day", "five times a day", "5 times a day", "5 time daily", "5 times daily", "5x daily"]):
        freq_val = 5
        
    # 2. Parse duration
    dur_val = 1
    dur = duration.lower().strip()
    match_digits = re.search(r'\d+', dur)
    if match_digits:
        num = int(match_digits.group())
        if "week" in dur:
            dur_val = num * 7
        elif "month" in dur:
            dur_val = num * 30
        else:
            dur_val = num
    else:
        if "week" in dur:
            dur_val = 7
        elif "month" in dur:
            dur_val = 30
        else:
            dur_val = 7  # default to 7 days
            
    qty = freq_val * dur_val
    return qty if qty > 0 else 10


@router.get("/latest")
def get_latest_prescription(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Retrieve the latest prescription
    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    active_user = shift.staff_name if shift else current_user.name
    active_db_user = db.query(Pharmacist).filter(Pharmacist.name == active_user).first()
    active_pharmacist_id = active_db_user.pharmacist_id if active_db_user else current_user.pharmacist_id

    rx = db.query(Prescription).filter(
        Prescription.pharmacist_id == active_pharmacist_id
    ).order_by(Prescription.prescription_date.desc()).first()
    if not rx:
        raise HTTPException(status_code=404, detail="No prescriptions found")
    
    return {
        "id": rx.prescription_id,
        "patientName": rx.patient.name,
        "patientAge": rx.patient.age,
        "patientGender": rx.patient.gender,
        "medicines": [
            {
                "id": d.id,
                "name": d.drug_name_raw,
                "dosage": d.dosage,
                "frequency": d.frequency,
                "duration": d.duration,
                "quantity_dispensed": d.quantity_dispensed or estimate_dispensed_quantity(d.frequency, d.duration),
                "unit_price": db.query(Inventory).filter(Inventory.drug_id == d.drug_id).first().unit_price if d.drug_id and db.query(Inventory).filter(Inventory.drug_id == d.drug_id).first() else 100.0
            }
            for d in rx.drugs
        ]
    }


@router.get("/{prescription_id}")
def get_prescription(
    prescription_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    active_user = shift.staff_name if shift else current_user.name
    active_db_user = db.query(Pharmacist).filter(Pharmacist.name == active_user).first()
    active_pharmacist_id = active_db_user.pharmacist_id if active_db_user else current_user.pharmacist_id

    rx = db.query(Prescription).filter(
        Prescription.prescription_id == prescription_id,
        Prescription.pharmacist_id == active_pharmacist_id
    ).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    return {
        "id": rx.prescription_id,
        "patientName": rx.patient.name,
        "patientAge": rx.patient.age,
        "patientGender": rx.patient.gender,
        "medicines": [
            {
                "id": d.id,
                "name": d.drug_name_raw,
                "dosage": d.dosage,
                "frequency": d.frequency,
                "duration": d.duration,
                "quantity_dispensed": d.quantity_dispensed or estimate_dispensed_quantity(d.frequency, d.duration),
                "unit_price": db.query(Inventory).filter(Inventory.drug_id == d.drug_id).first().unit_price if d.drug_id and db.query(Inventory).filter(Inventory.drug_id == d.drug_id).first() else 100.0
            }
            for d in rx.drugs
        ]
    }


@router.post("/{prescription_id}/instructions/log")
def log_instruction_generation(
    prescription_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    user_name = shift.staff_name if shift else current_user.name

    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    patient_name = rx.patient.name if (rx and rx.patient) else "Unknown"

    audit = AuditLog(
        user=user_name,
        action="Generated Instructions",
        prescription_id=prescription_id,
        details=f"Generated patient medication instructions for: {patient_name}"
    )
    db.add(audit)
    db.commit()
    return {"status": "success"}


@router.post("/{prescription_id}/dispense")
def dispense_prescription(
    prescription_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # 1. Check stock level for all prescribed drugs first
    out_of_stock = []
    for rx_drug in rx.drugs:
        qty = rx_drug.quantity_dispensed or estimate_dispensed_quantity(rx_drug.frequency, rx_drug.duration)
        inv = db.query(Inventory).filter(Inventory.drug_id == rx_drug.drug_id).first() if rx_drug.drug_id else None
        available = inv.quantity_in_stock if inv else 0
        if available < qty:
            shortage = qty - available
            out_of_stock.append(f"{rx_drug.drug_name_raw} is short by {shortage} units (Required: {qty}, Available: {available})")

    if out_of_stock:
        raise HTTPException(status_code=400, detail=f"Insufficient stock: {', '.join(out_of_stock)}")

    # 2. Mark as dispensed and deduct quantities
    rx.status = "dispensed"
    for rx_drug in rx.drugs:
        if rx_drug.drug_id:
            inv = db.query(Inventory).filter(Inventory.drug_id == rx_drug.drug_id).first()
            if inv:
                qty = rx_drug.quantity_dispensed or estimate_dispensed_quantity(rx_drug.frequency, rx_drug.duration)
                inv.quantity_in_stock = max(0, inv.quantity_in_stock - qty)
                rx_drug.quantity_dispensed = qty
    db.commit()

    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    user_name = shift.staff_name if shift else current_user.name

    patient_name = rx.patient.name if (rx and rx.patient) else "Unknown"

    audit = AuditLog(
        user=user_name,
        action="Prescription Dispensed",
        prescription_id=prescription_id,
        details=f"Dispensed prescription for patient: {patient_name}"
    )
    db.add(audit)
    db.commit()
    return {"status": "success"}


class OverrideRequest(BaseModel):
    action: str
    details: str


@router.post("/{prescription_id}/log-override")
def log_override(
    prescription_id: str,
    body: OverrideRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    if rx and body.action in ["Alert Resolved", "Override Alert"]:
        rx.status = "verified"

    shift = db.query(StaffShift).filter(
        StaffShift.end_time == None
    ).order_by(StaffShift.start_time.desc()).first()
    user_name = shift.staff_name if shift else current_user.name

    audit = AuditLog(
        user=user_name,
        action=body.action,
        prescription_id=prescription_id,
        details=body.details
    )
    db.add(audit)
    db.commit()
    return {"status": "success"}
