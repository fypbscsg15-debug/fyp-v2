import uuid
from sqlalchemy import Column, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from ..database import Base


class DrugInteraction(Base):
    __tablename__ = "drug_interactions"
    __table_args__ = (
        UniqueConstraint("drug1_id", "drug2_id", name="uq_drug_pair"),
    )

    interaction_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    drug1_id = Column(String, ForeignKey("drugs.drug_id"), nullable=False)
    drug2_id = Column(String, ForeignKey("drugs.drug_id"), nullable=False)
    severity = Column(Enum("high", "medium", "low", name="interaction_severity"), nullable=False)
    description = Column(Text, nullable=False)

    drug1 = relationship("Drug", back_populates="interactions_as_drug1", foreign_keys=[drug1_id])
    drug2 = relationship("Drug", back_populates="interactions_as_drug2", foreign_keys=[drug2_id])
