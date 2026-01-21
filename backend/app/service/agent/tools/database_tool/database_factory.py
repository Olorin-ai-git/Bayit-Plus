"""
Database Factory for Provider Selection.

This module implements the factory pattern for creating database provider
instances based on configuration from environment variables.
"""

from typing import Optional

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

from .database_provider import DatabaseProvider
from .postgres_client import PostgreSQLProvider
from .snowflake_provider import SnowflakeProvider

logger = get_bridge_logger(__name__)

# Cache for database provider instances (singleton pattern)
_provider_cache: Optional[DatabaseProvider] = None
_cached_provider_name: Optional[str] = None


class DatabaseFactory:
    """
    Factory class for creating database provider instances.

    This class implements the factory pattern to create appropriate
    database provider instances based on the DATABASE_PROVIDER
    environment variable.
    """

    @staticmethod
    def create_provider(provider_name: Optional[str] = None) -> DatabaseProvider:
        """
        Create and return a database provider instance.

        Uses singleton pattern - returns cached instance if available.

        Args:
            provider_name: Optional provider name override. If not provided,
                          reads from DATABASE_PROVIDER environment variable.

        Returns:
            DatabaseProvider instance for the specified provider

        Raises:
            ValueError: If provider_name is not a valid provider
        """
        global _provider_cache, _cached_provider_name

        # Load from config if not provided
        if provider_name is None:
            config_loader = get_config_loader()
            db_config = config_loader.load_database_provider_config()
            provider_name = db_config["provider"]
            logger.debug(f"Database provider loaded from config: {provider_name}")
        else:
            # Normalize provider name to lowercase
            provider_name = provider_name.lower()
            logger.debug(f"Database provider specified: {provider_name}")

        # Return cached instance if it matches the requested provider
        if _provider_cache is not None and _cached_provider_name == provider_name:
            logger.debug(f"Reusing cached database provider: {provider_name}")
            return _provider_cache

        # Create new provider instance
        if provider_name == "postgresql":
            logger.debug("Creating PostgreSQL provider")
            provider = PostgreSQLProvider()
        elif provider_name == "snowflake":
            logger.debug("Creating Snowflake provider")
            provider = SnowflakeProvider()
        else:
            raise ValueError(
                f"Invalid database provider: '{provider_name}'. "
                "Must be 'postgresql' or 'snowflake'"
            )

        # Cache the provider instance
        _provider_cache = provider
        _cached_provider_name = provider_name
        logger.info(f"Database provider initialized: {provider_name}")

        return provider


def get_database_provider(provider_name: Optional[str] = None) -> DatabaseProvider:
    """
    Module-level factory function for creating database providers.

    This is a convenience wrapper around DatabaseFactory.create_provider.

    Args:
        provider_name: Optional provider name. If not provided,
                      reads from DATABASE_PROVIDER environment variable.

    Returns:
        DatabaseProvider instance for the specified provider

    Raises:
        ValueError: If provider_name is not a valid provider
    """
    return DatabaseFactory.create_provider(provider_name)
