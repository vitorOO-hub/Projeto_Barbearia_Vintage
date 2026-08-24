import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models import Service
from app.schemas.service import ServiceCreate, ServiceOut, ServiceUpdate

router = APIRouter(prefix="/services", tags=["services"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(data: ServiceCreate, db: AsyncSession = Depends(get_db)):
    service = Service(**data.model_dump())
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service


@router.get("", response_model=list[ServiceOut])
async def list_services(include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(Service)
    if not include_inactive:
        query = query.where(Service.active.is_(True))
    query = query.order_by(Service.name)
    result = await db.execute(query)
    return result.scalars().all()


async def _get_service_or_404(service_id: uuid.UUID, db: AsyncSession) -> Service:
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if service is None:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    return service


@router.put("/{service_id}", response_model=ServiceOut)
async def update_service(service_id: uuid.UUID, data: ServiceUpdate, db: AsyncSession = Depends(get_db)):
    service = await _get_service_or_404(service_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    await db.commit()
    await db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = await _get_service_or_404(service_id, db)
    try:
        await db.delete(service)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir este serviço pois há agendamentos vinculados a ele.",
        )
