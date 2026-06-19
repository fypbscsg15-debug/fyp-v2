import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ErrorLog(Base):
    __tablename__ = "error_log"

    error_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.prescription_id"), nullable=True)
    error_type = Column(String, nullable=False)   # e.g. "ocr_failure", "drug_not_found"
    severity = Column(Enum("high", "medium", "low", name="error_severity"), nullable=False, default="low")
    description = Column(Text, nullable=False)
    resolved_by = Column(String, ForeignKey("pharmacists.pharmacist_id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    prescription = relationship("Prescription", back_populates="error_logs")
    resolver = relationship("Pharmacist", back_populates="resolved_errors", foreign_keys=[resolved_by])
