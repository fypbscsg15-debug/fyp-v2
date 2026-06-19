import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class InteractionCheck(Base):
    """One drug-interaction verification run by a pharmacist."""

    __tablename__ = "interaction_checks"

    check_id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacist_id    = Column(String, ForeignKey("pharmacists.pharmacist_id"), nullable=False)
    medicines_json   = Column(Text, nullable=False)   # JSON list of drug names checked
    alerts_json      = Column(Text, nullable=False)   # JSON list of alert objects returned
    total_pairs      = Column(Integer, nullable=False, default=0)
    alert_count      = Column(Integer, nullable=False, default=0)
    has_high         = Column(Boolean, nullable=False, default=False)
    created_at       = Column(DateTime, server_default=func.now(), nullable=False)

    pharmacist = relationship("Pharmacist", foreign_keys=[pharmacist_id])
