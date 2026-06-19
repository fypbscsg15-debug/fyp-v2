import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Alert(Base):
    """Safety alert generated during prescription verification."""

    __tablename__ = "alerts"

    alert_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.prescription_id"), nullable=False)
    alert_type = Column(
        Enum("interaction", "contraindication", "dosage", "duplicate", name="alert_type"),
        nullable=False,
    )
    severity = Column(Enum("high", "medium", "low", name="alert_severity"), nullable=False)
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, nullable=False, default=False)
    resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())

    prescription = relationship("Prescription", back_populates="alerts")
