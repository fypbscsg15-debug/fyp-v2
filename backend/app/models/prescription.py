import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    prescription_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    pharmacist_id = Column(String, ForeignKey("pharmacists.pharmacist_id"), nullable=False)
    prescription_date = Column(DateTime, server_default=func.now(), nullable=False)
    verification_date = Column(DateTime, nullable=True)
    status = Column(
        Enum("pending", "ocr_review", "verified", "dispensed", "error", name="prescription_status"),
        nullable=False,
        default="pending",
    )
    scan_image_path = Column(String, nullable=True)
    ocr_extracted_text = Column(Text, nullable=True)   # raw JSON from OCR engine
    verification_notes = Column(Text, nullable=True)
    is_emergency = Column(Boolean, nullable=False, default=False)

    patient = relationship("Patient", back_populates="prescriptions")
    pharmacist = relationship("Pharmacist", back_populates="prescriptions", foreign_keys=[pharmacist_id])
    drugs = relationship("PrescriptionDrug", back_populates="prescription", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="prescription", cascade="all, delete-orphan")
    instructions = relationship("Instruction", back_populates="prescription", cascade="all, delete-orphan")
    error_logs = relationship("ErrorLog", back_populates="prescription")
