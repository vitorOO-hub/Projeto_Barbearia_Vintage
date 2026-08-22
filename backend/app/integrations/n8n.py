import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=5)


async def notify_n8n(payload: dict) -> None:
    async with _build_client() as client:
        try:
            await client.post(
                settings.N8N_WEBHOOK_URL,
                json=payload,
                headers={"X-Webhook-Secret": settings.N8N_SHARED_SECRET},
            )
        except httpx.HTTPError:
            logger.warning("Falha ao notificar n8n", exc_info=True)
