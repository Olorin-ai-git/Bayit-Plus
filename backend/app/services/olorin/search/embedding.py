"""
Embedding Generator

Generates vector embeddings using OpenAI with resilience patterns.
"""

import logging
from typing import List, Optional

import httpx
from app.core.config import settings
from app.core.retry import async_retry
from app.services.olorin.resilience import OPENAI_BREAKER, circuit_breaker
from app.services.olorin.search.client import client_manager
from openai import APIConnectionError, APIStatusError, RateLimitError

logger = logging.getLogger(__name__)

# Retryable OpenAI exceptions
OPENAI_RETRYABLE_EXCEPTIONS = (
    APIConnectionError,
    RateLimitError,
    httpx.TimeoutException,
    httpx.ConnectError,
)


@circuit_breaker(OPENAI_BREAKER)
@async_retry(retryable_exceptions=OPENAI_RETRYABLE_EXCEPTIONS)
async def _generate_embedding_with_resilience(text: str, openai_client) -> List[float]:
    """
    Internal function with resilience decorators.

    Raises exceptions instead of returning None for proper circuit breaker operation.
    """
    response = await openai_client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


async def generate_embedding(text: str) -> Optional[List[float]]:
    """
    Generate embedding vector for text with circuit breaker and retry protection.

    Args:
        text: Text to embed

    Returns:
        Embedding vector or None if failed
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    openai_client = client_manager.openai_client
    if not openai_client:
        logger.error("OpenAI client not available")
        return None

    try:
        return await _generate_embedding_with_resilience(text, openai_client)

    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        return None
