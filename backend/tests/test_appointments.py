import uuid
import pytest

from app.core.security import hash_password
from app.models import User, Client, Service, Barber


async def _setup(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    c = Client(name="João Silva", email="joao@x.com")
    s = Service(name="Corte", duration_minutes=30, price=40)
    b = Barber(name="Carlos Silva")
    db_session.add_all([user, c, s, b])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(s)
    await db_session.refresh(b)

    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    return headers, c, s, b


@pytest.mark.anyio
async def test_create_appointment(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    response = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["status"] == "agendado"
    assert response.json()["barber_id"] == str(b.id)
    assert response.json()["confirmation_email_sent"] is False


@pytest.mark.anyio
async def test_create_appointment_with_invalid_service_id_returns_404(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    fake_service_id = str(uuid.uuid4())
    response = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": fake_service_id,
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Serviço não encontrado."


@pytest.mark.anyio
async def test_create_appointment_conflict_same_slot_returns_409(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    payload = {
        "client_id": str(c.id),
        "service_id": str(s.id),
        "barber_id": str(b.id),
        "appointment_date": "2026-08-25",
        "appointment_time": "14:00:00",
    }
    first = await client.post("/api/v1/appointments", json=payload, headers=headers)
    assert first.status_code == 201

    second = await client.post("/api/v1/appointments", json=payload, headers=headers)
    assert second.status_code == 409
    assert second.json()["detail"] == (
        "Este cabeleireiro já tem um atendimento das 14:00 às 14:30. "
        "Escolha outro horário ou outro cabeleireiro."
    )


@pytest.mark.anyio
async def test_same_slot_different_barbers_does_not_conflict(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    other_barber = Barber(name="Marcos Souza")
    db_session.add(other_barber)
    await db_session.commit()
    await db_session.refresh(other_barber)

    payload = {
        "client_id": str(c.id),
        "service_id": str(s.id),
        "appointment_date": "2026-08-25",
        "appointment_time": "14:00:00",
    }
    first = await client.post("/api/v1/appointments", json={**payload, "barber_id": str(b.id)}, headers=headers)
    assert first.status_code == 201

    second = await client.post("/api/v1/appointments", json={**payload, "barber_id": str(other_barber.id)}, headers=headers)
    assert second.status_code == 201


@pytest.mark.anyio
async def test_create_appointment_partial_overlap_returns_409_with_conflict_window(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    # s has duration_minutes=30 (see _setup: Service(name="Corte", duration_minutes=30, price=40))
    first = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    assert first.status_code == 201

    # Starts at 14:15, inside the first appointment's 14:00-14:30 window -> overlaps
    second = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:15:00",
        },
        headers=headers,
    )
    assert second.status_code == 409
    assert second.json()["detail"] == (
        "Este cabeleireiro já tem um atendimento das 14:00 às 14:30. "
        "Escolha outro horário ou outro cabeleireiro."
    )


@pytest.mark.anyio
async def test_create_appointment_adjacent_slots_do_not_conflict(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    first = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    assert first.status_code == 201

    # Starts exactly when the first ends (14:30) -> no overlap
    second = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:30:00",
        },
        headers=headers,
    )
    assert second.status_code == 201


@pytest.mark.anyio
async def test_update_appointment_excludes_itself_from_overlap_check(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    appt_id = resp.json()["id"]

    # Editing only the time, still overlapping only with itself -> should succeed
    update = await client.put(
        f"/api/v1/appointments/{appt_id}",
        json={"appointment_time": "14:10:00"},
        headers=headers,
    )
    assert update.status_code == 200


@pytest.mark.anyio
async def test_cancelled_slot_can_be_rebooked(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    payload = {
        "client_id": str(c.id),
        "service_id": str(s.id),
        "barber_id": str(b.id),
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
    headers, c, s, b = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
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
async def test_update_appointment_time_resets_confirmation_email_sent(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    appt_id = resp.json()["id"]
    await client.put(
        f"/api/v1/appointments/{appt_id}",
        json={"confirmation_email_sent": True},
        headers=headers,
    )

    response = await client.put(
        f"/api/v1/appointments/{appt_id}",
        json={"appointment_time": "15:00:00"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["confirmation_email_sent"] is False


@pytest.mark.anyio
async def test_update_appointment_to_same_slot_as_another_barber_conflicts(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    other_barber = Barber(name="Marcos Souza")
    db_session.add(other_barber)
    await db_session.commit()
    await db_session.refresh(other_barber)

    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(other_barber.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )
    mine = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "09:00:00",
        },
        headers=headers,
    )
    appt_id = mine.json()["id"]

    response = await client.put(
        f"/api/v1/appointments/{appt_id}",
        json={"barber_id": str(other_barber.id), "appointment_date": "2026-08-25", "appointment_time": "14:00:00"},
        headers=headers,
    )
    assert response.status_code == 409


@pytest.mark.anyio
async def test_list_appointments_by_date_ordered_by_time(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-25", "appointment_time": "15:00:00",
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-25", "appointment_time": "09:00:00",
        },
        headers=headers,
    )

    response = await client.get("/api/v1/appointments?date=2026-08-25", headers=headers)
    times = [a["appointment_time"] for a in response.json()]
    assert times == sorted(times)


@pytest.mark.anyio
async def test_list_appointments_includes_barber_name(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-25", "appointment_time": "09:00:00",
        },
        headers=headers,
    )

    response = await client.get("/api/v1/appointments?date=2026-08-25", headers=headers)
    assert response.json()[0]["barber_name"] == "Carlos Silva"


@pytest.mark.anyio
async def test_update_status(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-25", "appointment_time": "09:00:00",
        },
        headers=headers,
    )
    appt_id = resp.json()["id"]

    response = await client.patch(f"/api/v1/appointments/{appt_id}/status", json={"status": "concluido"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "concluido"


@pytest.mark.anyio
async def test_delete_appointment(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-25", "appointment_time": "09:00:00",
        },
        headers=headers,
    )
    appt_id = resp.json()["id"]

    response = await client.delete(f"/api/v1/appointments/{appt_id}", headers=headers)
    assert response.status_code == 204

    listing = await client.get("/api/v1/appointments?date=2026-08-25", headers=headers)
    assert listing.json() == []


@pytest.mark.anyio
async def test_list_appointments_by_date_range(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-24", "appointment_time": "10:00:00",
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-26", "appointment_time": "09:00:00",
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-30", "appointment_time": "09:00:00",
        },
        headers=headers,
    )

    response = await client.get(
        "/api/v1/appointments?start_date=2026-08-23&end_date=2026-08-29", headers=headers
    )
    assert response.status_code == 200
    dates = [a["appointment_date"] for a in response.json()]
    assert dates == ["2026-08-24", "2026-08-26"]


@pytest.mark.anyio
async def test_list_appointments_range_ordered_by_date_then_time(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-25", "appointment_time": "15:00:00",
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id), "service_id": str(s.id), "barber_id": str(b.id),
            "appointment_date": "2026-08-24", "appointment_time": "09:00:00",
        },
        headers=headers,
    )

    response = await client.get(
        "/api/v1/appointments?start_date=2026-08-23&end_date=2026-08-29", headers=headers
    )
    ordering = [(a["appointment_date"], a["appointment_time"]) for a in response.json()]
    assert ordering == [("2026-08-24", "09:00:00"), ("2026-08-25", "15:00:00")]


@pytest.mark.anyio
async def test_check_availability_returns_available_true_for_free_slot(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    response = await client.get(
        "/api/v1/appointments/check-availability",
        params={
            "barber_id": str(b.id),
            "date": "2026-08-25",
            "time": "10:00:00",
            "service_id": str(s.id),
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json() == {"available": True, "conflict_with": None}


@pytest.mark.anyio
async def test_check_availability_returns_conflict_window_when_busy(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "10:00:00",
        },
        headers=headers,
    )

    response = await client.get(
        "/api/v1/appointments/check-availability",
        params={
            "barber_id": str(b.id),
            "date": "2026-08-25",
            "time": "10:10:00",
            "service_id": str(s.id),
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json() == {"available": False, "conflict_with": "10:00 – 10:30"}


@pytest.mark.anyio
async def test_check_availability_requires_auth(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    response = await client.get(
        "/api/v1/appointments/check-availability",
        params={"barber_id": str(b.id), "date": "2026-08-25", "time": "10:00:00", "service_id": str(s.id)},
    )
    assert response.status_code in (401, 403)


@pytest.mark.anyio
async def test_check_availability_excludes_own_appointment_id(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "10:00:00",
        },
        headers=headers,
    )
    appt_id = resp.json()["id"]

    response = await client.get(
        "/api/v1/appointments/check-availability",
        params={
            "barber_id": str(b.id),
            "date": "2026-08-25",
            "time": "10:00:00",
            "service_id": str(s.id),
            "appointment_id": appt_id,
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json() == {"available": True, "conflict_with": None}


@pytest.mark.anyio
async def test_check_availability_with_malformed_time_returns_422(client, db_session):
    headers, c, s, b = await _setup(client, db_session)
    response = await client.get(
        "/api/v1/appointments/check-availability",
        params={"barber_id": str(b.id), "date": "2026-08-25", "time": "not-a-time", "service_id": str(s.id)},
        headers=headers,
    )
    assert response.status_code == 422
