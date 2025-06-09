"""
Root level conftest.py that implements mocking for AWS authentication errors in tests
"""

import logging
from unittest.mock import MagicMock, patch

import pytest

# Create a logger
logger = logging.getLogger(__name__)


class MockApiException(Exception):
    """Mock for machina_swagger_client.rest.ApiException"""

    def __init__(self, http_resp=None):
        self.status = 401
        self.body = '{"error":"AccountMismatch","message":"Mocked for testing"}'
        super().__init__(self.body)


class MockMachinaApiException(Exception):
    """Mock for idps_client.machina_api_wrapper.MachinaApiException"""

    def __init__(self):
        self.status = 401
        self.body = '{"error":"AccountMismatch","message":"Mocked for testing"}'
        super().__init__(self.body)


class MockSecret:
    """Mock secret object returned by get_secret"""

    def __init__(self, value="mock-secret-value"):
        self.value = value

    def get_string_value(self):
        """Return the mock secret value as a string"""
        return self.value


class MockRestClient:
    """
    Mock implementation of the RestClient to avoid AWS authentication issues
    """

    def __init__(self, *args, **kwargs):
        self.get_temporary_credentials = MagicMock()
        self.get_secret = MagicMock(return_value=MockSecret())
        self.is_e2e_secrecy_enabled = False
        self.machina_client = MagicMock()
        self.config = MagicMock()

    def _get_temp_creds_with_presigned_url(
        self, policy_id, get_caller_id_url, expiry_requested
    ):
        # Mock method that would otherwise cause AWS account mismatch errors
        mock_creds = {
            "AccessKeyId": "mock-access-key",
            "SecretAccessKey": "mock-secret-key",
            "SessionToken": "mock-session-token",
            "Expiration": "2025-01-01T00:00:00Z",
        }
        return mock_creds


class MockIdpsClient:
    """
    Mock implementation of the IDPS client to avoid AWS authentication issues
    """

    def __init__(self, *args, **kwargs):
        self.get_secret = MagicMock(return_value=MockSecret())

    def get_stringified_app_secret(self, secret_id):
        """Return a mock secret value"""
        return "mock-secret-value"





@pytest.fixture(autouse=True)
def mock_get_auth_token(monkeypatch):
    def fake_token():
        return ("test_user_id", "test_token", "test_realm")

    monkeypatch.setattr("app.utils.auth_utils.get_auth_token", fake_token)
    # Note: risk_assessment_router no longer imports get_auth_token directly
    # It's now handled in the service layer
