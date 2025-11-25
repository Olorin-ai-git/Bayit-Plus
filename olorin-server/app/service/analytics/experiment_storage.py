"""
A/B Experiment Storage Operations.

Handles file I/O for A/B testing experiment persistence.

Week 8 Phase 3 implementation.
"""

import logging
import json
from typing import Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


def load_experiments_data(experiments_file: str) -> Dict[str, Dict[str, Any]]:
    """
    Load experiments data from JSON file.

    Args:
        experiments_file: Path to experiments JSON file

    Returns:
        Dictionary of experiments data
    """
    if not Path(experiments_file).exists():
        return {}

    try:
        with open(experiments_file, 'r') as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"Failed to load experiments: {e}")
        return {}


def save_experiments_data(experiments_file: str, data: Dict[str, Dict[str, Any]]) -> bool:
    """
    Save experiments data to JSON file.

    Args:
        experiments_file: Path to experiments JSON file
        data: Experiments data to save

    Returns:
        True if saved successfully, False otherwise
    """
    try:
        with open(experiments_file, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to save experiments: {e}")
        return False


def ensure_experiments_directory(directory_path: str) -> None:
    """
    Ensure experiments directory exists.

    Args:
        directory_path: Path to directory
    """
    Path(directory_path).mkdir(parents=True, exist_ok=True)
