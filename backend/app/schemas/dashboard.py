from pydantic import BaseModel


class ServiceCount(BaseModel):
    service_name: str
    count: int


class DashboardSummary(BaseModel):
    appointments_today: int
    appointments_this_week: int
    top_services: list[ServiceCount]
