"""
Generic async event bus infrastructure.

Provides a reusable queue-per-subscriber pattern for broadcasting
events to multiple consumers with backpressure handling.
"""

from app.services.event_bus.base import AsyncEventBus

__all__ = ["AsyncEventBus"]
