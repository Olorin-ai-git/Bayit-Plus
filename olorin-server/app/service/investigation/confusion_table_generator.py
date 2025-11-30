"""
Confusion Table Generator

Automatically generates confusion tables for completed investigations.
"""

import asyncio
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger
from app.service.logging.investigation_folder_manager import get_folder_manager

logger = get_bridge_logger(__name__)

# Lock to prevent duplicate confusion table generation
_generation_locks: Dict[str, threading.Lock] = {}
_locks_lock = threading.Lock()


def _get_generation_lock(investigation_id: str) -> threading.Lock:
    """Get or create a lock for a specific investigation ID."""
    with _locks_lock:
        if investigation_id not in _generation_locks:
            _generation_locks[investigation_id] = threading.Lock()
        return _generation_locks[investigation_id]


async def generate_confusion_table_for_investigation(
    investigation_id: str, investigation_folder: Optional[Path] = None
) -> Optional[Path]:
    """
    Generate confusion table for a completed investigation.

    Args:
        investigation_id: Investigation ID
        investigation_folder: Optional investigation folder path. If not provided, will be resolved.

    Returns:
        Path to generated confusion table HTML file, or None if generation failed
    """
    # Prevent duplicate generation using lock
    lock = _get_generation_lock(investigation_id)
    if not lock.acquire(blocking=False):
        logger.info(
            f"⏭️  Confusion table generation already in progress for {investigation_id}, skipping duplicate request"
        )
        return None

    try:
        # Import here to avoid circular dependencies
        from scripts.generate_confusion_table_for_investigation import (
            generate_confusion_table,
        )

        # Determine output path
        output_path = None
        
        # For auto-comparison investigations, we want to let the script handle the path
        # (which includes grouping by merchant in artifacts/)
        if not investigation_id.startswith("auto-comp-"):
            # Resolve investigation folder if not provided
            if investigation_folder is None:
                folder_manager = get_folder_manager()
                investigation_folder = folder_manager.get_investigation_folder(
                    investigation_id
                )

            if investigation_folder:
                output_path = (
                    investigation_folder / f"confusion_table_{investigation_id}.html"
                )
            else:
                # Fallback: use default artifacts directory
                output_dir = Path("artifacts/comparisons/auto_startup")
                output_dir.mkdir(parents=True, exist_ok=True)
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = (
                    output_dir / f"confusion_table_{investigation_id}_{timestamp_str}.html"
                )

        # Check if confusion table already exists (only if we resolved a path)
        if output_path and output_path.exists():
            logger.info(
                f"⏭️  Confusion table already exists for {investigation_id} at {output_path}, skipping generation"
            )
            return output_path

        logger.info(
            f"📊 Generating confusion table for investigation {investigation_id} {f'-> {output_path}' if output_path else '(auto-path)'}"
        )

        # Generate confusion table
        result = await generate_confusion_table(investigation_id, output_path)

        if result and result.get("html_path"):
            html_path = result["html_path"]
            logger.info(f"✅ Confusion table generated: {html_path}")
            return html_path
        else:
            logger.warning(
                f"⚠️ Confusion table generation returned no result for {investigation_id}"
            )
            return None

    except Exception as e:
        logger.error(
            f"❌ Failed to generate confusion table for investigation {investigation_id}: {e}",
            exc_info=True,
        )
        return None
    finally:
        lock.release()


def generate_confusion_table_sync(
    investigation_id: str, investigation_folder: Optional[Path] = None
) -> Optional[Path]:
    """
    Synchronous wrapper for confusion table generation.

    Args:
        investigation_id: Investigation ID
        investigation_folder: Optional investigation folder path

    Returns:
        Path to generated confusion table HTML file, or None if generation failed
    """
    try:
        # Try to get existing event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Event loop is running - schedule as background task
            logger.info(
                f"📊 Scheduling confusion table generation as background task for {investigation_id}"
            )
            task = asyncio.create_task(
                generate_confusion_table_for_investigation(
                    investigation_id, investigation_folder
                )
            )
            # Return None immediately - caller should not wait for completion
            return None
        else:
            # Event loop exists but not running - can use run_until_complete
            return loop.run_until_complete(
                generate_confusion_table_for_investigation(
                    investigation_id, investigation_folder
                )
            )
    except RuntimeError:
        # No event loop - create one
        return asyncio.run(
            generate_confusion_table_for_investigation(
                investigation_id, investigation_folder
            )
        )
