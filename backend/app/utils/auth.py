from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.user import Pharmacist

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(pharmacist_id: str, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": pharmacist_id, "exp": expire, "iat": now}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        pharmacist_id: str = payload.get("sub")
        if not pharmacist_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return pharmacist_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token is invalid or expired")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Pharmacist:
    pharmacist_id = _decode_token(credentials.credentials)
    pharmacist = (
        db.query(Pharmacist)
        .filter(Pharmacist.pharmacist_id == pharmacist_id, Pharmacist.is_active == True)
        .first()
    )
    if not pharmacist:
        raise HTTPException(status_code=401, detail="Pharmacist not found or deactivated")
    return pharmacist


def require_admin(current_user: Pharmacist = Depends(get_current_user)) -> Pharmacist:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return current_user


def get_pharmacist_or_404(db: Session, pharmacist_id: str) -> Pharmacist:
    p = db.query(Pharmacist).filter(Pharmacist.pharmacist_id == pharmacist_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pharmacist not found")
    return p
