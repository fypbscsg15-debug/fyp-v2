import uuid
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Drug(Base):
    __tablename__ = "drugs"

    drug_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_name = Column(String, nullable=False, index=True)
    generic_name = Column(String, nullable=False, index=True)
    therapeutic_class = Column(String, nullable=True)   # e.g. "Antibiotic", "NSAID"
    standard_dosage = Column(String, nullable=True)      # e.g. "500mg twice daily"
    form = Column(String, nullable=True)                 # tablet / capsule / syrup / injection
    manufacturer = Column(String, nullable=True)
    side_effects = Column(Text, nullable=True)
    storage_instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    inventory = relationship("Inventory", back_populates="drug", uselist=False)
    contraindications = relationship("Contraindication", back_populates="drug")
    interactions_as_drug1 = relationship("DrugInteraction", back_populates="drug1", foreign_keys="DrugInteraction.drug1_id")
    interactions_as_drug2 = relationship("DrugInteraction", back_populates="drug2", foreign_keys="DrugInteraction.drug2_id")
    prescription_items = relationship("PrescriptionDrug", back_populates="drug")
