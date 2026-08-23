import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models import Barber
from app.schemas.barber import BarberCreate, BarberOut, BarberUpdate

router = APIRouter(prefix="/barbers", tags=["barbers"], dependencies=[Depends(get_current_user)])


async def _get_barber_or_404(barber_id: uuid.UUID, db: AsyncSession) -> Barber:
    result = await db.execute(select(Barber).where(Barber.id == barber_id))
    barber = result.scalar_one_or_none()
    if barber is None:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")
    return barber


@router.get("", response_model=list[BarberOut])
async def list_barbers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Barber).order_by(Barber.name))
    return result.scalars().all()


@router.post("", response_model=BarberOut, status_code=status.HTTP_201_CREATED)
async def create_barber(data: BarberCreate, db: AsyncSession = Depends(get_db)):
    barber = Barber(name=data.name)
    db.add(barber)
    await db.commit()
    await db.refresh(barber)
    return barber


@router.put("/{barber_id}", response_model=BarberOut)
async def update_barber(barber_id: uuid.UUID, data: BarberUpdate, db: AsyncSession = Depends(get_db)):
    barber = await _get_barber_or_404(barber_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(barber, field, value)
    await db.commit()
    await db.refresh(barber)
    return barber


@router.delete("/{barber_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_barber(barber_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    barber = await _get_barber_or_404(barber_id, db)
    try:
        await db.delete(barber)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover este barbeiro pois há agendamentos vinculados a ele.",
        )
