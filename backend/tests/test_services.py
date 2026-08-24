import pytest

from app.core.security import hash_password
from app.models import User, Client, Barber


async def _auth_headers(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()
    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.anyio
async def test_create_service(client, db_session):
    headers = await _auth_headers(client, db_session)
    response = await client.post(
        "/api/v1/services", json={"name": "Corte", "duration_minutes": 30, "price": 40}, headers=headers
    )
    assert response.status_code == 201
    assert response.json()["active"] is True


@pytest.mark.anyio
async def test_list_services_only_active_by_default(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/services", json={"name": "Barba"}, headers=headers)
    service_id = resp.json()["id"]
    await client.put(f"/api/v1/services/{service_id}", json={"active": False}, headers=headers)

    response = await client.get("/api/v1/services", headers=headers)
    names = [s["name"] for s in response.json()]
    assert "Barba" not in names


@pytest.mark.anyio
async def test_update_service_price(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/services", json={"name": "Corte"}, headers=headers)
    service_id = resp.json()["id"]

    response = await client.put(f"/api/v1/services/{service_id}", json={"price": 45.5}, headers=headers)
    assert response.status_code == 200
    assert float(response.json()["price"]) == 45.5


@pytest.mark.anyio
async def test_delete_service_removes_it_permanently(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/services", json={"name": "Corte"}, headers=headers)
    service_id = resp.json()["id"]

    response = await client.delete(f"/api/v1/services/{service_id}", headers=headers)
    assert response.status_code == 204

    check = await client.get("/api/v1/services?include_inactive=true", headers=headers)
    ids = [s["id"] for s in check.json()]
    assert service_id not in ids


@pytest.mark.anyio
async def test_cannot_delete_service_with_appointments(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/services", json={"name": "Corte", "duration_minutes": 30, "price": 40}, headers=headers)
    service_id = resp.json()["id"]

    c = Client(name="João Silva", email="joao@x.com")
    b = Barber(name="Carlos Silva")
    db_session.add_all([c, b])
    await db_session.commit()
    await db_session.refresh(c)
    await db_session.refresh(b)

    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": str(c.id),
            "service_id": service_id,
            "barber_id": str(b.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )

    response = await client.delete(f"/api/v1/services/{service_id}", headers=headers)
    assert response.status_code == 409


@pytest.mark.anyio
async def test_delete_nonexistent_service_returns_404(client, db_session):
    import uuid
    headers = await _auth_headers(client, db_session)
    fake_id = uuid.uuid4()
    response = await client.delete(f"/api/v1/services/{fake_id}", headers=headers)
    assert response.status_code == 404
