import pytest

from app.core.security import hash_password
from app.models import User


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
    response = await client.post("/api/v1/clients", json={"name": "João"})
    assert response.status_code == 401


@pytest.mark.anyio
async def test_list_clients_excludes_inactive_by_default(client, db_session):
    headers = await _auth_headers(client, db_session)
    await client.post("/api/v1/clients", json={"name": "Ativo"}, headers=headers)
    resp2 = await client.post("/api/v1/clients", json={"name": "Sera Removido"}, headers=headers)
    inactive_id = resp2.json()["id"]
    await client.delete(f"/api/v1/clients/{inactive_id}", headers=headers)

    response = await client.get("/api/v1/clients", headers=headers)
    names = [c["name"] for c in response.json()]
    assert "Ativo" in names
    assert "Sera Removido" not in names


@pytest.mark.anyio
async def test_list_clients_include_inactive(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "Sera Removido"}, headers=headers)
    inactive_id = resp.json()["id"]
    await client.delete(f"/api/v1/clients/{inactive_id}", headers=headers)

    response = await client.get("/api/v1/clients?include_inactive=true", headers=headers)
    names = [c["name"] for c in response.json()]
    assert "Sera Removido" in names


@pytest.mark.anyio
async def test_search_clients_by_name(client, db_session):
    headers = await _auth_headers(client, db_session)
    await client.post("/api/v1/clients", json={"name": "João Silva"}, headers=headers)
    await client.post("/api/v1/clients", json={"name": "Maria Souza"}, headers=headers)

    response = await client.get("/api/v1/clients?search=jo", headers=headers)
    names = [c["name"] for c in response.json()]
    assert names == ["João Silva"]


@pytest.mark.anyio
async def test_update_client(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João"}, headers=headers)
    client_id = resp.json()["id"]

    response = await client.put(f"/api/v1/clients/{client_id}", json={"notes": "Prefere corte curto"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["notes"] == "Prefere corte curto"


@pytest.mark.anyio
async def test_delete_client_is_soft_delete(client, db_session):
    headers = await _auth_headers(client, db_session)
    resp = await client.post("/api/v1/clients", json={"name": "João"}, headers=headers)
    client_id = resp.json()["id"]

    response = await client.delete(f"/api/v1/clients/{client_id}", headers=headers)
    assert response.status_code == 204

    check = await client.get("/api/v1/clients?include_inactive=true", headers=headers)
    target = next(c for c in check.json() if c["id"] == client_id)
    assert target["active"] is False
