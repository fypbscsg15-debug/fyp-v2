import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class VerificationSession(Base):
    """A pharmacist's work session — from login to logout."""

    __tablename__ = "verification_sessions"

    session_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacist_id = Column(String, ForeignKey("pharmacists.pharmacist_id"), nullable=False)
    start_time = Column(DateTime, server_default=func.now(), nullable=False)
    end_time = Column(DateTime, nullable=True)  # NULL while session is active
    prescriptions_verified = Column(Integer, nullable=False, default=0)

    pharmacist = relationship("Pharmacist", back_populates="verification_sessions", foreign_keys=[pharmacist_id])
    analytics_logs = relationship("AnalyticsLog", back_populates="session")
