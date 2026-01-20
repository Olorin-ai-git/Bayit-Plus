"""
Embedding Generator

Generates vector embeddings using OpenAI.
"""

import logging
from typing import Optional, List

from app.core.config import settings
from app.services.olorin.search.client import client_manager

logger = logging.getLogger(__name__)


async def generate_embedding(text: str) -> Optional[List[float]]:
    """
    Generate embedding vector for text.

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
        response = await openai_client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding

    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        return None
