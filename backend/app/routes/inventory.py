import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.inventory import Inventory
from ..models.drug import Drug
from ..schemas.schemas import InventoryResponse, InventoryCreate, InventoryUpdate
from ..utils.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("", response_model=list[InventoryResponse])
def list_inventory(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Inventory).all()

@router.post("", response_model=InventoryResponse)
def create_inventory_item(body: InventoryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    drug_id = body.drug_id
    if not drug_id:
        if not body.brand_name:
            raise HTTPException(status_code=400, detail="Either drug_id or brand_name is required")
        drug = db.query(Drug).filter(Drug.brand_name == body.brand_name).first()
        if not drug:
            drug = Drug(
                brand_name=body.brand_name,
                generic_name=body.generic_name or body.brand_name,
                therapeutic_class=body.category or "General",
                standard_dosage=body.standard_dosage or "",
                form="tablet"
            )
            db.add(drug)
            db.commit()
            db.refresh(drug)
        drug_id = drug.drug_id

    item = Inventory(
        drug_id=drug_id,
        quantity_in_stock=body.quantity_in_stock,
        expiry_date=body.expiry_date,
        low_stock_threshold=body.low_stock_threshold,
        unit_price=body.unit_price or 0.0,
        batch_number=body.batch_number or f"BATCH-{str(uuid.uuid4())[:4].upper()}",
        location=body.location or "—",
        category=body.category or "General",
        last_restocked=datetime.now()
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.patch("/{inventory_id}", response_model=InventoryResponse)
def update_inventory_item(inventory_id: str, body: InventoryUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = db.query(Inventory).filter(Inventory.inventory_id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if body.quantity_in_stock is not None and body.quantity_in_stock > item.quantity_in_stock:
        item.last_restocked = datetime.now()

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item
