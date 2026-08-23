import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models import User
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])

EMAIL_CONFLICT_ERROR = HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe um usuário com este e-mail.")


@router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.name))
    return result.scalars().all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password), is_admin=data.is_admin)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise EMAIL_CONFLICT_ERROR
    await db.refresh(user)
    return user


async def _get_user_or_404(user_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return user


@router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id: uuid.UUID, data: UserUpdate, db: AsyncSession = Depends(get_db)):
    user = await _get_user_or_404(user_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise EMAIL_CONFLICT_ERROR
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Você não pode remover a própria conta.")
    user = await _get_user_or_404(user_id, db)
    try:
        await db.delete(user)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover este usuário pois há agendamentos vinculados a ele.",
        )
