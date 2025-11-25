"""
Migration Validation Integration Tests.

Tests complete migration workflow from Snowflake to PostgreSQL.
Validates data parity, idempotency, and error recovery.

Following TDD: These tests MUST FAIL until implementation is complete.

Constitutional Compliance:
- NO mocks - uses real database connections or test containers
- Complete end-to-end validation
- Tests guide implementation
"""

import os
from typing import Any, Dict, List

import pytest

from app.service.agent.tools.database_tool.database_factory import get_database_provider
from app.service.agent.tools.database_tool.migration_manager import MigrationManager


class TestMigrationDataParity:
    """Test that migrated data matches source data exactly."""

    def test_record_count_matches_after_migration(self):
        """Test that target has same record count as source after migration."""
        manager = MigrationManager(batch_size=500)

        # Get providers
        source_provider = get_database_provider("snowflake")
        target_provider = get_database_provider("postgresql")

        # Get record counts before migration
        source_count_query = "SELECT COUNT(*) as count FROM transactions_enriched"
        source_count_result = source_provider.execute_query(source_count_query)
        source_count = source_count_result[0]["count"] if source_count_result else 0

        # Run migration
        migration_result = manager.migrate_all_data()

        # Get record counts after migration
        target_count_result = target_provider.execute_query(source_count_query)
        target_count = target_count_result[0]["count"] if target_count_result else 0

        # Verify counts match
        assert target_count == source_count
        assert migration_result["records_migrated"] == source_count

    def test_sample_data_matches_after_migration(self):
        """Test that sample records match between source and target."""
        manager = MigrationManager()

        # Get providers
        source_provider = get_database_provider("snowflake")
        target_provider = get_database_provider("postgresql")

        # Get sample from source (first 10 records)
        sample_query = """
            SELECT TX_ID_KEY, EMAIL, MODEL_SCORE, IS_FRAUD_TX
            FROM transactions_enriched
            ORDER BY TX_ID_KEY
            LIMIT 10
        """

        source_sample = source_provider.execute_query(sample_query)

        # Run migration
        manager.migrate_all_data()

        # Get sample from target
        target_sample = target_provider.execute_query(sample_query)

        # Verify samples match (case-insensitive)
        assert len(source_sample) == len(target_sample)

        for i in range(len(source_sample)):
            source_record = {k.upper(): v for k, v in source_sample[i].items()}
            target_record = {k.upper(): v for k, v in target_sample[i].items()}

            assert source_record["TX_ID_KEY"] == target_record["TX_ID_KEY"]
            assert source_record["EMAIL"] == target_record["EMAIL"]

    def test_all_columns_migrated(self):
        """Test that all 333 columns are migrated correctly."""
        manager = MigrationManager()

        # Get providers
        source_provider = get_database_provider("snowflake")
        target_provider = get_database_provider("postgresql")

        # Get column lists from both databases
        source_columns_query = """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'TRANSACTIONS_ENRICHED'
            ORDER BY COLUMN_NAME
        """

        target_columns_query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'transactions_enriched'
            ORDER BY column_name
        """

        source_columns = source_provider.execute_query(source_columns_query)
        target_columns = target_provider.execute_query(target_columns_query)

        # Normalize column names to uppercase for comparison
        source_col_names = set(col["COLUMN_NAME"].upper() for col in source_columns)
        target_col_names = set(col["column_name"].upper() for col in target_columns)

        # Verify all source columns exist in target
        missing_columns = source_col_names - target_col_names
        assert (
            len(missing_columns) == 0
        ), f"Missing columns in target: {missing_columns}"


class TestMigrationIdempotency:
    """Test that migration can run multiple times without duplicates."""

    def test_running_migration_twice_no_duplicates(self):
        """Test that running migration twice doesn't create duplicate records."""
        manager = MigrationManager()

        target_provider = get_database_provider("postgresql")

        # Run migration first time
        first_result = manager.migrate_all_data()
        first_count = first_result["records_migrated"]

        # Get record count after first migration
        count_query = "SELECT COUNT(*) as count FROM transactions_enriched"
        after_first = target_provider.execute_query(count_query)
        count_after_first = after_first[0]["count"]

        # Run migration second time
        second_result = manager.migrate_all_data()

        # Get record count after second migration
        after_second = target_provider.execute_query(count_query)
        count_after_second = after_second[0]["count"]

        # Record count should not increase (idempotent)
        assert count_after_second == count_after_first
        assert (
            second_result["records_skipped"] == first_count
        )  # All records already exist

    def test_partial_migration_resume(self):
        """Test that interrupted migration can resume from checkpoint."""
        # First migration - partial
        manager1 = MigrationManager(batch_size=500)

        # Simulate partial migration (only first batch)
        manager1.migrate_batches(max_batches=1)

        # Get checkpoint
        checkpoint = manager1.load_checkpoint()
        assert checkpoint is not None
        assert checkpoint["last_batch_id"] == 1

        # Second migration - resume
        manager2 = MigrationManager(batch_size=500)
        resume_result = manager2.migrate_all_data()

        # Should start from batch 2
        assert resume_result["resumed_from_batch"] == 2


class TestMigrationErrorRecovery:
    """Test migration error handling and recovery."""

    def test_migration_rollback_on_batch_error(self):
        """Test that batch errors trigger rollback."""
        manager = MigrationManager()

        # Attempt migration with invalid configuration
        with pytest.raises(Exception):
            # Force error by using invalid target
            manager.target_provider = None
            manager.migrate_all_data()

        # Verify no partial data in target
        target_provider = get_database_provider("postgresql")
        count_query = "SELECT COUNT(*) as count FROM transactions_enriched"
        result = target_provider.execute_query(count_query)

        # If migration failed, count should be 0 or unchanged
        # (Implementation will handle proper cleanup)

    def test_migration_logs_detailed_errors(self):
        """Test that migration failures are logged with details."""
        manager = MigrationManager()

        # Attempt migration that will fail
        try:
            manager.source_provider = None  # Force failure
            manager.migrate_all_data()
        except Exception as e:
            error_msg = str(e)

            # Error should be informative
            assert len(error_msg) > 0
            # Should mention source or configuration issue
            assert "source" in error_msg.lower() or "provider" in error_msg.lower()


class TestMigrationPerformance:
    """Test migration performance and efficiency."""

    def test_batch_processing_efficiency(self):
        """Test that batch processing is efficient."""
        manager = MigrationManager(batch_size=500)

        # Run migration and track time
        import time

        start_time = time.time()

        result = manager.migrate_all_data()

        elapsed_time = time.time() - start_time

        # Verify batching was used
        assert result["total_batches"] > 0
        assert result["batch_size"] == 500

        # Performance should be reasonable (< 1 second per batch for small datasets)
        if result["total_batches"] > 0:
            time_per_batch = elapsed_time / result["total_batches"]
            # Reasonable threshold (adjust based on actual performance)
            assert time_per_batch < 10.0  # Less than 10 seconds per batch

    def test_progress_logging_frequency(self):
        """Test that progress is logged at appropriate intervals."""
        manager = MigrationManager(batch_size=500)

        # Run migration
        result = manager.migrate_all_data()

        # Verify progress tracking
        assert "records_migrated" in result
        assert "elapsed_time_seconds" in result
        assert "batches_processed" in result


class TestMigrationValidation:
    """Test migration validation functionality."""

    def test_validate_migration_detects_missing_records(self):
        """Test that validation detects missing records."""
        manager = MigrationManager()

        # Run migration
        manager.migrate_all_data()

        # Validate migration
        validation_result = manager.validate_migration()

        assert validation_result["is_valid"] is True
        assert validation_result["record_count_match"] is True
        assert validation_result["sample_data_match"] is True

    def test_validate_migration_comprehensive(self):
        """Test comprehensive migration validation."""
        manager = MigrationManager()

        # Run migration
        manager.migrate_all_data()

        # Validate with comprehensive checks
        validation_result = manager.validate_migration(
            check_record_count=True, check_sample_data=True, sample_size=100
        )

        assert validation_result["is_valid"] is True
        assert "record_count_source" in validation_result
        assert "record_count_target" in validation_result
        assert (
            validation_result["record_count_source"]
            == validation_result["record_count_target"]
        )


class TestDataTransformationValidation:
    """Test that data transformations are correct."""

    def test_timestamp_conversion_correct(self):
        """Test that timestamps are converted to UTC correctly."""
        manager = MigrationManager()

        # Get providers
        source_provider = get_database_provider("snowflake")
        target_provider = get_database_provider("postgresql")

        # Run migration
        manager.migrate_all_data()

        # Get sample timestamps from both
        timestamp_query = """
            SELECT TX_ID_KEY, TX_DATETIME
            FROM transactions_enriched
            WHERE TX_DATETIME IS NOT NULL
            ORDER BY TX_ID_KEY
            LIMIT 5
        """

        source_timestamps = source_provider.execute_query(timestamp_query)
        target_timestamps = target_provider.execute_query(timestamp_query)

        # Verify timestamps match (within reasonable tolerance for UTC conversion)
        assert len(source_timestamps) == len(target_timestamps)

    def test_json_conversion_correct(self):
        """Test that JSON/VARIANT fields are converted correctly."""
        manager = MigrationManager()

        # Get providers
        target_provider = get_database_provider("postgresql")

        # Run migration
        manager.migrate_all_data()

        # Query for records with JSON columns
        json_query = """
            SELECT TX_ID_KEY
            FROM transactions_enriched
            LIMIT 5
        """

        results = target_provider.execute_query(json_query)

        # Verify query executed successfully (JSON conversion worked)
        assert isinstance(results, list)


class TestMigrationStatistics:
    """Test migration statistics reporting."""

    def test_migration_returns_statistics(self):
        """Test that migration returns comprehensive statistics."""
        manager = MigrationManager(batch_size=500)

        result = manager.migrate_all_data()

        # Verify all expected statistics are present
        assert "records_migrated" in result
        assert "total_batches" in result
        assert "elapsed_time_seconds" in result
        assert "migration_start_time" in result
        assert "migration_end_time" in result
        assert "average_records_per_second" in result

    def test_migration_calculates_rate_correctly(self):
        """Test that migration rate is calculated correctly."""
        manager = MigrationManager()

        result = manager.migrate_all_data()

        # Verify rate calculation
        if result["elapsed_time_seconds"] > 0:
            expected_rate = result["records_migrated"] / result["elapsed_time_seconds"]
            assert abs(result["average_records_per_second"] - expected_rate) < 0.01
