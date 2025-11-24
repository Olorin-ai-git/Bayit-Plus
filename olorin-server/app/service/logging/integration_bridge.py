"""
Enhanced Unified Logging Integration Bridge

This module provides seamless integration between the new unified logging system
and existing Olorin server logging mechanisms, ensuring complete backward compatibility
while enabling modern structured logging features.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import logging
import argparse
from typing import Optional, Any, Dict
from contextlib import contextmanager

from .unified_logging_core import get_unified_logging_core, configure_unified_logging
from .logging_config_manager import LoggingConfigManager
from ..logging_helper import RequestFormatter, logging_context, _logging_request_context


class UnifiedLoggingBridge:
    """
    Enhanced integration bridge for unified logging system.
    
    Provides seamless integration with existing logging infrastructure while
    enabling command-line configuration and structured logging features.
    """
    
    def __init__(self):
        self._config_manager = LoggingConfigManager()
        self._initialized = False
        self._original_configure_logger = None
        
    def initialize_from_args(self, args: Optional[argparse.Namespace] = None) -> None:
        """
        Initialize unified logging from command-line arguments.
        
        Args:
            args: Parsed command-line arguments with logging configuration
        """
        if self._initialized:
            return
            
        # Load configuration from multiple sources
        config = self._config_manager.load_configuration(args=args)
        
        # Configure unified logging core
        configure_unified_logging(
            log_level=config.log_level,
            log_format=config.log_format,
            log_outputs=config.log_outputs,
            async_logging=config.async_logging,
            buffer_size=config.buffer_size,
            lazy_initialization=config.lazy_initialization,
            suppress_noisy_loggers=config.suppress_noisy_loggers,
            performance_monitoring=config.performance_monitoring,
        )
        
        self._initialized = True
    
    def initialize_from_config(self, log_level: str = "WARNING", **kwargs) -> None:
        """
        Initialize unified logging from configuration parameters.
        
        Args:
            log_level: Logging level
            **kwargs: Additional configuration parameters
        """
        if self._initialized:
            return
            
        # Configure unified logging core directly
        configure_unified_logging(
            log_level=log_level,
            **kwargs
        )
        
        self._initialized = True
    
    def get_enhanced_logger(self, name: str, structured: bool = False):
        """
        Get enhanced logger with backward compatibility.
        
        Args:
            name: Logger name
            structured: Whether to use structured logging
            
        Returns:
            Logger instance with unified configuration
        """
        core = get_unified_logging_core()
        logger = core.get_logger(name, structured=structured)
        
        # Enhance with request context support for backward compatibility
        if not structured:
            self._enhance_logger_with_context(logger)
            
        return logger
    
    def _enhance_logger_with_context(self, logger: logging.Logger):
        """
        Enhance logger with request context support for backward compatibility.
        
        Args:
            logger: Logger instance to enhance
        """
        # Add request context support to existing handlers
        for handler in logger.handlers:
            if not isinstance(handler.formatter, RequestFormatter):
                # Preserve existing formatter format but add context support
                original_format = getattr(handler.formatter, '_fmt', None)
                if original_format and '%(context)s' not in original_format:
                    # Inject context into existing format
                    enhanced_format = original_format.replace(
                        '%(message)s', 
                        '[%(context)s] %(message)s'
                    )
                    handler.setFormatter(RequestFormatter(enhanced_format))
    
    def configure_legacy_logging(self, app: Any) -> None:
        """
        Configure legacy logging system with unified logging integration.
        
        This method maintains backward compatibility with the existing
        configure_logger function while enabling unified logging features.
        
        Args:
            app: FastAPI application instance
        """
        # Initialize unified logging if not already done
        if not self._initialized:
            # Use log level from app config if available
            log_level = getattr(app.state.config, 'log_level', 'WARNING')
            self.initialize_from_config(log_level=log_level)
        
        # Create unified handler with request context support
        core = get_unified_logging_core()
        unified_logger = core.get_logger('olorin.server')
        
        # Maintain the existing RequestFormatter behavior
        handler = logging.StreamHandler()
        formatter = RequestFormatter(
            "[%(asctime)s] %(levelname)s [%(context)s] module=%(module)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
        handler.setFormatter(formatter)
        
        # Use the log level from unified logging configuration, not app config
        core = get_unified_logging_core()
        level = getattr(logging, core.get_current_log_level().upper())
        
        # Configure root logger with unified settings
        root = logging.getLogger()
        
        # Remove existing handlers to avoid duplicates
        for h in root.handlers[:]:
            root.removeHandler(h)
            
        root.addHandler(handler)
        root.setLevel(level)

        # Set LangGraph internal logging to DEBUG level to reduce noise
        langgraph_logger = logging.getLogger('langgraph')
        langgraph_logger.setLevel(logging.DEBUG)

        # Also update all existing loggers to respect the new level
        self._update_existing_loggers(level)
    
    def _update_existing_loggers(self, level: int):
        """Update all existing loggers to use the unified log level."""
        import logging
        
        # Update all existing loggers
        for name in logging.Logger.manager.loggerDict:
            logger = logging.getLogger(name)
            if logger.handlers:  # Only update loggers that have handlers
                logger.setLevel(level)
        
        # Also configure structlog if it's been initialized
        try:
            import structlog
            # Force structlog to respect the standard library logging level
            structlog.configure(
                wrapper_class=structlog.stdlib.BoundLogger,
                logger_factory=structlog.stdlib.LoggerFactory(),
                cache_logger_on_first_use=True,
            )
        except ImportError:
            pass
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get unified logging performance statistics."""
        core = get_unified_logging_core()
        return core.get_performance_stats()
    
    @contextmanager
    def performance_context(self, operation: str):
        """Context manager for performance monitoring."""
        core = get_unified_logging_core()
        with core.performance_context(operation):
            yield
    
    def shutdown(self):
        """Shutdown unified logging system."""
        if self._initialized:
            core = get_unified_logging_core()
            core.shutdown()
            self._initialized = False


# Global bridge instance
_unified_bridge: Optional[UnifiedLoggingBridge] = None


def get_unified_bridge() -> UnifiedLoggingBridge:
    """Get the global unified logging bridge instance."""
    global _unified_bridge
    if _unified_bridge is None:
        _unified_bridge = UnifiedLoggingBridge()
    return _unified_bridge


def configure_unified_bridge_from_args(args: Optional[argparse.Namespace] = None) -> None:
    """
    Configure unified logging bridge from command-line arguments.
    
    Args:
        args: Parsed command-line arguments
    """
    bridge = get_unified_bridge()
    bridge.initialize_from_args(args)


def configure_unified_bridge_from_config(**kwargs) -> None:
    """
    Configure unified logging bridge from configuration parameters.
    
    Args:
        **kwargs: Configuration parameters
    """
    bridge = get_unified_bridge()
    bridge.initialize_from_config(**kwargs)


def get_bridge_logger(name: str, structured: bool = False):
    """
    Get logger through unified bridge.
    
    Args:
        name: Logger name
        structured: Whether to use structured logging
        
    Returns:
        Logger instance
    """
    bridge = get_unified_bridge()
    return bridge.get_enhanced_logger(name, structured=structured)


def bridge_configure_logger(app: Any) -> None:
    """
    Bridge function for legacy configure_logger compatibility.
    
    Args:
        app: FastAPI application instance
    """
    bridge = get_unified_bridge()
    bridge.configure_legacy_logging(app)


# Preserve backward compatibility with existing logging context
__all__ = [
    'UnifiedLoggingBridge',
    'get_unified_bridge',
    'configure_unified_bridge_from_args',
    'configure_unified_bridge_from_config',
    'get_bridge_logger',
    'bridge_configure_logger',
    'logging_context',  # Re-export from logging_helper
]