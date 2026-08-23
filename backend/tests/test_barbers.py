import pytest

from app.core.security import hash_password
from app.models import User, Barber


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
