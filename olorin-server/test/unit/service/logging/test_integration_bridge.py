"""
Unit tests for Integration Bridge

Tests the enhanced integration bridge functionality including backward compatibility,
command-line integration, and FastAPI server integration.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import argparse
import logging
import shutil
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

from app.service.logging.integration_bridge import (
    UnifiedLoggingBridge,
    bridge_configure_logger,
    configure_unified_bridge_from_args,
    configure_unified_bridge_from_config,
    get_bridge_logger,
    get_unified_bridge,
)
from app.service.logging.unified_logging_core import UnifiedLoggingCore


@pytest.fixture
def fresh_bridge():
    """Create fresh bridge instance for each test"""
    # Clear singleton instances
    UnifiedLoggingCore._instance = None

    # Clear global bridge
    import app.service.logging.integration_bridge

    app.service.logging.integration_bridge._unified_bridge = None

    bridge = UnifiedLoggingBridge()
    yield bridge

    # Cleanup
    bridge.shutdown()
    UnifiedLoggingCore._instance = None
    app.service.logging.integration_bridge._unified_bridge = None


@pytest.fixture
def mock_app():
    """Mock FastAPI app for testing"""
    app = Mock()
    app.state = Mock()
    app.state.config = Mock()
    app.state.config.log_level = "INFO"
    return app


@pytest.fixture
def sample_args():
    """Sample command-line arguments for testing"""
    args = argparse.Namespace()
    args.log_level = "DEBUG"
    args.log_format = "structured"
    args.log_output = "console,file"
    args.async_logging = True
    args.buffer_size = 2000
    args.lazy_init = None
    args.suppress_noisy = True
    args.performance_monitoring = True
    return args


class TestUnifiedLoggingBridge:
    """Test cases for UnifiedLoggingBridge class"""

    def test_bridge_initialization(self, fresh_bridge):
        """Test bridge initialization"""
        assert fresh_bridge._config_manager is not None
        assert fresh_bridge._initialized is False
        assert fresh_bridge._original_configure_logger is None

    def test_initialize_from_args(self, fresh_bridge, sample_args):
        """Test bridge initialization from command-line arguments"""
        fresh_bridge.initialize_from_args(sample_args)

        assert fresh_bridge._initialized is True

        # Test that it doesn't reinitialize
        fresh_bridge.initialize_from_args(sample_args)
        assert fresh_bridge._initialized is True

    def test_initialize_from_config(self, fresh_bridge):
        """Test bridge initialization from configuration"""
        fresh_bridge.initialize_from_config(
            log_level="INFO", log_format="json", async_logging=True
        )

        assert fresh_bridge._initialized is True

        # Test that it doesn't reinitialize
        fresh_bridge.initialize_from_config(log_level="DEBUG")
        assert fresh_bridge._initialized is True

    def test_get_enhanced_logger_standard(self, fresh_bridge):
        """Test getting enhanced standard logger"""
        fresh_bridge.initialize_from_config()

        logger = fresh_bridge.get_enhanced_logger("test.logger")

        assert isinstance(logger, logging.Logger)
        assert logger.name == "test.logger"

    def test_get_enhanced_logger_structured(self, fresh_bridge):
        """Test getting enhanced structured logger"""
        fresh_bridge.initialize_from_config()

        logger = fresh_bridge.get_enhanced_logger("test.structured", structured=True)

        # Structured logger should be different type (structlog)
        assert logger is not None
        # Note: actual type check depends on structlog implementation

    def test_configure_legacy_logging(self, fresh_bridge, mock_app):
        """Test legacy logging configuration compatibility"""
        fresh_bridge.configure_legacy_logging(mock_app)

        assert fresh_bridge._initialized is True

        # Should handle multiple calls gracefully
        fresh_bridge.configure_legacy_logging(mock_app)
        assert fresh_bridge._initialized is True

    def test_performance_stats(self, fresh_bridge):
        """Test performance statistics retrieval"""
        fresh_bridge.initialize_from_config()

        stats = fresh_bridge.get_performance_stats()

        assert "logger_creation_count" in stats
        assert "uptime_seconds" in stats
        assert "configuration" in stats

    def test_performance_context(self, fresh_bridge):
        """Test performance monitoring context manager"""
        fresh_bridge.initialize_from_config(performance_monitoring=True)

        with fresh_bridge.performance_context("test_operation"):
            # Simulate some work
            pass

        # Should complete without errors
        assert True

    def test_shutdown(self, fresh_bridge):
        """Test bridge shutdown"""
        fresh_bridge.initialize_from_config()
        assert fresh_bridge._initialized is True

        fresh_bridge.shutdown()
        assert fresh_bridge._initialized is False


class TestGlobalFunctions:
    """Test cases for global bridge functions"""

    def test_get_unified_bridge_singleton(self):
        """Test global bridge singleton"""
        # Clear any existing instance
        import app.service.logging.integration_bridge

        app.service.logging.integration_bridge._unified_bridge = None

        bridge1 = get_unified_bridge()
        bridge2 = get_unified_bridge()

        assert bridge1 is bridge2
        assert isinstance(bridge1, UnifiedLoggingBridge)

    def test_configure_unified_bridge_from_args(self, sample_args):
        """Test global bridge configuration from args"""
        # Clear any existing instance
        import app.service.logging.integration_bridge

        app.service.logging.integration_bridge._unified_bridge = None

        configure_unified_bridge_from_args(sample_args)

        bridge = get_unified_bridge()
        assert bridge._initialized is True

    def test_configure_unified_bridge_from_config(self):
        """Test global bridge configuration from config"""
        # Clear any existing instance
        import app.service.logging.integration_bridge

        app.service.logging.integration_bridge._unified_bridge = None

        configure_unified_bridge_from_config(log_level="WARNING", log_format="json")

        bridge = get_unified_bridge()
        assert bridge._initialized is True

    def test_get_bridge_logger(self):
        """Test global bridge logger getter"""
        # Clear any existing instance
        import app.service.logging.integration_bridge

        app.service.logging.integration_bridge._unified_bridge = None
        UnifiedLoggingCore._instance = None

        logger = get_bridge_logger("test.global")

        assert isinstance(logger, logging.Logger)
        assert logger.name == "test.global"

    def test_bridge_configure_logger(self, mock_app):
        """Test global bridge configure logger function"""
        # Clear any existing instance
        import app.service.logging.integration_bridge

        app.service.logging.integration_bridge._unified_bridge = None

        bridge_configure_logger(mock_app)

        bridge = get_unified_bridge()
        assert bridge._initialized is True


class TestBackwardCompatibility:
    """Test cases for backward compatibility"""

    def test_request_context_support(self, fresh_bridge):
        """Test that request context is supported for backward compatibility"""
        fresh_bridge.initialize_from_config()

        # Import logging context from legacy system
        from app.service.logging_helper import logging_context

        logger = fresh_bridge.get_enhanced_logger("test.context")

        # Should work with logging context
        with logging_context(request_id="test_123"):
            logger.info("Test message with context")

        # Should complete without errors
        assert True

    def test_legacy_formatter_compatibility(self, fresh_bridge, mock_app):
        """Test legacy formatter compatibility"""
        fresh_bridge.configure_legacy_logging(mock_app)

        # Should create handlers with RequestFormatter-like behavior
        root_logger = logging.getLogger()
        assert len(root_logger.handlers) > 0

        # Handler should have a formatter
        handler = root_logger.handlers[0]
        assert handler.formatter is not None


class TestIntegration:
    """Integration test cases"""

    def test_end_to_end_integration(self, sample_args):
        """Test complete end-to-end integration"""
        # Clear all instances
        import app.service.logging.integration_bridge

        app.service.logging.integration_bridge._unified_bridge = None
        UnifiedLoggingCore._instance = None

        # Configure bridge from args
        configure_unified_bridge_from_args(sample_args)

        # Get bridge logger
        logger = get_bridge_logger("integration.test")

        # Log messages
        logger.debug("Debug message")
        logger.info("Info message")
        logger.warning("Warning message")

        # Get performance stats
        bridge = get_unified_bridge()
        stats = bridge.get_performance_stats()

        assert stats["logger_creation_count"] >= 1
        assert "configuration" in stats

    def test_fastapi_integration(self, mock_app, sample_args):
        """Test FastAPI application integration"""
        # Clear all instances
        import app.service.logging.integration_bridge

        app.service.logging.integration_bridge._unified_bridge = None
        UnifiedLoggingCore._instance = None

        # First configure from args
        configure_unified_bridge_from_args(sample_args)

        # Then configure legacy logging
        bridge_configure_logger(mock_app)

        # Should have initialized the bridge
        bridge = get_unified_bridge()
        assert bridge._initialized is True

        # Should be able to get loggers
        logger = get_bridge_logger("fastapi.test")
        logger.info("FastAPI integration test")

        # Should complete without errors
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
