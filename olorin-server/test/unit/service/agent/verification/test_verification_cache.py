#!/usr/bin/env python3
"""
Unit tests for verification cache system.

Tests memory caching, Redis integration, and cache management.
"""

import asyncio
import json
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import HumanMessage, SystemMessage

from app.service.agent.verification.verification_cache import (
    VerificationCache,
    CacheEntry
)
from app.service.agent.verification.verification_config import VerificationConfig


class TestCacheEntry:
    """Test suite for CacheEntry dataclass."""
    
    def test_cache_entry_creation(self):
        """Test creating cache entry."""
        entry = CacheEntry(
            key="test_key",
            verification_result={'is_valid': True, 'confidence_score': 0.85},
            created_at=time.time(),
            access_count=1,
            last_accessed=time.time(),
            size_bytes=1024,
            model_used="gemini-1.5-flash",
            confidence_score=0.85
        )
        
        assert entry.key == "test_key"
        assert entry.verification_result['is_valid'] is True
        assert entry.access_count == 1
        assert entry.size_bytes == 1024
        

class TestVerificationCache:
    """Test suite for VerificationCache class."""
    
    @pytest.fixture
    def mock_config(self):
        """Create mock configuration for testing."""
        config = MagicMock(spec=VerificationConfig)
        config.cache_enabled = True
        config.cache_ttl_hours = 24
        config.get_cache_key_prefix.return_value = "test_verification"
        return config
    
    @pytest.fixture
    def cache_instance(self, mock_config):
        """Create cache instance for testing."""
        with patch('app.service.agent.verification.verification_cache.asyncio.create_task'):
            cache = VerificationCache(config=mock_config)
            return cache
    
    def test_cache_initialization(self, mock_config):
        """Test cache initialization."""
        with patch('app.service.agent.verification.verification_cache.asyncio.create_task'):
            cache = VerificationCache(config=mock_config)
            
            assert cache.config == mock_config
            assert cache.memory_cache == {}
            assert cache.redis_client is None
            assert cache.redis_available is False
            assert cache.max_memory_entries == 1000
            assert cache.max_memory_size_mb == 50
    
    def test_generate_cache_key(self, cache_instance):
        """Test cache key generation."""
        messages = [
            SystemMessage(content="You are a helpful assistant"),
            HumanMessage(content="What is Python?")
        ]
        response = "Python is a programming language"
        context = {'tool_name': 'code_helper', 'language': 'en'}
        
        key1 = cache_instance.generate_key(messages, response, context)
        key2 = cache_instance.generate_key(messages, response, context)
        
        # Same inputs should generate same key
        assert key1 == key2
        assert isinstance(key1, str)
        assert len(key1) > 0
        assert key1.startswith("test_verification:")
        
    def test_generate_key_normalization(self, cache_instance):
        """Test that cache key generation normalizes content."""
        messages1 = [HumanMessage(content="What  is    Python?")]
        messages2 = [HumanMessage(content="what is python?")]
        response1 = "Python  is  a   language"
        response2 = "python is a language"
        
        key1 = cache_instance.generate_key(messages1, response1)
        key2 = cache_instance.generate_key(messages2, response2)
        
        # Should generate same key due to normalization
        assert key1 == key2
        
    @pytest.mark.asyncio
    async def test_memory_cache_set_and_get(self, cache_instance):
        """Test setting and getting from memory cache."""
        key = "test_key"
        verification_result = {
            'is_valid': True,
            'confidence_score': 0.85,
            'explanation': 'Test result'
        }
        
        # Set in cache
        success = await cache_instance.set(key, verification_result, "gemini-1.5-flash")
        assert success is True
        
        # Get from cache
        cached_result = await cache_instance.get(key)
        assert cached_result == verification_result
        
        # Check cache statistics
        assert cache_instance.stats['hits'] == 1
        assert len(cache_instance.memory_cache) == 1
        
    @pytest.mark.asyncio
    async def test_cache_miss(self, cache_instance):
        """Test cache miss behavior."""
        result = await cache_instance.get("nonexistent_key")
        assert result is None
        assert cache_instance.stats['misses'] == 1
        
    @pytest.mark.asyncio
    async def test_cache_expiration(self, cache_instance):
        """Test cache entry expiration."""
        # Set TTL to very short time for testing
        cache_instance.ttl_seconds = 0.1
        
        key = "expiring_key"
        verification_result = {'is_valid': True}
        
        await cache_instance.set(key, verification_result)
        
        # Should be available immediately
        result = await cache_instance.get(key)
        assert result == verification_result
        
        # Wait for expiration
        await asyncio.sleep(0.2)
        
        # Should be expired now
        result = await cache_instance.get(key)
        assert result is None
        
    @pytest.mark.asyncio
    async def test_cache_access_count_update(self, cache_instance):
        """Test that access count is updated on cache hits."""
        key = "access_test_key"
        verification_result = {'is_valid': True}
        
        await cache_instance.set(key, verification_result)
        
        # Access multiple times
        await cache_instance.get(key)
        await cache_instance.get(key)
        await cache_instance.get(key)
        
        # Check that access count increased
        entry = cache_instance.memory_cache[key]
        assert entry.access_count == 4  # 1 from set + 3 from gets
        
    @pytest.mark.asyncio
    async def test_cache_size_management(self, cache_instance):
        """Test cache size-based cleanup."""
        # Set small limits for testing
        cache_instance.max_memory_entries = 3
        cache_instance.cleanup_threshold = 0.5  # Cleanup at 50% of max
        
        # Add entries
        for i in range(5):
            key = f"size_test_key_{i}"
            result = {'is_valid': True, 'data': f'test_data_{i}'}
            await cache_instance.set(key, result)
        
        # Should trigger cleanup due to entry count limit
        assert len(cache_instance.memory_cache) <= cache_instance.max_memory_entries
        
    @pytest.mark.asyncio
    async def test_intelligent_eviction(self, cache_instance):
        """Test intelligent cache eviction based on score."""
        cache_instance.max_memory_entries = 3
        
        # Add entries with different characteristics
        await cache_instance.set("high_confidence", {'confidence_score': 0.95}, "model1")
        await asyncio.sleep(0.01)  # Small delay to differentiate timestamps
        
        await cache_instance.set("medium_confidence", {'confidence_score': 0.75}, "model2") 
        await asyncio.sleep(0.01)
        
        await cache_instance.set("low_confidence", {'confidence_score': 0.45}, "model3")
        
        # Access high confidence multiple times to increase its score
        for _ in range(5):
            await cache_instance.get("high_confidence")
            
        # Add one more entry to trigger eviction
        await cache_instance.set("new_entry", {'confidence_score': 0.8}, "model4")
        
        # Low confidence should be evicted first
        assert "high_confidence" in cache_instance.memory_cache
        assert "low_confidence" not in cache_instance.memory_cache
        
    @pytest.mark.asyncio
    async def test_cache_invalidation(self, cache_instance):
        """Test cache entry invalidation."""
        key = "invalidation_test"
        verification_result = {'is_valid': True}
        
        await cache_instance.set(key, verification_result)
        assert await cache_instance.get(key) is not None
        
        # Invalidate entry
        success = await cache_instance.invalidate(key)
        assert success is True
        
        # Should be gone from cache
        result = await cache_instance.get(key)
        assert result is None
        
    @pytest.mark.asyncio
    async def test_clear_all_cache(self, cache_instance):
        """Test clearing entire cache."""
        # Add multiple entries
        for i in range(3):
            await cache_instance.set(f"clear_test_{i}", {'is_valid': True})
        
        assert len(cache_instance.memory_cache) == 3
        
        # Clear all
        removed_count = await cache_instance.clear_all()
        assert removed_count == 3
        assert len(cache_instance.memory_cache) == 0
        
    def test_cache_statistics(self, cache_instance):
        """Test cache statistics reporting."""
        stats = cache_instance.get_cache_stats()
        
        assert 'enabled' in stats
        assert 'memory_cache' in stats
        assert 'redis_cache' in stats
        assert 'performance' in stats
        assert 'ttl_hours' in stats
        
        assert stats['enabled'] is True
        assert isinstance(stats['memory_cache']['entries'], int)
        assert isinstance(stats['performance']['hit_rate'], (int, float))
        
    def test_get_top_entries(self, cache_instance):
        """Test getting top cache entries by access count."""
        # Initially empty
        top_entries = cache_instance.get_top_entries(limit=5)
        assert len(top_entries) == 0
        
    @pytest.mark.asyncio
    async def test_health_check(self, cache_instance):
        """Test cache health check."""
        health = await cache_instance.health_check()
        
        assert 'memory_cache_healthy' in health
        assert 'redis_cache_healthy' in health
        assert 'total_entries' in health
        assert 'memory_usage_mb' in health
        
        assert health['memory_cache_healthy'] is True
        assert isinstance(health['total_entries'], int)
        
    @pytest.mark.asyncio
    async def test_redis_integration_disabled(self, cache_instance):
        """Test behavior when Redis is not available."""
        # Redis should be disabled by default in tests
        assert cache_instance.redis_available is False
        assert cache_instance.redis_client is None
        
        # Cache operations should still work with memory only
        key = "redis_test"
        result = {'is_valid': True}
        
        success = await cache_instance.set(key, result)
        assert success is True
        
        cached_result = await cache_instance.get(key)
        assert cached_result == result
        
    @pytest.mark.asyncio  
    async def test_cache_disabled(self, mock_config):
        """Test cache behavior when disabled."""
        mock_config.cache_enabled = False
        
        with patch('app.service.agent.verification.verification_cache.asyncio.create_task'):
            cache = VerificationCache(config=mock_config)
            
            # All operations should return None/False when disabled
            success = await cache.set("test", {'is_valid': True})
            assert success is False
            
            result = await cache.get("test")
            assert result is None


class TestVerificationCacheRedisIntegration:
    """Test Redis integration for verification cache."""
    
    @pytest.mark.asyncio
    async def test_redis_connection_failure(self, mock_config):
        """Test handling of Redis connection failure."""
        with patch('app.service.agent.verification.verification_cache.asyncio.create_task') as mock_task:
            cache = VerificationCache(config=mock_config)
            
            # Mock Redis connection failure
            async def mock_redis_init():
                cache.redis_available = False
                cache.redis_client = None
                
            mock_task.assert_called_once()
            # The task would handle Redis initialization
            
            assert cache.redis_available is False
            
    @pytest.mark.asyncio
    async def test_redis_operations_with_failure(self, cache_instance):
        """Test cache operations when Redis operations fail."""
        # Mock a failed Redis client
        mock_redis = AsyncMock()
        mock_redis.get.side_effect = Exception("Redis connection error")
        mock_redis.setex.side_effect = Exception("Redis connection error")
        
        cache_instance.redis_client = mock_redis
        cache_instance.redis_available = True
        
        # Cache operations should still work with memory fallback
        key = "redis_failure_test"
        result = {'is_valid': True}
        
        success = await cache_instance.set(key, result)
        assert success is True  # Should succeed with memory cache
        
        cached_result = await cache_instance.get(key)
        assert cached_result == result  # Should get from memory
        
    def test_cache_key_prefix_configuration(self, cache_instance):
        """Test cache key prefix configuration."""
        messages = [HumanMessage(content="Test")]
        response = "Test response"
        
        key = cache_instance.generate_key(messages, response)
        
        # Should include the configured prefix
        assert key.startswith("test_verification:")
        
    @pytest.mark.asyncio
    async def test_concurrent_cache_access(self, cache_instance):
        """Test concurrent cache access operations."""
        key = "concurrent_test"
        result = {'is_valid': True}
        
        # Simulate concurrent set and get operations
        async def set_operation():
            return await cache_instance.set(key, result)
            
        async def get_operation():
            await asyncio.sleep(0.01)  # Small delay
            return await cache_instance.get(key)
        
        # Run operations concurrently
        set_task = asyncio.create_task(set_operation())
        get_task = asyncio.create_task(get_operation())
        
        set_success, get_result = await asyncio.gather(set_task, get_task)
        
        assert set_success is True
        # get_result might be None if it executes before set completes
        # but should not cause any errors
        
    @pytest.mark.asyncio
    async def test_memory_usage_tracking(self, cache_instance):
        """Test memory usage tracking in cache statistics."""
        # Add some entries
        for i in range(3):
            key = f"memory_test_{i}"
            result = {'is_valid': True, 'data': 'x' * 1000}  # ~1KB each
            await cache_instance.set(key, result)
        
        stats = cache_instance.get_cache_stats()
        memory_mb = stats['memory_cache']['size_mb']
        
        # Should show some memory usage
        assert memory_mb > 0
        assert memory_mb < 1  # Should be less than 1MB for test data