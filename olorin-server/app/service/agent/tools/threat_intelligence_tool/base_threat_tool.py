"""
Base Threat Intelligence Tool

Foundation class for all threat intelligence tools with built-in security,
caching, rate limiting, and integration with Firebase secrets management.
"""

import asyncio
import hashlib
import json
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..enhanced_tool_base import EnhancedToolBase, ValidationLevel, RetryStrategy
from ..enhanced_cache import EnhancedCache, EvictionPolicy
from app.utils.firebase_secrets import get_firebase_secret
from app.service.redis_client import get_redis_client
from app.service.config import get_settings
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ThreatIntelligenceConfig(BaseModel):
    """Configuration for threat intelligence tools."""
    
    api_key_secret_name: str = Field(..., description="Firebase secret name for API key")
    cache_ttl_seconds: int = Field(default=3600, description="Cache TTL in seconds")
    rate_limit_requests: int = Field(default=1000, description="Max requests per day")
    rate_limit_window: int = Field(default=86400, description="Rate limit window in seconds")
    timeout_seconds: int = Field(default=30, description="Request timeout")
    max_retries: int = Field(default=3, description="Maximum retry attempts")
    enable_caching: bool = Field(default=True, description="Enable response caching")


class ThreatIntelligenceResponse(BaseModel):
    """Standard response format for threat intelligence queries."""
    
    success: bool = Field(..., description="Whether the query was successful")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Response data")
    error: Optional[str] = Field(default=None, description="Error message if any")
    source: str = Field(..., description="Source of the intelligence data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    cache_hit: bool = Field(default=False, description="Whether response came from cache")
    confidence_score: Optional[float] = Field(default=None, description="Confidence score 0-1")


class BaseThreatIntelligenceTool(EnhancedToolBase):
    """
    Base class for threat intelligence tools with enterprise-grade features.
    
    Features:
    - Firebase secrets integration for API keys
    - Intelligent caching with Redis
    - Rate limiting with quota management
    - Comprehensive error handling and retry logic
    - Security audit logging
    - Performance monitoring
    """
    
    def __init__(
        self,
        name: str,
        description: str,
        config: ThreatIntelligenceConfig,
        **kwargs
    ):
        """Initialize threat intelligence tool."""
        super().__init__(
            name=name,
            description=description,
            validation_level=ValidationLevel.COMPREHENSIVE,
            retry_strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            cache_enabled=config.enable_caching,
            cache_ttl=config.cache_ttl_seconds,
            timeout=config.timeout_seconds,
            **kwargs
        )
        
        self.config = config
        self._api_key: Optional[str] = None
        self._rate_limiter = RateLimiter(
            max_requests=config.rate_limit_requests,
            window_seconds=config.rate_limit_window
        )
        
        # Initialize enhanced caching system
        self._cache = self._initialize_cache()
    
    def _initialize_cache(self) -> EnhancedCache:
        """Initialize enhanced caching system with Redis backend."""
        try:
            # Get Redis client if available
            redis_client = None
            if self.config.enable_caching:
                try:
                    settings = get_settings()
                    redis_client = get_redis_client(settings).get_client()
                except Exception as e:
                    logger.warning(f"Redis not available, using local cache only: {e}")
            
            # Configure cache for threat intelligence
            cache = EnhancedCache(
                max_size=10000,  # 10K entries
                max_memory_mb=50,  # 50MB memory limit
                default_ttl_seconds=self.config.cache_ttl_seconds,
                eviction_policy=EvictionPolicy.LRU,
                cleanup_interval_seconds=300,  # 5 minutes
                enable_content_deduplication=True,
                enable_compression=False,
                redis_client=redis_client
            )
            
            logger.info(f"Initialized enhanced cache for {self.name} with Redis: {redis_client is not None}")
            return cache
            
        except Exception as e:
            logger.error(f"Failed to initialize cache for {self.name}: {e}")
            # Return a basic cache without Redis
            return EnhancedCache(
                max_size=1000,
                max_memory_mb=10,
                default_ttl_seconds=self.config.cache_ttl_seconds,
                eviction_policy=EvictionPolicy.LRU,
                enable_content_deduplication=False
            )
    
    async def _get_api_key(self) -> str:
        """Get API key from Firebase secrets."""
        if self._api_key is None:
            try:
                self._api_key = await get_firebase_secret(self.config.api_key_secret_name)
                if not self._api_key:
                    raise ValueError(f"API key not found in Firebase secrets: {self.config.api_key_secret_name}")
            except Exception as e:
                logger.error(f"Failed to retrieve API key from Firebase secrets: {e}")
                raise
        
        return self._api_key
    
    def _generate_cache_key(self, query_data: Dict[str, Any]) -> str:
        """Generate cache key for query data."""
        # Create deterministic hash from query parameters
        query_str = json.dumps(query_data, sort_keys=True)
        cache_key = hashlib.sha256(f"{self.name}:{query_str}".encode()).hexdigest()
        return f"threat_intel:{cache_key}"
    
    async def _check_rate_limit(self) -> bool:
        """Check if request is within rate limits."""
        return await self._rate_limiter.can_make_request()
    
    async def _log_threat_query(
        self, 
        query_type: str, 
        query_data: Dict[str, Any], 
        response: ThreatIntelligenceResponse
    ) -> None:
        """Log threat intelligence query for audit purposes."""
        audit_log = {
            "tool": self.name,
            "query_type": query_type,
            "query_data": query_data,
            "success": response.success,
            "source": response.source,
            "timestamp": response.timestamp.isoformat(),
            "cache_hit": response.cache_hit,
            "confidence_score": response.confidence_score
        }
        
        # Log to structured logging system
        logger.info(f"Threat intelligence query: {json.dumps(audit_log)}")
    
    @abstractmethod
    async def _execute_threat_query(
        self, 
        query_type: str, 
        query_data: Dict[str, Any]
    ) -> ThreatIntelligenceResponse:
        """Execute threat intelligence query. Must be implemented by subclasses."""
        pass
    
    async def _execute_impl(self, input_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Any:
        """Implement EnhancedToolBase interface."""
        # Bridge to threat intelligence query system
        query_type = input_data.get("query_type", "default")
        response = await self.execute_threat_intelligence_query(query_type, input_data)
        
        if response.success:
            return response.data
        else:
            raise Exception(response.error or "Unknown threat intelligence error")

    async def execute_threat_intelligence_query(
        self,
        query_type: str,
        query_data: Dict[str, Any]
    ) -> ThreatIntelligenceResponse:
        """
        Execute threat intelligence query with full error handling and caching.
        
        Args:
            query_type: Type of query (e.g., 'ip_reputation', 'bulk_check')
            query_data: Query parameters
            
        Returns:
            ThreatIntelligenceResponse with results
        """
        start_time = datetime.utcnow()
        
        try:
            # Check rate limits
            if not await self._check_rate_limit():
                return ThreatIntelligenceResponse(
                    success=False,
                    error="Rate limit exceeded",
                    source=self.name,
                    timestamp=start_time
                )
            
            # Check enhanced cache first
            cache_key = self._generate_cache_key({"query_type": query_type, **query_data})
            
            if self.config.enable_caching:
                cached_data = await self._cache.get(cache_key)
                if cached_data:
                    response = ThreatIntelligenceResponse.model_validate(cached_data)
                    response.cache_hit = True
                    await self._log_threat_query(query_type, query_data, response)
                    return response
            
            # Execute query
            response = await self._execute_threat_query(query_type, query_data)
            response.cache_hit = False
            
            # Cache successful responses using enhanced cache
            if self.config.enable_caching and response.success:
                # Tag cache entries for intelligent invalidation
                cache_tags = {f"tool:{self.name}", f"query_type:{query_type}"}
                if "ip_address" in query_data:
                    cache_tags.add(f"ip:{query_data['ip_address']}")
                
                await self._cache.set(
                    key=cache_key,
                    value=response.model_dump(),
                    ttl_seconds=self.config.cache_ttl_seconds,
                    tags=cache_tags
                )
            
            # Log query
            await self._log_threat_query(query_type, query_data, response)
            
            return response
            
        except Exception as e:
            logger.error(f"Threat intelligence query failed: {e}")
            return ThreatIntelligenceResponse(
                success=False,
                error=str(e),
                source=self.name,
                timestamp=start_time
            )


class RateLimiter:
    """Simple rate limiter for API requests."""
    
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = []
    
    async def can_make_request(self) -> bool:
        """Check if a request can be made within rate limits."""
        now = datetime.utcnow()
        
        # Remove old requests outside the window
        cutoff = now - timedelta(seconds=self.window_seconds)
        self.requests = [req_time for req_time in self.requests if req_time > cutoff]
        
        # Check if we can make another request
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        
        return False
    
    async def get_cache_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        return self._cache.get_statistics()
    
    async def invalidate_cache_by_tag(self, tag: str) -> int:
        """Invalidate cache entries by tag."""
        return await self._cache.invalidate_by_tag(tag)
    
    async def clear_cache(self) -> None:
        """Clear all cache entries for this tool."""
        await self._cache.invalidate_by_tag(f"tool:{self.name}")
    
    async def warm_cache_with_data(self, key_value_pairs: Dict[str, Any]) -> int:
        """Warm cache with predefined data."""
        warmed = 0
        for key, value in key_value_pairs.items():
            if await self._cache.set(key, value):
                warmed += 1
        return warmed