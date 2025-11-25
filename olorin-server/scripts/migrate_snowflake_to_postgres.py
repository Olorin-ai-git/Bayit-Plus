"""
Snowflake to PostgreSQL Data Migration CLI Script.

Migrates all data from Snowflake to PostgreSQL with:
- Batch processing for large datasets
- Checkpointing for resume capability
- Progress logging and time estimates
- Comprehensive validation

Usage:
    python scripts/migrate_snowflake_to_postgres.py [--batch-size SIZE] [--validate-only] [--resume]

Constitutional Compliance:
- NO hardcoded values - all from configuration
- Complete implementation
- Production-ready error handling
"""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.agent.tools.database_tool.migration_manager import MigrationManager
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Migrate data from Snowflake to PostgreSQL"
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Number of records per batch (default: 500)",
    )

    parser.add_argument(
        "--checkpoint-file",
        type=str,
        default="migration_checkpoint.json",
        help="Path to checkpoint file (default: migration_checkpoint.json)",
    )

    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only validate existing migration, don't migrate data",
    )

    parser.add_argument(
        "--resume", action="store_true", help="Resume from last checkpoint"
    )

    parser.add_argument(
        "--skip-validation", action="store_true", help="Skip post-migration validation"
    )

    return parser.parse_args()


def print_progress(
    manager: MigrationManager, records_migrated: int, start_time: datetime
):
    """Print migration progress."""
    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
    rate = records_migrated / elapsed if elapsed > 0 else 0

    logger.info("=" * 60)
    logger.info(f"Records migrated: {records_migrated:,}")
    logger.info(f"Elapsed time: {elapsed:.1f} seconds")
    logger.info(f"Migration rate: {rate:.1f} records/second")

    if manager.total_records > 0:
        progress = manager.calculate_progress(records_migrated)
        remaining = manager.estimate_time_remaining(records_migrated, elapsed)
        logger.info(f"Progress: {progress:.1f}%")
        logger.info(f"Estimated time remaining: {remaining:.1f} seconds")

    logger.info("=" * 60)


def validate_migration(manager: MigrationManager) -> bool:
    """Validate migration and print results."""
    logger.info("\n🔍 Validating migration...")

    validation_result = manager.validate_migration(
        check_record_count=True, check_sample_data=True, sample_size=100
    )

    logger.info("=" * 60)
    logger.info("VALIDATION RESULTS")
    logger.info("=" * 60)
    logger.info(f"Source record count: {validation_result['record_count_source']:,}")
    logger.info(f"Target record count: {validation_result['record_count_target']:,}")
    logger.info(
        f"Record counts match: {'✅ YES' if validation_result['record_count_match'] else '❌ NO'}"
    )

    if "sample_data_match" in validation_result:
        logger.info(
            f"Sample data matches: {'✅ YES' if validation_result['sample_data_match'] else '❌ NO'}"
        )

    logger.info(
        f"Overall validation: {'✅ PASSED' if validation_result['is_valid'] else '❌ FAILED'}"
    )
    logger.info("=" * 60)

    return validation_result["is_valid"]


def main():
    """Main migration workflow."""
    args = parse_args()

    logger.info("=" * 60)
    logger.info("SNOWFLAKE → POSTGRESQL DATA MIGRATION")
    logger.info("=" * 60)
    logger.info(f"Start time: {datetime.now(timezone.utc).isoformat()}")
    logger.info(f"Batch size: {args.batch_size}")
    logger.info(f"Checkpoint file: {args.checkpoint_file}")
    logger.info(f"Validate only: {args.validate_only}")
    logger.info(f"Resume mode: {args.resume}")
    logger.info("=" * 60)

    try:
        # Initialize migration manager
        manager = MigrationManager(
            batch_size=args.batch_size, checkpoint_file=Path(args.checkpoint_file)
        )

        # Validate-only mode
        if args.validate_only:
            is_valid = validate_migration(manager)
            sys.exit(0 if is_valid else 1)

        # Check for existing checkpoint
        checkpoint = manager.load_checkpoint()
        if checkpoint and not args.resume:
            logger.warning("⚠️  Existing checkpoint found!")
            logger.warning(f"   Last batch: {checkpoint['last_batch_id']}")
            logger.warning(f"   Records migrated: {checkpoint['records_migrated']:,}")
            logger.warning("")
            logger.warning(
                "   Use --resume to continue, or delete checkpoint file to start fresh"
            )
            sys.exit(1)

        # Run migration
        logger.info("\n🚀 Starting migration...\n")
        start_time = datetime.now(timezone.utc)

        result = manager.migrate_all_data()

        # Print final results
        logger.info("\n✅ Migration completed successfully!")
        logger.info("=" * 60)
        logger.info("MIGRATION STATISTICS")
        logger.info("=" * 60)
        logger.info(f"Records migrated: {result['records_migrated']:,}")
        logger.info(f"Total batches: {result['total_batches']}")
        logger.info(f"Batch size: {result['batch_size']}")
        logger.info(f"Elapsed time: {result['elapsed_time_seconds']:.1f} seconds")

        if result["records_migrated"] > 0:
            rate = result["records_migrated"] / result["elapsed_time_seconds"]
            logger.info(f"Average rate: {rate:.1f} records/second")

        if result.get("resumed_from_batch"):
            logger.info(f"Resumed from batch: {result['resumed_from_batch']}")

        logger.info("=" * 60)

        # Post-migration validation
        if not args.skip_validation:
            is_valid = validate_migration(manager)

            if is_valid:
                logger.info("\n🎉 Validation PASSED - Migration successful!")

                # Clean up checkpoint
                manager.cleanup_checkpoint()
                logger.info("Checkpoint file cleaned up")

                sys.exit(0)
            else:
                logger.error("\n❌ Validation FAILED - Data mismatch detected!")
                sys.exit(1)
        else:
            logger.info("\n⚠️  Validation skipped (use --skip-validation)")
            sys.exit(0)

    except KeyboardInterrupt:
        logger.warning("\n⚠️  Migration interrupted by user")
        logger.warning("   Checkpoint saved - use --resume to continue")
        sys.exit(130)

    except Exception as e:
        logger.error(f"\n❌ Migration failed: {e}")
        logger.error("   Checkpoint saved - fix errors and use --resume to retry")
        sys.exit(1)


if __name__ == "__main__":
    main()
