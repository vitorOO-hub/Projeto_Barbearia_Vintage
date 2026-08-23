import uuid
from datetime import date, time

from pydantic import BaseModel, ConfigDict

from app.models.appointment import AppointmentStatus


class AppointmentCreate(BaseModel):
    client_id: uuid.UUID
    service_id: uuid.UUID
    barber_id: uuid.UUID
    appointment_date: date
    appointment_time: time


class AppointmentUpdate(BaseModel):
    client_id: uuid.UUID | None = None
    service_id: uuid.UUID | None = None
    barber_id: uuid.UUID | None = None
    appointment_date: date | None = None
    appointment_time: time | None = None
    confirmation_email_sent: bool | None = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    service_id: uuid.UUID
    barber_id: uuid.UUID
    appointment_date: date
    appointment_time: time
    status: AppointmentStatus
    confirmation_email_sent: bool


class AppointmentDetailOut(AppointmentOut):
    client_name: str
    client_email: str | None
    service_name: str
    service_price: float
    service_duration_minutes: int
    barber_name: str
