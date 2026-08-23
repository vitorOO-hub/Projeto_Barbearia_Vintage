from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models import Appointment, Barber, Service
from app.models.appointment import AppointmentStatus, ACTIVE_STATUSES
from app.schemas.dashboard import BarberRevenue, DashboardHistory, DashboardRevenue, DashboardSummary, ServiceCount, WeekRevenue

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])

HISTORY_WEEKS = 8


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


@router.get("/revenue", response_model=DashboardRevenue, dependencies=[Depends(require_admin)])
async def revenue(db: AsyncSession = Depends(get_db)):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    rows = (
        await db.execute(
            select(Barber.name, func.sum(Service.price).label("total"))
            .join(Appointment, Appointment.barber_id == Barber.id)
            .join(Service, Appointment.service_id == Service.id)
            .where(
                (Appointment.appointment_date >= week_start)
                & (Appointment.status == AppointmentStatus.concluido)
            )
            .group_by(Barber.name)
            .order_by(func.sum(Service.price).desc())
        )
    ).all()

    by_barber = [BarberRevenue(barber_name=name, total=float(total)) for name, total in rows]
    return DashboardRevenue(
        total_this_week=sum(row.total for row in by_barber),
        by_barber=by_barber,
    )


@router.get("/history", response_model=DashboardHistory, dependencies=[Depends(require_admin)])
async def history(db: AsyncSession = Depends(get_db)):
    today = date.today()
    current_week_start = today - timedelta(days=today.weekday())
    history_start = current_week_start - timedelta(weeks=HISTORY_WEEKS - 1)

    rows = (
        await db.execute(
            select(Appointment.appointment_date, Barber.name, Service.price)
            .join(Barber, Appointment.barber_id == Barber.id)
            .join(Service, Appointment.service_id == Service.id)
            .where(
                (Appointment.appointment_date >= history_start)
                & (Appointment.status == AppointmentStatus.concluido)
            )
        )
    ).all()

    weeks: list[WeekRevenue] = []
    current_month_total = 0.0
    for i in range(HISTORY_WEEKS):
        week_start = current_week_start - timedelta(weeks=i)
        week_end = week_start + timedelta(days=6)
        week_rows = [row for row in rows if week_start <= row.appointment_date <= week_end]

        totals_by_barber: dict[str, float] = {}
        for _, barber_name, price in week_rows:
            totals_by_barber[barber_name] = totals_by_barber.get(barber_name, 0.0) + float(price)

        by_barber = [
            BarberRevenue(barber_name=name, total=total)
            for name, total in sorted(totals_by_barber.items(), key=lambda item: item[1], reverse=True)
        ]
        weeks.append(
            WeekRevenue(
                week_start=week_start,
                week_end=week_end,
                total=sum(by_barber_row.total for by_barber_row in by_barber),
                appointments_count=len(week_rows),
                by_barber=by_barber,
            )
        )

    for appointment_date, _, price in rows:
        if appointment_date.year == today.year and appointment_date.month == today.month:
            current_month_total += float(price)

    return DashboardHistory(current_month_total=current_month_total, weeks=weeks)
