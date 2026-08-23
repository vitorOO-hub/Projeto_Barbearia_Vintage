from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models import Barber
from app.schemas.barber import BarberOut

router = APIRouter(prefix="/barbers", tags=["barbers"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[BarberOut])
async def list_barbers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Barber).order_by(Barber.name))
    return result.scalars().all()
