#!/usr/bin/env python3
"""
Script to manually recreate a failed comparison for a specific entity.

Usage:
    python scripts/recreate_comparison.py --entity ruggzee@gmail.com --entity-type email
    python scripts/recreate_comparison.py --entity ruggzee@gmail.com  # auto-detect entity type
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
from app.service.logging import configure_unified_logging, get_bridge_logger
from app.service.logging.unified_logging_core import LogFormat, LogOutput

logger = get_bridge_logger(__name__)


async def recreate_comparison(entity_value: str, entity_type: str = None) -> dict:
    """
    Recreate a comparison for a specific entity.

    Args:
        entity_value: Entity value (e.g., email address)
        entity_type: Optional entity type (will be auto-detected if not provided)

    Returns:
        Comparison result dictionary
    """
    logger.info(f"🔄 Recreating comparison for entity: {entity_value}")
    if entity_type:
        logger.info(f"   Entity type: {entity_type}")
    else:
        logger.info(f"   Entity type: auto-detect")

    # Create reports directory
    reports_dir = Path("artifacts/comparisons/manual_recreate")
    reports_dir.mkdir(parents=True, exist_ok=True)

    try:
        result = await run_auto_comparison_for_entity(
            entity_value=entity_value, entity_type=entity_type, reports_dir=reports_dir
        )

        status = result.get("status", "unknown")
        investigation_id = result.get("investigation_id")
        report_path = result.get("report_path")

        logger.info(f"✅ Comparison completed with status: {status}")
        if investigation_id:
            logger.info(f"   Investigation ID: {investigation_id}")
        if report_path:
            logger.info(f"   Report path: {report_path}")

        if status == "success":
            logger.info("✅ Comparison recreated successfully")
        elif status == "skipped":
            logger.warning(f"⚠️ Comparison skipped: {result.get('reason', 'unknown')}")
            logger.warning(f"   Message: {result.get('message', 'N/A')}")
        else:
            logger.error(f"❌ Comparison failed with status: {status}")
            if "error" in result:
                logger.error(f"   Error: {result['error']}")

        return result

    except Exception as e:
        logger.error(f"❌ Failed to recreate comparison: {e}", exc_info=True)
        raise


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Recreate a failed comparison for a specific entity"
    )
    parser.add_argument(
        "--entity",
        required=True,
        help="Entity value (e.g., email address, phone number)",
    )
    parser.add_argument(
        "--entity-type",
        help="Entity type (email, phone, etc.). If not provided, will be auto-detected",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Log level (default: INFO)",
    )

    args = parser.parse_args()

    # Configure logging
    configure_unified_logging(
        log_level=args.log_level,
        log_format=LogFormat.HUMAN,
        log_outputs=[LogOutput.CONSOLE],
        lazy_initialization=False,
        suppress_noisy_loggers=False,
    )

    # Run async function
    try:
        result = asyncio.run(
            recreate_comparison(entity_value=args.entity, entity_type=args.entity_type)
        )

        # Print summary
        print("\n" + "=" * 60)
        print("COMPARISON RECREATION SUMMARY")
        print("=" * 60)
        print(f"Entity: {args.entity}")
        print(f"Status: {result.get('status', 'unknown')}")
        if result.get("investigation_id"):
            print(f"Investigation ID: {result['investigation_id']}")
        if result.get("report_path"):
            print(f"Report Path: {result['report_path']}")
        if result.get("reason"):
            print(f"Reason: {result['reason']}")
        if result.get("message"):
            print(f"Message: {result['message']}")
        print("=" * 60)

        # Exit with appropriate code
        if result.get("status") == "success":
            sys.exit(0)
        else:
            sys.exit(1)

    except KeyboardInterrupt:
        logger.warning("⚠️ Interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
