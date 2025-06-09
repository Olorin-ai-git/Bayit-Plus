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
        """Return the secret value as a string"""
        return self.value


class MockRestClient:
    """
    Mock implementation of the RestClient to avoid AWS authentication issues
    """

    def __init__(self, *args, **kwargs):
        self.get_temporary_credentials = MagicMock()
        self.get_secret = MagicMock()
        self.get_secret.return_value = "mock-secret-value"
        self.is_e2e_secrecy_enabled = False
        self.machina_client = MagicMock()
        self.config = MagicMock()
        self.config.get_property = MagicMock(return_value=None)

    def _get_temp_creds_with_presigned_url(self, *args, **kwargs):
        """Mock implementation to avoid AWS authentication issues"""
        return {
            "AccessKeyId": "mock-key",
            "SecretAccessKey": "mock-secret",
            "SessionToken": "mock-token",
        }


class MockIdpsClient:
    """
    Mock implementation of the IDPS client to avoid AWS authentication issues
    """

    def __init__(self, *args, **kwargs):
        self.rest_config = MockRestClient()
        # Store any arguments passed so we can verify them later
        self.args = args
        self.kwargs = kwargs

    def get_secret(self, secret_name):
        """
        Mock implementation of get_secret that returns a MockSecret object
        This mimics the behavior of the real IDPS client
        """
        return MockSecret(f"mock-value-for-{secret_name}")



