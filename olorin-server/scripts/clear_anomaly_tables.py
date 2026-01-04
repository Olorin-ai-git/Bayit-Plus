#!/usr/bin/env python3
"""
Script to clear anomaly detection tables.
WARNING: This will delete all anomaly events, detection runs, and optionally detectors.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.anomaly import AnomalyEvent, DetectionRun, Detector
from app.persistence.database import get_db
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def clear_anomaly_tables(clear_detectors: bool = False):
    """
    Clear anomaly detection tables.

    Args:
        clear_detectors: If True, also delete all detectors. Default False (keeps detectors).
    """
    db = next(get_db())
    try:
        # Count records before deletion
        anomaly_count = db.query(AnomalyEvent).count()
        run_count = db.query(DetectionRun).count()
        detector_count = db.query(Detector).count()

        logger.info(
            f"Found {anomaly_count} anomaly events, {run_count} detection runs, {detector_count} detectors"
        )

        if (
            anomaly_count == 0
            and run_count == 0
            and (not clear_detectors or detector_count == 0)
        ):
            logger.info("No data to clear")
            return

        # Delete in order (respecting foreign key constraints)
        # 1. Delete anomaly events (has FK to detection_runs and detectors)
        logger.info(f"Deleting {anomaly_count} anomaly events...")
        deleted_anomalies = db.query(AnomalyEvent).delete()
        logger.info(f"Deleted {deleted_anomalies} anomaly events")

        # 2. Delete detection runs (has FK to detectors)
        logger.info(f"Deleting {run_count} detection runs...")
        deleted_runs = db.query(DetectionRun).delete()
        logger.info(f"Deleted {deleted_runs} detection runs")

        # 3. Optionally delete detectors
        if clear_detectors:
            logger.info(f"Deleting {detector_count} detectors...")
            deleted_detectors = db.query(Detector).delete()
            logger.info(f"Deleted {deleted_detectors} detectors")
        else:
            logger.info(
                f"Keeping {detector_count} detectors (use --clear-detectors to delete them)"
            )

        # Commit the transaction
        db.commit()
        logger.info("✅ Successfully cleared anomaly tables")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error clearing anomaly tables: {e}", exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Clear anomaly detection tables")
    parser.add_argument(
        "--clear-detectors",
        action="store_true",
        help="Also delete all detectors (default: keep detectors)",
    )
    parser.add_argument(
        "--confirm", action="store_true", help="Confirm deletion (required for safety)"
    )

    args = parser.parse_args()

    if not args.confirm:
        print("⚠️  WARNING: This will delete all anomaly events and detection runs!")
        if args.clear_detectors:
            print("⚠️  WARNING: This will also delete all detectors!")
        print("\nTo proceed, run with --confirm flag:")
        print(
            f"  python {sys.argv[0]} --confirm"
            + (" --clear-detectors" if args.clear_detectors else "")
        )
        sys.exit(1)

    try:
        clear_anomaly_tables(clear_detectors=args.clear_detectors)
        print("✅ Successfully cleared anomaly tables")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
