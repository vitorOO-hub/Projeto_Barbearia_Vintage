import uuid
from datetime import date as date_type

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.integrations.n8n import notify_n8n
from app.models import Appointment, Client, Service, User
from app.models.appointment import ACTIVE_STATUSES
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetailOut,
    AppointmentOut,
    AppointmentStatusUpdate,
    AppointmentUpdate,
)

router = APIRouter(prefix="/appointments", tags=["appointments"], dependencies=[Depends(get_current_user)])

CONFLICT_ERROR = HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe um agendamento para este horário.")


async def _has_conflict(
    db: AsyncSession,
    appointment_date,
    appointment_time,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    query = select(Appointment).where(
        and_(
            Appointment.appointment_date == appointment_date,
            Appointment.appointment_time == appointment_time,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
    )
    if exclude_id is not None:
        query = query.where(Appointment.id != exclude_id)
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def _get_appointment_or_404(appointment_id: uuid.UUID, db: AsyncSession) -> Appointment:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    return appt


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if await _has_conflict(db, data.appointment_date, data.appointment_time):
        raise CONFLICT_ERROR

    appt = Appointment(**data.model_dump(), created_by=current_user.id)
    db.add(appt)
    await db.commit()
    await db.refresh(appt)

    client_row = (await db.execute(select(Client).where(Client.id == appt.client_id))).scalar_one()
    service_row = (await db.execute(select(Service).where(Service.id == appt.service_id))).scalar_one()
    background_tasks.add_task(
        notify_n8n,
        {
            "appointment_id": str(appt.id),
            "client_name": client_row.name,
            "client_email": client_row.email,
            "service_name": service_row.name,
            "appointment_date": appt.appointment_date.isoformat(),
            "appointment_time": appt.appointment_time.isoformat(),
            "status": appt.status.value,
        },
    )
    return appt


@router.get("", response_model=list[AppointmentDetailOut])
async def list_appointments(date: date_type, db: AsyncSession = Depends(get_db)):
    query = (
        select(Appointment, Client, Service)
        .join(Client, Appointment.client_id == Client.id)
        .join(Service, Appointment.service_id == Service.id)
        .where(Appointment.appointment_date == date)
        .order_by(Appointment.appointment_time)
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        AppointmentDetailOut(
            id=appt.id,
            client_id=appt.client_id,
            service_id=appt.service_id,
            appointment_date=appt.appointment_date,
            appointment_time=appt.appointment_time,
            status=appt.status,
            client_name=client_row.name,
            client_email=client_row.email,
            service_name=service_row.name,
            service_price=float(service_row.price),
            service_duration_minutes=service_row.duration_minutes,
        )
        for appt, client_row, service_row in rows
    ]


@router.put("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(appointment_id: uuid.UUID, data: AppointmentUpdate, db: AsyncSession = Depends(get_db)):
    appt = await _get_appointment_or_404(appointment_id, db)
    updates = data.model_dump(exclude_unset=True)

    new_date = updates.get("appointment_date", appt.appointment_date)
    new_time = updates.get("appointment_time", appt.appointment_time)
    if (new_date, new_time) != (appt.appointment_date, appt.appointment_time):
        if await _has_conflict(db, new_date, new_time, exclude_id=appt.id):
            raise CONFLICT_ERROR

    for field, value in updates.items():
        setattr(appt, field, value)
    await db.commit()
    await db.refresh(appt)
    return appt


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
async def update_status(appointment_id: uuid.UUID, data: AppointmentStatusUpdate, db: AsyncSession = Depends(get_db)):
    appt = await _get_appointment_or_404(appointment_id, db)
    appt.status = data.status
    await db.commit()
    await db.refresh(appt)
    return appt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    appt = await _get_appointment_or_404(appointment_id, db)
    await db.delete(appt)
    await db.commit()
