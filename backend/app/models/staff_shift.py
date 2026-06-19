import uuid
from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func
from ..database import Base

class StaffShift(Base):
    __tablename__ = "staff_shifts"

    shift_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    staff_name = Column(String, nullable=False)
    staff_role = Column(String, nullable=False)
    start_time = Column(DateTime, server_default=func.now(), nullable=False)
    end_time = Column(DateTime, nullable=True)
