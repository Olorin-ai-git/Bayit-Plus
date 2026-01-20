"""
Pinecone Operations with Resilience

Provides resilient wrappers for Pinecone operations with circuit breaker and retry.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.core.retry import async_retry
from app.services.olorin.resilience import PINECONE_BREAKER, circuit_breaker

logger = logging.getLogger(__name__)

# Import Pinecone exceptions if available for specific error handling
try:
    from pinecone.exceptions import PineconeApiException, PineconeException

    PINECONE_SDK_EXCEPTIONS = (PineconeException, PineconeApiException)
except ImportError:
    # Fallback for older SDK versions or if import fails
    PINECONE_SDK_EXCEPTIONS = ()

# Only retry on transient/network errors, not on validation or auth errors
# ConnectionError: Network connectivity issues
# TimeoutError: Request timeouts
# OSError: Low-level network errors (socket errors, etc.)
# PineconeException: SDK-level errors (may include rate limits, server errors)
PINECONE_RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    OSError,
    *PINECONE_SDK_EXCEPTIONS,
)


@circuit_breaker(PINECONE_BREAKER)
@async_retry(retryable_exceptions=PINECONE_RETRYABLE_EXCEPTIONS, max_attempts=3)
async def pinecone_upsert(index, vectors: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Upsert vectors to Pinecone with resilience.

    Args:
        index: Pinecone index instance
        vectors: List of vectors to upsert

    Returns:
        Upsert response from Pinecone

    Raises:
        Exception if all retries fail or circuit is open
    """
    if not index:
        raise ValueError("Pinecone index not initialized")

    # Run blocking operation in thread pool
    result = await asyncio.to_thread(index.upsert, vectors=vectors)
    return result


@circuit_breaker(PINECONE_BREAKER)
@async_retry(retryable_exceptions=PINECONE_RETRYABLE_EXCEPTIONS, max_attempts=3)
async def pinecone_query(
    index,
    vector: List[float],
    top_k: int = 10,
    filter_dict: Optional[Dict[str, Any]] = None,
    include_metadata: bool = True,
) -> Any:
    """
    Query Pinecone with resilience.

    Args:
        index: Pinecone index instance
        vector: Query vector
        top_k: Number of results to return
        filter_dict: Optional metadata filter
        include_metadata: Include metadata in results

    Returns:
        Query results from Pinecone

    Raises:
        Exception if all retries fail or circuit is open
    """
    if not index:
        raise ValueError("Pinecone index not initialized")

    # Run blocking operation in thread pool
    result = await asyncio.to_thread(
        index.query,
        vector=vector,
        top_k=top_k,
        filter=filter_dict,
        include_metadata=include_metadata,
    )
    return result


async def safe_pinecone_upsert(
    index, vectors: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Safely upsert to Pinecone, returning None on failure.

    Use this when you want graceful degradation instead of exceptions.
    """
    try:
        return await pinecone_upsert(index, vectors)
    except Exception as e:
        logger.error(f"Pinecone upsert failed: {e}")
        return None


async def safe_pinecone_query(
    index,
    vector: List[float],
    top_k: int = 10,
    filter_dict: Optional[Dict[str, Any]] = None,
    include_metadata: bool = True,
) -> Optional[Any]:
    """
    Safely query Pinecone, returning None on failure.

    Use this when you want graceful degradation instead of exceptions.
    """
    try:
        return await pinecone_query(
            index,
            vector=vector,
            top_k=top_k,
            filter_dict=filter_dict,
            include_metadata=include_metadata,
        )
    except Exception as e:
        logger.error(f"Pinecone query failed: {e}")
        return None
