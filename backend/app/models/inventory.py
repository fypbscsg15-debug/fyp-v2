import uuid
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Inventory(Base):
    """One row per drug — tracks current stock level.

    NOTE: drug_id is UNIQUE (per ERD). If multi-batch tracking is needed later,
    remove the unique constraint and add a batch_number column.
    """

    __tablename__ = "inventory"

    inventory_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    drug_id = Column(String, ForeignKey("drugs.drug_id"), nullable=False, unique=True)
    quantity_in_stock = Column(Integer, nullable=False, default=0)
    expiry_date = Column(Date, nullable=True)
    low_stock_threshold = Column(Integer, nullable=False, default=10)
    unit_price = Column(Float, nullable=True)
    batch_number = Column(String, nullable=True)
    location = Column(String, nullable=True)
    category = Column(String, nullable=True)
    last_restocked = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, onupdate=func.now())

    drug = relationship("Drug", back_populates="inventory")
