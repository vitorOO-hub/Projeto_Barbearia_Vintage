import uuid

from pydantic import BaseModel, ConfigDict


class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int = 30
    price: float = 0


class ServiceUpdate(BaseModel):
    name: str | None = None
    duration_minutes: int | None = None
    price: float | None = None
    active: bool | None = None


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    duration_minutes: int
    price: float
    active: bool
