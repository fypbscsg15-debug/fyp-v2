import uuid
from sqlalchemy import Column, Date, Enum, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from ..database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(Enum("male", "female", "other", name="patient_gender"), nullable=True)
    contact_number = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    known_allergies = Column(Text, nullable=True)  # free-text or comma-separated
    created_at = Column(DateTime, server_default=func.now())

    prescriptions = relationship("Prescription", back_populates="patient")
