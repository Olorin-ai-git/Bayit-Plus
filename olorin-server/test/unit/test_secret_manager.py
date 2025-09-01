"""
Unit tests for Firebase Secret Manager integration.
"""

import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from google.api_core import exceptions as google_exceptions

from app.service.secret_manager import SecretManagerClient, get_secret_manager
from app.service.config_loader import ConfigLoader, get_config_loader
from app.service.config_secrets import enhance_config_with_secrets, validate_required_secrets


class TestSecretManagerClient:
    """Test suite for SecretManagerClient."""
    
    @pytest.fixture
    def mock_secret_client(self):
        """Create a mock Secret Manager client."""
        with patch('app.service.secret_manager.secretmanager.SecretManagerServiceClient') as mock:
            yield mock
    
    @pytest.fixture
    def secret_manager(self, mock_secret_client):
        """Create a SecretManagerClient instance with mocked dependencies."""
        client = SecretManagerClient(project_id="test-project", cache_ttl=60)  # 1 minute TTL for tests
        return client
    
    def test_initialization(self, mock_secret_client):
        """Test SecretManagerClient initialization."""
        client = SecretManagerClient(project_id="test-project", cache_ttl=300)
        assert client.project_id == "test-project"
        assert client.cache_ttl == 300
        assert client._client is not None
        assert isinstance(client._cache, dict)
        mock_secret_client.assert_called_once()
    
    def test_initialization_failure(self):
        """Test SecretManagerClient initialization with failure."""
        with patch('app.service.secret_manager.secretmanager.SecretManagerServiceClient', 
                  side_effect=Exception("Connection failed")):
            client = SecretManagerClient(project_id="test-project", cache_ttl=300)
            assert client._client is None
    
    def test_get_secret_from_manager(self, secret_manager):
        """Test retrieving secret from Secret Manager."""
        # Mock the response
        mock_response = Mock()
        mock_response.payload.data = b"secret_value"
        secret_manager._client.access_secret_version.return_value = mock_response
        
        result = secret_manager.get_secret("test_secret")
        
        assert result == "secret_value"
        secret_manager._client.access_secret_version.assert_called_once()
    
    def test_get_secret_with_env_override(self, secret_manager):
        """Test environment variable override for secrets."""
        with patch.dict(os.environ, {"TEST_SECRET": "env_value"}):
            result = secret_manager.get_secret("test_secret")
            assert result == "env_value"
            # Should not call Secret Manager when env var exists
            secret_manager._client.access_secret_version.assert_not_called()
    
    def test_get_secret_not_found(self, secret_manager):
        """Test handling of secret not found error."""
        secret_manager._client.access_secret_version.side_effect = \
            google_exceptions.NotFound("Secret not found")
        
        result = secret_manager.get_secret("missing_secret")
        assert result is None
    
    def test_get_secret_permission_denied(self, secret_manager):
        """Test handling of permission denied error."""
        secret_manager._client.access_secret_version.side_effect = \
            google_exceptions.PermissionDenied("Permission denied")
        
        result = secret_manager.get_secret("forbidden_secret")
        assert result is None
    
    def test_get_secret_with_fallback(self, secret_manager):
        """Test get_secret_with_fallback method."""
        # Test with successful secret retrieval
        mock_response = Mock()
        mock_response.payload.data = b"secret_value"
        secret_manager._client.access_secret_version.return_value = mock_response
        
        result = secret_manager.get_secret_with_fallback(
            "test_secret", 
            env_var="FALLBACK_VAR",
            default="default_value"
        )
        assert result == "secret_value"
        
        # Test with fallback to env var
        secret_manager._client.access_secret_version.side_effect = \
            google_exceptions.NotFound("Not found")
        
        with patch.dict(os.environ, {"FALLBACK_VAR": "fallback_value"}):
            result = secret_manager.get_secret_with_fallback(
                "missing_secret",
                env_var="FALLBACK_VAR",
                default="default_value"
            )
            assert result == "fallback_value"
        
        # Test with default value
        result = secret_manager.get_secret_with_fallback(
            "missing_secret",
            env_var="NONEXISTENT_VAR",
            default="default_value"
        )
        assert result == "default_value"
    
    def test_env_var_name_conversion(self, secret_manager):
        """Test conversion of secret names to environment variable names."""
        assert secret_manager._get_env_var_name("database_password") == "DATABASE_PASSWORD"
        assert secret_manager._get_env_var_name("DATABASE_PASSWORD") == "DATABASE_PASSWORD"
        assert secret_manager._get_env_var_name("jwt-secret-key") == "JWT_SECRET_KEY"
    
    def test_cache_ttl_behavior(self, secret_manager):
        """Test cache TTL behavior."""
        import time
        # First, populate the cache
        mock_response = Mock()
        mock_response.payload.data = b"cached_value"
        secret_manager._client.access_secret_version.return_value = mock_response
        
        # Get secret - should cache it
        result1 = secret_manager.get_secret("cached_secret")
        assert result1 == "cached_value"
        assert secret_manager._client.access_secret_version.call_count == 1
        
        # Get again immediately - should use cache
        result2 = secret_manager.get_secret("cached_secret")
        assert result2 == "cached_value"
        assert secret_manager._client.access_secret_version.call_count == 1  # Still 1, used cache
        
        # Simulate cache expiry by manipulating the cache directly
        cache_key = "cached_secret:latest"
        if cache_key in secret_manager._cache:
            # Set expiry to past
            secret_manager._cache[cache_key] = ("cached_value", time.time() - 1)
        
        # Get again after expiry - should call API again
        result3 = secret_manager.get_secret("cached_secret")
        assert result3 == "cached_value"
        assert secret_manager._client.access_secret_version.call_count == 2  # Called API again
    
    def test_cache_clearing(self, secret_manager):
        """Test cache clearing functionality."""
        # Add some items to cache
        secret_manager._cache["test1:latest"] = ("value1", 999999999999)
        secret_manager._cache["test2:latest"] = ("value2", 999999999999)
        
        assert len(secret_manager._cache) == 2
        
        # Clear cache
        secret_manager.clear_cache()
        assert len(secret_manager._cache) == 0
    
    def test_cache_stats(self, secret_manager):
        """Test cache statistics functionality."""
        import time
        current_time = time.time()
        
        # Add active and expired entries
        secret_manager._cache["active1:latest"] = ("value1", current_time + 300)
        secret_manager._cache["active2:latest"] = ("value2", current_time + 300)
        secret_manager._cache["expired1:latest"] = ("value3", current_time - 100)
        
        stats = secret_manager.get_cache_stats()
        
        assert stats["total_entries"] == 3
        assert stats["active_entries"] == 2
        assert stats["expired_entries"] == 1
        assert stats["cache_ttl_seconds"] == 60  # Test fixture uses 60 seconds


class TestConfigLoader:
    """Test suite for ConfigLoader."""
    
    @pytest.fixture
    def mock_secret_manager(self):
        """Create a mock SecretManagerClient."""
        with patch('app.service.config_loader.get_secret_manager') as mock:
            mock_client = Mock(spec=SecretManagerClient)
            mock.return_value = mock_client
            yield mock_client
    
    @pytest.fixture
    def config_loader(self, mock_secret_manager):
        """Create a ConfigLoader instance."""
        with patch.dict(os.environ, {"APP_ENV": "test"}):
            loader = ConfigLoader()
            return loader
    
    def test_load_secret_with_env_specific(self, config_loader, mock_secret_manager):
        """Test loading environment-specific secrets."""
        mock_secret_manager.get_secret_with_fallback.side_effect = [
            "env_specific_value",  # First call for env-specific
            None  # Second call for base path
        ]
        
        result = config_loader.load_secret("database_password", "DB_PASSWORD")
        assert result == "env_specific_value"
        
        # Should try env-specific path first
        first_call = mock_secret_manager.get_secret_with_fallback.call_args_list[0]
        assert first_call[0][0] == "test/database_password"  # Check the actual path format
    
    def test_load_api_key(self, config_loader, mock_secret_manager):
        """Test loading API keys."""
        mock_secret_manager.get_secret_with_fallback.return_value = "api_key_value"
        
        result = config_loader.load_api_key("anthropic_api_key", "ANTHROPIC_API_KEY")
        assert result == "api_key_value"
    
    def test_load_database_config(self, config_loader, mock_secret_manager):
        """Test loading database configuration."""
        mock_secret_manager.get_secret_with_fallback.return_value = "secret_password"
        
        with patch.dict(os.environ, {
            "DB_HOST": "test_host",
            "DB_PORT": "5432",
            "DB_NAME": "test_db",
            "DB_USER": "test_user",
            "APP_ENV": "test"  # Non-production environment
        }):
            config = config_loader.load_database_config()
            
            assert config["host"] == "test_host"
            assert config["port"] == 5432
            assert config["name"] == "test_db"
            assert config["user"] == "test_user"
            assert config["password"] == "secret_password"
    
    def test_load_database_config_missing_password_production(self, config_loader, mock_secret_manager):
        """Test that missing database password fails in production."""
        mock_secret_manager.get_secret_with_fallback.return_value = None
        
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            config_loader.env = "production"
            with pytest.raises(ValueError, match="CRITICAL: Database password not found"):
                config_loader.load_database_config()
    
    def test_load_jwt_config(self, config_loader, mock_secret_manager):
        """Test loading JWT configuration."""
        mock_secret_manager.get_secret_with_fallback.return_value = "jwt_secret"
        
        with patch.dict(os.environ, {"APP_ENV": "test"}):
            config = config_loader.load_jwt_config()
            
            assert config["secret_key"] == "jwt_secret"
            assert config["algorithm"] == "HS256"
            assert config["expire_hours"] == 2  # Updated to 2 hours for security
    
    def test_load_jwt_config_missing_key_production(self, config_loader, mock_secret_manager):
        """Test that missing JWT secret fails in production."""
        mock_secret_manager.get_secret_with_fallback.return_value = None
        
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            config_loader.env = "production"
            with pytest.raises(ValueError, match="CRITICAL: JWT secret key not found"):
                config_loader.load_jwt_config()
    
    def test_load_jwt_config_generates_dev_key(self, config_loader, mock_secret_manager):
        """Test that JWT secret is generated for development."""
        mock_secret_manager.get_secret_with_fallback.return_value = None
        
        with patch.dict(os.environ, {"APP_ENV": "development"}):
            config_loader.env = "development"
            config = config_loader.load_jwt_config()
            
            # Should generate a random key for development
            assert config["secret_key"] is not None
            assert len(config["secret_key"]) > 30  # Secure random key
    
    def test_load_all_secrets(self, config_loader, mock_secret_manager):
        """Test loading all secrets at once."""
        mock_secret_manager.get_secret_with_fallback.return_value = "test_value"
        
        secrets = config_loader.load_all_secrets()
        
        assert "anthropic_api_key" in secrets
        assert "database" in secrets
        assert "redis" in secrets
        assert "jwt" in secrets
        assert "splunk" in secrets
        assert "snowflake" in secrets


class TestConfigSecrets:
    """Test suite for config_secrets module."""
    
    @pytest.fixture
    def mock_config_loader(self):
        """Create a mock ConfigLoader."""
        with patch('app.service.config_secrets.get_config_loader') as mock:
            mock_loader = Mock(spec=ConfigLoader)
            mock.return_value = mock_loader
            yield mock_loader
    
    @pytest.fixture
    def mock_config_instance(self):
        """Create a mock configuration instance."""
        config = Mock()
        # Set all attributes to None initially
        config.anthropic_api_key = None
        config.openai_api_key = None
        config.olorin_api_key = None
        config.databricks_token = None
        config.database_password = None
        config.redis_api_key = None
        config.jwt_secret_key = None
        config.splunk_username = None
        config.splunk_password = None
        config.sumo_logic_access_id = None
        config.sumo_logic_access_key = None
        config.snowflake_account = None
        config.snowflake_user = None
        config.snowflake_password = None
        config.snowflake_private_key = None
        config.app_secret = None
        config.enabled_log_sources = ["splunk"]
        config.enabled_data_sources = ["snowflake"]
        config.env = "local"  # Default to local environment
        return config
    
    def test_enhance_config_with_secrets(self, mock_config_instance, mock_config_loader):
        """Test enhancing configuration with secrets."""
        mock_config_loader.load_all_secrets.return_value = {
            "anthropic_api_key": "anthropic_key",
            "openai_api_key": "openai_key",
            "database": {"password": "db_password"},
            "redis": {"api_key": "redis_api_key"},
            "jwt": {"secret_key": "jwt_secret"},
            "splunk": {"username": "splunk_user", "password": "splunk_pass"},
            "snowflake": {"account": "sf_account", "password": "sf_password"},
            "app_secret": "app_secret_value"
        }
        
        enhanced_config = enhance_config_with_secrets(mock_config_instance)
        
        assert enhanced_config.anthropic_api_key == "anthropic_key"
        assert enhanced_config.openai_api_key == "openai_key"
        assert enhanced_config.database_password == "db_password"
        assert enhanced_config.redis_api_key == "redis_api_key"
        assert enhanced_config.jwt_secret_key == "jwt_secret"
        assert enhanced_config.splunk_username == "splunk_user"
        assert enhanced_config.splunk_password == "splunk_pass"
        assert enhanced_config.snowflake_account == "sf_account"
        assert enhanced_config.snowflake_password == "sf_password"
        assert enhanced_config.app_secret == "app_secret_value"
    
    def test_validate_required_secrets_success(self, mock_config_instance):
        """Test validation of required secrets - success case."""
        mock_config_instance.anthropic_api_key = "key"
        mock_config_instance.jwt_secret_key = "secret"
        mock_config_instance.database_password = "password"
        mock_config_instance.splunk_username = "user"
        mock_config_instance.splunk_password = "pass"
        mock_config_instance.snowflake_account = "account"
        mock_config_instance.snowflake_user = "user"
        mock_config_instance.snowflake_password = "pass"
        
        # Set environment to production to trigger validation
        mock_config_instance.env = "production"
        
        result = validate_required_secrets(mock_config_instance)
        assert result is True
    
    def test_validate_required_secrets_failure(self, mock_config_instance):
        """Test validation of required secrets - failure case in production."""
        # Leave required secrets as None
        mock_config_instance.env = "production"
        
        # Should raise ValueError in production
        with pytest.raises(ValueError, match="CRITICAL: Missing required secrets"):
            validate_required_secrets(mock_config_instance)
    
    def test_validate_required_secrets_local_env(self, mock_config_instance):
        """Test that local environment skips validation."""
        # Leave all secrets as None
        mock_config_instance.env = "local"
        
        result = validate_required_secrets(mock_config_instance)
        assert result is True  # Should pass for local env
    
    def test_validate_required_secrets_staging(self, mock_config_instance):
        """Test validation in staging environment."""
        mock_config_instance.env = "staging"
        # Leave secrets as None
        
        # Should raise ValueError in staging
        with pytest.raises(ValueError, match="CRITICAL: Missing required secrets"):
            validate_required_secrets(mock_config_instance)


class TestGlobalInstances:
    """Test global instance getters."""
    
    def test_get_secret_manager_singleton(self):
        """Test that get_secret_manager returns singleton."""
        with patch('app.service.secret_manager.SecretManagerClient'):
            manager1 = get_secret_manager()
            manager2 = get_secret_manager()
            assert manager1 is manager2
    
    def test_get_config_loader_singleton(self):
        """Test that get_config_loader returns singleton."""
        with patch('app.service.config_loader.get_secret_manager'):
            loader1 = get_config_loader()
            loader2 = get_config_loader()
            assert loader1 is loader2