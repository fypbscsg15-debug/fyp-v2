from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import Pharmacist
from ..models.staff_shift import StaffShift
from ..schemas.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    PharmacistCreate,
    PharmacistResponse,
    PharmacistUpdate,
    Token,
    StaffShiftStart,
    StaffShiftResponse,
)
from ..utils.auth import (
    create_access_token,
    get_current_user,
    get_pharmacist_or_404,
    hash_password,
    require_admin,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    pharmacist = db.query(Pharmacist).filter(Pharmacist.email == body.email).first()
    if not pharmacist or not verify_password(body.password, pharmacist.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pharmacist.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    pharmacist.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(pharmacist.pharmacist_id)
    return Token(access_token=token, user=PharmacistResponse.model_validate(pharmacist))


@router.post("/logout")
def logout(_: Pharmacist = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=PharmacistResponse)
def me(current_user: Pharmacist = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: Pharmacist = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated"}


# ── User management (admin only) ──────────────────────────────────────────────

@router.post("/users", response_model=PharmacistResponse, dependencies=[Depends(require_admin)])
def create_pharmacist(body: PharmacistCreate, db: Session = Depends(get_db)):
    if db.query(Pharmacist).filter(Pharmacist.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    p = Pharmacist(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        phone=body.phone,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/users", response_model=list[PharmacistResponse], dependencies=[Depends(require_admin)])
def list_pharmacists(db: Session = Depends(get_db)):
    return db.query(Pharmacist).all()


@router.patch("/users/{pharmacist_id}", response_model=PharmacistResponse, dependencies=[Depends(require_admin)])
def update_pharmacist(pharmacist_id: str, body: PharmacistUpdate, db: Session = Depends(get_db)):
    p = get_pharmacist_or_404(db, pharmacist_id)
    if body.name is not None:
        p.name = body.name
    if body.role is not None:
        p.role = body.role
    if body.phone is not None:
        p.phone = body.phone
    if body.is_active is not None:
        p.is_active = body.is_active
    db.commit()
    db.refresh(p)
    return p


@router.delete("/users/{pharmacist_id}", dependencies=[Depends(require_admin)])
def delete_pharmacist(pharmacist_id: str, db: Session = Depends(get_db)):
    p = get_pharmacist_or_404(db, pharmacist_id)
    db.delete(p)
    db.commit()
    return {"message": "Pharmacist deleted"}


@router.post("/shift/start", response_model=StaffShiftResponse)
def start_shift(body: StaffShiftStart, db: Session = Depends(get_db)):
    shift = StaffShift(
        staff_name=body.staff_name,
        staff_role=body.staff_role,
        start_time=datetime.now()
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.post("/shift/end/{shift_id}", response_model=StaffShiftResponse)
def end_shift(shift_id: str, db: Session = Depends(get_db)):
    shift = db.query(StaffShift).filter(StaffShift.shift_id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift.end_time = datetime.now()
    db.commit()
    db.refresh(shift)
    return shift
