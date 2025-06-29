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


@pytest.fixture(scope="session", autouse=True)
def mock_idps_authentication():
    """
    Global fixture to mock IDPS authentication.
    This will prevent AWS account mismatch errors in the CI pipeline.
    """
    # Create a mock for the machina_swagger_client.rest.ApiException
    try:
        with patch("machina_swagger_client.rest.ApiException", MockApiException):
            # Mock the REST client methods directly involved in the authentication error
            with patch("idps_client.rest_client.RestClient", MockRestClient):
                # Create mock for IdpsClient
                with patch(
                    "app.utils.idps_utils.IdpsClientFactory.get_instance"
                ) as mock_get_instance:
                    mock_get_instance.return_value = MockIdpsClient()
                    # Directly mock the method that's causing the issue
                    with patch(
                        "idps_client.rest_client.RestClient._get_temp_creds_with_presigned_url"
                    ) as mock_creds:
                        mock_creds.return_value = {
                            "AccessKeyId": "mock-access-key",
                            "SecretAccessKey": "mock-secret-key",
                            "SessionToken": "mock-session-token",
                            "Expiration": "2025-01-01T00:00:00Z",
                        }
                        yield
    except ImportError as e:
        # Log any import errors to help debug CI issues
        logger.warning(f"Import error during mocking: {e}")
        yield


# Add a test to verify our mocking is working
def test_idps_mocking():
    """Test to verify our mocking of AWS/IDPS authentication is working"""
    try:
        from app.utils.idps_utils import get_app_secret

        # This would fail with AWS account mismatch error if mocking wasn't working
        secret = get_app_secret("test/secret")
        assert secret is not None, "get_app_secret should return a mock value"
        return True
    except ImportError as e:
        # Skip test if we can't import the required modules
        logger.warning(f"Skipping test_idps_mocking due to import error: {e}")
        pytest.skip(f"Required module not available: {e}")
        return False


@pytest.fixture(autouse=True)
def mock_get_auth_token(monkeypatch):
    def fake_token():
        return ("test_user_id", "test_token", "test_realm")

    monkeypatch.setattr("app.utils.auth_utils.get_auth_token", fake_token)
    # Note: risk_assessment_router no longer imports get_auth_token directly
    # It's now handled in the service layer
