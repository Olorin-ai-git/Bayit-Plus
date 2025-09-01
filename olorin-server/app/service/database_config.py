"""
Database Configuration with Firebase Secrets Integration
Enhanced database connection management using Firebase Secrets Manager.
"""

import os
import logging
from typing import Optional
from urllib.parse import quote_plus

from app.utils.firebase_secrets import get_app_secret
from app.service.config import SvcSettings

logger = logging.getLogger(__name__)

def get_database_password(settings: SvcSettings) -> str:
    """Get database password with Firebase secrets fallback
    
    Args:
        settings: Application settings configuration
        
    Returns:
        Database password string
        
    Raises:
        ValueError: If password cannot be retrieved from any source
    """
    # Try direct environment override first (for local development)
    db_password = settings.database_password
    
    # Try POSTGRES_PASSWORD as fallback
    if not db_password:
        db_password = os.getenv("POSTGRES_PASSWORD")
    
    if not db_password:
        # Retrieve from Firebase Secrets Manager
        try:
            db_password = get_app_secret(settings.database_password_secret)
            if db_password:
                logger.debug("Retrieved database password from Firebase Secrets Manager")
        except Exception as e:
            logger.error(f"Failed to retrieve database password from Firebase: {e}")
    
    if not db_password:
        raise ValueError(
            "Database password not available via environment variables or Firebase Secrets Manager. "
            "Set DB_PASSWORD/POSTGRES_PASSWORD environment variable or ensure Firebase secret exists at: "
            f"{settings.database_password_secret}"
        )
    
    return db_password


def get_redis_api_key(settings: SvcSettings) -> Optional[str]:
    """Get Redis API key with Firebase secrets fallback
    
    Args:
        settings: Application settings configuration
        
    Returns:
        Redis API key string or None if not configured
    """
    # Try direct environment override first (for local development)
    redis_api_key = getattr(settings, 'redis_api_key', None)
    
    if not redis_api_key:
        # Try legacy REDIS_PASSWORD environment variable
        redis_api_key = os.getenv("REDIS_PASSWORD")
    
    if not redis_api_key:
        # Retrieve from Firebase Secrets Manager
        try:
            redis_api_key = get_app_secret(settings.redis_api_key_secret)
            if redis_api_key:
                logger.debug("Retrieved Redis API key from Firebase Secrets Manager")
        except Exception as e:
            logger.warning(f"Failed to retrieve Redis API key from Firebase: {e}")
    
    return redis_api_key


def get_redis_password(settings: SvcSettings) -> Optional[str]:
    """Legacy compatibility function - redirects to get_redis_api_key
    
    Args:
        settings: Application settings configuration
        
    Returns:
        Redis API key string or None if not configured
    """
    return get_redis_api_key(settings)


def get_jwt_secret_key(settings: SvcSettings) -> str:
    """Get JWT secret key with Firebase secrets fallback
    
    Args:
        settings: Application settings configuration
        
    Returns:
        JWT secret key string
        
    Raises:
        ValueError: If JWT secret key cannot be retrieved from any source
    """
    # Try direct environment override first (for local development)
    jwt_secret = settings.jwt_secret_key
    
    if not jwt_secret:
        # Retrieve from Firebase Secrets Manager
        try:
            jwt_secret = get_app_secret(settings.jwt_secret_key_secret)
            if jwt_secret:
                logger.debug("Retrieved JWT secret key from Firebase Secrets Manager")
        except Exception as e:
            logger.error(f"Failed to retrieve JWT secret key from Firebase: {e}")
    
    if not jwt_secret:
        raise ValueError(
            "JWT secret key not available via environment variables or Firebase Secrets Manager. "
            "Set JWT_SECRET_KEY environment variable or ensure Firebase secret exists at: "
            f"{settings.jwt_secret_key_secret}"
        )
    
    # Validate JWT secret key length (minimum 32 characters for security)
    if len(jwt_secret) < 32:
        logger.warning(f"JWT secret key is only {len(jwt_secret)} characters - recommend minimum 32 characters")
    
    return jwt_secret


def get_api_key(settings: SvcSettings, api_name: str) -> Optional[str]:
    """Get API key with Firebase secrets fallback
    
    Args:
        settings: Application settings configuration
        api_name: Name of the API key to retrieve (olorin, databricks)
        
    Returns:
        API key string or None if not found
    """
    api_config = {
        "olorin": {
            "direct_attr": "olorin_api_key", 
            "secret_attr": "olorin_api_key_secret"
        },
        "databricks": {
            "direct_attr": "databricks_token",
            "secret_attr": "databricks_token_secret"
        }
    }
    
    if api_name not in api_config:
        logger.error(f"Unknown API name: {api_name}")
        return None
    
    config = api_config[api_name]
    
    # Try direct environment override first (for local development)
    api_key = getattr(settings, config["direct_attr"], None)
    
    if not api_key:
        # Retrieve from Firebase Secrets Manager
        try:
            secret_path = getattr(settings, config["secret_attr"])
            api_key = get_app_secret(secret_path)
            if api_key:
                logger.debug(f"Retrieved {api_name} API key from Firebase Secrets Manager")
        except Exception as e:
            logger.warning(f"Failed to retrieve {api_name} API key from Firebase: {e}")
    
    return api_key


def build_database_url(settings: SvcSettings, 
                      db_host: Optional[str] = None,
                      db_port: Optional[int] = None, 
                      db_name: Optional[str] = None,
                      db_user: Optional[str] = None) -> str:
    """Build database URL with Firebase-managed password
    
    Args:
        settings: Application settings configuration
        db_host: Database host (defaults to environment variable DB_HOST)
        db_port: Database port (defaults to environment variable DB_PORT)
        db_name: Database name (defaults to environment variable DB_NAME)
        db_user: Database user (defaults to environment variable DB_USER)
        
    Returns:
        Complete database URL string
        
    Raises:
        ValueError: If required parameters are missing
    """
    # Use provided parameters or fall back to environment variables
    host = db_host or os.getenv("DB_HOST", "localhost")
    port = db_port or int(os.getenv("DB_PORT", "5432"))
    database = db_name or os.getenv("DB_NAME", "olorin")
    user = db_user or os.getenv("DB_USER", "olorin_user")
    
    # Get password with Firebase secrets integration
    password = get_database_password(settings)
    
    # URL-encode password to handle special characters
    encoded_password = quote_plus(password)
    
    database_url = f"postgresql://{user}:{encoded_password}@{host}:{port}/{database}"
    
    logger.info(f"Built database URL for {host}:{port}/{database} with user {user}")
    return database_url


def build_redis_url(settings: SvcSettings,
                   redis_host: Optional[str] = None,
                   redis_port: Optional[int] = None,
                   redis_db: Optional[int] = None) -> str:
    """Build Redis URL with Firebase-managed password
    
    Args:
        settings: Application settings configuration
        redis_host: Redis host (defaults to environment variable REDIS_HOST)
        redis_port: Redis port (defaults to environment variable REDIS_PORT)
        redis_db: Redis database number (defaults to 0)
        
    Returns:
        Complete Redis URL string
    """
    # Check for Redis Cloud URL first
    redis_url_env = os.getenv("REDIS_URL")
    if redis_url_env:
        logger.info("Using Redis Cloud URL from REDIS_URL environment variable")
        return redis_url_env
    
    # Use provided parameters or fall back to environment variables
    # Default to Redis Cloud host if not specified
    host = redis_host or os.getenv("REDIS_HOST", "redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com") 
    port = redis_port or int(os.getenv("REDIS_PORT", "13848"))
    db = redis_db or int(os.getenv("REDIS_DB", "0"))
    
    # Get API key with Firebase secrets integration
    api_key = get_redis_api_key(settings)
    
    # Use Redis Cloud connection parameters from settings
    user = getattr(settings, 'redis_username', 'default')
    
    if api_key:
        # URL-encode API key to handle special characters
        encoded_api_key = quote_plus(api_key)
        redis_url = f"redis://{user}:{encoded_api_key}@{host}:{port}/{db}"
        logger.info(f"Built Redis URL for {host}:{port}/{db} with authentication")
    else:
        redis_url = f"redis://{host}:{port}/{db}"
        logger.info(f"Built Redis URL for {host}:{port}/{db} without authentication")
    
    return redis_url


def validate_database_config(settings: SvcSettings) -> bool:
    """Validate database configuration and connectivity to secrets
    
    Args:
        settings: Application settings configuration
        
    Returns:
        True if configuration is valid, False otherwise
    """
    validation_errors = []
    
    try:
        # Test database password retrieval
        db_password = get_database_password(settings)
        if not db_password:
            validation_errors.append("Database password not available")
        elif len(db_password) < 8:
            validation_errors.append("Database password is too short (< 8 characters)")
    except Exception as e:
        validation_errors.append(f"Database password validation failed: {e}")
    
    try:
        # Test JWT secret key retrieval
        jwt_secret = get_jwt_secret_key(settings)
        if not jwt_secret:
            validation_errors.append("JWT secret key not available")
        elif len(jwt_secret) < 32:
            validation_errors.append("JWT secret key is too short (< 32 characters)")
    except Exception as e:
        validation_errors.append(f"JWT secret key validation failed: {e}")
    
    # Test Redis API key retrieval (optional)
    try:
        redis_api_key = get_redis_api_key(settings)
        # Redis API key is optional, so no error if not found
        if redis_api_key and len(redis_api_key) < 8:
            validation_errors.append("Redis API key is too short (< 8 characters)")
    except Exception as e:
        validation_errors.append(f"Redis API key validation failed: {e}")
    
    # Test API key retrieval (optional for development)
    for api_name in ["olorin", "databricks"]:
        try:
            api_key = get_api_key(settings, api_name)
            # API keys are optional, so no error if not found
            if api_key and len(api_key) < 16:
                validation_errors.append(f"{api_name} API key is too short (< 16 characters)")
        except Exception as e:
            validation_errors.append(f"{api_name} API key validation failed: {e}")
    
    if validation_errors:
        logger.error("Database configuration validation failed:")
        for error in validation_errors:
            logger.error(f"  - {error}")
        return False
    
    logger.info("Database configuration validation passed")
    return True


# Legacy compatibility functions for existing code
def get_database_url(settings: SvcSettings) -> str:
    """Legacy compatibility function for getting database URL
    
    Args:
        settings: Application settings configuration
        
    Returns:
        Database URL string
    """
    return build_database_url(settings)


def get_redis_connection_url(settings: SvcSettings) -> str:
    """Legacy compatibility function for getting Redis URL
    
    Args:
        settings: Application settings configuration
        
    Returns:
        Redis URL string
    """
    return build_redis_url(settings)