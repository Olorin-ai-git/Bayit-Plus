"""
Performance optimization module for Olorin application.

This module provides performance management capabilities including:
- Performance optimization system initialization
- Configuration management for performance features
- Lifecycle management for performance monitoring
"""

from .performance_manager import (
    PerformanceManager,
    get_performance_manager,
    initialize_performance_system,
    shutdown_performance_system,
)

__all__ = [
    "initialize_performance_system",
    "get_performance_manager",
    "PerformanceManager",
    "shutdown_performance_system",
]
