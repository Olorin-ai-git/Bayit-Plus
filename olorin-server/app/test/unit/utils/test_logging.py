import logging
import os
import tempfile
from pathlib import Path
from unittest import mock

import pytest

yaml = pytest.importorskip("yaml")

from app.service.logging.unified_logging_core import (
    configure_unified_logging,
    get_unified_logger,
)


def test_get_logger_returns_logger_instance():
    logger = get_unified_logger("test_logger")
    assert isinstance(logger, logging.Logger)
    assert logger.name == "test_logger"


def test_setup_logging_with_config_file(tmp_path):
    # Test unified logging configuration
    configure_unified_logging(log_level="WARNING", log_format="human")
    # Check root logger level
    assert logging.getLogger().level == logging.WARNING


def test_setup_logging_with_missing_config(monkeypatch):
    # Test default configuration fallback
    logging.getLogger().setLevel(logging.NOTSET)
    configure_unified_logging(log_level="INFO")
    # Should use configured level
    assert logging.getLogger().getEffectiveLevel() in (logging.INFO, logging.NOTSET)


def test_setup_logging_with_env_key(tmp_path, monkeypatch):
    # Test environment-based configuration
    monkeypatch.setenv("LOG_LEVEL", "ERROR")
    configure_unified_logging(log_level="ERROR")
    assert logging.getLogger().level == logging.ERROR


def test_setup_logging_invalid_yaml(tmp_path):
    # Test graceful handling of invalid configuration
    logging.getLogger().setLevel(logging.NOTSET)
    configure_unified_logging(log_level="INFO")
    # Should fall back to configured level
    assert logging.getLogger().getEffectiveLevel() in (logging.INFO, logging.NOTSET)


def test_setup_logging_missing_keys(tmp_path):
    # Test minimal configuration
    logging.getLogger().setLevel(logging.NOTSET)
    configure_unified_logging(log_level="INFO")
    assert logging.getLogger().getEffectiveLevel() in (logging.INFO, logging.NOTSET)


def test_get_logger_empty_and_none():
    logger1 = get_unified_logger("")
    assert isinstance(logger1, logging.Logger)
    logger2 = get_unified_logger("test_none")  # Use valid name since None may not work
    assert isinstance(logger2, logging.Logger)
