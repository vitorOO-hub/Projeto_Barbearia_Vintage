import pytest
from datetime import date, time, timedelta

from app.core.security import hash_password
from app.models import User, Client, Service, Barber, Appointment, AppointmentStatus


@pytest.mark.anyio
async def test_dashboard_summary_counts_and_top_services(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    c = Client(name="João")
    corte = Service(name="Corte", duration_minutes=30, price=40)
    barba = Service(name="Barba", duration_minutes=20, price=25)
    b = Barber(name="Carlos Silva")
    db_session.add_all([user, c, corte, barba, b])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(corte)
    await db_session.refresh(barba)
    await db_session.refresh(b)

    today = date.today()
    db_session.add_all(
        [
            Appointment(client_id=c.id, service_id=corte.id, barber_id=b.id, appointment_date=today, appointment_time=time(9, 0), status=AppointmentStatus.concluido),
            Appointment(client_id=c.id, service_id=corte.id, barber_id=b.id, appointment_date=today, appointment_time=time(10, 0), status=AppointmentStatus.concluido),
            Appointment(client_id=c.id, service_id=barba.id, barber_id=b.id, appointment_date=today, appointment_time=time(11, 0), status=AppointmentStatus.agendado),
            Appointment(client_id=c.id, service_id=corte.id, barber_id=b.id, appointment_date=today, appointment_time=time(12, 0), status=AppointmentStatus.cancelado),
            Appointment(client_id=c.id, service_id=barba.id, barber_id=b.id, appointment_date=today, appointment_time=time(13, 0), status=AppointmentStatus.nao_compareceu),
        ]
    )
    await db_session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    response = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert response.status_code == 200
    body = response.json()
    # Should count 3 active appointments (2 concluido + 1 agendado), excluding cancelado and nao_compareceu
    assert body["appointments_today"] == 3
    # top_services should only include concluido appointments, so only Corte with count 2
    assert len(body["top_services"]) == 1
    assert body["top_services"][0]["service_name"] == "Corte"
    assert body["top_services"][0]["count"] == 2


@pytest.mark.anyio
async def test_dashboard_revenue_requires_admin(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    response = await client.get("/api/v1/dashboard/revenue", headers=headers)
    assert response.status_code == 403


@pytest.mark.anyio
async def test_dashboard_revenue_sums_completed_appointments_by_barber(client, db_session):
    admin = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"), is_admin=True)
    c = Client(name="João")
    corte = Service(name="Corte", duration_minutes=30, price=40)
    barba = Service(name="Barba", duration_minutes=20, price=25)
    carlos = Barber(name="Carlos Silva")
    marcos = Barber(name="Marcos Souza")
    db_session.add_all([admin, c, corte, barba, carlos, marcos])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(corte)
    await db_session.refresh(barba)
    await db_session.refresh(carlos)
    await db_session.refresh(marcos)

    today = date.today()
    db_session.add_all(
        [
            # Carlos: 2 cortes concluidos = 80
            Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=today, appointment_time=time(9, 0), status=AppointmentStatus.concluido),
            Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=today, appointment_time=time(10, 0), status=AppointmentStatus.concluido),
            # Marcos: 1 barba concluida = 25
            Appointment(client_id=c.id, service_id=barba.id, barber_id=marcos.id, appointment_date=today, appointment_time=time(9, 0), status=AppointmentStatus.concluido),
            # Should not count: agendado, cancelado, nao_compareceu
            Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=today, appointment_time=time(11, 0), status=AppointmentStatus.agendado),
            Appointment(client_id=c.id, service_id=corte.id, barber_id=marcos.id, appointment_date=today, appointment_time=time(12, 0), status=AppointmentStatus.cancelado),
            Appointment(client_id=c.id, service_id=barba.id, barber_id=carlos.id, appointment_date=today, appointment_time=time(13, 0), status=AppointmentStatus.nao_compareceu),
        ]
    )
    await db_session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    response = await client.get("/api/v1/dashboard/revenue", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_this_week"] == 105.0
    by_barber = {row["barber_name"]: row["total"] for row in body["by_barber"]}
    assert by_barber == {"Carlos Silva": 80.0, "Marcos Souza": 25.0}


@pytest.mark.anyio
async def test_dashboard_history_requires_admin(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    response = await client.get("/api/v1/dashboard/history", headers=headers)
    assert response.status_code == 403


@pytest.mark.anyio
async def test_dashboard_history_returns_8_weeks_with_current_week_first(client, db_session):
    admin = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"), is_admin=True)
    c = Client(name="João")
    corte = Service(name="Corte", duration_minutes=30, price=40)
    carlos = Barber(name="Carlos Silva")
    db_session.add_all([admin, c, corte, carlos])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(corte)
    await db_session.refresh(carlos)

    today = date.today()
    last_week = today - timedelta(weeks=1)
    db_session.add_all(
        [
            # This week: 1 corte concluido = 40
            Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=today, appointment_time=time(9, 0), status=AppointmentStatus.concluido),
            # Last week: 2 cortes concluidos = 80
            Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=last_week, appointment_time=time(9, 0), status=AppointmentStatus.concluido),
            Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=last_week, appointment_time=time(10, 0), status=AppointmentStatus.concluido),
            # Should not count
            Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=today, appointment_time=time(11, 0), status=AppointmentStatus.cancelado),
        ]
    )
    await db_session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    response = await client.get("/api/v1/dashboard/history", headers=headers)
    assert response.status_code == 200
    body = response.json()

    assert len(body["weeks"]) == 8
    current_week, previous_week = body["weeks"][0], body["weeks"][1]

    assert current_week["total"] == 40.0
    assert current_week["appointments_count"] == 1
    assert current_week["by_barber"] == [{"barber_name": "Carlos Silva", "total": 40.0}]

    assert previous_week["total"] == 80.0
    assert previous_week["appointments_count"] == 2
    assert previous_week["by_barber"] == [{"barber_name": "Carlos Silva", "total": 80.0}]

    # The other 6 weeks have no data
    assert all(w["total"] == 0.0 and w["appointments_count"] == 0 for w in body["weeks"][2:])


@pytest.mark.anyio
async def test_dashboard_history_current_month_total_only_counts_this_month(client, db_session):
    admin = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"), is_admin=True)
    c = Client(name="João")
    corte = Service(name="Corte", duration_minutes=30, price=40)
    carlos = Barber(name="Carlos Silva")
    db_session.add_all([admin, c, corte, carlos])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(corte)
    await db_session.refresh(carlos)

    today = date.today()
    db_session.add(
        Appointment(client_id=c.id, service_id=corte.id, barber_id=carlos.id, appointment_date=today, appointment_time=time(9, 0), status=AppointmentStatus.concluido)
    )
    await db_session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    response = await client.get("/api/v1/dashboard/history", headers=headers)
    assert response.status_code == 200
    assert response.json()["current_month_total"] == 40.0
