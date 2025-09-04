"""
Performance optimization manager for Olorin fraud detection system.

This module handles the initialization, configuration, and lifecycle management
of the performance optimization system integrated with the Olorin application.
"""

import os
from typing import Dict, Any, Optional

from fastapi import FastAPI

# Performance optimization imports
from ..performance_integration import (
    initialize_performance_optimization_system,
    get_performance_optimization_manager,
    PerformanceOptimizationConfig
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PerformanceManager:
    """
    Manages performance optimization system for Olorin application.
    """
    
    def __init__(self):
        self._initialized = False
        self._config: Optional[PerformanceOptimizationConfig] = None
        self._init_result: Optional[Dict[str, Any]] = None
        
    async def initialize(self, app: FastAPI) -> Dict[str, Any]:
        """
        Initialize the performance optimization system.
        
        Args:
            app: FastAPI application instance
            
        Returns:
            Dict containing initialization results
        """
        logger.info("Starting Olorin application with performance optimizations...")
        
        try:
            # Initialize performance optimization system first
            self._config = PerformanceOptimizationConfig(
                database_url=os.getenv("DATABASE_URL", "sqlite:///olorin_fraud_detection.db"),
                redis_host=os.getenv("REDIS_HOST", "localhost"),
                redis_port=int(os.getenv("REDIS_PORT", "6379")),
                max_parallel_agents=int(os.getenv("MAX_PARALLEL_AGENTS", "8")),
                enable_alerts=os.getenv("ENABLE_PERFORMANCE_ALERTS", "true").lower() == "true"
            )
            
            self._init_result = await initialize_performance_optimization_system(self._config)
            
            if self._init_result.get('status') == 'success':
                logger.info("✓ Performance optimization system initialized successfully")
                app.state.performance_optimizations_enabled = True
                app.state.performance_init_result = self._init_result
                
                # Log performance improvements
                improvements = self._init_result.get('target_improvements', {})
                logger.info("Performance targets:")
                for metric, improvement in improvements.items():
                    target_improvement = improvement.get('target_improvement', '0%')
                    logger.info(f"  - {metric}: {target_improvement} improvement target")
                    
                self._initialized = True
            else:
                logger.warning("Performance optimization system initialization failed")
                app.state.performance_optimizations_enabled = False
                app.state.performance_init_error = self._init_result.get('error')
                
        except Exception as e:
            logger.error(f"Failed to initialize performance optimizations: {e}")
            app.state.performance_optimizations_enabled = False
            app.state.performance_init_error = str(e)
            self._init_result = {'status': 'failed', 'error': str(e)}
            
        return self._init_result or {'status': 'failed', 'error': 'Unknown error'}
    
    async def shutdown(self, app: FastAPI) -> Dict[str, Any]:
        """
        Shutdown the performance optimization system.
        
        Args:
            app: FastAPI application instance
            
        Returns:
            Dict containing shutdown results
        """
        logger.info("Shutting down performance optimization system...")
        
        if not self._initialized:
            logger.info("Performance system was not initialized, skipping shutdown")
            return {'status': 'skipped', 'reason': 'not_initialized'}
        
        # Shutdown performance optimization system
        if getattr(app.state, 'performance_optimizations_enabled', False):
            try:
                performance_manager = get_performance_optimization_manager()
                shutdown_result = await performance_manager.shutdown()
                logger.info("Performance optimization system shutdown completed")
                self._initialized = False
                return {'status': 'success', 'details': shutdown_result}
            except Exception as e:
                logger.error(f"Error during performance system shutdown: {e}")
                return {'status': 'error', 'error': str(e)}
        
        return {'status': 'skipped', 'reason': 'not_enabled'}
    
    @property
    def is_initialized(self) -> bool:
        """Check if performance system is initialized."""
        return self._initialized
    
    @property
    def config(self) -> Optional[PerformanceOptimizationConfig]:
        """Get performance optimization configuration."""
        return self._config
    
    @property
    def init_result(self) -> Optional[Dict[str, Any]]:
        """Get initialization result."""
        return self._init_result


# Global performance manager instance
_performance_manager: Optional[PerformanceManager] = None


async def initialize_performance_system(app: FastAPI) -> Dict[str, Any]:
    """
    Initialize the global performance optimization system.
    
    Args:
        app: FastAPI application instance
        
    Returns:
        Dict containing initialization results
    """
    global _performance_manager
    
    if _performance_manager is None:
        _performance_manager = PerformanceManager()
    
    return await _performance_manager.initialize(app)


async def shutdown_performance_system(app: FastAPI) -> Dict[str, Any]:
    """
    Shutdown the global performance optimization system.
    
    Args:
        app: FastAPI application instance
        
    Returns:
        Dict containing shutdown results
    """
    global _performance_manager
    
    if _performance_manager is None:
        return {'status': 'skipped', 'reason': 'not_initialized'}
    
    return await _performance_manager.shutdown(app)


def get_performance_manager() -> Optional[PerformanceManager]:
    """
    Get the global performance manager instance.
    
    Returns:
        PerformanceManager instance or None if not initialized
    """
    return _performance_manager