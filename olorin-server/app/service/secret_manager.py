"""
Firebase Secret Manager Client for Olorin Service.

This module provides a centralized interface for accessing secrets stored in
Firebase Secret Manager with caching and fallback mechanisms for local development.
"""

import os
import time
from typing import Optional, Dict, Tuple

from google.cloud import secretmanager
from google.api_core import exceptions as google_exceptions
from app.service.logging import get_bridge_logger


def _mask_secret_value(value: str, show_chars: int = 4) -> str:
    """
    Mask secret value for logging, showing only first few characters.
    
    Args:
        value: The secret value to mask
        show_chars: Number of characters to show (default: 4)
        
    Returns:
        Masked secret value for safe logging
    """
    if not value:
        return "[EMPTY]"
    if len(value) <= show_chars:
        return "*" * len(value)
    return value[:show_chars] + "*" * (len(value) - show_chars)

# Configure logging level based on environment variable
_log_level = os.getenv("SECRET_MANAGER_LOG_LEVEL", "INFO").upper()
if _log_level == "SILENT":
    # Special mode to completely silence secret manager logs
    class SilentLogger:
        def debug(self, *args, **kwargs): pass
        def info(self, *args, **kwargs): pass
        def warning(self, *args, **kwargs): pass
        def error(self, *args, **kwargs): pass
    logger = SilentLogger()
else:
    # Use unified logging bridge - this will respect CLI log level
    logger = get_bridge_logger(__name__)


class SecretManagerClient:
    """
    Client for accessing secrets from Firebase Secret Manager.
    
    Provides time-based caching with TTL and error handling.
    No environment variable fallbacks - ALL secrets must come from Firebase.
    """
    
    def __init__(self, project_id: str = "olorin-ai", cache_ttl: int = 300):
        """
        Initialize the Secret Manager client.
        
        Args:
            project_id: The Firebase/GCP project ID containing the secrets.
            cache_ttl: Cache time-to-live in seconds (default: 5 minutes)
        """
        self.project_id = project_id
        self.cache_ttl = cache_ttl
        self._client = None
        self._cache: Dict[str, Tuple[str, float]] = {}  # {secret_name: (value, expiry_time)}
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Secret Manager client with error handling."""
        try:
            logger.info(f"🔐 Initializing Google Cloud Secret Manager client...")
            logger.info(f"   Project: {self.project_id}")
            logger.info(f"   Cache TTL: {self.cache_ttl} seconds")
            logger.info(f"   This requires GCP credentials to be configured...")
            logger.info(f"   Connection may take 10-30 seconds...")
            
            self._client = secretmanager.SecretManagerServiceClient()
            logger.info(f"✅ Secret Manager client initialized for project: {self.project_id}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Secret Manager client - Firebase Secrets Manager is required: {e}")
            raise ValueError(f"Firebase Secret Manager client initialization failed: {e}")
    
    def get_secret(self, secret_name: str, version: str = "latest") -> Optional[str]:
        """
        Get secret value from Firebase Secret Manager with time-based caching.
        
        Args:
            secret_name: The name/path of the secret (e.g., "DATABASE_PASSWORD" or "ANTHROPIC_API_KEY")
            version: The version of the secret to retrieve (default: "latest")
            
        Returns:
            The secret value as a string, or None if not found
        """
        # Convert to Firebase-compatible format (UPPER_SNAKE_CASE)
        firebase_secret_name = self._convert_to_firebase_format(secret_name)
        
        # Check cache first
        cache_key = f"{firebase_secret_name}:{version}"
        if cache_key in self._cache:
            cached_value, expiry_time = self._cache[cache_key]
            if time.time() < expiry_time:
                masked_value = _mask_secret_value(cached_value)
                logger.debug(f"Using cached secret {firebase_secret_name} (value: {masked_value}, TTL remaining: {int(expiry_time - time.time())}s)")
                return cached_value
            else:
                # Cache expired, remove it
                del self._cache[cache_key]
                logger.debug(f"Cache expired for secret {firebase_secret_name}")
        
        # No environment variable fallbacks - must use Firebase Secret Manager
        if not self._client:
            logger.error("No Secret Manager client available - Firebase connection required")
            raise ValueError(
                f"Cannot retrieve secret '{secret_name}' - Firebase Secret Manager connection required. "
                "Ensure GCP credentials are configured."
            )
        
        # Try to get from Secret Manager
        try:
            # Build the resource name using Firebase format
            name = f"projects/{self.project_id}/secrets/{firebase_secret_name}/versions/{version}"
            
            logger.info(f"🔐 Attempting to retrieve secret from Firebase Secret Manager...")
            logger.info(f"   Project: {self.project_id}")
            logger.info(f"   Secret: {firebase_secret_name}")
            logger.info(f"   Version: {version}")
            logger.info(f"   Full path: {name}")
            logger.info(f"   This may take 10-30 seconds...")
            
            # Access the secret
            response = self._client.access_secret_version(request={"name": name})
            secret_value = response.payload.data.decode("UTF-8")
            
            # Cache the secret with TTL
            self._cache[cache_key] = (secret_value, time.time() + self.cache_ttl)
            
            # Log success with masked value for security
            masked_value = _mask_secret_value(secret_value)
            logger.debug(f"Successfully retrieved secret {firebase_secret_name} from Secret Manager (value: {masked_value})")
            return secret_value
            
        except google_exceptions.NotFound:
            logger.warning(f"Secret not found in Secret Manager: {firebase_secret_name} (original: {secret_name}) in project {self.project_id}")
            return None
            
        except google_exceptions.PermissionDenied:
            logger.error(f"Permission denied accessing secret {firebase_secret_name} (original: {secret_name}) in project {self.project_id}")
            return None
            
        except google_exceptions.DeadlineExceeded:
            logger.error(f"⏰ Timeout retrieving secret {firebase_secret_name} (original: {secret_name}) from Secret Manager")
            logger.error("   This usually indicates network connectivity issues or service unavailability")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error retrieving secret {firebase_secret_name} (original: {secret_name}) from Secret Manager: {e}")
            logger.error(f"   Error type: {type(e).__name__}")
            return None
    
    def _convert_to_firebase_format(self, secret_name: str) -> str:
        """
        Convert secret name to Firebase-compatible format (UPPER_SNAKE_CASE).
        
        Args:
            secret_name: The secret name/path (e.g., "olorin/database_password" or "database_password")
            
        Returns:
            Firebase-compatible secret name (e.g., "DATABASE_PASSWORD")
        """
        # Remove any path prefixes (e.g., "olorin/", "production/olorin/")
        if "/" in secret_name:
            # For environment-specific secrets, create a prefix
            parts = secret_name.split("/")
            if parts[0] in ["production", "staging", "development"]:
                # e.g., "production/database_password" -> "PRODUCTION_DATABASE_PASSWORD"
                return "_".join(parts).replace("-", "_").upper()
            else:
                # e.g., "olorin/database_password" -> "DATABASE_PASSWORD"
                secret_name = parts[-1]
        
        # Convert to uppercase and replace hyphens with underscores
        return secret_name.replace("-", "_").upper()
    
    def _get_env_var_name(self, secret_name: str) -> str:
        """
        Convert secret name to environment variable name.
        
        Args:
            secret_name: The secret name/path (e.g., "olorin/database_password")
            
        Returns:
            Environment variable name (e.g., "DATABASE_PASSWORD")
        """
        # Remove prefix if present
        if "/" in secret_name:
            secret_name = secret_name.split("/")[-1]
        
        # Convert to uppercase and replace hyphens with underscores
        return secret_name.replace("-", "_").upper()
    
    def get_secret_or_raise(self, secret_name: str) -> str:
        """
        Get secret from Firebase Secret Manager or raise an error.
        No fallbacks allowed - Firebase is the only source of truth.
        
        Args:
            secret_name: The name/path of the secret
            
        Returns:
            The secret value from Firebase
            
        Raises:
            ValueError: If secret not found in Firebase Secret Manager
        """
        secret_value = self.get_secret(secret_name)
        if not secret_value:
            raise ValueError(
                f"Secret '{secret_name}' not found in Firebase Secret Manager (project: {self.project_id}). "
                "All secrets must be configured in Firebase Secret Manager."
            )
        return secret_value
    
    def clear_cache(self):
        """Clear the TTL cache for secrets."""
        self._cache.clear()
        logger.info("Secret cache cleared")
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        current_time = time.time()
        active_entries = sum(1 for _, (_, expiry) in self._cache.items() if expiry > current_time)
        expired_entries = len(self._cache) - active_entries
        
        return {
            "total_entries": len(self._cache),
            "active_entries": active_entries,
            "expired_entries": expired_entries,
            "cache_ttl_seconds": self.cache_ttl
        }


# Global instance for easy access
_secret_manager = None


def get_secret_manager() -> SecretManagerClient:
    """
    Get the global Secret Manager client instance.
    
    Returns:
        The global SecretManagerClient instance
    """
    global _secret_manager
    if _secret_manager is None:
        project_id = os.getenv("FIREBASE_PROJECT_ID", "olorin-ai")
        _secret_manager = SecretManagerClient(project_id=project_id)
    return _secret_manager