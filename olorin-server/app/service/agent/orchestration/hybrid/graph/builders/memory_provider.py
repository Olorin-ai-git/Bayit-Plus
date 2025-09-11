"""
Memory Provider - Memory system setup for hybrid intelligence graph.

This module provides memory persistence configuration for the hybrid 
intelligence investigation graph, supporting both Redis and in-memory fallback.
"""

from typing import Optional, Any

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MemoryProvider:
    """
    Provides memory system configuration for hybrid intelligence graph.
    
    Handles Redis persistence with in-memory fallback for graph state management.
    """
    
    def __init__(self):
        """Initialize memory provider."""
        self.memory_type = None
        self.memory_instance = None
        
    async def create_hybrid_memory(self) -> Any:
        """
        Create memory system for hybrid graph with Redis fallback.
        
        Returns:
            Memory system instance (RedisSaver or MemorySaver)
        """
        try:
            # Try to use Redis for persistence
            memory = await self._create_redis_memory()
            self.memory_type = "redis"
            self.memory_instance = memory
            logger.info("🛡️ Using Redis memory for hybrid graph persistence")
            return memory
            
        except Exception as e:
            logger.warning(f"Redis memory unavailable: {str(e)}")
            # Fallback to in-memory
            memory = self._create_memory_fallback()
            self.memory_type = "memory"
            self.memory_instance = memory
            logger.info("🛡️ Using in-memory storage for hybrid graph (Redis unavailable)")
            return memory
            
    async def _create_redis_memory(self) -> Any:
        """
        Create Redis-based memory system.
        
        Returns:
            RedisSaver instance
            
        Raises:
            Exception: If Redis is not available or configuration fails
        """
        from langgraph.checkpoint.redis import RedisSaver
        from app.service.redis_client import get_redis_client
        from app.service.config import get_settings_for_env
        
        settings = get_settings_for_env()
        redis_client = get_redis_client(settings).get_client()
        
        return RedisSaver(redis_client)
        
    def _create_memory_fallback(self) -> Any:
        """
        Create in-memory fallback system.
        
        Returns:
            MemorySaver instance
        """
        from langgraph.checkpoint.memory import MemorySaver
        
        return MemorySaver()
        
    def get_memory_info(self) -> dict:
        """
        Get information about the current memory configuration.
        
        Returns:
            Dictionary with memory system information
        """
        return {
            "memory_type": self.memory_type,
            "persistence": self.memory_type == "redis",
            "fallback_used": self.memory_type == "memory",
            "memory_instance_type": type(self.memory_instance).__name__ if self.memory_instance else None
        }
        
    def is_persistent(self) -> bool:
        """Check if memory system provides persistence."""
        return self.memory_type == "redis"
        
    def is_redis_available(self) -> bool:
        """Check if Redis memory system is available."""
        return self.memory_type == "redis"