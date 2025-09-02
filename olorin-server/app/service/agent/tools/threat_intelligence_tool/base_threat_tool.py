"""
Base Threat Intelligence Tool

Foundation class for all threat intelligence tools with built-in security,
caching, rate limiting, and integration with Firebase secrets management.
"""

import asyncio
import hashlib
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from ..enhanced_tool_base import EnhancedToolBase, ValidationLevel, RetryStrategy
from app.utils.firebase_secrets import get_firebase_secret

logger = logging.getLogger(__name__)


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
            
            # Check cache first
            cache_key = self._generate_cache_key({"query_type": query_type, **query_data})
            
            if self.config.enable_caching:
                cached_response = await self._get_from_cache(cache_key)
                if cached_response:
                    response = ThreatIntelligenceResponse.model_validate(cached_response)
                    response.cache_hit = True
                    await self._log_threat_query(query_type, query_data, response)
                    return response
            
            # Execute query
            response = await self._execute_threat_query(query_type, query_data)
            response.cache_hit = False
            
            # Cache successful responses
            if self.config.enable_caching and response.success:
                await self._set_cache(cache_key, response.model_dump(), self.config.cache_ttl_seconds)
            
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