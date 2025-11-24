"""
Log Stream Configuration Validator
Feature: 021-live-merged-logstream

Startup validation for log streaming configuration with fail-fast behavior.
Provides clear, actionable error messages for missing or invalid configuration.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

import sys
from typing import Optional, List, Tuple
from pydantic import ValidationError
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def validate_logstream_config() -> Tuple[bool, Optional[str]]:
    """
    Validate log stream configuration at startup.

    Attempts to load and validate all log stream configuration settings.
    Returns success status and optional error message.

    Returns:
        Tuple of (is_valid: bool, error_message: Optional[str])
    """
    try:
        from app.config.logstream_config import LogStreamConfig

        config = LogStreamConfig()

        logger.info("Log stream configuration validation successful")
        logger.info(f"Log streaming enabled: {config.enable_log_stream}")

        if config.enable_log_stream:
            logger.info("Log stream configuration details:")
            logger.info(f"  SSE heartbeat: {config.sse.heartbeat_interval_seconds}s")
            logger.info(f"  SSE timeout: {config.sse.connection_timeout_seconds}s")
            logger.info(f"  Buffer size: {config.aggregator.max_buffer_size}")
            logger.info(f"  PII redaction: {config.pii_redaction.enable_pii_redaction}")
            logger.info(f"  Rate limit (user): {config.rate_limit.requests_per_minute_per_user} req/min")

        return True, None

    except ValidationError as e:
        error_details = format_validation_error(e)
        error_message = (
            "❌ LOG STREAM CONFIGURATION VALIDATION FAILED\n\n"
            "Missing or invalid environment variables:\n\n"
            f"{error_details}\n\n"
            "Please set all required LOGSTREAM_* environment variables.\n"
            "See app/config/logstream_config.py for required configuration."
        )
        logger.error(error_message)
        return False, error_message

    except Exception as e:
        error_message = (
            f"❌ LOG STREAM CONFIGURATION ERROR\n\n"
            f"Unexpected error during configuration validation: {e}\n\n"
            f"Please check your environment configuration."
        )
        logger.error(error_message, exc_info=True)
        return False, error_message


def format_validation_error(error: ValidationError) -> str:
    """
    Format Pydantic validation error into readable message.

    Args:
        error: Pydantic ValidationError

    Returns:
        Formatted error message with field names and issues
    """
    errors: List[str] = []

    for err in error.errors():
        field_path = " -> ".join(str(loc) for loc in err["loc"])
        error_type = err["type"]
        message = err["msg"]

        env_var = infer_env_var_from_path(field_path)

        error_line = f"  ❌ {field_path}:\n     {message}\n"
        if env_var:
            error_line += f"     Environment variable: {env_var}\n"

        errors.append(error_line)

    return "\n".join(errors)


def infer_env_var_from_path(field_path: str) -> Optional[str]:
    """
    Infer environment variable name from field path.

    Args:
        field_path: Pydantic field path (e.g., "sse -> heartbeat_interval_seconds")

    Returns:
        Inferred environment variable name or None
    """
    path_mapping = {
        "enable_log_stream": "LOGSTREAM_ENABLE",
        "provider -> frontend_log_endpoint": "LOGSTREAM_FRONTEND_ENDPOINT",
        "provider -> backend_log_endpoint": "LOGSTREAM_BACKEND_ENDPOINT",
        "provider -> provider_timeout_ms": "LOGSTREAM_PROVIDER_TIMEOUT_MS",
        "sse -> heartbeat_interval_seconds": "LOGSTREAM_SSE_HEARTBEAT_INTERVAL_SECONDS",
        "sse -> connection_timeout_seconds": "LOGSTREAM_SSE_CONNECTION_TIMEOUT_SECONDS",
        "sse -> retry_interval_ms": "LOGSTREAM_SSE_RETRY_INTERVAL_MS",
        "aggregator -> clock_skew_tolerance_seconds": "LOGSTREAM_CLOCK_SKEW_TOLERANCE_SECONDS",
        "aggregator -> max_buffer_size": "LOGSTREAM_MAX_BUFFER_SIZE",
        "aggregator -> deduplication_window_seconds": "LOGSTREAM_DEDUPLICATION_WINDOW_SECONDS",
        "pii_redaction -> enable_pii_redaction": "LOGSTREAM_ENABLE_PII_REDACTION",
        "pii_redaction -> pii_patterns": "LOGSTREAM_PII_PATTERNS",
        "rate_limit -> requests_per_minute_per_user": "LOGSTREAM_RATE_LIMIT_USER_RPM",
        "rate_limit -> requests_per_minute_per_investigation": "LOGSTREAM_RATE_LIMIT_INVESTIGATION_RPM",
        "rate_limit -> max_concurrent_connections_per_user": "LOGSTREAM_RATE_LIMIT_CONCURRENT_CONNECTIONS",
        "polling -> default_polling_interval_ms": "LOGSTREAM_POLLING_INTERVAL_MS",
        "polling -> cursor_validity_seconds": "LOGSTREAM_CURSOR_VALIDITY_SECONDS",
        "polling -> etag_cache_ttl_seconds": "LOGSTREAM_ETAG_CACHE_TTL_SECONDS",
    }

    return path_mapping.get(field_path)


def fail_fast_on_invalid_config() -> None:
    """
    Validate log stream configuration and exit if invalid.

    Call this function at application startup to ensure all required
    configuration is present before proceeding.

    Exits with code 1 if configuration is invalid.
    """
    is_valid, error_message = validate_logstream_config()

    if not is_valid:
        print(error_message, file=sys.stderr)
        logger.critical("Log stream configuration validation failed - refusing to start")
        sys.exit(1)

    logger.info("✅ Log stream configuration validated successfully")


def get_validation_summary() -> dict:
    """
    Get validation summary for health checks.

    Returns:
        Dictionary with validation status and details
    """
    is_valid, error_message = validate_logstream_config()

    return {
        "valid": is_valid,
        "error": error_message if not is_valid else None,
        "component": "log_stream_configuration"
    }
