"""
Registry Storage Operations.

Handles file I/O for model registry persistence.

Week 8 Phase 3 implementation.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger(__name__)


def load_registry_data(registry_file: str) -> Dict[str, Dict[str, Any]]:
    """
    Load registry data from JSON file.

    Args:
        registry_file: Path to registry JSON file

    Returns:
        Dictionary of registry data
    """
    if not Path(registry_file).exists():
        logger.info("No existing registry found, creating new registry")
        return {}

    try:
        with open(registry_file, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"Failed to load registry: {e}")
        return {}


def save_registry_data(registry_file: str, data: Dict[str, Dict[str, Any]]) -> bool:
    """
    Save registry data to JSON file.

    Args:
        registry_file: Path to registry JSON file
        data: Registry data to save

    Returns:
        True if saved successfully, False otherwise
    """
    try:
        with open(registry_file, "w") as f:
            json.dump(data, f, indent=2)
        logger.debug(f"Saved registry with {len(data)} models")
        return True
    except Exception as e:
        logger.error(f"Failed to save registry: {e}")
        return False


def ensure_directory_exists(directory_path: str) -> None:
    """
    Ensure directory exists, creating it if necessary.

    Args:
        directory_path: Path to directory
    """
    Path(directory_path).mkdir(parents=True, exist_ok=True)
