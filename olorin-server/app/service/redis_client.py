"""
Redis Client Module for Redis Cloud Integration
Uses redis-py library with proper connection parameters for Redis Cloud.
"""

import os
import logging
from typing import Optional
import redis
from redis import Redis
from redis.exceptions import RedisError, ConnectionError

from app.service.config import SvcSettings
from app.service.database_config import get_redis_api_key

logger = logging.getLogger(__name__)


class RedisCloudClient:
    """Redis Cloud client with proper authentication and connection management."""
    
    def __init__(self, settings: SvcSettings):
        """Initialize Redis Cloud client with settings.
        
        Args:
            settings: Application settings configuration
        """
        self.settings = settings
        self._client: Optional[Redis] = None
        self._connected = False
        
    def get_client(self) -> Redis:
        """Get or create Redis client instance.
        
        Returns:
            Redis client instance
            
        Raises:
            ConnectionError: If unable to connect to Redis
        """
        if not self._client or not self._connected:
            self._client = self._create_client()
            self._test_connection()
        return self._client
    
    def _create_client(self) -> Redis:
        """Create Redis client with proper configuration.
        
        Returns:
            Configured Redis client instance
        """
        # Get Redis API key from Firebase secrets
        api_key = get_redis_api_key(self.settings)
        
        if not api_key:
            logger.warning("Redis API key not found, attempting connection without authentication")
        
        # Use Redis Cloud connection parameters
        host = getattr(self.settings, 'redis_host', 'redis-13848.c253.us-central1-1.gce.redns.redis-cloud.com')
        port = getattr(self.settings, 'redis_port', 13848)
        username = getattr(self.settings, 'redis_username', 'default')
        
        # Create Redis client with recommended parameters
        client_params = {
            'host': host,
            'port': port,
            'decode_responses': True,  # Decode responses to strings
            'socket_connect_timeout': 5,
            'socket_timeout': 5,
            'retry_on_timeout': True,
            'health_check_interval': 30,
        }
        
        # Add authentication if API key is available
        if api_key:
            client_params['username'] = username
            client_params['password'] = api_key
            logger.info(f"Connecting to Redis Cloud at {host}:{port} with authentication")
        else:
            logger.info(f"Connecting to Redis at {host}:{port} without authentication")
        
        return redis.Redis(**client_params)
    
    def _test_connection(self) -> None:
        """Test Redis connection and set connected flag.
        
        Raises:
            ConnectionError: If unable to connect to Redis
        """
        try:
            # Test connection with ping
            self._client.ping()
            self._connected = True
            logger.info("Successfully connected to Redis Cloud")
            
            # Log Redis server info (without sensitive data)
            try:
                info = self._client.info('server')
                logger.info(f"Connected to Redis version: {info.get('redis_version', 'unknown')}")
            except Exception:
                # Info command might not be available in all Redis configurations
                pass
                
        except ConnectionError as e:
            self._connected = False
            logger.error(f"Failed to connect to Redis: {e}")
            raise ConnectionError(f"Unable to connect to Redis Cloud: {e}")
        except RedisError as e:
            self._connected = False
            logger.error(f"Redis error during connection test: {e}")
            raise ConnectionError(f"Redis error: {e}")
    
    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set a key-value pair in Redis.
        
        Args:
            key: The key to set
            value: The value to set
            ex: Optional expiration time in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            client = self.get_client()
            result = client.set(key, value, ex=ex)
            return bool(result)
        except RedisError as e:
            logger.error(f"Failed to set key '{key}': {e}")
            return False
    
    def get(self, key: str) -> Optional[str]:
        """Get a value from Redis.
        
        Args:
            key: The key to retrieve
            
        Returns:
            The value if found, None otherwise
        """
        try:
            client = self.get_client()
            return client.get(key)
        except RedisError as e:
            logger.error(f"Failed to get key '{key}': {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a key from Redis.
        
        Args:
            key: The key to delete
            
        Returns:
            True if key was deleted, False otherwise
        """
        try:
            client = self.get_client()
            result = client.delete(key)
            return bool(result)
        except RedisError as e:
            logger.error(f"Failed to delete key '{key}': {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if a key exists in Redis.
        
        Args:
            key: The key to check
            
        Returns:
            True if key exists, False otherwise
        """
        try:
            client = self.get_client()
            return bool(client.exists(key))
        except RedisError as e:
            logger.error(f"Failed to check key existence '{key}': {e}")
            return False
    
    def close(self) -> None:
        """Close Redis connection."""
        if self._client:
            try:
                self._client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.warning(f"Error closing Redis connection: {e}")
            finally:
                self._client = None
                self._connected = False


# Global Redis client instance
_redis_client: Optional[RedisCloudClient] = None


def get_redis_client(settings: SvcSettings) -> RedisCloudClient:
    """Get global Redis client instance.
    
    Args:
        settings: Application settings configuration
        
    Returns:
        RedisCloudClient instance
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisCloudClient(settings)
    return _redis_client


def test_redis_connection(settings: SvcSettings) -> bool:
    """Test Redis connection with provided settings.
    
    Args:
        settings: Application settings configuration
        
    Returns:
        True if connection successful, False otherwise
    """
    try:
        client = RedisCloudClient(settings)
        redis_client = client.get_client()
        
        # Test basic operations
        test_key = "olorin:test:connection"
        test_value = "test_successful"
        
        # Set a test value
        success = client.set(test_key, test_value, ex=60)  # Expire after 60 seconds
        if not success:
            logger.error("Failed to set test key")
            return False
        
        # Get the test value
        retrieved = client.get(test_key)
        if retrieved != test_value:
            logger.error(f"Retrieved value '{retrieved}' doesn't match expected '{test_value}'")
            return False
        
        # Clean up
        client.delete(test_key)
        client.close()
        
        logger.info("Redis connection test successful")
        return True
        
    except Exception as e:
        logger.error(f"Redis connection test failed: {e}")
        return False