"""
IP Risk Score Cache Service

Provides Redis caching for MaxMind IP risk scores with 1 hour TTL.
"""

import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from app.service.logging import get_bridge_logger
from app.service.cache.redis_client import CacheService
from app.service.config import SvcSettings

logger = get_bridge_logger(__name__)


class ScoreCache:
    """
    Redis cache for IP risk scores with 1 hour TTL.
    
    Cache key format: maxmind:ip:{ip_address}
    """
    
    CACHE_TTL_SECONDS = 3600  # 1 hour
    CACHE_KEY_PREFIX = "maxmind:ip:"
    
    def __init__(self, cache_service: Optional[CacheService] = None):
        """
        Initialize score cache.
        
        Args:
            cache_service: Optional cache service instance
        """
        self.cache_service = cache_service or CacheService()
    
    def get_cached_score(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """
        Get cached IP risk score.
        
        Args:
            ip_address: IP address to lookup
            
        Returns:
            Cached score data or None if not found/expired
        """
        try:
            cache_key = f"{self.CACHE_KEY_PREFIX}{ip_address}"
            cached_data = self.cache_service.get(cache_key)
            
            if cached_data is None:
                return None
            
            # Validate cached data structure
            if isinstance(cached_data, dict):
                # Check if expired (should be handled by Redis TTL, but verify)
                expires_at_str = cached_data.get("expires_at")
                if expires_at_str:
                    try:
                        expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                        if datetime.utcnow() > expires_at:
                            logger.debug(f"Cached score expired for IP {ip_address}")
                            self.cache_service.delete(cache_key)
                            return None
                    except Exception as e:
                        logger.warning(f"Failed to parse expires_at: {e}")
                
                return cached_data
            
            return None
            
        except Exception as e:
            logger.warning(f"Failed to get cached score for IP {ip_address}: {e}")
            return None
    
    def set_cached_score(
        self,
        ip_address: str,
        score_data: Dict[str, Any]
    ) -> bool:
        """
        Cache IP risk score with 1 hour TTL.
        
        Args:
            ip_address: IP address
            score_data: Score data to cache
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cache_key = f"{self.CACHE_KEY_PREFIX}{ip_address}"
            
            # Add metadata to cached data
            cached_data = {
                **score_data,
                "cached_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(seconds=self.CACHE_TTL_SECONDS)).isoformat()
            }
            
            # Cache with TTL
            success = self.cache_service.set(cache_key, cached_data, ttl=self.CACHE_TTL_SECONDS)
            
            if success:
                logger.debug(f"Cached score for IP {ip_address} with TTL {self.CACHE_TTL_SECONDS}s")
            else:
                logger.warning(f"Failed to cache score for IP {ip_address}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to cache score for IP {ip_address}: {e}")
            return False
    
    def delete_cached_score(self, ip_address: str) -> bool:
        """
        Delete cached score for IP address.
        
        Args:
            ip_address: IP address
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cache_key = f"{self.CACHE_KEY_PREFIX}{ip_address}"
            return self.cache_service.delete(cache_key)
        except Exception as e:
            logger.warning(f"Failed to delete cached score for IP {ip_address}: {e}")
            return False
    
    def is_cached(self, ip_address: str) -> bool:
        """
        Check if IP address has cached score.
        
        Args:
            ip_address: IP address
            
        Returns:
            True if cached, False otherwise
        """
        try:
            cache_key = f"{self.CACHE_KEY_PREFIX}{ip_address}"
            return self.cache_service.exists(cache_key)
        except Exception as e:
            logger.warning(f"Failed to check cache for IP {ip_address}: {e}")
            return False

