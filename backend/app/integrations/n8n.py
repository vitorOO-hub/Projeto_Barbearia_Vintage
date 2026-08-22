import logging

logger = logging.getLogger(__name__)


async def notify_n8n(payload: dict) -> None:
    logger.info("notify_n8n stub called with %s", payload)
