"""
Configuration loader module with dual support for .env files and Firebase Secret Manager.

This module handles loading configuration with the following priority:
1. .env file values (highest priority - expected source)
2. Firebase Secret Manager (fallback)
3. No defaults - warn if missing from both sources
"""

import os
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv

from .logging import get_bridge_logger
from .secret_manager import get_secret_manager

# Configure logging level based on environment variable
_log_level = os.getenv("SECRET_MANAGER_LOG_LEVEL", "INFO").upper()
if _log_level == "SILENT":
    # Special mode to completely silence config loader logs
    class SilentLogger:
        def debug(self, *args, **kwargs):
            pass

        def info(self, *args, **kwargs):
            pass

        def warning(self, *args, **kwargs):
            pass

        def error(self, *args, **kwargs):
            pass

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
            env_path = Path(__file__).parent.parent.parent / ".env"
            if env_path.exists():
                load_dotenv(
                    env_path, override=True
                )  # override=True ensures .env takes precedence
                logger.info(f"Loaded .env configuration from {env_path}")
            else:
                logger.warning(f"No .env file found at {env_path}")

            # Initialize secret manager only if Firebase secrets are enabled
            use_firebase_secrets = (
                os.getenv("USE_FIREBASE_SECRETS", "true").lower() == "true"
            )
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
            logger.debug(
                f"❌ Firebase secrets disabled, {secret_path} not found in .env"
            )
            return None

        logger.info(
            f"⚠️  Secret '{secret_path}' not found in .env, attempting Firebase fallback..."
        )

        # Try environment-specific secret first
        env_secret_path = f"{self.env}/{secret_path}"
        value = self.secret_manager.get_secret(env_secret_path)

        if value:
            logger.debug(f"Using Firebase fallback for {secret_path}")
            return value

        # Try base secret path (for shared secrets)
        value = self.secret_manager.get_secret(secret_path)

        if not value:
            logger.warning(
                f"Configuration '{secret_path}' not found in .env or Firebase Secrets"
            )

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
            "pool_size": 10,
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
            "account",
            "host",
            "user",
            "password",
            "private_key",
            "oauth_token",
            "database",
            "schema",
            "warehouse",
            "role",
            "authenticator",
            "pool_size",
            "pool_max_overflow",
            "pool_timeout",
            "query_timeout",
            "max_transactions_limit",
        ]

        # Check authentication method early to determine which configs are actually needed
        auth_method = os.getenv("SNOWFLAKE_AUTH_METHOD", "password")
        authenticator = os.getenv("SNOWFLAKE_AUTHENTICATOR", "snowflake")
        private_key_path = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")

        # Determine which auth-related configs are actually needed
        auth_configs_needed = set()
        if authenticator == "oauth" or auth_method == "oauth":
            auth_configs_needed.add("SNOWFLAKE_OAUTH_TOKEN")
        elif auth_method == "private_key":
            auth_configs_needed.add("SNOWFLAKE_PRIVATE_KEY_PATH")  # Path is preferred
            # Don't require SNOWFLAKE_PASSWORD or SNOWFLAKE_PRIVATE_KEY when using private key path
        else:
            # Default password auth
            auth_configs_needed.add("SNOWFLAKE_PASSWORD")

        missing_from_env = []

        for key in config_keys:
            env_var = f"SNOWFLAKE_{key.upper()}"

            # Priority 1: Check .env file (expected source)
            value = os.getenv(env_var)

            if value:
                config[key] = value
                # Log source for debugging (avoid logging passwords)
                if "password" not in key.lower() and "key" not in key.lower():
                    logger.debug(f"Loaded {key} from .env: {value}")
            else:
                # Skip logging warnings for auth configs that aren't needed for current auth method
                is_auth_config = env_var in [
                    "SNOWFLAKE_PASSWORD",
                    "SNOWFLAKE_PRIVATE_KEY",
                    "SNOWFLAKE_OAUTH_TOKEN",
                ]
                if is_auth_config and env_var not in auth_configs_needed:
                    # This auth config is not needed - skip warning and continue
                    config[key] = None
                    continue

                # Track what's missing from .env (only for configs that are actually needed)
                missing_from_env.append(env_var)

                # Priority 2: Try Firebase as fallback
                value = self.load_secret(env_var)
                if value:
                    config[key] = value
                    logger.info(f"Using Firebase fallback for {env_var} (not in .env)")
                else:
                    # Missing from both - only warn if it's actually needed
                    if not is_auth_config or env_var in auth_configs_needed:
                        logger.warning(
                            f"MISSING: {env_var} not found in .env or Firebase Secrets"
                        )
                    config[key] = None

        # Log summary of missing configs (filter out unnecessary auth configs)
        if missing_from_env:
            # Filter out auth configs that aren't needed
            actually_missing = [
                m
                for m in missing_from_env
                if m
                not in [
                    "SNOWFLAKE_PASSWORD",
                    "SNOWFLAKE_PRIVATE_KEY",
                    "SNOWFLAKE_OAUTH_TOKEN",
                ]
                or m in auth_configs_needed
            ]
            if actually_missing:
                logger.warning(
                    f"Expected in .env but missing: {', '.join(actually_missing)}"
                )
                logger.warning(
                    "Please add these to your .env file for complete configuration"
                )

        # Check critical fields but don't fail - just warn
        # Note: password is only required for non-OAuth/auth_method auth
        critical_fields = ["account", "user", "database"]
        missing_critical = [f for f in critical_fields if not config.get(f)]

        # Mask file paths in logs (show basename only)
        def mask_path(path: Optional[str]) -> Optional[str]:
            if not path:
                return None
            from pathlib import Path

            return Path(path).name if path else None

        if authenticator == "oauth" or auth_method == "oauth":
            if not config.get("oauth_token"):
                missing_critical.append("oauth_token (required for OAuth auth)")
        elif auth_method == "private_key":
            if not config.get("private_key") and not private_key_path:
                missing_critical.append(
                    "private_key or SNOWFLAKE_PRIVATE_KEY_PATH (required for private key auth)"
                )
            else:
                # Private key auth is configured - log debug (no warnings for missing password)
                logger.debug(
                    f"Using Snowflake private-key authentication (key: {mask_path(private_key_path)})"
                )
        else:
            # Default to password auth
            if not config.get("password"):
                missing_critical.append("password (required for password auth)")

        if missing_critical:
            # Only log CRITICAL if no auth method is configured
            # If private_key is configured, missing password is expected
            if auth_method == "private_key" and "password" in str(missing_critical):
                # Remove password from critical if private_key is configured
                missing_critical = [
                    m for m in missing_critical if "password" not in m.lower()
                ]
                if missing_critical:
                    logger.error(
                        f"CRITICAL: Missing required Snowflake configuration: {missing_critical}"
                    )
                    logger.error(
                        "Snowflake connection will not be possible without these values"
                    )
                else:
                    logger.info(
                        f"✅ Snowflake private-key authentication configured (key: {mask_path(private_key_path)})"
                    )
            else:
                logger.error(
                    f"CRITICAL: Missing required Snowflake configuration: {missing_critical}"
                )
                logger.error(
                    "Snowflake connection will not be possible without these values"
                )
            # Don't raise exception - just warn

        return config

    def load_postgresql_config(self) -> Dict[str, Optional[str]]:
        """
        Load PostgreSQL configuration with priority: .env > Firebase > None.

        Returns:
            Dict containing PostgreSQL configuration with .env taking priority
        """
        config = {}

        # Define configuration keys with type conversion info
        config_keys = {
            "host": str,
            "port": int,
            "database": str,
            "schema": str,
            "user": str,
            "password": str,
            "pool_size": int,
            "pool_max_overflow": int,
            "query_timeout": int,
            "transactions_table": str,
            "max_transactions_limit": int,
        }

        missing_from_env = []

        for key, key_type in config_keys.items():
            env_var = f"POSTGRES_{key.upper()}"

            # Priority 1: Check .env file (expected source)
            value = os.getenv(env_var)

            if value:
                # Convert to appropriate type
                try:
                    if key_type == int:
                        config[key] = int(value)
                    else:
                        config[key] = value
                except ValueError:
                    logger.warning(
                        f"Invalid value for {env_var}: {value}, expected {key_type.__name__}"
                    )
                    config[key] = None

                # Log source for debugging (avoid logging passwords)
                if "password" not in key.lower():
                    logger.debug(f"Loaded {key} from .env: {config[key]}")
            else:
                # Track what's missing from .env
                missing_from_env.append(env_var)

                # Priority 2: Try Firebase as fallback
                value = self.load_secret(env_var)
                if value:
                    try:
                        if key_type == int:
                            config[key] = int(value)
                        else:
                            config[key] = value
                    except ValueError:
                        logger.warning(
                            f"Invalid value for {env_var}: {value}, expected {key_type.__name__}"
                        )
                        config[key] = None
                    logger.info(f"Using Firebase fallback for {env_var} (not in .env)")
                else:
                    # Missing from both - just warn
                    logger.warning(
                        f"MISSING: {env_var} not found in .env or Firebase Secrets"
                    )
                    config[key] = None

        # Log summary of missing configs
        if missing_from_env:
            logger.warning(
                f"Expected in .env but missing: {', '.join(missing_from_env)}"
            )
            logger.warning(
                "Please add these to your .env file for complete configuration"
            )

        # Check critical fields but don't fail - just warn
        critical_fields = ["host", "port", "database", "user", "password"]
        missing_critical = [f for f in critical_fields if not config.get(f)]

        if missing_critical:
            logger.error(
                f"CRITICAL: Missing required PostgreSQL configuration: {missing_critical}"
            )
            logger.error(
                "PostgreSQL connection will not be possible without these values"
            )
            # Don't raise exception - just warn

        return config

    def load_database_provider_config(self) -> Dict[str, any]:
        """
        Load database provider configuration based on DATABASE_PROVIDER env var.

        Returns:
            Dictionary with provider name and appropriate configuration.

        Raises:
            ValueError: If DATABASE_PROVIDER is invalid (not 'snowflake' or 'postgresql')
        """
        # Get database provider from environment
        provider = os.getenv("DATABASE_PROVIDER")

        if not provider:
            logger.warning("DATABASE_PROVIDER not set, defaulting to 'snowflake'")
            provider = "snowflake"

        # Normalize provider name to lowercase
        provider = provider.lower()

        # Validate provider
        if provider not in ["snowflake", "postgresql"]:
            raise ValueError(
                f"Invalid DATABASE_PROVIDER: '{provider}'. "
                "Must be 'snowflake' or 'postgresql'"
            )

        # Load appropriate configuration
        config = {"provider": provider}

        if provider == "snowflake":
            config["snowflake"] = self.load_snowflake_config()
        elif provider == "postgresql":
            config["postgresql"] = self.load_postgresql_config()

        logger.debug(f"Loaded database provider configuration for: {provider}")

        return config

    def load_all_secrets(self) -> dict:
        """
        Load all secrets from both .env and Firebase.

        Returns:
            Dictionary with all available secrets
        """
        secrets = {}

        # Load Snowflake configuration
        secrets["snowflake"] = self.load_snowflake_config()

        # Load other API keys and secrets
        api_keys = [
            "ANTHROPIC_API_KEY",
            "OPENAI_API_KEY",
            "OLORIN_API_KEY",
            "JWT_SECRET_KEY",
            "REDIS_API_KEY",
        ]

        for key in api_keys:
            value = self.load_secret(key)
            if value:
                secrets[key.lower()] = value

        # Load Splunk configuration if enabled
        if os.getenv("USE_SPLUNK", "false").lower() == "true":
            secrets["splunk"] = {
                "username": self.load_secret("SPLUNK_USERNAME"),
                "password": self.load_secret("SPLUNK_PASSWORD"),
                "host": os.getenv("SPLUNK_HOST"),
                "port": os.getenv("SPLUNK_PORT", "8089"),
                "index": os.getenv("SPLUNK_INDEX", "main"),
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
            "api_key": self.load_secret(
                "REDIS_API_KEY"
            ),  # Only this needs to be fetched from secrets
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
            "expire_hours": 2,  # Use hardcoded default (reduced from 24 to 2 hours for security)
        }

    def load_splunk_config(self) -> dict:
        """
        Load Splunk configuration from secrets.

        Returns:
            Dictionary with Splunk configuration
        """
        return {
            "username": self.load_secret("SPLUNK_USERNAME"),
            "password": self.load_secret("SPLUNK_PASSWORD"),
        }

    def load_sumo_logic_config(self) -> dict:
        """
        Load SumoLogic configuration from secrets.

        Returns:
            Dictionary with SumoLogic configuration
        """
        return {
            "access_id": self.load_secret("SUMO_LOGIC_ACCESS_ID"),
            "access_key": self.load_secret("SUMO_LOGIC_ACCESS_KEY"),
        }

    def load_all_secrets(self) -> dict:
        """
        Load all secrets and return as a dictionary.

        Returns:
            Dictionary with all loaded secrets
        """
        return {
            # API Keys - USED
            "anthropic_api_key": self.load_api_key(
                "anthropic_api_key"
            ),  # USED: Core LLM functionality
            # "openai_api_key": self.load_api_key("openai_api_key"),  # UNUSED: Replaced by Anthropic
            "olorin_api_key": self.load_api_key(
                "olorin_api_key"
            ),  # USED: Internal API calls
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
