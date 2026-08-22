import httpx
import pytest

from app.integrations.n8n import notify_n8n


@pytest.mark.anyio
async def test_notify_n8n_posts_payload_with_secret_header(monkeypatch):
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"ok": True})

    monkeypatch.setattr(
        "app.integrations.n8n._build_client",
        lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler), timeout=5),
    )

    await notify_n8n({"client_name": "João", "appointment_date": "2026-08-25"})

    assert len(calls) == 1
    assert calls[0].headers["x-webhook-secret"] != ""


@pytest.mark.anyio
async def test_notify_n8n_never_raises_on_http_error(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timeout", request=request)

    monkeypatch.setattr(
        "app.integrations.n8n._build_client",
        lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler), timeout=5),
    )

    # Must not raise -- a failed webhook can never break the caller.
    await notify_n8n({"client_name": "João"})
