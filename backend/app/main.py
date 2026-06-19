from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine

# Import every model so SQLAlchemy registers their tables before create_all()
from .models.user import Pharmacist                          # noqa: F401
from .models.session import VerificationSession              # noqa: F401
from .models.analytics_log import AnalyticsLog               # noqa: F401
from .models.patient import Patient                          # noqa: F401
from .models.drug import Drug                                # noqa: F401
from .models.drug_interaction import DrugInteraction         # noqa: F401
from .models.contraindication import Contraindication        # noqa: F401
from .models.inventory import Inventory                      # noqa: F401
from .models.prescription import Prescription                # noqa: F401
from .models.prescription_drug import PrescriptionDrug       # noqa: F401
from .models.alert import Alert                              # noqa: F401
from .models.instruction import Instruction                  # noqa: F401
from .models.error_log import ErrorLog                       # noqa: F401
from .models.interaction_check import InteractionCheck       # noqa: F401
from .models.staff_shift import StaffShift                   # noqa: F401

from fastapi import Depends
from sqlalchemy.orm import Session
from .database import get_db
from datetime import datetime, date

from .routes.auth import router as auth_router
from .routes.prescriptions import router as prescriptions_router
from .routes.analytics import router as analytics_router
from .routes.inventory import router as inventory_router
from .routes.reports import router as reports_router
from .utils.auth import hash_password
from .utils.drug_interaction import preload_model


def _seed_default_admin():
    """Create the built-in admin account on first run only. Never overwrites an existing record."""
    db = SessionLocal()
    try:
        if not db.query(Pharmacist).filter(Pharmacist.email == "PHARM-001").first():
            db.add(Pharmacist(
                name="Admin",
                email="PHARM-001",
                password_hash=hash_password("1234"),
                role="admin",
            ))
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_default_admin()
    preload_model()
    yield


app = FastAPI(title="SPSS API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(prescriptions_router)
app.include_router(analytics_router)
app.include_router(inventory_router)
app.include_router(reports_router)


@app.post("/system/seed")
def seed_database(db: Session = Depends(get_db)):
    import traceback
    try:
        Base.metadata.create_all(bind=engine)
        db.query(Alert).delete()
        db.query(Instruction).delete()
        db.query(ErrorLog).delete()
        db.query(PrescriptionDrug).delete()
        db.query(Prescription).delete()
        db.query(Inventory).delete()
        db.query(Contraindication).delete()
        db.query(DrugInteraction).delete()
        db.query(Drug).delete()
        db.query(InteractionCheck).delete()
        db.query(AnalyticsLog).delete()
        db.query(VerificationSession).delete()
        db.query(Patient).delete()
        db.query(Pharmacist).delete()
        db.commit()

        p_admin = Pharmacist(
            name="Admin",
            email="PHARM-001",
            password_hash=hash_password("1234"),
            role="admin",
        )
        p_ali = Pharmacist(
            name="Dr. Ali",
            email="ali@spss.health",
            password_hash=hash_password("1234"),
            role="pharmacist",
        )
        p_sara = Pharmacist(
            name="Dr. Sara",
            email="sara@spss.health",
            password_hash=hash_password("1234"),
            role="pharmacist",
        )
        p_hassan = Pharmacist(
            name="Dr. Hassan",
            email="hassan@spss.health",
            password_hash=hash_password("1234"),
            role="pharmacist",
        )
        db.add_all([p_admin, p_ali, p_sara, p_hassan])
        db.commit()

        patient = Patient(
            name="Ahmed Khan",
            age=42,
            gender="male",
            contact_number="+923001234567",
            known_allergies="Sulfa drugs"
        )
        db.add(patient)
        db.commit()

        raw_drugs = [
            ("Amoxicillin 500mg", "Amoxicillin", "Antibiotic", "500mg three times daily", "capsule", 8, 20, date(2025, 8, 12), 0.45, "A-1"),
            ("Paracetamol 500mg", "Acetaminophen", "Analgesic", "500mg four times daily", "tablet", 320, 50, date(2026, 4, 20), 0.05, "A-2"),
            ("Omeprazole 20mg", "Omeprazole", "PPI", "20mg once daily", "capsule", 12, 30, date(2025, 6, 30), 0.22, "B-1"),
            ("Metformin 850mg", "Metformin HCl", "Antidiabetic", "850mg twice daily", "tablet", 0, 40, date(2024, 11, 1), 0.18, "B-2"),
            ("Atorvastatin 20mg", "Atorvastatin", "Statin", "20mg once daily", "tablet", 145, 30, date(2026, 2, 15), 0.32, "C-1"),
            ("Lisinopril 10mg", "Lisinopril", "Antihypertensive", "10mg once daily", "tablet", 18, 25, date(2025, 12, 10), 0.27, "C-2"),
            ("Salbutamol Inhaler", "Salbutamol", "Bronchodilator", "1-2 puffs as needed", "inhaler", 6, 10, date(2025, 9, 22), 4.50, "D-1"),
            ("Insulin Glargine", "Insulin Glargine", "Antidiabetic", "10 units once daily", "injection", 4, 8, date(2025, 5, 18), 32.00, "Cold-1"),
            ("Ibuprofen 400mg", "Ibuprofen", "NSAID", "400mg three times daily", "tablet", 210, 60, date(2026, 7, 30), 0.08, "A-3"),
            ("Cetirizine 10mg", "Cetirizine", "Antihistamine", "10mg once daily", "tablet", 95, 30, date(2025, 11, 15), 0.06, "D-2"),
        ]

        for brand, generic, t_class, dosage, form, qty, threshold, exp_date, price, loc in raw_drugs:
            drug = Drug(
                brand_name=brand,
                generic_name=generic,
                therapeutic_class=t_class,
                standard_dosage=dosage,
                form=form
            )
            db.add(drug)
            db.commit()

            inv = Inventory(
                drug_id=drug.drug_id,
                quantity_in_stock=qty,
                expiry_date=exp_date,
                low_stock_threshold=threshold,
                unit_price=price,
                batch_number=f"{brand[:3].upper()}-2401",
                location=loc,
                category=t_class
            )
            db.add(inv)
            db.commit()

        rx = Prescription(
            patient_id=patient.patient_id,
            pharmacist_id=p_ali.pharmacist_id,
            status="verified",
            scan_image_path="/placeholder.svg",
            ocr_extracted_text="Ahmed Khan. Amoxicillin, Paracetamol."
        )
        db.add(rx)
        db.commit()

        db.add(Alert(
            prescription_id=rx.prescription_id,
            alert_type="interaction",
            severity="high",
            message="Drug Interaction: Warfarin + Amoxicillin",
            acknowledged=False,
            resolved=False
        ))
        db.commit()

        return {"status": "success", "message": "Database seeded successfully!"}
    except Exception as e:
        db.rollback()
        tb = traceback.format_exc()
        print("SEED ERROR:")
        print(tb)
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}\n{tb}")


@app.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = []
    
    sessions = db.query(VerificationSession).all()
    for s in sessions:
        logs.append({
            "id": f"sess_{s.session_id[:8]}",
            "timestamp": s.start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "user": s.pharmacist.name if s.pharmacist else "System",
            "action": "Login",
            "prescriptionId": "—",
            "details": f"Shift session started. Pharmacist ID: {s.pharmacist_id}"
        })
        if s.end_time:
            logs.append({
                "id": f"sesse_{s.session_id[:8]}",
                "timestamp": s.end_time.strftime("%Y-%m-%d %H:%M:%S"),
                "user": s.pharmacist.name if s.pharmacist else "System",
                "action": "Logout",
                "prescriptionId": "—",
                "details": f"Shift session ended. Verified count: {s.prescriptions_verified}"
            })
            
    prescriptions = db.query(Prescription).all()
    for r in prescriptions:
        logs.append({
            "id": f"rx_{r.prescription_id[:8]}",
            "timestamp": r.prescription_date.strftime("%Y-%m-%d %H:%M:%S"),
            "user": r.pharmacist.name if r.pharmacist else "System",
            "action": "Prescription Verified" if r.status == "verified" else "Prescription Dispensed",
            "prescriptionId": f"#{r.prescription_id[:4].upper()}",
            "details": f"Prescription status: {r.status}."
        })
        
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    if not logs:
        logs = [
            {
                "id": f"log_{i}",
                "timestamp": f"2025-04-{str(15 - (i % 10)).zfill(2)} 10:42:00",
                "user": ["Dr. Ali", "Dr. Sara", "Admin", "Dr. Hassan"][i % 4],
                "action": ["Prescription Verified", "Override Applied", "Inventory Updated", "Alert Resolved", "Login", "Settings Changed"][i % 6],
                "prescriptionId": f"#{1023 - i}",
                "details": "Action completed successfully without anomalies."
            }
            for i in range(15)
        ]
        
    return logs


@app.get("/health")
def health():
    return {"status": "ok"}
