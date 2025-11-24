import logging
from app.service.logging import get_bridge_logger

try:
    from enum import StrEnum
except ImportError:
    # Fallback for Python < 3.11
    from enum import Enum

    class StrEnum(str, Enum):
        pass


from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Optional, Dict, Any

logger = get_bridge_logger(__name__)


class ErrorCode(StrEnum):
    # The code MUST be machine-readable snake-case string.
    # Code MUST not be opaque (e.g. fact-1064).
    # see https://devportal.olorin.com/app/dp/capability/1467/capabilityDocs/main/docs/REST/guidelines.md
    BAD_REQUEST = "bad_request"
    REQUEST_VALIDATION_ERROR = "request_validation_error"


class AuthorizationError(Exception):
    pass


class FinancialApiError(Exception):
    pass


class UPIServiceException(Exception):
    pass


class ClientException(HTTPException):
    pass


class AgentInvokeException(Exception):
    pass


def _format_error_response(
    error_code: str,
    message: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Format error response according to API contract.
    
    Returns consistent error structure:
    {
        "error": "error_code",
        "message": "Human-readable message",
        "details": {...}  # Optional
    }
    """
    response = {
        "error": error_code,
        "message": message
    }
    if details:
        response["details"] = details
    return response


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException):
        """
        Handle HTTPException with consistent error response formatting.
        
        Formats all HTTPException responses according to API contract.
        """
        # Map status codes to error codes
        status_to_error_code = {
            400: ErrorCode.BAD_REQUEST,
            401: "unauthorized",
            403: "forbidden",
            404: "not_found",
            409: "conflict",
            422: ErrorCode.REQUEST_VALIDATION_ERROR,
            500: "internal_server_error",
            503: "service_unavailable"
        }
        
        error_code = status_to_error_code.get(exc.status_code, "error")
        
        # Extract details if available (for validation errors)
        details = None
        if isinstance(exc.detail, dict):
            details = exc.detail
        elif isinstance(exc.detail, list):
            # FastAPI validation errors come as a list
            details = {"validation_errors": exc.detail}
        
        logger.warning(
            f"HTTP Exception: {exc.status_code} - {exc.detail}",
            extra={
                "path": str(request.url.path),
                "method": request.method,
                "status_code": exc.status_code,
                "error_code": error_code
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=_format_error_response(
                error_code=error_code,
                message=str(exc.detail) if not isinstance(exc.detail, (dict, list)) else "Validation error",
                status_code=exc.status_code,
                details=details
            )
        )
    
    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        """
        Handle Pydantic validation errors with consistent formatting.
        """
        errors = exc.errors()
        details = {
            "validation_errors": [
                {
                    "field": ".".join(str(loc) for loc in err.get("loc", [])),
                    "message": err.get("msg"),
                    "type": err.get("type")
                }
                for err in errors
            ]
        }
        
        logger.warning(
            f"Request validation error: {errors}",
            extra={
                "path": str(request.url.path),
                "method": request.method,
                "validation_errors": errors
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_format_error_response(
                error_code=ErrorCode.REQUEST_VALIDATION_ERROR,
                message="Request validation failed",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                details=details
            )
        )
    
    @app.exception_handler(AuthorizationError)
    async def handle_authorization_error(request: Request, error: AuthorizationError):
        logger.warning(f"Rejecting request: {str(error)}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=_format_error_response(
                error_code="unauthorized",
                message=str(error),
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        )

    @app.exception_handler(AgentInvokeException)
    async def handle_agent_invoke_exception(request: Request, ex: AgentInvokeException):
        logger.warning(f"Rejecting request: {str(ex)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_format_error_response(
                error_code="agent_invoke_error",
                message=str(ex),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )

    @app.exception_handler(ClientException)
    async def handle_client_exception(request: Request, ex: ClientException):
        logger.warning(f"Rejecting request: {str(ex)}")
        return JSONResponse(
            status_code=ex.status_code,
            content=_format_error_response(
                error_code="client_error",
                message=str(ex.detail) if hasattr(ex, 'detail') else str(ex),
                status_code=ex.status_code
            )
        )
