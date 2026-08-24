import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    notes: str | None = None
    active: bool | None = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str | None
    phone: str | None
    notes: str | None
    active: bool
    created_at: datetime
    updated_at: datetime
