"""
Unified Logging Core - Central logging management system

This module provides the core unified logging functionality for the Olorin server,
integrating command-line configuration, multiple format support, and performance optimization
while maintaining backward compatibility with existing specialized logging systems.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import logging
import logging.handlers
import sys
import time
from contextlib import contextmanager
from enum import Enum
from typing import Dict, Optional, Any, Union, List
from functools import lru_cache
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

import structlog
from pythonjsonlogger import jsonlogger


class LogFormat(Enum):
    """Supported logging formats"""
    HUMAN = "human"
    JSON = "json" 
    STRUCTURED = "structured"


class LogOutput(Enum):
    """Supported output destinations"""
    CONSOLE = "console"
    FILE = "file"
    JSON_FILE = "json_file"
    STRUCTURED_FILE = "structured_file"


class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output with consistent timestamps"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[34m',     # Blue
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def __init__(self, fmt=None, datefmt=None, use_colors=None):
        super().__init__(fmt, datefmt)
        # Auto-detect color support if not specified
        if use_colors is None:
            use_colors = self._supports_color()
        self.use_colors = use_colors
    
    def _supports_color(self) -> bool:
        """Check if terminal supports colors"""
        import os
        # Check environment variables first
        if os.getenv('NO_COLOR'):
            return False
        if os.getenv('FORCE_COLOR'):
            return True
            
        # Force colors for common terminals (be more permissive)
        term = os.getenv('TERM', '')
        if term in ['xterm', 'xterm-256color', 'xterm-color', 'screen', 'screen-256color', 
                    'tmux', 'tmux-256color', 'linux', 'cygwin']:
            return True
            
        # Check if we're in a terminal and not piped
        if hasattr(sys.stdout, 'isatty') and sys.stdout.isatty():
            return True
            
        # Default to True for better user experience
        return True
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors and consistent timestamp"""
        # Format the record normally first
        formatted = super().format(record)
        
        # Apply colors if supported
        if self.use_colors:
            color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
            reset = self.COLORS['RESET']
            
            # Apply color to the level name in the formatted message
            if '[' + record.levelname + ']' in formatted:
                colored_level = f"{color}[{record.levelname}]{reset}"
                formatted = formatted.replace('[' + record.levelname + ']', colored_level)
        
        return formatted


class StructuredFormatter(logging.Formatter):
    """Enhanced structured formatter with metadata and performance metrics"""
    
    def __init__(self, include_context: bool = True, include_performance_metrics: bool = True):
        super().__init__()
        self.include_context = include_context
        self.include_performance_metrics = include_performance_metrics
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with structured data"""
        log_entry = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add context information if available
        if self.include_context and hasattr(record, 'context'):
            log_entry['context'] = record.context
            
        # Add performance metrics if available
        if self.include_performance_metrics and hasattr(record, 'performance_metrics'):
            log_entry['performance_metrics'] = record.performance_metrics
            
        # Add any additional fields from the record
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'context',
                          'performance_metrics']:
                log_entry[key] = value
        
        return json.dumps(log_entry, default=str)


class UnifiedLoggingCore:
    """
    Central unified logging management system
    
    Provides single point of configuration for all logging needs with:
    - Command-line configurable logging levels and formats
    - Dynamic format switching (JSON/human-readable/structured)
    - Performance-optimized logger creation and management
    - Integration with existing specialized loggers
    - Async logging support for high-volume operations
    """
    
    _instance: Optional['UnifiedLoggingCore'] = None
    _lock = threading.Lock()
    
    def __new__(cls) -> 'UnifiedLoggingCore':
        """Singleton pattern to ensure single instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the unified logging core"""
        if hasattr(self, '_initialized'):
            return
            
        self._initialized = True
        self._loggers: Dict[str, logging.Logger] = {}
        self._structlog_loggers: Dict[str, Any] = {}
        self._config: Dict[str, Any] = {}
        self._formatters: Dict[LogFormat, logging.Formatter] = {}
        self._handlers: Dict[LogOutput, logging.Handler] = {}
        self._async_enabled = False
        self._executor: Optional[ThreadPoolExecutor] = None
        self._buffer_size = 1000
        self._lazy_initialization = True
        
        # Performance metrics
        self._logger_creation_count = 0
        self._log_entry_count = 0
        self._last_performance_check = time.time()
        
        # Initialize with default configuration
        self._setup_default_configuration()
        self._setup_formatters()
    
    def _setup_default_configuration(self):
        """Setup default logging configuration"""
        self._config = {
            'log_level': 'WARNING',
            'log_format': LogFormat.HUMAN,
            'log_outputs': [LogOutput.CONSOLE],
            'async_logging': False,
            'buffer_size': 1000,
            'lazy_initialization': True,
            'suppress_noisy_loggers': True,
            'performance_monitoring': True,
        }
    
    def _setup_formatters(self):
        """Setup logging formatters for different formats"""
        self._formatters = {
            LogFormat.HUMAN: ColoredFormatter(
                '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            ),
            LogFormat.JSON: jsonlogger.JsonFormatter(
                '%(asctime)s %(name)s %(levelname)s %(message)s %(context)s'
            ),
            LogFormat.STRUCTURED: StructuredFormatter(
                include_context=True,
                include_performance_metrics=True
            )
        }
    
    def configure(self, 
                  log_level: str = "WARNING",
                  log_format: Union[str, LogFormat] = LogFormat.HUMAN,
                  log_outputs: Optional[List[Union[str, LogOutput]]] = None,
                  async_logging: bool = False,
                  buffer_size: int = 1000,
                  lazy_initialization: bool = True,
                  suppress_noisy_loggers: bool = True,
                  **kwargs) -> None:
        """
        Configure the unified logging system
        
        Args:
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
            log_format: Output format (human, json, structured)
            log_outputs: List of output destinations
            async_logging: Enable asynchronous logging
            buffer_size: Buffer size for async logging
            lazy_initialization: Enable lazy logger initialization
            suppress_noisy_loggers: Suppress verbose third-party loggers
            **kwargs: Additional configuration options
        """
        # Normalize format parameter
        if isinstance(log_format, str):
            log_format = LogFormat(log_format.lower())
        
        # Normalize outputs parameter
        if log_outputs is None:
            log_outputs = [LogOutput.CONSOLE]
        else:
            log_outputs = [LogOutput(out) if isinstance(out, str) else out for out in log_outputs]
        
        # Update configuration
        self._config.update({
            'log_level': log_level.upper(),
            'log_format': log_format,
            'log_outputs': log_outputs,
            'async_logging': async_logging,
            'buffer_size': buffer_size,
            'lazy_initialization': lazy_initialization,
            'suppress_noisy_loggers': suppress_noisy_loggers,
            **kwargs
        })
        
        # Setup async logging if enabled
        if async_logging and not self._async_enabled:
            self._setup_async_logging()
        
        # Suppress noisy loggers if enabled
        if suppress_noisy_loggers:
            self._suppress_noisy_loggers()
        
        # Setup handlers for configured outputs
        self._setup_handlers()
        
        # Reconfigure existing loggers with new settings
        self._reconfigure_existing_loggers()
    
    def _setup_async_logging(self):
        """Setup asynchronous logging infrastructure"""
        self._async_enabled = True
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="unified-logging")
    
    def _suppress_noisy_loggers(self):
        """Suppress verbose third-party loggers"""
        noisy_loggers = [
            'urllib3.connectionpool',
            'google.auth.transport.requests',
            'passlib.handlers.bcrypt', 
            'uvicorn.access',
            'uvicorn.error',
            'google.cloud.secretmanager',
            'google.auth._default',
            'google.auth.compute_engine',
            'requests.packages.urllib3.connectionpool',
            'asyncio',
            'google.auth',
            'googleapiclient',
            'structlog'
        ]
        
        for logger_name in noisy_loggers:
            logging.getLogger(logger_name).setLevel(logging.ERROR)
    
    def _setup_handlers(self):
        """Setup logging handlers for configured outputs"""
        self._handlers.clear()
        
        for output in self._config['log_outputs']:
            if output == LogOutput.CONSOLE:
                handler = logging.StreamHandler(sys.stdout)
                handler.setLevel(getattr(logging, self._config['log_level']))
                handler.setFormatter(self._formatters[self._config['log_format']])
                self._handlers[output] = handler
                
            elif output == LogOutput.FILE:
                handler = logging.handlers.RotatingFileHandler(
                    'logs/olorin_server.log',
                    maxBytes=10*1024*1024,  # 10MB
                    backupCount=5,
                    encoding='utf8'
                )
                handler.setLevel(logging.INFO)
                # Use plain formatter for file output (no colors)
                file_formatter = logging.Formatter(
                    '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S'
                )
                handler.setFormatter(file_formatter)
                self._handlers[output] = handler
                
            elif output == LogOutput.JSON_FILE:
                handler = logging.handlers.RotatingFileHandler(
                    'logs/olorin_server.json',
                    maxBytes=10*1024*1024,  # 10MB
                    backupCount=5,
                    encoding='utf8'
                )
                handler.setLevel(logging.INFO)
                handler.setFormatter(self._formatters[LogFormat.JSON])
                self._handlers[output] = handler
                
            elif output == LogOutput.STRUCTURED_FILE:
                handler = logging.handlers.RotatingFileHandler(
                    'logs/olorin_structured.log',
                    maxBytes=20*1024*1024,  # 20MB
                    backupCount=10,
                    encoding='utf8'
                )
                handler.setLevel(logging.DEBUG)
                handler.setFormatter(self._formatters[LogFormat.STRUCTURED])
                self._handlers[output] = handler
    
    def _reconfigure_existing_loggers(self):
        """Reconfigure existing loggers with new settings"""
        # Configure our own loggers
        for logger in self._loggers.values():
            # Remove existing handlers
            for handler in logger.handlers[:]:
                logger.removeHandler(handler)
            
            # Add new handlers
            for handler in self._handlers.values():
                logger.addHandler(handler)
            
            # Update log level
            logger.setLevel(getattr(logging, self._config['log_level']))
        
        # Configure root logger to ensure consistent formatting for all external loggers
        root_logger = logging.getLogger()
        
        # Remove all existing handlers from root logger
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Add our handlers to root logger
        for handler in self._handlers.values():
            root_logger.addHandler(handler)
        
        # Set root logger level
        root_logger.setLevel(getattr(logging, self._config['log_level']))
        
        # Configure specific external loggers to use our format
        external_loggers = ['uvicorn', 'uvicorn.error', 'uvicorn.access', 'fastapi', 'root']
        for logger_name in external_loggers:
            ext_logger = logging.getLogger(logger_name)
            # Clear existing handlers
            ext_logger.handlers.clear()
            # Add our handlers with our formatting
            for handler in self._handlers.values():
                ext_logger.addHandler(handler)
            ext_logger.propagate = False  # Prevent double logging
            ext_logger.setLevel(getattr(logging, self._config['log_level']))
    
    @lru_cache(maxsize=256)
    def get_logger(self, name: str, structured: bool = False) -> Union[logging.Logger, Any]:
        """
        Get or create a logger instance with caching
        
        Args:
            name: Logger name (typically __name__)
            structured: Whether to return a structlog instance
            
        Returns:
            Logger instance (standard logging.Logger or structlog instance)
        """
        if structured:
            return self._get_structured_logger(name)
        else:
            return self._get_standard_logger(name)
    
    def _get_standard_logger(self, name: str) -> logging.Logger:
        """Get or create a standard logging.Logger instance"""
        if name not in self._loggers or not self._config['lazy_initialization']:
            logger = logging.getLogger(name)
            logger.setLevel(getattr(logging, self._config['log_level']))
            
            # Remove any existing handlers to avoid duplicates
            for handler in logger.handlers[:]:
                logger.removeHandler(handler)
            
            # Add configured handlers
            for handler in self._handlers.values():
                logger.addHandler(handler)
            
            # Prevent propagation to root logger to avoid duplicates
            logger.propagate = False
            
            self._loggers[name] = logger
            self._logger_creation_count += 1
        
        return self._loggers[name]
    
    def _get_structured_logger(self, name: str) -> Any:
        """Get or create a structlog instance"""
        if name not in self._structlog_loggers or not self._config['lazy_initialization']:
            # Configure structlog with unified settings
            structlog.configure(
                processors=[
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    structlog.processors.JSONRenderer()
                ],
                wrapper_class=structlog.stdlib.BoundLogger,
                logger_factory=structlog.stdlib.LoggerFactory(),
                context_class=dict,
                cache_logger_on_first_use=True,
            )
            
            logger = structlog.get_logger(name)
            self._structlog_loggers[name] = logger
            self._logger_creation_count += 1
        
        return self._structlog_loggers[name]
    
    @contextmanager
    def performance_context(self, operation: str):
        """Context manager for performance monitoring"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            if self._config.get('performance_monitoring', True):
                # Log performance metrics
                perf_logger = self.get_logger('unified_logging.performance')
                perf_logger.debug(
                    f"Performance: {operation}",
                    extra={'performance_metrics': {'operation': operation, 'duration_ms': duration * 1000}}
                )
    
    def get_current_log_level(self) -> str:
        """Get the current configured log level"""
        return self._config.get('log_level', 'WARNING')
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        current_time = time.time()
        uptime = current_time - self._last_performance_check
        
        return {
            'logger_creation_count': self._logger_creation_count,
            'log_entry_count': self._log_entry_count,
            'cached_loggers': len(self._loggers) + len(self._structlog_loggers),
            'uptime_seconds': uptime,
            'async_enabled': self._async_enabled,
            'configuration': dict(self._config),
        }
    
    def shutdown(self):
        """Shutdown the unified logging system"""
        if self._executor:
            self._executor.shutdown(wait=True)
            self._async_enabled = False
        
        # Close all handlers
        for handler in self._handlers.values():
            handler.close()
        
        # Clear caches
        self.get_logger.cache_clear()
        self._loggers.clear()
        self._structlog_loggers.clear()


# Global instance
_unified_logging_core: Optional[UnifiedLoggingCore] = None


def get_unified_logging_core() -> UnifiedLoggingCore:
    """Get the global unified logging core instance"""
    global _unified_logging_core
    if _unified_logging_core is None:
        _unified_logging_core = UnifiedLoggingCore()
    return _unified_logging_core


def get_unified_logger(name: str, structured: bool = False) -> Union[logging.Logger, Any]:
    """
    Get a unified logger instance
    
    Args:
        name: Logger name (typically __name__)
        structured: Whether to return a structlog instance
        
    Returns:
        Logger instance configured with unified settings
    """
    core = get_unified_logging_core()
    return core.get_logger(name, structured=structured)


def configure_unified_logging(**kwargs):
    """Configure the unified logging system"""
    core = get_unified_logging_core()
    core.configure(**kwargs)


def get_logging_performance_stats() -> Dict[str, Any]:
    """Get unified logging performance statistics"""
    core = get_unified_logging_core()
    return core.get_performance_stats()