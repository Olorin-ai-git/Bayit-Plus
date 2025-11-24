"""
Logging Configuration Wrapper for Contract Testing

This module provides a simple wrapper around the comprehensive unified logging system
in app/service/logging/ for backward compatibility and ease of use.

Constitutional Compliance:
- Uses existing unified logging system with environment variable configuration
- No hardcoded log configuration
- Fail-fast validation
- Performance monitoring

The actual implementation is in app/service/logging/ which includes:
- Multi-source configuration (args → env → config file → defaults)
- Multiple log formats (human, JSON, structured)
- Multiple outputs (console, file, JSON file)
- Async logging support
- Performance monitoring
"""

from app.service.logging import (
    get_bridge_logger,
    configure_unified_bridge_from_config,
    get_unified_logger,
    LogFormat,
    LogOutput,
    LoggingConfig,
)
import logging
import os


def setup_contract_testing_logger(logger_name: str = "contract_test") -> logging.Logger:
    """
    Setup a logger for contract testing with environment-based configuration.

    This function wraps the unified logging system and provides a simple interface
    for contract testing use cases.

    Args:
        logger_name: Name of the logger (default: "contract_test")

    Returns:
        logging.Logger: Configured logger instance

    Environment Variables Used:
        - LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        - LOG_FORMAT: Log format (human, json, structured)
        - LOG_OUTPUT: Output destination (console, file, json_file)
    """
    # Get logger from unified bridge
    logger = get_bridge_logger(logger_name)

    # Configure based on environment
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))

    return logger


def get_contract_test_logger() -> logging.Logger:
    """
    Get a pre-configured logger for contract testing.

    Returns:
        logging.Logger: Logger configured for contract testing
    """
    return setup_contract_testing_logger("contract_test")


def get_type_generation_logger() -> logging.Logger:
    """
    Get a pre-configured logger for OpenAPI type generation.

    Returns:
        logging.Logger: Logger configured for type generation
    """
    return setup_contract_testing_logger("type_generation")


def get_schema_validation_logger() -> logging.Logger:
    """
    Get a pre-configured logger for schema validation.

    Returns:
        logging.Logger: Logger configured for schema validation
    """
    return setup_contract_testing_logger("schema_validation")


# Default contract testing logger
contract_test_logger = get_contract_test_logger()
type_generation_logger = get_type_generation_logger()
schema_validation_logger = get_schema_validation_logger()
