import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Pharmacist(Base):
    """Represents a pharmacist / admin user who logs into the system."""

    __tablename__ = "pharmacists"

    pharmacist_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum("admin", "pharmacist", name="pharmacist_role"), nullable=False, default="pharmacist")
    phone = Column(String, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, nullable=False, default=True)

    # relationships
    verification_sessions = relationship("VerificationSession", back_populates="pharmacist", foreign_keys="VerificationSession.pharmacist_id")
    prescriptions = relationship("Prescription", back_populates="pharmacist", foreign_keys="Prescription.pharmacist_id")
    resolved_errors = relationship("ErrorLog", back_populates="resolver", foreign_keys="ErrorLog.resolved_by")
