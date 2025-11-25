"""
Root level conftest.py that implements mocking for Firebase authentication and secrets in tests
"""

import logging
import os
from typing import Optional
from unittest.mock import MagicMock, patch

import pytest

# Create a logger
logger = logging.getLogger(__name__)


class MockFirebaseSecretClient:
    """Mock Firebase Secrets Manager client for testing"""

    def __init__(self, *args, **kwargs):
        self.secrets = {
            # Default mock secrets for testing
            "APP_SECRET": "mock-app-secret-value",
            "SPLUNK_USERNAME": "mock-splunk-user",
            "SPLUNK_PASSWORD": "mock-splunk-password",
            "SUMO_LOGIC_ACCESS_ID": "mock-sumo-access-id",
            "SUMO_LOGIC_ACCESS_KEY": "mock-sumo-access-key",
            "SNOWFLAKE_ACCOUNT": "mock-snowflake-account",
            "SNOWFLAKE_USER": "mock-snowflake-user",
            "SNOWFLAKE_PASSWORD": "mock-snowflake-password",
            "SNOWFLAKE_PRIVATE_KEY": "mock-snowflake-private-key",
            "LANGFUSE_PUBLIC_KEY": "mock-langfuse-public-key",
            "LANGFUSE_SECRET_KEY": "mock-langfuse-secret-key",
            "TEST_USER_PWD": "mock-test-user-password",
            "TEST_SECRET": "mock-test-secret",  # For basic testing
        }

    def access_secret_version(self, request):
        """Mock accessing a secret version from Firebase Secret Manager"""
        name = request.get("name", "")

        # Extract secret name from the resource name
        # projects/{project}/secrets/{secret}/versions/latest
        parts = name.split("/")
        if len(parts) >= 4:
            secret_name = parts[3]

            if secret_name in self.secrets:
                # Create mock response
                mock_response = MagicMock()
                mock_payload = MagicMock()
                mock_payload.data.decode.return_value = self.secrets[secret_name]
                mock_response.payload = mock_payload
                return mock_response

        # Raise exception for unknown secrets
        from google.api_core.exceptions import NotFound

        raise NotFound(f"Secret not found: {name}")


class MockFirebaseApp:
    """Mock Firebase App for testing"""

    def __init__(self, *args, **kwargs):
        self.project_id = "mock-project-id"
        self.options = kwargs


def mock_get_firebase_secret(secret_name: str) -> Optional[str]:
    """Mock implementation of get_firebase_secret for testing"""
    # Check if environment override exists first
    env_var_name = secret_name
    env_value = os.getenv(env_var_name)
    if env_value:
        return env_value

    # Return mock values for known secrets
    mock_secrets = {
        "APP_SECRET": "mock-app-secret-value",
        "SPLUNK_USERNAME": "mock-splunk-user",
        "SPLUNK_PASSWORD": "mock-splunk-password",
        "SUMO_LOGIC_ACCESS_ID": "mock-sumo-access-id",
        "SUMO_LOGIC_ACCESS_KEY": "mock-sumo-access-key",
        "SNOWFLAKE_ACCOUNT": "mock-snowflake-account",
        "SNOWFLAKE_USER": "mock-snowflake-user",
        "SNOWFLAKE_PASSWORD": "mock-snowflake-password",
        "SNOWFLAKE_PRIVATE_KEY": "mock-snowflake-private-key",
        "LANGFUSE_PUBLIC_KEY": "mock-langfuse-public-key",
        "LANGFUSE_SECRET_KEY": "mock-langfuse-secret-key",
        "TEST_USER_PWD": "mock-test-user-password",
        "TEST_SECRET": "mock-test-secret",
    }

    return mock_secrets.get(secret_name, f"mock-{secret_name}")


def mock_get_app_secret(secret_name: str) -> Optional[str]:
    """Legacy compatibility mock for get_app_secret"""
    return mock_get_firebase_secret(secret_name)


@pytest.fixture(scope="session", autouse=True)
def mock_firebase_authentication():
    """
    Global fixture to mock Firebase authentication and secrets.
    This replaces IDPS mocking and prevents Firebase authentication issues in tests.
    """
    patches = []

    try:
        # Mock Firebase Admin SDK initialization
        firebase_admin_patch = patch("firebase_admin.initialize_app")
        firebase_admin_patch.start()
        patches.append(firebase_admin_patch)

        # Mock Firebase App
        firebase_app_patch = patch("firebase_admin._apps", [MockFirebaseApp()])
        firebase_app_patch.start()
        patches.append(firebase_app_patch)

        # Mock Google Cloud Secret Manager client
        secret_manager_patch = patch(
            "google.cloud.secretmanager.SecretManagerServiceClient"
        )
        mock_client = secret_manager_patch.start()
        mock_client.return_value = MockFirebaseSecretClient()
        patches.append(secret_manager_patch)

        # Mock our Firebase secrets utility functions directly
        firebase_secret_patch = patch(
            "app.utils.firebase_secrets.get_firebase_secret",
            side_effect=mock_get_firebase_secret,
        )
        firebase_secret_patch.start()
        patches.append(firebase_secret_patch)

        app_secret_patch = patch(
            "app.utils.firebase_secrets.get_app_secret", side_effect=mock_get_app_secret
        )
        app_secret_patch.start()
        patches.append(app_secret_patch)

        # Set mock environment variables for Firebase
        os.environ["FIREBASE_PROJECT_ID"] = "mock-project-id"
        os.environ["FIREBASE_PRIVATE_KEY"] = "mock-private-key"
        os.environ["FIREBASE_CLIENT_EMAIL"] = "mock@serviceaccount.com"

        logger.info("Firebase authentication and secrets have been mocked for testing")

        yield

    except ImportError as e:
        logger.warning(f"Import error during Firebase mocking: {e}")
        yield
    finally:
        # Clean up patches
        for patch_obj in patches:
            try:
                patch_obj.stop()
            except RuntimeError:
                # Patch was already stopped
                pass


@pytest.fixture
def mock_firebase_secrets():
    """
    Fixture that provides a way to customize mock secrets for individual tests
    """
    mock_client = MockFirebaseSecretClient()

    with patch("google.cloud.secretmanager.SecretManagerServiceClient") as mock_sm:
        mock_sm.return_value = mock_client
        yield mock_client.secrets


# Test to verify Firebase mocking is working
def test_firebase_mocking():
    """Test to verify that our Firebase mocking is working correctly"""
    try:
        from app.utils.firebase_secrets import get_app_secret, get_firebase_secret

        # Test that get_firebase_secret returns our mocked value
        secret = get_firebase_secret("TEST_SECRET")
        assert secret is not None, "get_firebase_secret should return a mock value"
        assert (
            secret == "mock-test-secret"
        ), f"Expected 'mock-test-secret', got '{secret}'"

        # Test legacy get_app_secret function
        app_secret = get_app_secret("APP_SECRET")
        assert app_secret is not None, "get_app_secret should return a mock value"
        assert (
            app_secret == "mock-app-secret-value"
        ), f"Expected 'mock-app-secret-value', got '{app_secret}'"

        logger.info("Firebase mocking verification passed")
        return True

    except ImportError as e:
        logger.error(f"Firebase mocking verification failed due to import error: {e}")
        pytest.skip(f"Required Firebase module not available: {e}")
        return False
    except Exception as e:
        logger.error(f"Firebase mocking verification failed: {e}")
        raise


# Additional test fixtures for specific testing scenarios
@pytest.fixture
def firebase_secret_override():
    """
    Fixture that allows tests to override specific Firebase secrets
    Returns a function that can be used to set secret values
    """
    original_secrets = {}

    def set_secret(secret_name: str, secret_value: str):
        """Set a mock secret value for testing"""
        # Store original value if not already stored
        if secret_name not in original_secrets:
            try:
                from app.utils.firebase_secrets import get_firebase_secret

                original_secrets[secret_name] = get_firebase_secret(secret_name)
            except:
                original_secrets[secret_name] = None

        # Set environment variable override
        env_var_name = secret_name.upper().replace("/", "_")
        os.environ[env_var_name] = secret_value

    yield set_secret

    # Cleanup: restore original values
    for secret_name, original_value in original_secrets.items():
        env_var_name = secret_name.upper().replace("/", "_")
        if original_value is not None:
            os.environ[env_var_name] = original_value
        elif env_var_name in os.environ:
            del os.environ[env_var_name]
