import uuid
from datetime import date as date_type, time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.integrations.n8n import notify_n8n
from app.models import Appointment, Barber, Client, Service, User
from app.models.appointment import ACTIVE_STATUSES
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetailOut,
    AppointmentOut,
    AppointmentStatusUpdate,
    AppointmentUpdate,
)

router = APIRouter(prefix="/appointments", tags=["appointments"], dependencies=[Depends(get_current_user)])


async def _has_conflict(
    db: AsyncSession,
    appointment_date,
    appointment_time,
    barber_id,
    duration_minutes: int,
    exclude_id: uuid.UUID | None = None,
) -> Appointment | None:
    query = (
        select(Appointment, Service.duration_minutes)
        .join(Service, Appointment.service_id == Service.id)
        .where(
            and_(
                Appointment.appointment_date == appointment_date,
                Appointment.barber_id == barber_id,
                Appointment.status.in_(ACTIVE_STATUSES),
            )
        )
    )
    if exclude_id is not None:
        query = query.where(Appointment.id != exclude_id)
    result = await db.execute(query)

    new_start = appointment_time.hour * 60 + appointment_time.minute
    new_end = new_start + duration_minutes

    for existing_appt, existing_duration in result.all():
        existing_start = existing_appt.appointment_time.hour * 60 + existing_appt.appointment_time.minute
        existing_end = existing_start + existing_duration
        if existing_start < new_end and existing_end > new_start:
            return existing_appt
    return None


def _format_conflict_detail(conflict_time: time, conflict_duration_minutes: int) -> str:
    start_minutes = conflict_time.hour * 60 + conflict_time.minute
    end_minutes = start_minutes + conflict_duration_minutes
    start_str = f"{start_minutes // 60:02d}:{start_minutes % 60:02d}"
    end_str = f"{(end_minutes // 60) % 24:02d}:{end_minutes % 60:02d}"
    return f"Este barbeiro já tem um atendimento das {start_str} às {end_str}. Escolha outro horário ou outro barbeiro."


async def _get_appointment_or_404(appointment_id: uuid.UUID, db: AsyncSession) -> Appointment:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if appt is None:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    return appt


async def _get_service_or_404(service_id: uuid.UUID, db: AsyncSession) -> Service:
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if service is None:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    return service


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service_row = await _get_service_or_404(data.service_id, db)

    conflict = await _has_conflict(
        db, data.appointment_date, data.appointment_time, data.barber_id, service_row.duration_minutes
    )
    if conflict is not None:
        conflict_service = (await db.execute(select(Service).where(Service.id == conflict.service_id))).scalar_one()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_format_conflict_detail(conflict.appointment_time, conflict_service.duration_minutes),
        )

    appt = Appointment(**data.model_dump(), created_by=current_user.id)
    db.add(appt)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este barbeiro já tem um agendamento neste horário.")
    await db.refresh(appt)

    client_row = (await db.execute(select(Client).where(Client.id == appt.client_id))).scalar_one()
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
async def list_appointments(
    date: date_type | None = None,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Appointment, Client, Service, Barber)
        .join(Client, Appointment.client_id == Client.id)
        .join(Service, Appointment.service_id == Service.id)
        .join(Barber, Appointment.barber_id == Barber.id)
    )

    if date is not None:
        query = query.where(Appointment.appointment_date == date)
    elif start_date is not None or end_date is not None:
        if start_date is not None:
            query = query.where(Appointment.appointment_date >= start_date)
        if end_date is not None:
            query = query.where(Appointment.appointment_date <= end_date)
    else:
        query = query.where(Appointment.appointment_date == date_type.today())

    query = query.order_by(Appointment.appointment_date, Appointment.appointment_time)
    result = await db.execute(query)
    rows = result.all()
    return [
        AppointmentDetailOut(
            id=appt.id,
            client_id=appt.client_id,
            service_id=appt.service_id,
            barber_id=appt.barber_id,
            appointment_date=appt.appointment_date,
            appointment_time=appt.appointment_time,
            status=appt.status,
            confirmation_email_sent=appt.confirmation_email_sent,
            client_name=client_row.name,
            client_email=client_row.email,
            service_name=service_row.name,
            service_price=float(service_row.price),
            service_duration_minutes=service_row.duration_minutes,
            barber_name=barber_row.name,
        )
        for appt, client_row, service_row, barber_row in rows
    ]


@router.put("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(appointment_id: uuid.UUID, data: AppointmentUpdate, db: AsyncSession = Depends(get_db)):
    appt = await _get_appointment_or_404(appointment_id, db)
    updates = data.model_dump(exclude_unset=True)

    new_date = updates.get("appointment_date", appt.appointment_date)
    new_time = updates.get("appointment_time", appt.appointment_time)
    new_barber_id = updates.get("barber_id", appt.barber_id)
    new_service_id = updates.get("service_id", appt.service_id)
    if (new_date, new_time, new_barber_id, new_service_id) != (
        appt.appointment_date,
        appt.appointment_time,
        appt.barber_id,
        appt.service_id,
    ):
        new_service_row = await _get_service_or_404(new_service_id, db)
        conflict = await _has_conflict(
            db, new_date, new_time, new_barber_id, new_service_row.duration_minutes, exclude_id=appt.id
        )
        if conflict is not None:
            conflict_service = (await db.execute(select(Service).where(Service.id == conflict.service_id))).scalar_one()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_format_conflict_detail(conflict.appointment_time, conflict_service.duration_minutes),
            )

    for field, value in updates.items():
        setattr(appt, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este barbeiro já tem um agendamento neste horário.")
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
