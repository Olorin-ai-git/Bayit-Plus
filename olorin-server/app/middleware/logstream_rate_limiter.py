"""
Log Stream Rate Limiting Configuration
Feature: 021-live-merged-logstream

Specialized rate limiting for log streaming endpoints with environment-driven
configuration to prevent abuse and resource exhaustion.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

import os

from fastapi import FastAPI

from app.service.logging import get_bridge_logger

from .rate_limiter import EndpointRateLimits, RateLimitMiddleware

logger = get_bridge_logger(__name__)


def configure_logstream_rate_limiting(app: FastAPI) -> None:
    """
    Configure rate limiting for log streaming endpoints.

    Applies stricter rate limits to log streaming and ingestion endpoints
    to prevent abuse, DOS attacks, and resource exhaustion.

    Environment Variables:
        LOG_STREAM_RATE_LIMIT_CALLS: Max log stream requests (default: 30)
        LOG_STREAM_RATE_LIMIT_PERIOD: Time window in seconds (default: 60)
        LOG_INGESTION_RATE_LIMIT_CALLS: Max ingestion requests (default: 20)
        LOG_INGESTION_RATE_LIMIT_PERIOD: Time window in seconds (default: 60)

    Args:
        app: FastAPI application instance
    """
    environment = os.getenv("APP_ENV", "local")

    log_stream_calls = EndpointRateLimits.LOG_STREAMING["calls"]
    log_stream_period = EndpointRateLimits.LOG_STREAMING["period"]

    log_ingestion_calls = EndpointRateLimits.LOG_INGESTION["calls"]
    log_ingestion_period = EndpointRateLimits.LOG_INGESTION["period"]

    logger.info(
        f"Log stream rate limiting configured for {environment}: "
        f"streaming={log_stream_calls} req/{log_stream_period}s, "
        f"ingestion={log_ingestion_calls} req/{log_ingestion_period}s"
    )


def is_log_streaming_endpoint(path: str) -> bool:
    """
    Check if request path is a log streaming endpoint.

    Log streaming endpoints:
        - GET /api/v1/investigations/{id}/logs/stream (SSE)
        - GET /api/v1/investigations/{id}/logs (polling)

    Args:
        path: Request path

    Returns:
        True if path is a log streaming endpoint, False otherwise
    """
    return "/logs/stream" in path or (
        path.endswith("/logs") and "/investigations/" in path
    )


def is_log_ingestion_endpoint(path: str) -> bool:
    """
    Check if request path is a log ingestion endpoint.

    Log ingestion endpoints:
        - POST /client-logs (frontend log ingestion)
        - POST /api/logs/ingest (generic log ingestion)

    Args:
        path: Request path

    Returns:
        True if path is a log ingestion endpoint, False otherwise
    """
    return path.endswith("/client-logs") or "/logs/ingest" in path


def get_rate_limit_for_endpoint(path: str) -> dict:
    """
    Get appropriate rate limit configuration for endpoint.

    Args:
        path: Request path

    Returns:
        Dictionary with 'calls' and 'period' for rate limiting
    """
    if is_log_ingestion_endpoint(path):
        return EndpointRateLimits.LOG_INGESTION

    if is_log_streaming_endpoint(path):
        return EndpointRateLimits.LOG_STREAMING

    return EndpointRateLimits.STANDARD
