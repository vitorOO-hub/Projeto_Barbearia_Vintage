import pytest

from app.core.security import hash_password
from app.models import User, Service, Barber


async def _auth_headers(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()
    resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_create_client(client, db_session):
    headers = await _auth_headers(client, db_session)
    response = await client.post("/api/v1/clients", json={"name": "João Silva", "email": "joao@x.com"}, headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "João Silva"
    assert body["active"] is True


@pytest.mark.anyio
async def test_create_client_requires_auth(client):
    response = await client.post("/api/v1/clients", json={"name": "João", "email": "joao@x.com"})
    assert response.status_code == 401


@pytest.mark.anyio
async def test_create_client_without_email_fails_validation(client, db_session):
    headers = await _auth_headers(client, db_session)
    response = await client.post("/api/v1/clients", json={"name": "João"}, headers=headers)
    assert response.status_code == 422


@pytest.mark.anyio
async def test_create_client_with_phone(client, db_session):
    headers = await _auth_headers(client, db_session)
    response = await client.post(
        "/api/v1/clients",
        json={"name": "João Silva", "email": "joao@x.com", "phone": "(11) 957645612"},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["phone"] == "(11) 957645612"


@pytest.mark.anyio
async def test_list_clients_excludes_inactive_by_default(client, db_session):
    headers = await _auth_headers(client, db_session)
    await client.post("/api/v1/clients", json={"name": "Ativo", "email": "ativo@x.com"}, headers=headers)
    resp2 = await client.post("/api/v1/clients", json={"name": "Sera Removido", "email": "removido@x.com"}, headers=headers)
    inactive_id = resp2.json()["id"]
    await client.put(f"/api/v1/clients/{inactive_id}", json={"active": False}, headers=headers)

    response = await client.get("/api/v1/clients", headers=headers)
    names = [c["name"] for c in response.json()]
    assert "Ativo" in names
    assert "Sera Removido" not in names


@pytest.mark.anyio
async def test_list_clients_include_inactive(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "Sera Removido", "email": "removido@x.com"}, headers=headers)
    inactive_id = resp.json()["id"]
    await client.put(f"/api/v1/clients/{inactive_id}", json={"active": False}, headers=headers)

    response = await client.get("/api/v1/clients?include_inactive=true", headers=headers)
    names = [c["name"] for c in response.json()]
    assert "Sera Removido" in names


@pytest.mark.anyio
async def test_search_clients_by_name(client, db_session):
    headers = await _auth_headers(client, db_session)
    await client.post("/api/v1/clients", json={"name": "João Silva", "email": "joao@x.com"}, headers=headers)
    await client.post("/api/v1/clients", json={"name": "Maria Souza", "email": "maria@x.com"}, headers=headers)

    response = await client.get("/api/v1/clients?search=jo", headers=headers)
    names = [c["name"] for c in response.json()]
    assert names == ["João Silva"]


@pytest.mark.anyio
async def test_update_client(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João", "email": "joao@x.com"}, headers=headers)
    client_id = resp.json()["id"]

    response = await client.put(f"/api/v1/clients/{client_id}", json={"notes": "Prefere corte curto"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["notes"] == "Prefere corte curto"


@pytest.mark.anyio
async def test_update_client_phone(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João", "email": "joao@x.com"}, headers=headers)
    client_id = resp.json()["id"]

    response = await client.put(
        f"/api/v1/clients/{client_id}", json={"phone": "(11) 957645612"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["phone"] == "(11) 957645612"


@pytest.mark.anyio
async def test_can_deactivate_a_client_via_update(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João", "email": "joao@x.com"}, headers=headers)
    client_id = resp.json()["id"]

    response = await client.put(f"/api/v1/clients/{client_id}", json={"active": False}, headers=headers)
    assert response.status_code == 200
    assert response.json()["active"] is False

    check = await client.get("/api/v1/clients?include_inactive=true", headers=headers)
    target = next(c for c in check.json() if c["id"] == client_id)
    assert target["active"] is False


@pytest.mark.anyio
async def test_delete_client_removes_it_permanently(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João", "email": "joao@x.com"}, headers=headers)
    client_id = resp.json()["id"]

    response = await client.delete(f"/api/v1/clients/{client_id}", headers=headers)
    assert response.status_code == 204

    check = await client.get("/api/v1/clients?include_inactive=true", headers=headers)
    ids = [c["id"] for c in check.json()]
    assert client_id not in ids


@pytest.mark.anyio
async def test_cannot_delete_client_with_appointments(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João", "email": "joao@x.com"}, headers=headers)
    client_id = resp.json()["id"]

    service = Service(name="Corte", duration_minutes=30, price=40)
    barber = Barber(name="Carlos Silva")
    db_session.add_all([service, barber])
    await db_session.commit()
    await db_session.refresh(service)
    await db_session.refresh(barber)

    await client.post(
        "/api/v1/appointments",
        json={
            "client_id": client_id,
            "service_id": str(service.id),
            "barber_id": str(barber.id),
            "appointment_date": "2026-08-25",
            "appointment_time": "14:00:00",
        },
        headers=headers,
    )

    response = await client.delete(f"/api/v1/clients/{client_id}", headers=headers)
    assert response.status_code == 409


@pytest.mark.anyio
async def test_can_reactivate_a_deactivated_client(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João", "email": "joao@x.com"}, headers=headers)
    client_id = resp.json()["id"]
    await client.put(f"/api/v1/clients/{client_id}", json={"active": False}, headers=headers)

    response = await client.put(f"/api/v1/clients/{client_id}", json={"active": True}, headers=headers)
    assert response.status_code == 200
    assert response.json()["active"] is True

    listing = await client.get("/api/v1/clients", headers=headers)
    names = [c["name"] for c in listing.json()]
    assert "João" in names


@pytest.mark.anyio
async def test_update_nonexistent_client_returns_404(client, db_session):
    headers = await _auth_headers(client, db_session)
    import uuid
    fake_id = uuid.uuid4()
    response = await client.put(f"/api/v1/clients/{fake_id}", json={"notes": "test"}, headers=headers)
    assert response.status_code == 404
    assert "Cliente não encontrado" in response.json()["detail"]


@pytest.mark.anyio
async def test_delete_nonexistent_client_returns_404(client, db_session):
    headers = await _auth_headers(client, db_session)
    import uuid
    fake_id = uuid.uuid4()
    response = await client.delete(f"/api/v1/clients/{fake_id}", headers=headers)
    assert response.status_code == 404
    assert "Cliente não encontrado" in response.json()["detail"]


@pytest.mark.anyio
async def test_update_client_preserves_unset_fields(client, db_session):
    headers = await _auth_headers(client, db_session)
    # Create client with name and email
    resp = await client.post(
        "/api/v1/clients",
        json={"name": "João Silva", "email": "joao@example.com"},
        headers=headers
    )
    client_id = resp.json()["id"]
    original_name = resp.json()["name"]
    original_email = resp.json()["email"]

    # Update only notes (partial update)
    response = await client.put(
        f"/api/v1/clients/{client_id}",
        json={"notes": "Prefere corte curto"},
        headers=headers
    )
    assert response.status_code == 200
    updated = response.json()
    # Verify the updated field
    assert updated["notes"] == "Prefere corte curto"
    # Verify unset fields were preserved
    assert updated["name"] == original_name
    assert updated["email"] == original_email
