import uuid

from pydantic import BaseModel, ConfigDict


class BarberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class BarberCreate(BaseModel):
    name: str


class BarberUpdate(BaseModel):
    name: str | None = None
