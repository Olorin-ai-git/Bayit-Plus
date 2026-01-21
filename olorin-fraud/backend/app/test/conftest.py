"""
App-level conftest.py that implements Firebase mocking for tests.
This inherits from the root conftest.py and adds app-specific test configurations.
"""

import logging
import os
from typing import Optional
from unittest.mock import MagicMock, patch

import pytest

# Create a logger
logger = logging.getLogger(__name__)


def mock_get_firebase_secret(secret_name: str) -> Optional[str]:
    """Mock implementation of get_firebase_secret for app-level tests"""
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
def mock_firebase_for_app_tests():
    """
    App-level fixture to ensure Firebase mocking is active for all app tests.
    This supplements the root-level mocking with app-specific configurations.
    """
    patches = []

    try:
        # Mock Firebase Admin SDK components
        firebase_admin_patch = patch("firebase_admin.initialize_app")
        firebase_admin_patch.start()
        patches.append(firebase_admin_patch)

        # Mock Google Cloud Secret Manager
        secret_manager_patch = patch(
            "google.cloud.secretmanager.SecretManagerServiceClient"
        )
        secret_manager_patch.start()
        patches.append(secret_manager_patch)

        # Mock our Firebase secrets utility functions
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

        # Set mock environment variables
        os.environ.setdefault("FIREBASE_PROJECT_ID", "mock-project-id")
        os.environ.setdefault("FIREBASE_PRIVATE_KEY", "mock-private-key")
        os.environ.setdefault("FIREBASE_CLIENT_EMAIL", "mock@serviceaccount.com")

        logger.info("Firebase mocking active for app-level tests")

        yield

    except ImportError as e:
        logger.warning(f"Import error during app-level Firebase mocking: {e}")
        yield
    finally:
        # Clean up patches
        for patch_obj in patches:
            try:
                patch_obj.stop()
            except RuntimeError:
                # Patch was already stopped
                pass


# Test to verify our app-level mocking is working
def test_firebase_mocking():
    """Test to verify that our Firebase mocking is working correctly"""
    try:
        from app.utils.firebase_secrets import get_app_secret, get_firebase_secret

        # Test that get_firebase_secret returns our mocked value
        secret = get_firebase_secret("any/path")
        assert secret is not None, "get_firebase_secret should return a mock value"

        # Test specific app secret
        app_secret = get_app_secret("APP_SECRET")
        assert (
            app_secret == "mock-app-secret-value"
        ), f"Expected 'mock-app-secret-value', got '{app_secret}'"

        logger.info("App-level Firebase mocking verification passed")

    except ImportError as e:
        logger.error(f"Firebase mocking verification failed: {e}")
        pytest.skip(f"Required module not available: {e}")
    except Exception as e:
        logger.error(f"Firebase mocking verification failed: {e}")
        raise


@pytest.fixture
def firebase_test_secrets():
    """
    Fixture that provides test-specific Firebase secret values
    """
    return {
        "APP_SECRET": "test-app-secret",
        "SPLUNK_USERNAME": "test-splunk-user",
        "SPLUNK_PASSWORD": "test-splunk-pass",
        "SUMO_LOGIC_ACCESS_ID": "test-sumo-id",
        "SUMO_LOGIC_ACCESS_KEY": "test-sumo-key",
        "TEST_USER_PWD": "test-password",
    }


@pytest.fixture
def override_firebase_secret():
    """
    Fixture that allows individual tests to override Firebase secret values
    """
    original_env = {}

    def set_secret(secret_name: str, secret_value: str):
        """Override a Firebase secret for this test"""
        env_var_name = secret_name

        # Store original value
        original_env[env_var_name] = os.environ.get(env_var_name)

        # Set new value
        os.environ[env_var_name] = secret_value
        logger.debug(f"Override Firebase secret: {secret_name} -> {env_var_name}")

    yield set_secret

    # Cleanup: restore original values
    for env_var, original_value in original_env.items():
        if original_value is not None:
            os.environ[env_var] = original_value
        elif env_var in os.environ:
            del os.environ[env_var]
