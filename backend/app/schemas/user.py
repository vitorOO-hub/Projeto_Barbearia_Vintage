import uuid

from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    is_admin: bool


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    is_admin: bool = False


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    is_admin: bool | None = None
