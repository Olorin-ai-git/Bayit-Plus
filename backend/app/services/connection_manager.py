"""
WebSocket Connection Manager for real-time features.

This module now delegates to RedisConnectionManager for cross-instance
support while maintaining the same public API. All existing imports of
`connection_manager` continue to work without changes.
"""

from app.services.redis_connection_manager import (
    RedisConnectionManager,
    redis_connection_manager,
)

# Re-export the RedisConnectionManager as ConnectionManager for backward compat
ConnectionManager = RedisConnectionManager

# Global instance used throughout the codebase
connection_manager = redis_connection_manager
