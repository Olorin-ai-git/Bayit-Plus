"""
Batch Fixer

Functions for batch fixing multiple content issues.
"""

import logging
from typing import Any, Dict, List

from .metadata_fixer import fix_missing_metadata

logger = logging.getLogger(__name__)


async def fix_content_issues(
    missing_metadata: List[Dict[str, Any]], dry_run: bool = False
) -> Dict[str, Any]:
    """Fix multiple content issues in batch."""
    fixed_count = 0
    error_count = 0

    for item in missing_metadata:
        content_id = item.get("content_id")
        if not content_id:
            continue

        if dry_run:
            logger.info(f"[DRY RUN] Would fix {content_id}")
            fixed_count += 1
            continue

        try:
            result = await fix_missing_metadata(content_id)
            if result.get("success"):
                fixed_count += 1
            else:
                error_count += 1
        except Exception as e:
            logger.error(f"Error fixing {content_id}: {e}")
            error_count += 1

    return {
        "success": True,
        "fixed": fixed_count,
        "errors": error_count,
        "dry_run": dry_run,
    }
