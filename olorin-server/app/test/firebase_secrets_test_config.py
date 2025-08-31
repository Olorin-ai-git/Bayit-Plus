"""
Firebase Secrets Test Configuration
Test configuration and mocking utilities for Firebase Secrets Manager integration.
"""

import os
import logging
from typing import Dict, Optional
from unittest.mock import patch, MagicMock

logger = logging.getLogger(__name__)

# Test secret values for mocking
TEST_SECRETS = {
    # Core application secrets
    "olorin/app_secret": "test_app_secret_value_for_testing",
    
    # AI/ML API keys
    "olorin/anthropic_api_key": "test_anthropic_api_key_sk_ant_test123",
    "olorin/openai_api_key": "test_openai_api_key_sk_test123",
    
    # Database and infrastructure
    "olorin/database_password": "test_database_password_secure123",
    "olorin/redis_password": "test_redis_password_secure123", 
    "olorin/jwt_secret_key": "test_jwt_secret_key_minimum_32_characters_long_secure",
    
    # Log analysis services
    "olorin/splunk_username": "test_splunk_user",
    "olorin/splunk_password": "test_splunk_password_secure123",
    "olorin/sumo_logic_access_id": "test_sumo_access_id",
    "olorin/sumo_logic_access_key": "test_sumo_access_key_secure123",
    
    # Data sources
    "olorin/snowflake_account": "test_snowflake_account",
    "olorin/snowflake_user": "test_snowflake_user",
    "olorin/snowflake_password": "test_snowflake_password_secure123",
    "olorin/snowflake_private_key": "test_snowflake_private_key_content",
    
    # External APIs
    "olorin/gaia_api_key": "test_gaia_api_key_secure123",
    "olorin/olorin_api_key": "test_olorin_api_key_secure123", 
    "olorin/databricks_token": "test_databricks_token_secure123",
    
    # Observability and tracing
    "olorin/langfuse/public_key": "test_langfuse_public_key",
    "olorin/langfuse/secret_key": "test_langfuse_secret_key_secure123",
    
    # Testing and development
    "olorin/test_user_pwd": "test_user_password_secure123",
}

# Environment variable overrides for testing
TEST_ENV_OVERRIDES = {
    "APP_ENV": "test",
    "LOG_LEVEL": "DEBUG", 
    "FIREBASE_PROJECT_ID": "olorin-ai-test",
    
    # Database configuration for testing
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_NAME": "olorin_test",
    "DB_USER": "test_user",
    
    # Redis configuration for testing
    "REDIS_HOST": "localhost",
    "REDIS_PORT": "6379",
    "REDIS_DB": "1",  # Use different DB for tests
}


class FirebaseSecretsMockManager:
    """Mock manager for Firebase Secrets Manager in tests"""
    
    def __init__(self, test_secrets: Optional[Dict[str, str]] = None):
        """Initialize mock manager with test secrets
        
        Args:
            test_secrets: Dictionary of secret name -> value mappings
        """
        self.test_secrets = test_secrets or TEST_SECRETS.copy()
        self.access_log = []  # Track secret access for testing
        
    def mock_get_firebase_secret(self, secret_name: str) -> Optional[str]:
        """Mock implementation of get_firebase_secret
        
        Args:
            secret_name: Name of the secret to retrieve
            
        Returns:
            Mock secret value or None if not found
        """
        self.access_log.append(secret_name)
        
        secret_value = self.test_secrets.get(secret_name)
        if secret_value:
            logger.debug(f"Mock Firebase secret retrieved: {secret_name}")
            return secret_value
        else:
            logger.warning(f"Mock Firebase secret not found: {secret_name}")
            return None
    
    def mock_get_app_secret(self, secret_name: str) -> Optional[str]:
        """Mock implementation of get_app_secret
        
        Args:
            secret_name: Name of the secret to retrieve
            
        Returns:
            Mock secret value or None if not found
        """
        return self.mock_get_firebase_secret(secret_name)
    
    def add_secret(self, secret_name: str, secret_value: str):
        """Add a secret to the mock store
        
        Args:
            secret_name: Name of the secret
            secret_value: Value of the secret
        """
        self.test_secrets[secret_name] = secret_value
        logger.debug(f"Added mock secret: {secret_name}")
    
    def remove_secret(self, secret_name: str):
        """Remove a secret from the mock store
        
        Args:
            secret_name: Name of the secret to remove
        """
        if secret_name in self.test_secrets:
            del self.test_secrets[secret_name]
            logger.debug(f"Removed mock secret: {secret_name}")
    
    def clear_access_log(self):
        """Clear the access log"""
        self.access_log.clear()
    
    def get_accessed_secrets(self) -> list:
        """Get list of secrets that were accessed during testing
        
        Returns:
            List of secret names that were accessed
        """
        return self.access_log.copy()


def setup_firebase_secrets_mocking(test_secrets: Optional[Dict[str, str]] = None):
    """Setup Firebase secrets mocking for tests
    
    Args:
        test_secrets: Optional custom test secrets dictionary
        
    Returns:
        Tuple of (mock_manager, patch_context_manager)
    """
    mock_manager = FirebaseSecretsMockManager(test_secrets)
    
    # Create patch for firebase_secrets module
    patches = [
        patch('app.utils.firebase_secrets.get_firebase_secret', 
              side_effect=mock_manager.mock_get_firebase_secret),
        patch('app.utils.firebase_secrets.get_app_secret',
              side_effect=mock_manager.mock_get_app_secret),
    ]
    
    # Also patch any direct imports in other modules
    additional_patches = [
        patch('app.service.database_config.get_app_secret',
              side_effect=mock_manager.mock_get_app_secret),
        patch('app.utils.auth_utils.get_app_secret', 
              side_effect=mock_manager.mock_get_app_secret),
    ]
    
    all_patches = patches + additional_patches
    
    logger.info("Firebase secrets mocking enabled for tests")
    return mock_manager, all_patches


def setup_test_environment():
    """Setup test environment variables"""
    for key, value in TEST_ENV_OVERRIDES.items():
        os.environ[key] = value
    
    logger.info("Test environment variables configured")


def cleanup_test_environment():
    """Cleanup test environment variables"""
    for key in TEST_ENV_OVERRIDES.keys():
        if key in os.environ:
            del os.environ[key]
    
    logger.info("Test environment variables cleaned up")


class FirebaseSecretsTestMixin:
    """Mixin class for test cases that need Firebase secrets mocking"""
    
    def setUp(self):
        """Setup Firebase secrets mocking"""
        super().setUp()
        
        # Setup test environment
        setup_test_environment()
        
        # Setup Firebase secrets mocking
        self.mock_manager, self.patches = setup_firebase_secrets_mocking()
        
        # Start all patches
        self.active_patches = []
        for patch_obj in self.patches:
            mock_obj = patch_obj.start()
            self.active_patches.append((patch_obj, mock_obj))
        
        logger.info("Firebase secrets test setup completed")
    
    def tearDown(self):
        """Cleanup Firebase secrets mocking"""
        # Stop all patches
        for patch_obj, _ in self.active_patches:
            patch_obj.stop()
        
        # Cleanup test environment
        cleanup_test_environment()
        
        super().tearDown()
        logger.info("Firebase secrets test cleanup completed")
    
    def add_test_secret(self, secret_name: str, secret_value: str):
        """Add a test secret for this test case
        
        Args:
            secret_name: Name of the secret
            secret_value: Value of the secret
        """
        self.mock_manager.add_secret(secret_name, secret_value)
    
    def remove_test_secret(self, secret_name: str):
        """Remove a test secret for this test case
        
        Args:
            secret_name: Name of the secret to remove
        """
        self.mock_manager.remove_secret(secret_name)
    
    def assert_secret_accessed(self, secret_name: str):
        """Assert that a specific secret was accessed during the test
        
        Args:
            secret_name: Name of the secret that should have been accessed
        """
        accessed_secrets = self.mock_manager.get_accessed_secrets()
        self.assertIn(secret_name, accessed_secrets,
                     f"Secret '{secret_name}' was not accessed. Accessed: {accessed_secrets}")
    
    def assert_secret_not_accessed(self, secret_name: str):
        """Assert that a specific secret was NOT accessed during the test
        
        Args:
            secret_name: Name of the secret that should not have been accessed
        """
        accessed_secrets = self.mock_manager.get_accessed_secrets()
        self.assertNotIn(secret_name, accessed_secrets,
                        f"Secret '{secret_name}' was accessed unexpectedly. Accessed: {accessed_secrets}")
    
    def get_accessed_secrets(self) -> list:
        """Get list of all secrets accessed during the test
        
        Returns:
            List of secret names that were accessed
        """
        return self.mock_manager.get_accessed_secrets()
    
    def clear_access_log(self):
        """Clear the secret access log"""
        self.mock_manager.clear_access_log()


def mock_firebase_secrets_for_function(func):
    """Decorator to mock Firebase secrets for a single function
    
    Usage:
        @mock_firebase_secrets_for_function
        def test_my_function():
            # Firebase secrets are mocked within this function
            pass
    """
    def wrapper(*args, **kwargs):
        mock_manager, patches = setup_firebase_secrets_mocking()
        
        # Start all patches
        active_patches = []
        try:
            for patch_obj in patches:
                mock_obj = patch_obj.start()
                active_patches.append(patch_obj)
            
            # Call the original function
            return func(*args, **kwargs)
            
        finally:
            # Stop all patches
            for patch_obj in active_patches:
                patch_obj.stop()
    
    return wrapper


# Pytest fixtures for Firebase secrets mocking
try:
    import pytest
    
    @pytest.fixture
    def firebase_secrets_mock():
        """Pytest fixture for Firebase secrets mocking"""
        setup_test_environment()
        
        mock_manager, patches = setup_firebase_secrets_mocking()
        
        # Start all patches
        active_patches = []
        for patch_obj in patches:
            mock_obj = patch_obj.start()
            active_patches.append(patch_obj)
        
        yield mock_manager
        
        # Stop all patches
        for patch_obj in active_patches:
            patch_obj.stop()
        
        cleanup_test_environment()
    
    @pytest.fixture
    def firebase_secrets_mock_with_custom_values():
        """Pytest fixture for Firebase secrets mocking with custom test values"""
        def _create_mock(custom_secrets: Dict[str, str]):
            setup_test_environment()
            
            mock_manager, patches = setup_firebase_secrets_mocking(custom_secrets)
            
            # Start all patches
            active_patches = []
            for patch_obj in patches:
                mock_obj = patch_obj.start()
                active_patches.append(patch_obj)
            
            return mock_manager, active_patches
        
        yield _create_mock
        
        # Cleanup is handled by individual test cases when they finish

except ImportError:
    # pytest not available, skip pytest-specific fixtures
    pass


# Example usage and testing utilities
def validate_test_secrets():
    """Validate that all test secrets meet minimum security requirements"""
    validation_errors = []
    
    for secret_name, secret_value in TEST_SECRETS.items():
        if not secret_value:
            validation_errors.append(f"Secret '{secret_name}' is empty")
            continue
        
        # Check minimum length requirements
        min_length = 16
        if "password" in secret_name.lower() or "secret" in secret_name.lower():
            min_length = 32
        elif "key" in secret_name.lower():
            min_length = 24
        
        if len(secret_value) < min_length:
            validation_errors.append(
                f"Secret '{secret_name}' is too short ({len(secret_value)} chars, minimum {min_length})"
            )
    
    if validation_errors:
        logger.warning("Test secrets validation issues:")
        for error in validation_errors:
            logger.warning(f"  - {error}")
        return False
    
    logger.info("Test secrets validation passed")
    return True


if __name__ == "__main__":
    # Validate test secrets when run directly
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if validate_test_secrets():
        print("✓ Test secrets validation passed")
        sys.exit(0)
    else:
        print("✗ Test secrets validation failed")
        sys.exit(1)