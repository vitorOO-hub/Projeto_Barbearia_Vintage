import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models import Client, User
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate

router = APIRouter(prefix="/clients", tags=["clients"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(data: ClientCreate, db: AsyncSession = Depends(get_db)):
    client = Client(**data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("", response_model=list[ClientOut])
async def list_clients(
    search: str | None = None,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(Client)
    if not include_inactive:
        query = query.where(Client.active.is_(True))
    if search:
        query = query.where(Client.name.ilike(f"%{search}%"))
    query = query.order_by(Client.name)
    result = await db.execute(query)
    return result.scalars().all()


async def _get_client_or_404(client_id: uuid.UUID, db: AsyncSession) -> Client:
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return client


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(client_id: uuid.UUID, data: ClientUpdate, db: AsyncSession = Depends(get_db)):
    client = await _get_client_or_404(client_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_client(client_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    client = await _get_client_or_404(client_id, db)
    client.active = False
    await db.commit()
