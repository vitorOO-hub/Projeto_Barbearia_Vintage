import pytest

from app.core.security import hash_password
from app.models import User


async def _login(client, email: str, password: str) -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.anyio
async def test_non_admin_cannot_access_users(client, db_session):
    user = User(name="Barbeiro", email="barbeiro@x.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()
    headers = await _login(client, "barbeiro@x.com", "senha123")

    response = await client.get("/api/v1/users", headers=headers)
    assert response.status_code == 403


@pytest.mark.anyio
async def test_admin_can_list_and_create_users(client, db_session):
    admin = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"), is_admin=True)
    db_session.add(admin)
    await db_session.commit()
    headers = await _login(client, "marcelo@barbearia.com", "senha123")

    create = await client.post(
        "/api/v1/users",
        json={"name": "Novo Admin", "email": "novo@x.com", "password": "senha123", "is_admin": True},
        headers=headers,
    )
    assert create.status_code == 201
    assert create.json()["is_admin"] is True

    listing = await client.get("/api/v1/users", headers=headers)
    assert listing.status_code == 200
    assert {u["email"] for u in listing.json()} == {"marcelo@barbearia.com", "novo@x.com"}


@pytest.mark.anyio
async def test_admin_can_update_and_delete_other_user(client, db_session):
    admin = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"), is_admin=True)
    other = User(name="Barbeiro", email="barbeiro@x.com", password_hash=hash_password("senha123"))
    db_session.add_all([admin, other])
    await db_session.commit()
    await db_session.refresh(other)
    headers = await _login(client, "marcelo@barbearia.com", "senha123")

    update = await client.put(f"/api/v1/users/{other.id}", json={"is_admin": True}, headers=headers)
    assert update.status_code == 200
    assert update.json()["is_admin"] is True

    delete = await client.delete(f"/api/v1/users/{other.id}", headers=headers)
    assert delete.status_code == 204

    listing = await client.get("/api/v1/users", headers=headers)
    assert {u["email"] for u in listing.json()} == {"marcelo@barbearia.com"}


@pytest.mark.anyio
async def test_admin_cannot_delete_own_account(client, db_session):
    admin = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"), is_admin=True)
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    headers = await _login(client, "marcelo@barbearia.com", "senha123")

    response = await client.delete(f"/api/v1/users/{admin.id}", headers=headers)
    assert response.status_code == 400
