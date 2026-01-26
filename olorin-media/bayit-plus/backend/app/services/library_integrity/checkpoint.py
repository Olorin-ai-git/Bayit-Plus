"""
Checkpoint Management for Library Integrity Verification

Handles saving and loading verification progress for resumption.
"""

import json
import logging
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from .models import CheckpointData

logger = logging.getLogger(__name__)


async def save_checkpoint(checkpoint: CheckpointData) -> None:
    """
    Save checkpoint to temp file for resumption.

    Uses atomic write (temp file + rename) to prevent corruption.

    Args:
        checkpoint: CheckpointData to save
    """
    try:
        checkpoint_path = (
            Path(tempfile.gettempdir()) / "bayit_library_integrity_checkpoint.json"
        )
        checkpoint_dict = asdict(checkpoint)

        # Atomic write with temp file + rename
        temp_path = checkpoint_path.with_suffix(".tmp")
        with open(temp_path, "w") as f:
            json.dump(checkpoint_dict, f, indent=2)

        temp_path.rename(checkpoint_path)

    except Exception as e:
        logger.error(f"Failed to save checkpoint: {e}", exc_info=True)


async def load_checkpoint(checkpoint_path: str) -> Optional[CheckpointData]:
    """
    Load checkpoint from file.

    Args:
        checkpoint_path: Path to checkpoint file

    Returns:
        CheckpointData if file exists and valid, None otherwise
    """
    try:
        path = Path(checkpoint_path)
        if not path.exists():
            logger.warning(f"Checkpoint file not found: {checkpoint_path}")
            return None

        with open(path, "r") as f:
            data = json.load(f)

        return CheckpointData(**data)

    except Exception as e:
        logger.error(f"Failed to load checkpoint: {e}", exc_info=True)
        return None
