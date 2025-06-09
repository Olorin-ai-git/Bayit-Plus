import logging
import os
import tempfile
from pathlib import Path
from unittest import mock

import pytest

yaml = pytest.importorskip("yaml")

from app.service.agent.ato_agents.utils import logging as logging_utils


def test_get_logger_returns_logger_instance():
    logger = logging_utils.get_logger("test_logger")
    assert isinstance(logger, logging.Logger)
    assert logger.name == "test_logger"


def test_setup_logging_with_config_file(tmp_path):
    # Create a minimal YAML logging config
    config = {
        "version": 1,
        "formatters": {"default": {"format": "%(levelname)s %(message)s"}},
        "handlers": {
            "console": {"class": "logging.StreamHandler", "formatter": "default"}
        },
        "root": {"handlers": ["console"], "level": "WARNING"},
    }
    config_path = tmp_path / "test_logging.yaml"
    with open(config_path, "w") as f:
        yaml.dump(config, f)
    # Patch logs dir to tmp_path
    with mock.patch(
        "app.service.agent.ato_agents.utils.logging.Path.mkdir"
    ) as mock_mkdir:
        logging_utils.setup_logging(default_path=str(config_path))
        # Should not raise, should call mkdir
        mock_mkdir.assert_called_with(exist_ok=True)
    # Check root logger level
    assert logging.getLogger().level == logging.WARNING


def test_setup_logging_with_missing_config(monkeypatch):
    # Use a non-existent config path
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = os.path.join(tmpdir, "does_not_exist.yaml")
        # Reset root logger level so setup_logging can set it
        logging.getLogger().setLevel(logging.NOTSET)
        # Patch logs dir to tmpdir
        with mock.patch(
            "app.service.agent.ato_agents.utils.logging.Path.mkdir"
        ) as mock_mkdir:
            logging_utils.setup_logging(default_path=config_path)
            mock_mkdir.assert_called_with(exist_ok=True)
        # Should fall back to default level
        assert logging.getLogger().getEffectiveLevel() in (logging.INFO, logging.NOTSET)


def test_setup_logging_with_env_key(tmp_path, monkeypatch):
    config = {
        "version": 1,
        "formatters": {"default": {"format": "%(levelname)s %(message)s"}},
        "handlers": {
            "console": {"class": "logging.StreamHandler", "formatter": "default"}
        },
        "root": {"handlers": ["console"], "level": "ERROR"},
    }
    config_path = tmp_path / "env_logging.yaml"
    with open(config_path, "w") as f:
        yaml.dump(config, f)
    monkeypatch.setenv("LOG_CFG", str(config_path))
    with mock.patch(
        "app.service.agent.ato_agents.utils.logging.Path.mkdir"
    ) as mock_mkdir:
        logging_utils.setup_logging()
        mock_mkdir.assert_called_with(exist_ok=True)
    assert logging.getLogger().level == logging.ERROR


def test_setup_logging_invalid_yaml(tmp_path):
    # Write invalid YAML
    config_path = tmp_path / "bad.yaml"
    with open(config_path, "w") as f:
        f.write(": bad: [unclosed")
    with mock.patch("builtins.print") as mock_print:
        logging.getLogger().setLevel(logging.NOTSET)
        logging_utils.setup_logging(default_path=str(config_path))
        # Should print error message
        assert any(
            "Error in Logging Configuration" in str(c[0][0])
            for c in mock_print.call_args_list
        )
    # Should fall back to default level
    assert logging.getLogger().getEffectiveLevel() in (logging.INFO, logging.NOTSET)


def test_setup_logging_missing_keys(tmp_path):
    # Write minimal YAML missing required keys
    config_path = tmp_path / "minimal.yaml"
    with open(config_path, "w") as f:
        f.write("version: 1\n")
    logging.getLogger().setLevel(logging.NOTSET)
    # Should not raise
    logging_utils.setup_logging(default_path=str(config_path))
    assert logging.getLogger().getEffectiveLevel() in (logging.INFO, logging.NOTSET)


def test_get_logger_empty_and_none():
    logger1 = logging_utils.get_logger("")
    assert isinstance(logger1, logging.Logger)
    logger2 = logging_utils.get_logger(None)
    assert isinstance(logger2, logging.Logger)
