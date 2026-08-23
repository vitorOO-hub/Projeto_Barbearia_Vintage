from datetime import date

from pydantic import BaseModel


class ServiceCount(BaseModel):
    service_name: str
    count: int


class DashboardSummary(BaseModel):
    appointments_today: int
    appointments_this_week: int
    top_services: list[ServiceCount]


class BarberRevenue(BaseModel):
    barber_name: str
    total: float


class DashboardRevenue(BaseModel):
    total_this_week: float
    by_barber: list[BarberRevenue]


class WeekRevenue(BaseModel):
    week_start: date
    week_end: date
    total: float
    appointments_count: int
    by_barber: list[BarberRevenue]


class DashboardHistory(BaseModel):
    current_month_total: float
    weeks: list[WeekRevenue]
