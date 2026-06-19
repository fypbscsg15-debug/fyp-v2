import sys
from datetime import date
from app.database import Base, SessionLocal, engine
from app.models.user import Pharmacist
from app.models.session import VerificationSession
from app.models.analytics_log import AnalyticsLog
from app.models.patient import Patient
from app.models.drug import Drug
from app.models.drug_interaction import DrugInteraction
from app.models.contraindication import Contraindication
from app.models.inventory import Inventory
from app.models.prescription import Prescription
from app.models.prescription_drug import PrescriptionDrug
from app.models.alert import Alert
from app.models.instruction import Instruction
from app.models.error_log import ErrorLog
from app.models.interaction_check import InteractionCheck
from app.utils.auth import hash_password

print("Testing database connection and seeding...")
db = SessionLocal()
try:
    print("Creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    print("Deleting old records...")
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
    print("Deletions complete!")

    print("Inserting pharmacists...")
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
    db.add_all([p_admin, p_ali])
    db.commit()

    print("Inserting patient...")
    patient = Patient(
        name="Ahmed Khan",
        age=42,
        gender="male",
        contact_number="+923001234567",
        known_allergies="Sulfa drugs"
    )
    db.add(patient)
    db.commit()

    print("Inserting drugs & inventory...")
    drug = Drug(
        brand_name="Amoxicillin 500mg",
        generic_name="Amoxicillin",
        therapeutic_class="Antibiotic",
        standard_dosage="500mg twice daily",
        form="capsule"
    )
    db.add(drug)
    db.commit()

    inv = Inventory(
        drug_id=drug.drug_id,
        quantity_in_stock=8,
        expiry_date=date(2025, 8, 12),
        low_stock_threshold=20,
        unit_price=0.45,
        batch_number="AMX-2401",
        location="A-1",
        category="Antibiotic"
    )
    db.add(inv)
    db.commit()

    print("Inserting prescription...")
    rx = Prescription(
        patient_id=patient.patient_id,
        pharmacist_id=p_ali.pharmacist_id,
        status="verified",
        scan_image_path="/placeholder.svg",
        ocr_extracted_text="Ahmed Khan. Amoxicillin."
    )
    db.add(rx)
    db.commit()

    print("Inserting alert...")
    db.add(Alert(
        prescription_id=rx.prescription_id,
        alert_type="interaction",
        severity="high",
        message="Drug Interaction: Warfarin + Amoxicillin",
        acknowledged=False,
        resolved=False
    ))
    db.commit()

    print("Seeding successful!")
except Exception as e:
    import traceback
    print("Error during seeding:")
    traceback.print_exc()
finally:
    db.close()
