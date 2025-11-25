"""
Investigation ID Middleware
Feature: 021-live-merged-logstream

Middleware for extracting and correlating investigation IDs across requests.
Enables log aggregation and filtering by investigation context.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

import uuid
from typing import Callable, Optional

from fastapi import Request, Response

from app.service.logging import get_bridge_logger
from app.service.logging_helper import logging_context

logger = get_bridge_logger(__name__)


async def inject_investigation_id(request: Request, call_next: Callable) -> Response:
    """
    Middleware that injects X-Investigation-Id into request and response.

    Extracts investigation ID from:
    1. X-Investigation-Id header (highest priority)
    2. investigation_id query parameter
    3. Generates new UUID if not provided

    The investigation ID is used for:
    - Correlating logs across frontend and backend
    - Filtering log streams by investigation context
    - Request tracing and debugging

    Args:
        request: FastAPI request object
        call_next: Next middleware or route handler

    Returns:
        Response with X-Investigation-Id header attached
    """
    investigation_id: Optional[str] = None

    investigation_id = request.headers.get("X-Investigation-Id")

    if not investigation_id:
        investigation_id = request.query_params.get("investigation_id")

    if not investigation_id:
        investigation_id = str(uuid.uuid4())
        logger.debug(f"Generated new investigation ID: {investigation_id}")

    request.state.investigation_id = investigation_id

    with logging_context(investigation_id=investigation_id):
        response: Response = await call_next(request)
        response.headers["X-Investigation-Id"] = investigation_id
        return response


def get_investigation_id_from_request(request: Request) -> Optional[str]:
    """
    Extract investigation ID from request state.

    Utility function for route handlers to access the investigation ID
    that was set by the middleware.

    Args:
        request: FastAPI request object

    Returns:
        Investigation ID string or None if not set
    """
    return getattr(request.state, "investigation_id", None)
