import uuid
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base


class PrescriptionDrug(Base):
    """Junction table: which drugs appear on a prescription and at what dose.

    Added beyond the original ERD to make individual drug line-items
    queryable (required by the OCR review and verify pages).
    drug_id is nullable — OCR may extract a name that doesn't match any
    known drug in the database yet.
    """

    __tablename__ = "prescription_drugs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prescription_id = Column(String, ForeignKey("prescriptions.prescription_id"), nullable=False)
    drug_id = Column(String, ForeignKey("drugs.drug_id"), nullable=True)  # NULL if unrecognised
    drug_name_raw = Column(String, nullable=False)    # exactly as extracted by OCR
    dosage = Column(String, nullable=True)            # e.g. "500 mg"
    frequency = Column(String, nullable=True)         # e.g. "twice daily"
    duration = Column(String, nullable=True)          # e.g. "7 days"
    quantity_dispensed = Column(Integer, nullable=True)

    prescription = relationship("Prescription", back_populates="drugs")
    drug = relationship("Drug", back_populates="prescription_items")
