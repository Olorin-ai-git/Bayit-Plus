"""
Configuration loader module that integrates with Firebase Secret Manager.

This module handles loading secrets from Firebase Secret Manager ONLY.
No environment variable fallbacks - all secrets must come from Firebase.
"""

import os
from typing import Optional

from .secret_manager import get_secret_manager
from .logging import get_bridge_logger

# Configure logging level based on environment variable  
_log_level = os.getenv("SECRET_MANAGER_LOG_LEVEL", "INFO").upper()
if _log_level == "SILENT":
    # Special mode to completely silence config loader logs
    class SilentLogger:
        def debug(self, *args, **kwargs): pass
        def info(self, *args, **kwargs): pass
        def warning(self, *args, **kwargs): pass
        def error(self, *args, **kwargs): pass
    logger = SilentLogger()
else:
    # Use unified logging bridge - this will respect CLI log level
    logger = get_bridge_logger(__name__)


class ConfigLoader:
    """Loads configuration values from Firebase Secret Manager."""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Implement singleton pattern for ConfigLoader."""
        if cls._instance is None:
            cls._instance = super(ConfigLoader, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the configuration loader (only once)."""
        if not ConfigLoader._initialized:
            self.secret_manager = get_secret_manager()
            self.env = os.getenv("APP_ENV", "local")
            logger.info(f"ConfigLoader initialized for environment: {self.env}")
            ConfigLoader._initialized = True
    
    def load_secret(self, secret_path: str) -> Optional[str]:
        """
        Load a secret from Firebase Secret Manager ONLY.
        
        Args:
            secret_path: Base secret name (e.g., "DATABASE_PASSWORD")
            
        Returns:
            The secret value or None
        """
        # Try environment-specific secret first
        env_secret_path = f"{self.env}/{secret_path}"
        value = self.secret_manager.get_secret(env_secret_path)
        
        if value:
            return value
        
        # Try base secret path (for shared secrets)
        value = self.secret_manager.get_secret(secret_path)
        
        return value
    
    def load_api_key(self, key_name: str) -> Optional[str]:
        """
        Load an API key from Firebase Secret Manager ONLY.
        
        Args:
            key_name: The key name in Secret Manager
            
        Returns:
            The API key value or None
        """
        secret_path = key_name.upper().replace("-", "_")
        return self.load_secret(secret_path)
    
    def load_database_config(self) -> dict:
        """
        Load database configuration from secrets.
        UNUSED: Application uses SQLite, not PostgreSQL.
        
        Returns:
            Dictionary with database configuration (hardcoded defaults)
        """
        # Using SQLite - no secrets needed, return hardcoded defaults
        return {
            "host": "localhost",
            "port": 3306,
            "name": "fraud_detection",
            "user": "root",
            "password": None,  # Not needed for SQLite
            "pool_size": 10
        }
    
    def load_redis_config(self) -> dict:
        """
        Load Redis configuration from secrets.
        Only fetch the API key from secrets, use hardcoded defaults for connection params.
        
        Returns:
            Dictionary with Redis configuration
        """
        return {
            "host": "redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com",  # Use hardcoded default
            "port": 13848,  # Use hardcoded default
            "username": "default",  # Use hardcoded default
            "api_key": self.load_secret("REDIS_API_KEY")  # Only this needs to be fetched from secrets
        }
    
    def load_jwt_config(self) -> dict:
        """
        Load JWT configuration from secrets.
        Only fetch the secret key from secrets, use hardcoded defaults for other params.
        
        Returns:
            Dictionary with JWT configuration
            
        Raises:
            ValueError: If JWT secret key is missing in production
        """
        secret_key = self.load_secret("JWT_SECRET_KEY")
        
        # JWT secret must exist - no fallbacks
        if not secret_key:
            raise ValueError(
                f"CRITICAL: JWT_SECRET_KEY not found in Firebase Secret Manager for environment '{self.env}'. "
                "All secrets must be configured in Firebase Secret Manager."
            )
        
        return {
            "secret_key": secret_key,
            "algorithm": "HS256",  # Use hardcoded default
            "expire_hours": 2  # Use hardcoded default (reduced from 24 to 2 hours for security)
        }
    
    def load_splunk_config(self) -> dict:
        """
        Load Splunk configuration from secrets.
        
        Returns:
            Dictionary with Splunk configuration
        """
        return {
            "username": self.load_secret("SPLUNK_USERNAME"),
            "password": self.load_secret("SPLUNK_PASSWORD")
        }
    
    def load_sumo_logic_config(self) -> dict:
        """
        Load SumoLogic configuration from secrets.
        
        Returns:
            Dictionary with SumoLogic configuration
        """
        return {
            "access_id": self.load_secret("SUMO_LOGIC_ACCESS_ID"),
            "access_key": self.load_secret("SUMO_LOGIC_ACCESS_KEY")
        }
    
    def load_snowflake_config(self) -> dict:
        """
        Load Snowflake configuration from secrets.
        
        Returns:
            Dictionary with Snowflake configuration
        """
        return {
            "account": self.load_secret("SNOWFLAKE_ACCOUNT"),
            "user": self.load_secret("SNOWFLAKE_USER"),
            "password": self.load_secret("SNOWFLAKE_PASSWORD"),
            "private_key": self.load_secret("SNOWFLAKE_PRIVATE_KEY"),
            "database": self.load_secret("SNOWFLAKE_DATABASE"),
            "schema": self.load_secret("SNOWFLAKE_SCHEMA"),
            "warehouse": self.load_secret("SNOWFLAKE_WAREHOUSE"),
            "role": self.load_secret("SNOWFLAKE_ROLE"),
            "authenticator": self.load_secret("SNOWFLAKE_AUTHENTICATOR") or "snowflake"
        }
    
    def load_all_secrets(self) -> dict:
        """
        Load all secrets and return as a dictionary.
        
        Returns:
            Dictionary with all loaded secrets
        """
        return {
            # API Keys - USED
            "anthropic_api_key": self.load_api_key("anthropic_api_key"),  # USED: Core LLM functionality
            # "openai_api_key": self.load_api_key("openai_api_key"),  # UNUSED: Replaced by Anthropic
            "olorin_api_key": self.load_api_key("olorin_api_key"),  # USED: Internal API calls
            # "databricks_token": self.load_api_key("databricks_token"),  # UNUSED: Mock implementation only
            
            # Service Configurations - Only load configs that actually fetch secrets
            # "database": self.load_database_config(),  # UNUSED: Using SQLite, not PostgreSQL
            "redis": self.load_redis_config(),  # USED: Caching system (only api_key from secrets)
            "jwt": self.load_jwt_config(),  # USED: Authentication (only secret_key from secrets)
            "splunk": self.load_splunk_config(),  # USED: Log analysis
            # "sumo_logic": self.load_sumo_logic_config(),  # UNUSED: Mock implementation only
            # "snowflake": self.load_snowflake_config(),  # UNUSED: Mock implementation only
            
            # App Secret
            # "app_secret": self.load_secret("APP_SECRET")  # UNUSED: Not referenced in codebase
        }


# Global instance
_config_loader = None


def get_config_loader() -> ConfigLoader:
    """
    Get the global configuration loader instance.
    
    Returns:
        The global ConfigLoader instance
    """
    global _config_loader
    if _config_loader is None:
        _config_loader = ConfigLoader()
    return _config_loader