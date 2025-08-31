"""
Configuration loader module that integrates with Firebase Secret Manager.

This module handles loading secrets from Firebase Secret Manager and
populating configuration values with proper fallback mechanisms.
"""

import os
from typing import Optional

import structlog
from .secret_manager import get_secret_manager

logger = structlog.get_logger(__name__)


class ConfigLoader:
    """Loads configuration values from Firebase Secret Manager."""
    
    def __init__(self):
        """Initialize the configuration loader."""
        self.secret_manager = get_secret_manager()
        self.env = os.getenv("APP_ENV", "local")
        logger.info(f"ConfigLoader initialized for environment: {self.env}")
    
    def load_secret(self, 
                    secret_path: str, 
                    env_var: Optional[str] = None,
                    default: Optional[str] = None) -> Optional[str]:
        """
        Load a secret with environment-specific naming.
        
        Args:
            secret_path: Base secret path (e.g., "olorin/database_password")
            env_var: Environment variable fallback name
            default: Default value if not found
            
        Returns:
            The secret value or None
        """
        # Try environment-specific secret first
        env_secret_path = f"{self.env}/{secret_path}"
        value = self.secret_manager.get_secret_with_fallback(
            env_secret_path, env_var, None
        )
        
        if value:
            return value
        
        # Try base secret path (for shared secrets)
        value = self.secret_manager.get_secret_with_fallback(
            secret_path, env_var, default
        )
        
        return value
    
    def load_api_key(self, key_name: str, env_var: str) -> Optional[str]:
        """
        Load an API key from Secret Manager.
        
        Args:
            key_name: The key name in Secret Manager
            env_var: Environment variable name for fallback
            
        Returns:
            The API key value or None
        """
        secret_path = f"olorin/{key_name}"
        return self.load_secret(secret_path, env_var)
    
    def load_database_config(self) -> dict:
        """
        Load database configuration from secrets.
        
        Returns:
            Dictionary with database configuration
        """
        return {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", "3306")),
            "name": os.getenv("DB_NAME", "fraud_detection"),
            "user": os.getenv("DB_USER", "root"),
            "password": self.load_secret(
                "olorin/database_password",
                "DB_PASSWORD",
                "default_password"
            ),
            "pool_size": int(os.getenv("DB_POOL_SIZE", "5"))
        }
    
    def load_redis_config(self) -> dict:
        """
        Load Redis configuration from secrets.
        
        Returns:
            Dictionary with Redis configuration
        """
        return {
            "host": os.getenv("REDIS_HOST", "localhost"),
            "port": int(os.getenv("REDIS_PORT", "6379")),
            "password": self.load_secret(
                "olorin/redis_password",
                "REDIS_PASSWORD"
            )
        }
    
    def load_jwt_config(self) -> dict:
        """
        Load JWT configuration from secrets.
        
        Returns:
            Dictionary with JWT configuration
        """
        return {
            "secret_key": self.load_secret(
                "olorin/jwt_secret_key",
                "JWT_SECRET_KEY",
                "default_jwt_secret_key_minimum_32_characters"
            ),
            "algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
            "expire_hours": int(os.getenv("JWT_EXPIRE_HOURS", "24"))
        }
    
    def load_splunk_config(self) -> dict:
        """
        Load Splunk configuration from secrets.
        
        Returns:
            Dictionary with Splunk configuration
        """
        return {
            "username": self.load_secret(
                "olorin/splunk_username",
                "SPLUNK_USERNAME"
            ),
            "password": self.load_secret(
                "olorin/splunk_password",
                "SPLUNK_PASSWORD"
            )
        }
    
    def load_sumo_logic_config(self) -> dict:
        """
        Load SumoLogic configuration from secrets.
        
        Returns:
            Dictionary with SumoLogic configuration
        """
        return {
            "access_id": self.load_secret(
                "olorin/sumo_logic_access_id",
                "SUMO_LOGIC_ACCESS_ID"
            ),
            "access_key": self.load_secret(
                "olorin/sumo_logic_access_key",
                "SUMO_LOGIC_ACCESS_KEY"
            )
        }
    
    def load_snowflake_config(self) -> dict:
        """
        Load Snowflake configuration from secrets.
        
        Returns:
            Dictionary with Snowflake configuration
        """
        return {
            "account": self.load_secret(
                "olorin/snowflake_account",
                "SNOWFLAKE_ACCOUNT"
            ),
            "user": self.load_secret(
                "olorin/snowflake_user",
                "SNOWFLAKE_USER"
            ),
            "password": self.load_secret(
                "olorin/snowflake_password",
                "SNOWFLAKE_PASSWORD"
            ),
            "private_key": self.load_secret(
                "olorin/snowflake_private_key",
                "SNOWFLAKE_PRIVATE_KEY"
            ),
            "database": os.getenv("SNOWFLAKE_DATABASE"),
            "schema": os.getenv("SNOWFLAKE_SCHEMA"),
            "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE"),
            "role": os.getenv("SNOWFLAKE_ROLE"),
            "authenticator": os.getenv("SNOWFLAKE_AUTHENTICATOR", "snowflake")
        }
    
    def load_all_secrets(self) -> dict:
        """
        Load all secrets and return as a dictionary.
        
        Returns:
            Dictionary with all loaded secrets
        """
        return {
            # API Keys
            "anthropic_api_key": self.load_api_key("anthropic_api_key", "ANTHROPIC_API_KEY"),
            "openai_api_key": self.load_api_key("openai_api_key", "OPENAI_API_KEY"),
            "gaia_api_key": self.load_api_key("gaia_api_key", "GAIA_API_KEY"),
            "olorin_api_key": self.load_api_key("olorin_api_key", "OLORIN_API_KEY"),
            "databricks_token": self.load_api_key("databricks_token", "DATABRICKS_TOKEN"),
            
            # Service Configurations
            "database": self.load_database_config(),
            "redis": self.load_redis_config(),
            "jwt": self.load_jwt_config(),
            "splunk": self.load_splunk_config(),
            "sumo_logic": self.load_sumo_logic_config(),
            "snowflake": self.load_snowflake_config(),
            
            # App Secret
            "app_secret": self.load_secret("olorin/app_secret", "APP_SECRET")
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