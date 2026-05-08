from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.district_account import DistrictAccount
from app.schemas.district_account import (
    DistrictAccount as DistrictAccountSchema,
    DistrictAccountCreate,
    DistrictAccountUpdate,
)
from app.utils.excel_parser import parse_district_accounts_excel

router = APIRouter(prefix="/district-accounts", tags=["District Accounts"])

ALLOWED_ROLES = {"admin", "superadmin", "director"}


@router.get("/", response_model=List[DistrictAccountSchema])
async def get_district_accounts(
    settlement_id: int | None = None,
    skip: int = 0,
    limit: int = 1000,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(DistrictAccount)
    if settlement_id:
        query = query.where(DistrictAccount.settlement_id == settlement_id)
    query = query.offset(skip).limit(limit).order_by(DistrictAccount.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=DistrictAccountSchema)
async def create_district_account(
    body: DistrictAccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    db_acc = DistrictAccount(**body.model_dump())
    db.add(db_acc)
    await db.commit()
    await db.refresh(db_acc)
    return db_acc


@router.post("/upload", response_model=List[DistrictAccountSchema])
async def upload_district_accounts(
    settlement_id: int = Form(...),
    file: UploadFile = File(...),
    replace: bool = Form(False),
    category: str | None = Form(None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload district accounts from Excel.
    If replace=True, existing records for this settlement are deleted before import.
    If category is provided, it overrides any category detected from the file.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")

    content = await file.read()
    try:
        parsed_accounts = parse_district_accounts_excel(content, settlement_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing Excel: {str(e)}")

    if not parsed_accounts:
        raise HTTPException(status_code=400, detail="No data found in the Excel file")

    if category:
        for acc in parsed_accounts:
            acc["category"] = category

    if replace:
        await db.execute(delete(DistrictAccount).where(DistrictAccount.settlement_id == settlement_id))

    new_accounts = []
    for acc_data in parsed_accounts:
        db_acc = DistrictAccount(**acc_data)
        db.add(db_acc)
        new_accounts.append(db_acc)

    await db.commit()
    for acc in new_accounts:
        await db.refresh(acc)

    return new_accounts


@router.post("/bulk-delete")
async def bulk_delete_district_accounts(
    ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.execute(delete(DistrictAccount).where(DistrictAccount.id.in_(ids)))
    await db.commit()
    return {"status": "success", "deleted": len(ids)}


@router.delete("/settlement/{settlement_id}")
async def clear_district_accounts(
    settlement_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.execute(delete(DistrictAccount).where(DistrictAccount.settlement_id == settlement_id))
    await db.commit()
    return {"status": "success"}


@router.patch("/{account_id}", response_model=DistrictAccountSchema)
async def update_district_account(
    account_id: int,
    body: DistrictAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(select(DistrictAccount).where(DistrictAccount.id == account_id))
    db_acc = result.scalar_one_or_none()
    if not db_acc:
        raise HTTPException(status_code=404, detail="Account not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(db_acc, key, value)

    await db.commit()
    await db.refresh(db_acc)
    return db_acc


@router.delete("/{account_id}")
async def delete_district_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(select(DistrictAccount).where(DistrictAccount.id == account_id))
    db_acc = result.scalar_one_or_none()
    if not db_acc:
        raise HTTPException(status_code=404, detail="Account not found")

    await db.delete(db_acc)
    await db.commit()
    return {"status": "success"}
