"""
Log Stream Dependencies
Feature: 021-live-merged-logstream

Dependency injection and shared service instances for log streaming.
Provides configuration, log providers, and service singletons.

Author: Gil Klainert
Date: 2025-11-13
Spec: /specs/021-live-merged-logstream/api-contracts.md
"""

from typing import List

from app.config.logstream_config import LogStreamConfig
from app.service.log_providers.aggregator import LogAggregatorService
from app.service.log_providers.backend_log_collector import BackendLogCollector
from app.service.log_providers.backend_provider import BackendLogProvider
from app.service.log_providers.base import LogProvider
from app.service.log_providers.frontend_log_buffer import FrontendLogBuffer
from app.service.log_providers.frontend_provider import FrontendLogProvider
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def get_logstream_config() -> LogStreamConfig:
    """
    Get log stream configuration (dependency injection).

    Returns:
        LogStreamConfig instance from environment variables
    """
    return LogStreamConfig()


# Shared service instances (singletons)
_frontend_buffer = FrontendLogBuffer()
_backend_collector = BackendLogCollector()


def get_frontend_buffer() -> FrontendLogBuffer:
    """Get shared frontend log buffer instance."""
    return _frontend_buffer


def get_backend_collector() -> BackendLogCollector:
    """Get shared backend log collector instance."""
    return _backend_collector


def create_log_providers(
    investigation_id: str, config: LogStreamConfig
) -> List[LogProvider]:
    """
    Create log providers for investigation.

    Args:
        investigation_id: Investigation ID
        config: Log stream configuration

    Returns:
        List of configured LogProvider instances
    """
    frontend = FrontendLogProvider(
        investigation_id=investigation_id,
        buffer=_frontend_buffer,
        timeout_ms=config.provider.provider_timeout_ms,
    )

    backend = BackendLogProvider(
        investigation_id=investigation_id,
        collector=_backend_collector,
        timeout_ms=config.provider.provider_timeout_ms,
    )

    return [frontend, backend]
