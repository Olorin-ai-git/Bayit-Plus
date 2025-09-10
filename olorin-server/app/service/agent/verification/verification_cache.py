#!/usr/bin/env python3
"""
Verification Cache System

High-performance caching for verification results with intelligent
cache management, Redis integration, and memory optimization.

Author: Gil Klainert
Date: 2025-01-10
"""

import asyncio
import hashlib
import json
import logging
import pickle
import time
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

from langchain_core.messages import BaseMessage

from .verification_config import VerificationConfig, get_verification_config

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Represents a cached verification result."""
    key: str
    verification_result: Dict[str, Any]
    created_at: float
    access_count: int
    last_accessed: float
    size_bytes: int
    model_used: str
    confidence_score: float


class VerificationCache:
    """
    High-performance caching system for verification results.
    
    Features:
    - Intelligent cache key generation based on semantic content
    - LRU eviction with size-based cleanup
    - Redis integration with memory fallback
    - Cache hit/miss analytics
    - Automatic expiration handling
    """
    
    def __init__(self, config: Optional[VerificationConfig] = None):
        """Initialize verification cache."""
        self.config = config or get_verification_config()
        
        # Memory cache for fast access
        self.memory_cache: Dict[str, CacheEntry] = {}
        
        # Redis cache for persistence (will be initialized asynchronously)
        self.redis_client = None
        self.redis_available = False
        
        # Cache statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'redis_hits': 0,
            'redis_misses': 0,
            'total_size_bytes': 0
        }
        
        # Configuration
        self.max_memory_entries = 1000
        self.max_memory_size_mb = 50
        self.ttl_seconds = self.config.cache_ttl_hours * 3600
        self.cleanup_threshold = 0.8
        
        logger.info(f"🗄️  Verification cache initialized - Enabled: {self.config.cache_enabled}")
        
        if self.config.cache_enabled:
            # Initialize Redis connection lazily (only when first needed)
            self._redis_initialized = False
            self._initialization_task = None
    
    async def _ensure_redis_initialized(self):
        """Ensure Redis connection is initialized."""
        if not self.config.cache_enabled:
            return
            
        if self._redis_initialized:
            return
            
        if self._initialization_task is None:
            self._initialization_task = asyncio.create_task(self._initialize_redis())
            
        await self._initialization_task
    
    async def _initialize_redis(self):
        """Initialize Redis connection if available."""
        if self._redis_initialized:
            return
            
        try:
            import redis.asyncio as redis
            
            # Try to connect to Redis
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', '6379')),
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            
            # Test connection
            await self.redis_client.ping()
            self.redis_available = True
            self._redis_initialized = True
            logger.info("✅ Redis cache connection established")
            
        except ImportError:
            logger.warning("⚠️  Redis not available (redis package not installed)")
            self._redis_initialized = True  # Mark as "initialized" even if failed
        except Exception as e:
            logger.warning(f"⚠️  Redis connection failed: {str(e)}")
            self.redis_client = None
            self.redis_available = False
            self._redis_initialized = True  # Mark as "initialized" even if failed
    
    def generate_key(
        self,
        original_request: List[BaseMessage],
        response: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate cache key for request/response pair.
        
        Uses semantic hashing to enable cache hits for similar requests.
        """
        # Extract meaningful content from messages
        request_content = []
        for msg in original_request:
            if hasattr(msg, 'content'):
                # Normalize whitespace and case for better cache hits
                normalized_content = ' '.join(msg.content.strip().lower().split())
                request_content.append(normalized_content)
        
        # Normalize response
        normalized_response = ' '.join(response.strip().lower().split())
        
        # Include relevant context
        context_str = ""
        if context:
            # Only include stable context elements
            stable_context = {
                k: v for k, v in context.items()
                if k in ['tool_name', 'entity_type', 'investigation_type', 'language']
            }
            if stable_context:
                context_str = json.dumps(stable_context, sort_keys=True)
        
        # Create composite key
        key_content = f"req:{':'.join(request_content)}|resp:{normalized_response}|ctx:{context_str}"
        
        # Generate hash
        cache_key = hashlib.sha256(key_content.encode('utf-8')).hexdigest()[:16]
        
        # Add prefix for Redis namespacing
        return f"{self.config.get_cache_key_prefix()}:{cache_key}"
    
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached verification result.
        
        Checks memory cache first, then Redis if available.
        """
        if not self.config.cache_enabled:
            return None
            
        await self._ensure_redis_initialized()
        
        current_time = time.time()
        
        # Check memory cache first (fastest)
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            
            # Check if expired
            if current_time - entry.created_at > self.ttl_seconds:
                await self._remove_from_memory(key)
                self.stats['misses'] += 1
                return None
            
            # Update access statistics
            entry.access_count += 1
            entry.last_accessed = current_time
            
            self.stats['hits'] += 1
            logger.debug(f"🎯 Memory cache hit: {key[:8]}...")
            return entry.verification_result
        
        # Check Redis cache if available
        if self.redis_available and self.redis_client:
            try:
                redis_key = f"verification_cache:{key}"
                cached_data = await self.redis_client.get(redis_key)
                
                if cached_data:
                    result = json.loads(cached_data)
                    
                    # Add to memory cache for future access
                    await self._add_to_memory(key, result, "redis_restore")
                    
                    self.stats['hits'] += 1
                    self.stats['redis_hits'] += 1
                    logger.debug(f"🎯 Redis cache hit: {key[:8]}...")
                    return result
                else:
                    self.stats['redis_misses'] += 1
                    
            except Exception as e:
                logger.warning(f"Redis cache read error: {str(e)}")
        
        self.stats['misses'] += 1
        return None
    
    async def set(
        self,
        key: str,
        verification_result: Dict[str, Any],
        model_used: str = "unknown"
    ) -> bool:
        """
        Cache verification result in both memory and Redis.
        
        Returns:
            True if successfully cached
        """
        if not self.config.cache_enabled:
            return False
            
        await self._ensure_redis_initialized()
        
        try:
            # Add to memory cache
            await self._add_to_memory(key, verification_result, model_used)
            
            # Add to Redis cache if available
            if self.redis_available and self.redis_client:
                await self._add_to_redis(key, verification_result)
            
            logger.debug(f"💾 Cached verification result: {key[:8]}...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache verification result: {str(e)}")
            return False
    
    async def _add_to_memory(
        self,
        key: str,
        verification_result: Dict[str, Any],
        model_used: str
    ):
        """Add entry to memory cache with size management."""
        current_time = time.time()
        
        # Calculate entry size
        serialized = json.dumps(verification_result)
        size_bytes = len(serialized.encode('utf-8'))
        
        # Create cache entry
        entry = CacheEntry(
            key=key,
            verification_result=verification_result,
            created_at=current_time,
            access_count=1,
            last_accessed=current_time,
            size_bytes=size_bytes,
            model_used=model_used,
            confidence_score=verification_result.get('confidence_score', 0.0)
        )
        
        # Check if we need to clean up before adding
        await self._cleanup_memory_if_needed(size_bytes)
        
        # Add to cache
        self.memory_cache[key] = entry
        self.stats['total_size_bytes'] += size_bytes
    
    async def _add_to_redis(self, key: str, verification_result: Dict[str, Any]):
        """Add entry to Redis cache with TTL."""
        try:
            redis_key = f"verification_cache:{key}"
            serialized = json.dumps(verification_result)
            
            await self.redis_client.setex(
                redis_key,
                self.ttl_seconds,
                serialized
            )
            
        except Exception as e:
            logger.warning(f"Failed to cache in Redis: {str(e)}")
    
    async def _cleanup_memory_if_needed(self, new_entry_size: int):
        """Clean up memory cache if it exceeds limits."""
        current_size_mb = self.stats['total_size_bytes'] / (1024 * 1024)
        
        # Check size-based cleanup
        if (current_size_mb + new_entry_size / (1024 * 1024)) > self.max_memory_size_mb:
            await self._cleanup_memory(target_reduction=0.3)
        
        # Check count-based cleanup
        elif len(self.memory_cache) >= self.max_memory_entries * self.cleanup_threshold:
            await self._cleanup_memory(target_reduction=0.2)
    
    async def _cleanup_memory(self, target_reduction: float):
        """
        Clean up memory cache using intelligent eviction.
        
        Uses a combination of LRU, size, and confidence score for eviction decisions.
        """
        if not self.memory_cache:
            return
        
        current_time = time.time()
        entries_to_remove = int(len(self.memory_cache) * target_reduction)
        
        # Score entries for eviction (lower score = more likely to evict)
        scored_entries = []
        for key, entry in self.memory_cache.items():
            # Factors that influence eviction:
            age_hours = (current_time - entry.created_at) / 3600
            recency_hours = (current_time - entry.last_accessed) / 3600
            
            # Lower confidence = more likely to evict
            confidence_factor = entry.confidence_score
            
            # Larger size = more likely to evict
            size_factor = 1.0 / (1.0 + entry.size_bytes / 1024)  # Normalized
            
            # Less accessed = more likely to evict
            access_factor = 1.0 / (1.0 + entry.access_count)
            
            # Combine factors (lower = more likely to evict)
            eviction_score = (
                confidence_factor * 0.3 +
                size_factor * 0.2 +
                access_factor * 0.2 +
                (1.0 / (1.0 + recency_hours)) * 0.3
            )
            
            scored_entries.append((eviction_score, key, entry))
        
        # Sort by eviction score (lowest first)
        scored_entries.sort()
        
        # Remove lowest-scoring entries
        removed_count = 0
        for score, key, entry in scored_entries[:entries_to_remove]:
            await self._remove_from_memory(key)
            removed_count += 1
        
        self.stats['evictions'] += removed_count
        logger.debug(f"🧹 Evicted {removed_count} cache entries")
    
    async def _remove_from_memory(self, key: str):
        """Remove entry from memory cache."""
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            self.stats['total_size_bytes'] -= entry.size_bytes
            del self.memory_cache[key]
    
    async def invalidate(self, key: str) -> bool:
        """Remove specific entry from cache."""
        removed = False
        
        # Remove from memory
        if key in self.memory_cache:
            await self._remove_from_memory(key)
            removed = True
        
        # Remove from Redis
        if self.redis_available and self.redis_client:
            try:
                redis_key = f"verification_cache:{key}"
                deleted = await self.redis_client.delete(redis_key)
                if deleted:
                    removed = True
            except Exception as e:
                logger.warning(f"Failed to invalidate Redis cache: {str(e)}")
        
        if removed:
            logger.debug(f"🗑️  Invalidated cache entry: {key[:8]}...")
        
        return removed
    
    async def clear_all(self) -> int:
        """Clear entire cache and return number of entries removed."""
        removed_count = len(self.memory_cache)
        
        # Clear memory cache
        self.memory_cache.clear()
        self.stats['total_size_bytes'] = 0
        
        # Clear Redis cache
        if self.redis_available and self.redis_client:
            try:
                # Use pattern matching to clear verification cache entries
                pattern = f"verification_cache:{self.config.get_cache_key_prefix()}:*"
                keys = await self.redis_client.keys(pattern)
                if keys:
                    deleted = await self.redis_client.delete(*keys)
                    removed_count += deleted
            except Exception as e:
                logger.warning(f"Failed to clear Redis cache: {str(e)}")
        
        logger.info(f"🧹 Cleared {removed_count} cache entries")
        return removed_count
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        total_requests = self.stats['hits'] + self.stats['misses']
        hit_rate = (self.stats['hits'] / total_requests) if total_requests > 0 else 0.0
        
        redis_requests = self.stats['redis_hits'] + self.stats['redis_misses']
        redis_hit_rate = (self.stats['redis_hits'] / redis_requests) if redis_requests > 0 else 0.0
        
        return {
            'enabled': self.config.cache_enabled,
            'memory_cache': {
                'entries': len(self.memory_cache),
                'size_mb': round(self.stats['total_size_bytes'] / (1024 * 1024), 2),
                'max_entries': self.max_memory_entries,
                'max_size_mb': self.max_memory_size_mb
            },
            'redis_cache': {
                'available': self.redis_available,
                'hits': self.stats['redis_hits'],
                'misses': self.stats['redis_misses'],
                'hit_rate': round(redis_hit_rate * 100, 1)
            },
            'performance': {
                'total_hits': self.stats['hits'],
                'total_misses': self.stats['misses'],
                'hit_rate': round(hit_rate * 100, 1),
                'evictions': self.stats['evictions']
            },
            'ttl_hours': self.config.cache_ttl_hours
        }
    
    def get_top_entries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top cache entries by access count."""
        if not self.memory_cache:
            return []
        
        sorted_entries = sorted(
            self.memory_cache.values(),
            key=lambda e: e.access_count,
            reverse=True
        )
        
        return [
            {
                'key': entry.key[:16] + '...',
                'access_count': entry.access_count,
                'confidence_score': entry.confidence_score,
                'model_used': entry.model_used,
                'size_kb': round(entry.size_bytes / 1024, 1),
                'age_hours': round((time.time() - entry.created_at) / 3600, 1)
            }
            for entry in sorted_entries[:limit]
        ]
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on cache system."""
        health_status = {
            'memory_cache_healthy': True,
            'redis_cache_healthy': self.redis_available,
            'total_entries': len(self.memory_cache),
            'memory_usage_mb': round(self.stats['total_size_bytes'] / (1024 * 1024), 2)
        }
        
        # Test Redis connection if available
        if self.redis_available and self.redis_client:
            try:
                await self.redis_client.ping()
                health_status['redis_cache_healthy'] = True
            except Exception:
                health_status['redis_cache_healthy'] = False
                self.redis_available = False
        
        return health_status


# Import os for Redis configuration
import os