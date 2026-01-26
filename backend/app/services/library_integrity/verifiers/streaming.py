"""
Streaming URL Verification

Tests streaming URL with Range request to validate functionality.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)


async def verify_streaming_url(stream_url: str) -> Dict[str, Any]:
    """
    Test streaming URL with Range request.

    Requests first 1MB to validate streaming works.

    Args:
        stream_url: URL to test

    Returns:
        Dict with success, response_time, error
    """
    try:
        start_time = datetime.now(timezone.utc)

        async with httpx.AsyncClient() as client:
            # Request first 1MB with Range header
            headers = {"Range": "bytes=0-1048575"}
            response = await client.get(stream_url, headers=headers, timeout=10)

            end_time = datetime.now(timezone.utc)
            response_time = (end_time - start_time).total_seconds()

            if response.status_code in (200, 206):  # 206 = Partial Content
                return {"success": True, "response_time": response_time}
            else:
                return {
                    "success": False,
                    "error": f"Unexpected status: {response.status_code}",
                    "response_time": response_time,
                }

    except Exception as e:
        return {"success": False, "error": str(e)}
