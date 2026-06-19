import uuid
from sqlalchemy import Column, Enum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from ..database import Base


class Contraindication(Base):
    __tablename__ = "contraindications"

    contraindication_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    drug_id = Column(String, ForeignKey("drugs.drug_id"), nullable=False)
    condition = Column(String, nullable=False)   # e.g. "hypertension", "renal failure"
    severity = Column(Enum("high", "medium", "low", name="contraindication_severity"), nullable=False)
    description = Column(Text, nullable=True)

    drug = relationship("Drug", back_populates="contraindications")
