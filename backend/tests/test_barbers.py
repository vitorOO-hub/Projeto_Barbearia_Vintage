import pytest

from app.core.security import hash_password
from app.models import User, Barber, Client, Service


async def _auth_headers(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()
    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.anyio
async def test_list_barbers_requires_auth(client):
    response = await client.get("/api/v1/barbers")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_list_barbers_returns_sorted_by_name(client, db_session):
    headers = await _auth_headers(client, db_session)
    db_session.add_all([Barber(name="Marcos Souza"), Barber(name="Carlos Silva")])
    await db_session.commit()

    response = await client.get("/api/v1/barbers", headers=headers)
    assert response.status_code == 200
    names = [b["name"] for b in response.json()]
    assert names == ["Carlos Silva", "Marcos Souza"]


@pytest.mark.anyio
async def test_create_update_and_delete_barber(client, db_session):
    headers = await _auth_headers(client, db_session)

    create = await client.post("/api/v1/barbers", json={"name": "Carlos Silva"}, headers=headers)
    assert create.status_code == 201
    barber_id = create.json()["id"]

    update = await client.put(f"/api/v1/barbers/{barber_id}", json={"name": "Carlos S. Silva"}, headers=headers)
    assert update.status_code == 200
    assert update.json()["name"] == "Carlos S. Silva"

    delete = await client.delete(f"/api/v1/barbers/{barber_id}", headers=headers)
    assert delete.status_code == 204

    listing = await client.get("/api/v1/barbers", headers=headers)
    assert listing.json() == []


@pytest.mark.anyio
async def test_cannot_delete_barber_with_appointments(client, db_session):
    headers = await _auth_headers(client, db_session)
    barber = Barber(name="Carlos Silva")
    c = Client(name="João Silva", email="joao@x.com")
    s = Service(name="Corte", duration_minutes=30, price=40)
    db_session.add_all([barber, c, s])
    await db_session.commit()
    await db_session.refresh(barber)
    await db_session.refresh(c)
    await db_session.refresh(s)

    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": str(s.id),
            "barber_id": str(barber.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )

    response = await client.delete(f"/api/v1/barbers/{barber.id}", headers=headers)
    assert response.status_code == 409
