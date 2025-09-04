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
        
        Returns:
            Dictionary with database configuration
            
        Raises:
            ValueError: If critical database password is missing in production
        """
        password = self.load_secret("DATABASE_PASSWORD")
        
        # Validate password exists for non-local environments
        if not password and self.env not in ["local", "development"]:
            raise ValueError(
                f"CRITICAL: Database password not found for environment '{self.env}'. "
                "Cannot start safely without database credentials."
            )
        
        return {
            "host": self.load_secret("DB_HOST") or "localhost",
            "port": int(self.load_secret("DB_PORT") or "3306"),
            "name": self.load_secret("DB_NAME") or "fraud_detection",
            "user": self.load_secret("DB_USER") or "root",
            "password": password,
            "pool_size": int(self.load_secret("DB_POOL_SIZE") or "10")  # Increased from 5 for production load
        }
    
    def load_redis_config(self) -> dict:
        """
        Load Redis configuration from secrets.
        
        Returns:
            Dictionary with Redis configuration
        """
        return {
            "host": self.load_secret("REDIS_HOST") or "redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com",
            "port": int(self.load_secret("REDIS_PORT") or "13848"),
            "username": self.load_secret("REDIS_USERNAME") or "default",
            "api_key": self.load_secret("REDIS_API_KEY")
        }
    
    def load_jwt_config(self) -> dict:
        """
        Load JWT configuration from secrets.
        
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
            "algorithm": self.load_secret("JWT_ALGORITHM") or "HS256",
            "expire_hours": int(self.load_secret("JWT_EXPIRE_HOURS") or "2")  # Reduced from 24 to 2 hours for security
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
            # API Keys
            "anthropic_api_key": self.load_api_key("anthropic_api_key"),
            "openai_api_key": self.load_api_key("openai_api_key"),
            "olorin_api_key": self.load_api_key("olorin_api_key"),
            "databricks_token": self.load_api_key("databricks_token"),
            
            # Service Configurations
            "database": self.load_database_config(),
            "redis": self.load_redis_config(),
            "jwt": self.load_jwt_config(),
            "splunk": self.load_splunk_config(),
            "sumo_logic": self.load_sumo_logic_config(),
            "snowflake": self.load_snowflake_config(),
            
            # App Secret
            "app_secret": self.load_secret("APP_SECRET")
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