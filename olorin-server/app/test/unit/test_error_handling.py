import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from app.service import error_handling


def test_error_code_enum():
    # Enum values
    assert error_handling.ErrorCode.BAD_REQUEST == "bad_request"
    assert (
        error_handling.ErrorCode.REQUEST_VALIDATION_ERROR == "request_validation_error"
    )


def test_custom_exceptions():
    # All custom exceptions can be raised and caught
    for exc in [
        error_handling.AuthorizationError,
        error_handling.FinancialApiError,
        error_handling.UPIServiceException,
        error_handling.AgentInvokeException,
    ]:
        with pytest.raises(exc):
            raise exc("fail")
    # ClientException requires a valid status_code
    with pytest.raises(error_handling.ClientException):
        raise error_handling.ClientException(status_code=400, detail="fail client")


def test_register_error_handlers():
    app = FastAPI()
    error_handling.register_error_handlers(app)

    @app.get("/auth")
    async def auth():
        raise error_handling.AuthorizationError("no auth")

    @app.get("/agent")
    async def agent():
        raise error_handling.AgentInvokeException("fail agent")

    @app.get("/client")
    async def client():
        raise error_handling.ClientException(status_code=418, detail="fail client")

    client = TestClient(app)
    r = client.get("/auth")
    assert r.status_code == status.HTTP_401_UNAUTHORIZED
    assert r.json()["message"] == "no auth"
    r = client.get("/agent")
    assert r.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert r.json()["message"] == "fail agent"
    r = client.get("/client")
    assert r.status_code == 418
    assert r.json()["message"] == "418: fail client"
