from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models import Appointment, Service
from app.models.appointment import AppointmentStatus, ACTIVE_STATUSES
from app.schemas.dashboard import DashboardSummary, ServiceCount

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=DashboardSummary)
async def summary(db: AsyncSession = Depends(get_db)):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    today_count = (
        await db.execute(
            select(func.count()).select_from(Appointment).where(
                (Appointment.appointment_date == today) & (Appointment.status.in_(ACTIVE_STATUSES))
            )
        )
    ).scalar_one()

    week_count = (
        await db.execute(
            select(func.count()).select_from(Appointment).where(
                (Appointment.appointment_date >= week_start) & (Appointment.status.in_(ACTIVE_STATUSES))
            )
        )
    ).scalar_one()

    top_services_rows = (
        await db.execute(
            select(Service.name, func.count(Appointment.id).label("total"))
            .join(Appointment, Appointment.service_id == Service.id)
            .where(Appointment.status == AppointmentStatus.concluido)
            .group_by(Service.name)
            .order_by(func.count(Appointment.id).desc())
            .limit(5)
        )
    ).all()

    return DashboardSummary(
        appointments_today=today_count,
        appointments_this_week=week_count,
        top_services=[ServiceCount(service_name=name, count=total) for name, total in top_services_rows],
    )
