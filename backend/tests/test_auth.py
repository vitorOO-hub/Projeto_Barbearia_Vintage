import pytest

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models import User


def test_hash_password_is_not_plaintext():
    hashed = hash_password("minhasenha123")
    assert hashed != "minhasenha123"
    assert verify_password("minhasenha123", hashed) is True
    assert verify_password("senhaerrada", hashed) is False


def test_create_and_decode_access_token():
    token = create_access_token(subject="user-id-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-id-123"


def test_decode_invalid_token_raises():
    with pytest.raises(ValueError):
        decode_access_token("token.invalido.aqui")


@pytest.mark.anyio
async def test_login_success_returns_token(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()

    response = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.anyio
async def test_login_wrong_password_returns_generic_401(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()

    response = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "errada"})
    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."


@pytest.mark.anyio
async def test_login_unknown_email_returns_same_generic_401(client):
    response = await client.post("/api/v1/auth/login", json={"email": "ninguem@x.com", "password": "qualquer"})
    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."


@pytest.mark.anyio
async def test_me_requires_token(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_me_returns_current_user_with_valid_token(client, db_session):
    user = User(name="Marcelo", email="marcelo@barbearia.com", password_hash=hash_password("senha123"))
    db_session.add(user)
    await db_session.commit()

    login_resp = await client.post("/api/v1/auth/login", json={"email": "marcelo@barbearia.com", "password": "senha123"})
    token = login_resp.json()["access_token"]

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "marcelo@barbearia.com"
