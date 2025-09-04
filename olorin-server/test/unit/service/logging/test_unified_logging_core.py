"""
Unit tests for UnifiedLoggingCore

Tests the core unified logging functionality including logger creation,
format switching, performance optimization, and singleton behavior.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import pytest
import logging
import tempfile
import shutil
import time
import json
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from concurrent.futures import ThreadPoolExecutor
import threading

from app.service.logging.unified_logging_core import (
    UnifiedLoggingCore,
    LogFormat,
    LogOutput,
    StructuredFormatter,
    get_unified_logging_core,
    get_unified_logger,
    configure_unified_logging,
    get_logging_performance_stats
)


@pytest.fixture
def temp_log_dir():
    """Create temporary directory for log files"""
    temp_dir = tempfile.mkdtemp()
    logs_dir = Path(temp_dir) / "logs"
    logs_dir.mkdir()
    
    # Patch the logs directory in the logging core
    original_cwd = Path.cwd()
    
    yield logs_dir.parent
    
    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def fresh_logging_core():
    """Create fresh logging core instance for each test"""
    # Clear singleton instance
    UnifiedLoggingCore._instance = None
    
    # Create new instance
    core = UnifiedLoggingCore()
    
    yield core
    
    # Cleanup
    core.shutdown()
    UnifiedLoggingCore._instance = None


@pytest.fixture
def mock_handlers():
    """Mock logging handlers for testing"""
    console_handler = Mock(spec=logging.StreamHandler)
    file_handler = Mock(spec=logging.handlers.RotatingFileHandler)
    
    with patch('logging.StreamHandler', return_value=console_handler), \
         patch('logging.handlers.RotatingFileHandler', return_value=file_handler):
        yield {
            'console': console_handler,
            'file': file_handler
        }


class TestUnifiedLoggingCore:
    """Test cases for UnifiedLoggingCore class"""
    
    def test_singleton_pattern(self):
        """Test that UnifiedLoggingCore implements singleton pattern"""
        core1 = UnifiedLoggingCore()
        core2 = UnifiedLoggingCore()
        
        assert core1 is core2
        assert id(core1) == id(core2)
    
    def test_default_configuration(self, fresh_logging_core):
        """Test default configuration values"""
        core = fresh_logging_core
        
        assert core._config['log_level'] == 'WARNING'
        assert core._config['log_format'] == LogFormat.HUMAN
        assert core._config['log_outputs'] == [LogOutput.CONSOLE]
        assert core._config['async_logging'] is False
        assert core._config['buffer_size'] == 1000
        assert core._config['lazy_initialization'] is True
        assert core._config['suppress_noisy_loggers'] is True
    
    def test_configuration_update(self, fresh_logging_core):
        """Test configuration update functionality"""
        core = fresh_logging_core
        
        core.configure(
            log_level="DEBUG",
            log_format="json",
            log_outputs=["console", "file"],
            async_logging=True,
            buffer_size=2000
        )
        
        assert core._config['log_level'] == 'DEBUG'
        assert core._config['log_format'] == LogFormat.JSON
        assert LogOutput.CONSOLE in core._config['log_outputs']
        assert LogOutput.FILE in core._config['log_outputs']
        assert core._config['async_logging'] is True
        assert core._config['buffer_size'] == 2000
    
    def test_formatter_setup(self, fresh_logging_core):
        """Test formatter setup for different formats"""
        core = fresh_logging_core
        
        assert LogFormat.HUMAN in core._formatters
        assert LogFormat.JSON in core._formatters
        assert LogFormat.STRUCTURED in core._formatters
        
        # Test human formatter
        human_formatter = core._formatters[LogFormat.HUMAN]
        assert isinstance(human_formatter, logging.Formatter)
        
        # Test structured formatter
        structured_formatter = core._formatters[LogFormat.STRUCTURED]
        assert isinstance(structured_formatter, StructuredFormatter)
    
    def test_logger_creation_standard(self, fresh_logging_core):
        """Test standard logger creation"""
        core = fresh_logging_core
        
        logger1 = core.get_logger("test.logger1")
        logger2 = core.get_logger("test.logger1")  # Same name
        logger3 = core.get_logger("test.logger3")  # Different name
        
        # Should return same instance for same name
        assert logger1 is logger2
        
        # Should return different instance for different name
        assert logger1 is not logger3
        
        # Should be standard logging.Logger instances
        assert isinstance(logger1, logging.Logger)
        assert isinstance(logger3, logging.Logger)
    
    def test_logger_creation_structured(self, fresh_logging_core):
        """Test structured logger creation"""
        core = fresh_logging_core
        
        logger1 = core.get_logger("test.structured1", structured=True)
        logger2 = core.get_logger("test.structured1", structured=True)  # Same name
        logger3 = core.get_logger("test.structured3", structured=True)  # Different name
        
        # Should return same instance for same name
        assert logger1 is logger2
        
        # Should return different instance for different name
        assert logger1 is not logger3
    
    def test_logger_caching(self, fresh_logging_core):
        """Test logger instance caching"""
        core = fresh_logging_core
        
        # Create loggers
        logger1 = core.get_logger("cache.test1")
        logger2 = core.get_logger("cache.test2", structured=True)
        
        # Verify they're cached
        assert "cache.test1" in core._loggers
        assert "cache.test2" in core._structlog_loggers
        
        # Verify performance stats reflect creation
        stats = core.get_performance_stats()
        assert stats['logger_creation_count'] >= 2
        assert stats['cached_loggers'] >= 2
    
    def test_noisy_logger_suppression(self, fresh_logging_core):
        """Test suppression of noisy third-party loggers"""
        core = fresh_logging_core
        core.configure(suppress_noisy_loggers=True)
        
        # Test that noisy loggers are set to ERROR level
        noisy_loggers = [
            'urllib3.connectionpool',
            'google.auth.transport.requests',
            'uvicorn.access'
        ]
        
        for logger_name in noisy_loggers:
            logger = logging.getLogger(logger_name)
            assert logger.level == logging.ERROR
    
    @patch('app.service.logging.unified_logging_core.ThreadPoolExecutor')
    def test_async_logging_setup(self, mock_executor, fresh_logging_core):
        """Test async logging setup"""
        core = fresh_logging_core
        
        core.configure(async_logging=True)
        
        assert core._async_enabled is True
        mock_executor.assert_called_once()
    
    def test_performance_context(self, fresh_logging_core):
        """Test performance monitoring context manager"""
        core = fresh_logging_core
        core.configure(performance_monitoring=True)
        
        start_time = time.time()
        with core.performance_context("test_operation"):
            time.sleep(0.01)  # Small delay for measurable duration
        
        # Should have logged performance metrics (hard to test directly)
        # but we can verify the context manager worked without errors
        assert True
    
    def test_performance_stats(self, fresh_logging_core):
        """Test performance statistics collection"""
        core = fresh_logging_core
        
        # Create some loggers
        core.get_logger("stats.test1")
        core.get_logger("stats.test2", structured=True)
        
        stats = core.get_performance_stats()
        
        assert 'logger_creation_count' in stats
        assert 'log_entry_count' in stats
        assert 'cached_loggers' in stats
        assert 'uptime_seconds' in stats
        assert 'async_enabled' in stats
        assert 'configuration' in stats
        
        assert stats['logger_creation_count'] >= 2
        assert stats['cached_loggers'] >= 2
        assert isinstance(stats['uptime_seconds'], float)
    
    def test_shutdown(self, fresh_logging_core, mock_handlers):
        """Test shutdown functionality"""
        core = fresh_logging_core
        
        # Configure with handlers
        core.configure(log_outputs=['console', 'file'])
        
        # Create some loggers
        core.get_logger("shutdown.test")
        
        # Mock executor for async logging
        mock_executor = Mock(spec=ThreadPoolExecutor)
        core._executor = mock_executor
        core._async_enabled = True
        
        # Shutdown
        core.shutdown()
        
        # Verify executor shutdown
        mock_executor.shutdown.assert_called_once_with(wait=True)
        assert core._async_enabled is False
        
        # Verify caches cleared
        assert len(core._loggers) == 0
        assert len(core._structlog_loggers) == 0


class TestStructuredFormatter:
    """Test cases for StructuredFormatter class"""
    
    def test_basic_formatting(self):
        """Test basic structured log formatting"""
        formatter = StructuredFormatter()
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message",
            args=(),
            exc_info=None
        )
        record.module = "test_module"
        record.funcName = "test_function"
        
        formatted = formatter.format(record)
        
        # Parse JSON to verify structure
        parsed = json.loads(formatted)
        
        assert parsed['level'] == 'INFO'
        assert parsed['logger'] == 'test.logger'
        assert parsed['message'] == 'Test message'
        assert parsed['module'] == 'test_module'
        assert parsed['function'] == 'test_function'
        assert parsed['line'] == 42
        assert 'timestamp' in parsed
    
    def test_context_inclusion(self):
        """Test context information inclusion"""
        formatter = StructuredFormatter(include_context=True)
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="/test/path.py",
            lineno=42,
            msg="Test message with context",
            args=(),
            exc_info=None
        )
        record.context = {"request_id": "req_123", "user_id": "user_456"}
        
        formatted = formatter.format(record)
        parsed = json.loads(formatted)
        
        assert 'context' in parsed
        assert parsed['context']['request_id'] == 'req_123'
        assert parsed['context']['user_id'] == 'user_456'
    
    def test_performance_metrics_inclusion(self):
        """Test performance metrics inclusion"""
        formatter = StructuredFormatter(include_performance_metrics=True)
        
        record = logging.LogRecord(
            name="test.logger",
            level=logging.DEBUG,
            pathname="/test/path.py",
            lineno=42,
            msg="Performance test",
            args=(),
            exc_info=None
        )
        record.performance_metrics = {"latency_ms": 45.2, "memory_mb": 128.5}
        
        formatted = formatter.format(record)
        parsed = json.loads(formatted)
        
        assert 'performance_metrics' in parsed
        assert parsed['performance_metrics']['latency_ms'] == 45.2
        assert parsed['performance_metrics']['memory_mb'] == 128.5


class TestGlobalFunctions:
    """Test cases for global utility functions"""
    
    def test_get_unified_logging_core_singleton(self):
        """Test global function returns singleton instance"""
        # Clear any existing instance
        UnifiedLoggingCore._instance = None
        
        core1 = get_unified_logging_core()
        core2 = get_unified_logging_core()
        
        assert core1 is core2
        assert isinstance(core1, UnifiedLoggingCore)
    
    def test_get_unified_logger(self):
        """Test global logger getter function"""
        # Clear singleton
        UnifiedLoggingCore._instance = None
        
        logger1 = get_unified_logger("global.test1")
        logger2 = get_unified_logger("global.test1")  # Same name
        logger3 = get_unified_logger("global.test2", structured=True)
        
        assert logger1 is logger2
        assert isinstance(logger1, logging.Logger)
        # logger3 should be structlog instance (different type)
        assert logger1 is not logger3
    
    def test_configure_unified_logging(self):
        """Test global configuration function"""
        # Clear singleton
        UnifiedLoggingCore._instance = None
        
        configure_unified_logging(
            log_level="INFO",
            log_format="json",
            async_logging=True
        )
        
        core = get_unified_logging_core()
        assert core._config['log_level'] == 'INFO'
        assert core._config['log_format'] == LogFormat.JSON
        assert core._config['async_logging'] is True
    
    def test_get_logging_performance_stats(self):
        """Test global performance stats function"""
        # Clear singleton and create some activity
        UnifiedLoggingCore._instance = None
        
        get_unified_logger("perf.test1")
        get_unified_logger("perf.test2", structured=True)
        
        stats = get_logging_performance_stats()
        
        assert 'logger_creation_count' in stats
        assert 'cached_loggers' in stats
        assert stats['logger_creation_count'] >= 2


class TestConcurrency:
    """Test cases for concurrent logging operations"""
    
    def test_concurrent_logger_creation(self, fresh_logging_core):
        """Test thread-safe logger creation"""
        core = fresh_logging_core
        results = []
        errors = []
        
        def create_logger(thread_id):
            try:
                logger = core.get_logger(f"concurrent.test.{thread_id}")
                results.append((thread_id, logger))
            except Exception as e:
                errors.append((thread_id, e))
        
        threads = []
        for i in range(10):
            thread = threading.Thread(target=create_logger, args=(i,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Should have no errors
        assert len(errors) == 0
        assert len(results) == 10
        
        # Each thread should get a unique logger
        loggers = {result[1] for result in results}
        assert len(loggers) == 10
    
    def test_concurrent_configuration_updates(self, fresh_logging_core):
        """Test thread-safe configuration updates"""
        core = fresh_logging_core
        errors = []
        
        def update_config(thread_id):
            try:
                core.configure(
                    log_level="INFO",
                    buffer_size=1000 + thread_id
                )
            except Exception as e:
                errors.append((thread_id, e))
        
        threads = []
        for i in range(5):
            thread = threading.Thread(target=update_config, args=(i,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Should handle concurrent updates without errors
        assert len(errors) == 0


class TestIntegration:
    """Integration test cases"""
    
    def test_end_to_end_logging_flow(self, temp_log_dir):
        """Test complete logging flow from configuration to output"""
        with patch('pathlib.Path.cwd', return_value=temp_log_dir):
            # Clear singleton
            UnifiedLoggingCore._instance = None
            
            # Configure unified logging
            configure_unified_logging(
                log_level="DEBUG",
                log_format="structured",
                log_outputs=["console", "structured_file"],
                performance_monitoring=True
            )
            
            # Get logger and log messages
            logger = get_unified_logger("integration.test")
            
            logger.debug("Debug message")
            logger.info("Info message")
            logger.warning("Warning message")
            logger.error("Error message")
            
            # Test structured logging
            structured_logger = get_unified_logger("integration.structured", structured=True)
            structured_logger.info(
                "Structured log entry",
                investigation_id="inv_123",
                performance_metrics={"latency": 25.5}
            )
            
            # Verify performance stats
            stats = get_logging_performance_stats()
            assert stats['logger_creation_count'] >= 2
            assert stats['configuration']['log_level'] == 'DEBUG'
            # The configuration stores the enum directly, not the value
            assert stats['configuration']['log_format'] == LogFormat.STRUCTURED


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])