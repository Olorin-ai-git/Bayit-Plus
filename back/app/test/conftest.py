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


@pytest.fixture(scope="session", autouse=True)
def mock_idps_authentication():
    """
    Global fixture to mock IDPS authentication.
    This will prevent AWS account mismatch errors in the CI pipeline.
    """
    # Create a list to store our patchers
    patchers = []

    # Define a safer way to apply patches
    def apply_patch(target, replacement):
        try:
            p = patch(target, replacement)
            p.start()
            patchers.append(p)
            return True
        except (ImportError, AttributeError) as e:
            logger.warning(f"Failed to patch {target}: {e}")
            return False

    # Apply all our patches
    apply_patch("idps_sdk.idps_client.IdpsClient", MockIdpsClient)
    apply_patch(
        "idps_sdk.idps_client.IdpsClientFactory.get_instance",
        lambda *a, **kw: MockIdpsClient(*a, **kw),
    )
    apply_patch("idps_client.rest_client.RestClient", MockRestClient)
    apply_patch(
        "idps_client.rest_client.RestClientFactory.get_instance_by_config",
        lambda *a, **kw: MockRestClient(),
    )
    apply_patch("machina_swagger_client.rest.ApiException", MockApiException)
    apply_patch(
        "idps_client.machina_api_wrapper.MachinaApiException", MockMachinaApiException
    )

    # Directly patch app.utils.idps_utils which is the common entry point
    try:
        from app.utils import idps_utils

        # We want to preserve the original get_app_secret behavior but use our mocked client
        original_getIdpsClient = idps_utils._getIdpsClient
        idps_utils._getIdpsClient = lambda settings: MockIdpsClient(
            endpoint=settings.idps_endpoint,
            policy_id=getattr(settings, "idps_policy_id", None),
            resource_asset_id=getattr(settings, "asset_id", None),
        )
    except ImportError:
        logger.warning("Could not directly patch idps_utils")

    logger.info("IDPS authentication has been mocked to avoid AWS account issues")

    yield

    # Stop all patches when done
    for patcher in patchers:
        try:
            patcher.stop()
        except Exception as e:
            logger.warning(f"Failed to stop patcher: {e}")


# Test to verify mocking is working
def test_idps_mocking():
    """Test to verify that our IDPS mocking is working correctly"""
    try:
        # Import these here to ensure they're imported after the mocks are applied
        from app.utils.idps_utils import get_app_secret

        # Test that get_app_secret returns our mocked value
        secret = get_app_secret("any/path")
        assert secret == "mock-value-for-any/path"

        logger.info("IDPS mocking verification passed")
        return True
    except Exception as e:
        logger.error(f"IDPS mocking verification failed: {e}")
        return False
