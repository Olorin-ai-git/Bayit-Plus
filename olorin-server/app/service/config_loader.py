"""
Configuration loader module with dual support for .env files and Firebase Secret Manager.

This module handles loading configuration with the following priority:
1. .env file values (highest priority - expected source)
2. Firebase Secret Manager (fallback)
3. No defaults - warn if missing from both sources
"""

import os
from pathlib import Path
from typing import Optional, Dict
from dotenv import load_dotenv

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
        """Initialize the configuration loader with .env support (only once)."""
        if not ConfigLoader._initialized:
            # Load .env file if it exists
            env_path = Path(__file__).parent.parent.parent / '.env'
            if env_path.exists():
                load_dotenv(env_path, override=True)  # override=True ensures .env takes precedence
                logger.info(f"Loaded .env configuration from {env_path}")
            else:
                logger.warning(f"No .env file found at {env_path}")
            
            # Initialize secret manager only if Firebase secrets are enabled
            use_firebase_secrets = os.getenv('USE_FIREBASE_SECRETS', 'true').lower() == 'true'
            if use_firebase_secrets:
                self.secret_manager = get_secret_manager()
                logger.info("Firebase Secret Manager enabled")
            else:
                self.secret_manager = None
                logger.info("Firebase Secret Manager disabled - using .env only")
                
            self.env = os.getenv("APP_ENV", "local")
            logger.info(f"ConfigLoader initialized for environment: {self.env}")
            ConfigLoader._initialized = True
    
    def load_secret(self, secret_path: str) -> Optional[str]:
        """
        Load a secret with priority: .env > Firebase > None.
        
        Args:
            secret_path: Base secret name (e.g., "DATABASE_PASSWORD")
            
        Returns:
            The secret value or None
        """
        # Priority 1: Check .env file first
        value = os.getenv(secret_path)
        if value:
            logger.debug(f"✅ Using .env value for {secret_path}")
            return value
        
        # Priority 2: Try Firebase Secret Manager (if enabled)
        if not self.secret_manager:
            logger.debug(f"❌ Firebase secrets disabled, {secret_path} not found in .env")
            return None
            
        logger.info(f"⚠️  Secret '{secret_path}' not found in .env, attempting Firebase fallback...")
        
        # Try environment-specific secret first
        env_secret_path = f"{self.env}/{secret_path}"
        value = self.secret_manager.get_secret(env_secret_path)
        
        if value:
            logger.debug(f"Using Firebase fallback for {secret_path}")
            return value
        
        # Try base secret path (for shared secrets)
        value = self.secret_manager.get_secret(secret_path)
        
        if not value:
            logger.warning(f"Configuration '{secret_path}' not found in .env or Firebase Secrets")
        
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
    
    def load_snowflake_config(self) -> Dict[str, Optional[str]]:
        """
        Load Snowflake configuration with priority: .env > Firebase > None.
        
        Returns:
            Dict containing Snowflake configuration with .env taking priority
        """
        config = {}
        
        # Define configuration keys (no defaults - must be configured)
        config_keys = [
            'account', 'host', 'user', 'password', 'private_key',
            'database', 'schema', 'warehouse', 'role', 'authenticator',
            'pool_size', 'pool_max_overflow', 'pool_timeout', 'query_timeout'
        ]
        
        missing_from_env = []
        
        for key in config_keys:
            env_var = f'SNOWFLAKE_{key.upper()}'
            
            # Priority 1: Check .env file (expected source)
            value = os.getenv(env_var)
            
            if value:
                config[key] = value
                # Log source for debugging (avoid logging passwords)
                if 'password' not in key.lower() and 'key' not in key.lower():
                    logger.debug(f"Loaded {key} from .env: {value}")
            else:
                # Track what's missing from .env
                missing_from_env.append(env_var)
                
                # Priority 2: Try Firebase as fallback
                value = self.load_secret(env_var)
                if value:
                    config[key] = value
                    logger.info(f"Using Firebase fallback for {env_var} (not in .env)")
                else:
                    # Missing from both - just warn
                    logger.warning(f"MISSING: {env_var} not found in .env or Firebase Secrets")
                    config[key] = None
        
        # Log summary of missing configs
        if missing_from_env:
            logger.warning(f"Expected in .env but missing: {', '.join(missing_from_env)}")
            logger.warning("Please add these to your .env file for complete configuration")
        
        # Check critical fields but don't fail - just warn
        critical_fields = ['account', 'user', 'password', 'database']
        missing_critical = [f for f in critical_fields if not config.get(f)]
        
        if missing_critical:
            logger.error(f"CRITICAL: Missing required Snowflake configuration: {missing_critical}")
            logger.error("Snowflake connection will not be possible without these values")
            # Don't raise exception - just warn
        
        return config
    
    def load_all_secrets(self) -> dict:
        """
        Load all secrets from both .env and Firebase.
        
        Returns:
            Dictionary with all available secrets
        """
        secrets = {}
        
        # Load Snowflake configuration
        secrets['snowflake'] = self.load_snowflake_config()
        
        # Load other API keys and secrets
        api_keys = [
            'ANTHROPIC_API_KEY',
            'OPENAI_API_KEY',
            'OLORIN_API_KEY',
            'JWT_SECRET_KEY',
            'REDIS_API_KEY'
        ]
        
        for key in api_keys:
            value = self.load_secret(key)
            if value:
                secrets[key.lower()] = value
        
        # Load Splunk configuration if enabled
        if os.getenv('USE_SPLUNK', 'false').lower() == 'true':
            secrets['splunk'] = {
                'username': self.load_secret('SPLUNK_USERNAME'),
                'password': self.load_secret('SPLUNK_PASSWORD'),
                'host': os.getenv('SPLUNK_HOST'),
                'port': os.getenv('SPLUNK_PORT', '8089'),
                'index': os.getenv('SPLUNK_INDEX', 'main')
            }
        
        return secrets
    
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