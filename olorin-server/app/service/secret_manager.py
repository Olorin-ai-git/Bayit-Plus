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
import structlog

logger = structlog.get_logger(__name__)


class SecretManagerClient:
    """
    Client for accessing secrets from Firebase Secret Manager.
    
    Provides time-based caching with TTL, error handling, and environment 
    variable fallback for local development and testing.
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
            self._client = secretmanager.SecretManagerServiceClient()
            logger.info("Secret Manager client initialized", project_id=self.project_id)
        except Exception as e:
            logger.warning(
                "Failed to initialize Secret Manager client, will use environment fallback",
                error=str(e)
            )
    
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
                logger.debug("Using cached secret", 
                           ttl_remaining=int(expiry_time - time.time()))
                return cached_value
            else:
                # Cache expired, remove it
                del self._cache[cache_key]
                logger.debug("Cache expired for secret")
        
        # Check for environment variable override
        env_var = self._get_env_var_name(secret_name)
        env_value = os.getenv(env_var)
        
        if env_value:
            logger.debug("Using environment override for configuration")
            # Cache the env value too
            self._cache[cache_key] = (env_value, time.time() + self.cache_ttl)
            return env_value
        
        # If no client available (local dev without GCP), return None
        if not self._client:
            logger.debug("No Secret Manager client available, checking env fallback")
            return None
        
        # Try to get from Secret Manager
        try:
            # Build the resource name using Firebase format
            name = f"projects/{self.project_id}/secrets/{firebase_secret_name}/versions/{version}"
            
            # Access the secret
            response = self._client.access_secret_version(request={"name": name})
            secret_value = response.payload.data.decode("UTF-8")
            
            # Cache the secret with TTL
            self._cache[cache_key] = (secret_value, time.time() + self.cache_ttl)
            
            logger.debug("Successfully retrieved secret from Secret Manager")
            return secret_value
            
        except google_exceptions.NotFound:
            logger.warning("Secret not found in Secret Manager",
                          project_id=self.project_id)
            return None
            
        except google_exceptions.PermissionDenied:
            logger.error("Permission denied accessing secret",
                        project_id=self.project_id)
            return None
            
        except Exception as e:
            logger.error("Error retrieving secret from Secret Manager",
                        error=str(e))
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
    
    def get_secret_with_fallback(self, 
                                  secret_name: str, 
                                  env_var: Optional[str] = None,
                                  default: Optional[str] = None) -> Optional[str]:
        """
        Get secret with explicit environment variable fallback and default.
        
        Args:
            secret_name: The name/path of the secret
            env_var: Explicit environment variable to check (optional)
            default: Default value if secret not found anywhere (optional)
            
        Returns:
            The secret value, environment value, default, or None
        """
        # Try Secret Manager first
        secret_value = self.get_secret(secret_name)
        if secret_value:
            return secret_value
        
        # Try explicit environment variable
        if env_var:
            env_value = os.getenv(env_var)
            if env_value:
                logger.debug("Using explicit env fallback")
                return env_value
        
        # Return default if provided
        if default:
            logger.debug("Using default value for configuration")
            return default
        
        return None
    
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