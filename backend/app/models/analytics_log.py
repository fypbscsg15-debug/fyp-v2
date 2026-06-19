import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class AnalyticsLog(Base):
    """Event-based metric entries generated within a verification session."""

    __tablename__ = "analytics_log"

    log_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    session_id = Column(String, ForeignKey("verification_sessions.session_id"), nullable=False)
    metric_type = Column(String, nullable=False)   # e.g. "prescriptions_processed", "alert_triggered"
    metric_value = Column(Float, nullable=False)

    session = relationship("VerificationSession", back_populates="analytics_logs")
