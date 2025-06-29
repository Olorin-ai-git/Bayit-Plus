import logging

try:
    from enum import StrEnum
except ImportError:
    # Fallback for Python < 3.11
    from enum import Enum

    class StrEnum(str, Enum):
        pass


from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


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


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AuthorizationError)
    async def handle_authorization_error(request: Request, error: AuthorizationError):
        logger.warning(f"Rejecting request: {str(error)}")
        return JSONResponse(
            content={"message": str(error)}, status_code=status.HTTP_401_UNAUTHORIZED
        )

    @app.exception_handler(AgentInvokeException)
    async def handle_agent_invoke_exception(request: Request, ex: AgentInvokeException):
        logger.warning(f"Rejecting request: {str(ex)}")
        return JSONResponse(
            content={"message": str(ex)},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @app.exception_handler(ClientException)
    async def handle_agent_invoke_exception(request: Request, ex: ClientException):
        logger.warning(f"Rejecting request: {str(ex)}")
        return JSONResponse(content={"message": str(ex)}, status_code=ex.status_code)
