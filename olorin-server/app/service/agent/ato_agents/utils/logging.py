import logging.config
import os
from pathlib import Path

import yaml


def setup_logging(
    default_path="config/logging_config.yaml",
    default_level=logging.INFO,
    env_key="LOG_CFG",
):
    """Setup logging configuration."""
    path = default_path
    value = os.getenv(env_key, None)
    if value:
        path = value

    # Create logs directory if it doesn't exist
    Path("logs").mkdir(exist_ok=True)

    if os.path.exists(path):
        with open(path, "rt") as f:
            try:
                config = yaml.safe_load(f.read())
                logging.config.dictConfig(config)
            except Exception as e:
                print(f"Error in Logging Configuration: {e}")
                logging.basicConfig(level=default_level)
    else:
        logging.basicConfig(level=default_level)


def get_logger(name):
    """Get a logger instance with the specified name."""
    return logging.getLogger(name)
