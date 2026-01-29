"""
Global Error Handlers for FastAPI Application.

Comprehensive exception handling to ensure the server remains responsive
even when errors occur. All errors are logged, tracked in Sentry, and
return proper HTTP responses without crashing the server.
"""

import logging
import traceback
from typing import Union

from fastapi import Request, status
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from pymongo.errors import PyMongoError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


async def http_exception_handler(
    request: Request, exc: Union[HTTPException, StarletteHTTPException]
) -> JSONResponse:
    """
    Handle FastAPI HTTPException and Starlette HTTPException.

    Returns proper JSON response with status code and error details.
    """
    logger.warning(
        f"HTTP {exc.status_code}: {exc.detail}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path,
        },
    )


async def validation_exception_handler(
    request: Request, exc: Union[RequestValidationError, ValidationError]
) -> JSONResponse:
    """
    Handle Pydantic validation errors.

    Returns 422 Unprocessable Entity with detailed validation error information.
    """
    errors = []

    if isinstance(exc, RequestValidationError):
        for error in exc.errors():
            errors.append({
                "loc": error.get("loc", []),
                "msg": error.get("msg", ""),
                "type": error.get("type", ""),
            })
    else:
        # Pydantic ValidationError
        for error in exc.errors():
            errors.append({
                "loc": error.get("loc", []),
                "msg": error.get("msg", ""),
                "type": error.get("type", ""),
            })

    logger.warning(
        f"Validation error: {len(errors)} error(s)",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": errors,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": errors,
            "status_code": 422,
            "path": request.url.path,
        },
    )


async def database_exception_handler(request: Request, exc: PyMongoError) -> JSONResponse:
    """
    Handle MongoDB/PyMongo errors.

    Returns 503 Service Unavailable for database errors.
    Server remains responsive even if database operations fail.
    """
    error_message = str(exc)

    logger.error(
        f"Database error: {error_message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__,
        },
        exc_info=True,
    )

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database operation failed. Please try again later.",
            "error_type": "database_error",
            "status_code": 503,
            "path": request.url.path,
        },
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global catch-all exception handler.

    Handles any unhandled exceptions to prevent server crashes.
    All errors are logged with full stack traces and reported to Sentry.
    Returns 500 Internal Server Error with safe error information.
    """
    # Generate unique error ID for tracking
    import uuid
    error_id = str(uuid.uuid4())

    # Log full error with stack trace
    logger.error(
        f"Unhandled exception [ID: {error_id}]: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_id": error_id,
            "error_type": type(exc).__name__,
            "query_params": dict(request.query_params),
        },
        exc_info=True,
    )

    # Extract stack trace for debugging (only in development)
    from app.core.config import settings

    response_content = {
        "detail": "Internal server error. The request could not be processed.",
        "error_id": error_id,
        "error_type": type(exc).__name__,
        "status_code": 500,
        "path": request.url.path,
    }

    # Include stack trace only in development mode
    if settings.DEBUG:
        response_content["traceback"] = traceback.format_exc()
        response_content["error_message"] = str(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_content,
    )


async def rate_limit_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle rate limiting exceptions from slowapi.

    Returns 429 Too Many Requests with retry information.
    """
    # Extract limit info from exception if available
    limit_info = str(exc) if exc else "Rate limit exceeded"

    logger.warning(
        f"Rate limit exceeded: {limit_info}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "client": request.client.host if request.client else None,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "limit_info": limit_info,
            "status_code": 429,
            "path": request.url.path,
        },
        headers={
            "Retry-After": "60",  # Suggest retry after 60 seconds
            "X-RateLimit-Reset": "60",
        },
    )
