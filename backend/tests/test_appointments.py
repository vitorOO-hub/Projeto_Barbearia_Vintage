import pytest

from app.core.security import hash_password
from app.models import User, Client, Service


async def _setup(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    c = Client(name="João Silva", email="joao@x.com")
    s = Service(name="Corte", duration_minutes=30, price=40)
    db_session.add_all([user, c, s])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(s)

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    return headers, c, s


@pytest.mark.anyio
async def test_create_appointment(client, db_session):
    headers, c, s = await _setup(client, db_session)
    response = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["status"] == "agendado"


@pytest.mark.anyio
async def test_create_appointment_conflict_same_slot_returns_409(client, db_session):
    headers, c, s = await _setup(client, db_session)
    payload = {
        "client_id": str(c.id),
        "service_id": str(s.id),
        "appointment_date": "2026-08-25",
        "appointment_time": "14:00:00",
    }
    first = await client.post("/api/v1/appointments", json=payload, headers=headers)
    assert first.status_code == 201

    second = await client.post("/api/v1/appointments", json=payload, headers=headers)
    assert second.status_code == 409
    assert second.json()["detail"] == "Já existe um agendamento para este horário."


@pytest.mark.anyio
async def test_cancelled_slot_can_be_rebooked(client, db_session):
    headers, c, s = await _setup(client, db_session)
    payload = {
        "client_id": str(c.id),
        "service_id": str(s.id),
        "appointment_date": "2026-08-25",
        "appointment_time": "14:00:00",
    }
    first = await client.post("/api/v1/appointments", json=payload, headers=headers)
    appt_id = first.json()["id"]
    await client.patch(f"/api/v1/appointments/{appt_id}/status", json={"status": "cancelado"}, headers=headers)

    second = await client.post("/api/v1/appointments", json=payload, headers=headers)
    assert second.status_code == 201


@pytest.mark.anyio
async def test_update_appointment_same_slot_does_not_conflict_with_itself(client, db_session):
    headers, c, s = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    appt_id = resp.json()["id"]

    response = await client.put(
        f"/api/v1/appointments/{appt_id}",
        json={
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
            "service_id": str(s.id),
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["appointment_time"] == "14:00:00"


@pytest.mark.anyio
async def test_list_appointments_by_date_ordered_by_time(client, db_session):
    headers, c, s = await _setup(client, db_session)
    await client.post(
        "/api/v1/appointments",
        json={"client_id": str(c.id), "service_id": str(s.id), "appointment_date": "2026-08-25", "appointment_time": "15:00:00"},
        headers=headers,
    )
    await client.post(
        "/api/v1/appointments",
        json={"client_id": str(c.id), "service_id": str(s.id), "appointment_date": "2026-08-25", "appointment_time": "09:00:00"},
        headers=headers,
    )

    response = await client.get("/api/v1/appointments?date=2026-08-25", headers=headers)
    times = [a["appointment_time"] for a in response.json()]
    assert times == sorted(times)


@pytest.mark.anyio
async def test_update_status(client, db_session):
    headers, c, s = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={"client_id": str(c.id), "service_id": str(s.id), "appointment_date": "2026-08-25", "appointment_time": "09:00:00"},
        headers=headers,
    )
    appt_id = resp.json()["id"]

    response = await client.patch(f"/api/v1/appointments/{appt_id}/status", json={"status": "concluido"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "concluido"


@pytest.mark.anyio
async def test_delete_appointment(client, db_session):
    headers, c, s = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={"client_id": str(c.id), "service_id": str(s.id), "appointment_date": "2026-08-25", "appointment_time": "09:00:00"},
        headers=headers,
    )
    appt_id = resp.json()["id"]

    response = await client.delete(f"/api/v1/appointments/{appt_id}", headers=headers)
    assert response.status_code == 204

    listing = await client.get("/api/v1/appointments?date=2026-08-25", headers=headers)
    assert listing.json() == []
