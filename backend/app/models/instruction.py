import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Instruction(Base):
    """Patient-facing dispensing instructions, one row per language."""

    __tablename__ = "instructions"

    instruction_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.prescription_id"), nullable=False)
    language = Column(Enum("en", "ur", name="instruction_language"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    prescription = relationship("Prescription", back_populates="instructions")
