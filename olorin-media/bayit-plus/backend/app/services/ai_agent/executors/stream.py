"""
Stream Executors

Functions for validating streaming URLs.
"""

import logging
from typing import Any, Dict

from app.services.stream_validator import validate_stream_url

logger = logging.getLogger(__name__)


async def execute_check_stream_url(
    url: str, stream_type: str = "hls"
) -> Dict[str, Any]:
    """Validate a streaming URL."""
    try:
        result = await validate_stream_url(url, stream_type)

        return {
            "success": True,
            "validation": {
                "url": url,
                "is_valid": result.is_valid,
                "status_code": result.status_code,
                "response_time_ms": result.response_time_ms,
                "error_message": result.error_message,
            },
        }
    except Exception as e:
        logger.error(f"Error in check_stream_url: {str(e)}")
        return {"success": False, "error": str(e)}
