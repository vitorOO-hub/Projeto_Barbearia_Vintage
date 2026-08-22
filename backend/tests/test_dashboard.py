import pytest
from datetime import date, time

from app.core.security import hash_password
from app.models import User, Client, Service, Appointment, AppointmentStatus


@pytest.mark.anyio
async def test_dashboard_summary_counts_and_top_services(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    c = Client(name="João")
    corte = Service(name="Corte", duration_minutes=30, price=40)
    barba = Service(name="Barba", duration_minutes=20, price=25)
    db_session.add_all([user, c, corte, barba])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(corte)
    await db_session.refresh(barba)

    db_session.add_all(
        [
            Appointment(client_id=c.id, service_id=corte.id, appointment_date=date(2026, 8, 22), appointment_time=time(9, 0), status=AppointmentStatus.concluido),
            Appointment(client_id=c.id, service_id=corte.id, appointment_date=date(2026, 8, 22), appointment_time=time(10, 0), status=AppointmentStatus.concluido),
            Appointment(client_id=c.id, service_id=barba.id, appointment_date=date(2026, 8, 22), appointment_time=time(11, 0), status=AppointmentStatus.agendado),
        ]
    )
    await db_session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    response = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["appointments_today"] == 3
    assert body["top_services"][0]["service_name"] == "Corte"
    assert body["top_services"][0]["count"] == 2
