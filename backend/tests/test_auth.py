import pytest

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token


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
