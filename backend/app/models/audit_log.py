import uuid
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func
from ..database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    user = Column(String, nullable=False)
    action = Column(String, nullable=False)
    prescription_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
