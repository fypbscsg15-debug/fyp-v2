from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel


# ── Pharmacist / Auth ─────────────────────────────────────────────────────────

class PharmacistCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Literal["admin", "pharmacist"] = "pharmacist"
    phone: Optional[str] = None


class PharmacistUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["admin", "pharmacist"]] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class PharmacistResponse(BaseModel):
    pharmacist_id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    is_active: bool

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PharmacistResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Verification Session ──────────────────────────────────────────────────────

class SessionResponse(BaseModel):
    session_id: str
    pharmacist_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    prescriptions_verified: int

    model_config = {"from_attributes": True}


# ── Patient ───────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    known_allergies: Optional[str] = None


class PatientResponse(BaseModel):
    patient_id: str
    name: str
    age: Optional[int] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    known_allergies: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Drug ──────────────────────────────────────────────────────────────────────

class DrugCreate(BaseModel):
    brand_name: str
    generic_name: str
    therapeutic_class: Optional[str] = None
    standard_dosage: Optional[str] = None
    form: Optional[str] = None
    manufacturer: Optional[str] = None
    side_effects: Optional[str] = None
    storage_instructions: Optional[str] = None


class DrugResponse(BaseModel):
    drug_id: str
    brand_name: str
    generic_name: str
    therapeutic_class: Optional[str] = None
    standard_dosage: Optional[str] = None
    form: Optional[str] = None
    manufacturer: Optional[str] = None
    side_effects: Optional[str] = None
    storage_instructions: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Inventory ─────────────────────────────────────────────────────────────────

class InventoryCreate(BaseModel):
    drug_id: Optional[str] = None
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    standard_dosage: Optional[str] = None
    quantity_in_stock: int
    expiry_date: Optional[date] = None
    low_stock_threshold: int = 10
    unit_price: Optional[float] = None
    batch_number: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    last_restocked: Optional[datetime] = None


class InventoryUpdate(BaseModel):
    quantity_in_stock: Optional[int] = None
    expiry_date: Optional[date] = None
    low_stock_threshold: Optional[int] = None
    unit_price: Optional[float] = None
    batch_number: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    last_restocked: Optional[datetime] = None


class InventoryResponse(BaseModel):
    inventory_id: str
    drug_id: str
    quantity_in_stock: int
    expiry_date: Optional[date] = None
    low_stock_threshold: int
    unit_price: Optional[float] = None
    batch_number: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    last_restocked: Optional[datetime] = None
    drug: Optional[DrugResponse] = None

    model_config = {"from_attributes": True}


# ── Prescription ──────────────────────────────────────────────────────────────

class PrescriptionDrugCreate(BaseModel):
    drug_id: Optional[str] = None
    drug_name_raw: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity_dispensed: Optional[int] = None


class PrescriptionDrugResponse(BaseModel):
    id: str
    drug_id: Optional[str] = None
    drug_name_raw: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity_dispensed: Optional[int] = None

    model_config = {"from_attributes": True}


class PrescriptionCreate(BaseModel):
    patient_id: str
    is_emergency: bool = False


class PrescriptionResponse(BaseModel):
    prescription_id: str
    patient_id: str
    pharmacist_id: str
    prescription_date: datetime
    verification_date: Optional[datetime] = None
    status: str
    scan_image_path: Optional[str] = None
    verification_notes: Optional[str] = None
    is_emergency: bool
    drugs: list[PrescriptionDrugResponse] = []

    model_config = {"from_attributes": True}


# ── Alert ─────────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    alert_id: str
    prescription_id: str
    alert_type: str
    severity: str
    message: str
    acknowledged: bool
    resolved: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Instruction ───────────────────────────────────────────────────────────────

class InstructionCreate(BaseModel):
    language: str
    content: str


class InstructionResponse(BaseModel):
    instruction_id: str
    prescription_id: str
    language: str
    content: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Interaction Check ─────────────────────────────────────────────────────────

class InteractionAlert(BaseModel):
    id: str
    severity: str
    category: str
    title: str
    description: str
    reference: str


class InteractionCheckResponse(BaseModel):
    check_id: str
    prescription_id: Optional[str] = None
    pharmacist_id: str
    medicines: list[str]
    alerts: list[InteractionAlert]
    total_pairs: int
    alert_count: int
    has_high: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsLogResponse(BaseModel):
    log_id: str
    timestamp: datetime
    session_id: str
    metric_type: str
    metric_value: float

    model_config = {"from_attributes": True}


# ── Staff Shift ──────────────────────────────────────────────────────────────

class StaffShiftStart(BaseModel):
    staff_name: str
    staff_role: str
    password: Optional[str] = None


class StaffShiftResponse(BaseModel):
    shift_id: str
    staff_name: str
    staff_role: str
    start_time: datetime
    end_time: Optional[datetime] = None

    model_config = {"from_attributes": True}
