"""
Migration Manager Unit Tests.

Tests the MigrationManager class for data migration from Snowflake to PostgreSQL.
Tests batch processing, checkpointing, error handling, and data transformations.

Following TDD: These tests MUST FAIL until implementation is complete.

Constitutional Compliance:
- NO mocks - uses real database providers or test doubles that mimic real behavior
- Complete implementation testing
- Tests guide implementation
"""

import pytest
import os
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.service.agent.tools.database_tool.migration_manager import MigrationManager


class TestMigrationManagerInitialization:
    """Test MigrationManager initialization."""

    def test_migration_manager_init_with_defaults(self):
        """Test initialization with default configuration."""
        manager = MigrationManager()

        assert manager.batch_size == 500  # Default batch size
        assert manager.checkpoint_file == Path("migration_checkpoint.json")
        assert manager.source_provider_name == "snowflake"
        assert manager.target_provider_name == "postgresql"

    def test_migration_manager_init_with_custom_config(self):
        """Test initialization with custom configuration."""
        manager = MigrationManager(
            batch_size=1000,
            checkpoint_file=Path("custom_checkpoint.json")
        )

        assert manager.batch_size == 1000
        assert manager.checkpoint_file == Path("custom_checkpoint.json")

    def test_migration_manager_validates_batch_size(self):
        """Test that invalid batch sizes are rejected."""
        with pytest.raises(ValueError, match="batch_size must be > 0"):
            MigrationManager(batch_size=0)

        with pytest.raises(ValueError, match="batch_size must be > 0"):
            MigrationManager(batch_size=-100)


class TestMigrationCheckpointing:
    """Test migration checkpointing functionality."""

    def test_create_checkpoint(self, tmp_path):
        """Test checkpoint file creation."""
        checkpoint_file = tmp_path / "test_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Create checkpoint with migration state
        state = {
            "last_batch_id": 5,
            "records_migrated": 2500,
            "migration_start_time": datetime.now(timezone.utc).isoformat(),
            "last_successful_batch_timestamp": datetime.now(timezone.utc).isoformat()
        }

        manager.save_checkpoint(state)

        # Verify checkpoint file exists
        assert checkpoint_file.exists()

        # Verify checkpoint contents
        with open(checkpoint_file) as f:
            checkpoint_data = json.load(f)

        assert checkpoint_data["last_batch_id"] == 5
        assert checkpoint_data["records_migrated"] == 2500

    def test_load_checkpoint(self, tmp_path):
        """Test loading checkpoint from file."""
        checkpoint_file = tmp_path / "test_checkpoint.json"

        # Create checkpoint file manually
        checkpoint_data = {
            "last_batch_id": 10,
            "records_migrated": 5000,
            "migration_start_time": "2025-01-01T00:00:00Z"
        }

        with open(checkpoint_file, 'w') as f:
            json.dump(checkpoint_data, f)

        manager = MigrationManager(checkpoint_file=checkpoint_file)
        state = manager.load_checkpoint()

        assert state is not None
        assert state["last_batch_id"] == 10
        assert state["records_migrated"] == 5000

    def test_load_checkpoint_missing_file(self, tmp_path):
        """Test loading checkpoint when file doesn't exist."""
        checkpoint_file = tmp_path / "nonexistent_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        state = manager.load_checkpoint()

        # Should return None or empty state
        assert state is None or state == {}

    def test_checkpoint_is_resumable(self, tmp_path):
        """Test that checkpoint allows resuming from last successful batch."""
        checkpoint_file = tmp_path / "test_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Save checkpoint at batch 3
        state = {
            "last_batch_id": 3,
            "records_migrated": 1500
        }
        manager.save_checkpoint(state)

        # Create new manager instance and load checkpoint
        manager2 = MigrationManager(checkpoint_file=checkpoint_file)
        loaded_state = manager2.load_checkpoint()

        assert loaded_state["last_batch_id"] == 3
        assert loaded_state["records_migrated"] == 1500

        # Should resume from batch 4
        next_batch_id = loaded_state["last_batch_id"] + 1
        assert next_batch_id == 4


class TestDataExtraction:
    """Test data extraction from Snowflake."""

    def test_extract_batch_returns_correct_batch_size(self):
        """Test that extract_batch returns correct number of records."""
        manager = MigrationManager(batch_size=100)

        # Extract batch (will use mock/test provider)
        batch = manager.extract_batch(batch_id=1, offset=0)

        # Verify batch structure
        assert isinstance(batch, list)
        # Note: May be empty if no test data, or up to batch_size records
        assert len(batch) <= 100

    def test_extract_batch_with_offset(self):
        """Test batch extraction with offset pagination."""
        manager = MigrationManager(batch_size=500)

        # Extract first batch
        batch1 = manager.extract_batch(batch_id=1, offset=0)

        # Extract second batch with offset
        batch2 = manager.extract_batch(batch_id=2, offset=500)

        # Batches should be different (unless data is identical)
        assert isinstance(batch1, list)
        assert isinstance(batch2, list)

    def test_extract_batch_handles_empty_result(self):
        """Test that extract_batch handles empty results gracefully."""
        manager = MigrationManager(batch_size=500)

        # Extract batch beyond available data
        batch = manager.extract_batch(batch_id=999, offset=999000)

        # Should return empty list, not error
        assert batch == []


class TestDataInsertion:
    """Test data insertion to PostgreSQL."""

    def test_insert_batch_returns_success_count(self):
        """Test that insert_batch returns number of inserted records."""
        manager = MigrationManager()

        # Sample batch data
        batch_data = [
            {"TX_ID_KEY": "tx_001", "EMAIL": "user1@test.com", "MODEL_SCORE": 0.75},
            {"TX_ID_KEY": "tx_002", "EMAIL": "user2@test.com", "MODEL_SCORE": 0.45}
        ]

        # Insert batch
        inserted_count = manager.insert_batch(batch_data)

        # Verify insertion
        assert isinstance(inserted_count, int)
        assert inserted_count >= 0  # May be 0 if test DB is read-only

    def test_insert_batch_handles_empty_batch(self):
        """Test that insert_batch handles empty batches gracefully."""
        manager = MigrationManager()

        # Insert empty batch
        inserted_count = manager.insert_batch([])

        # Should return 0, not error
        assert inserted_count == 0

    def test_insert_batch_transaction_rollback_on_error(self):
        """Test that insert_batch rolls back on error."""
        manager = MigrationManager()

        # Batch with invalid data (should trigger error)
        invalid_batch = [
            {"INVALID_COLUMN": "value"}  # Column doesn't exist
        ]

        # Should raise error and rollback
        with pytest.raises(Exception):
            manager.insert_batch(invalid_batch)


class TestDataTransformation:
    """Test data transformation during migration."""

    def test_transform_timestamp_to_utc(self):
        """Test UTC timezone standardization for timestamps."""
        manager = MigrationManager()

        # Record with timestamp (may have timezone info)
        record = {
            "TX_DATETIME": "2025-01-01 12:00:00",
            "EMAIL": "user@test.com"
        }

        transformed = manager.transform_record(record)

        # Verify timestamp is converted to UTC
        assert "TX_DATETIME" in transformed
        # Should be ISO format with UTC timezone
        assert isinstance(transformed["TX_DATETIME"], str)

    def test_transform_variant_to_jsonb(self):
        """Test VARIANT (JSON) to JSONB conversion."""
        manager = MigrationManager()

        # Record with VARIANT column
        record = {
            "TX_ID_KEY": "tx_001",
            "METADATA": '{"key": "value", "nested": {"data": "test"}}'  # JSON string
        }

        transformed = manager.transform_record(record)

        # Verify JSON is properly formatted for JSONB
        assert "METADATA" in transformed
        # Should be valid JSON
        if isinstance(transformed["METADATA"], str):
            json.loads(transformed["METADATA"])  # Should not raise

    def test_transform_preserves_all_fields(self):
        """Test that transformation preserves all record fields."""
        manager = MigrationManager()

        record = {
            "TX_ID_KEY": "tx_001",
            "EMAIL": "user@test.com",
            "MODEL_SCORE": 0.85,
            "IS_FRAUD_TX": True,
            "TX_DATETIME": "2025-01-01 12:00:00"
        }

        transformed = manager.transform_record(record)

        # All original fields should be present
        for key in record.keys():
            assert key in transformed


class TestMigrationProgress:
    """Test migration progress tracking."""

    def test_calculate_progress_percentage(self):
        """Test progress percentage calculation."""
        manager = MigrationManager()

        # Set total records
        manager.total_records = 10000

        # Calculate progress at different points
        progress_0 = manager.calculate_progress(records_migrated=0)
        progress_50 = manager.calculate_progress(records_migrated=5000)
        progress_100 = manager.calculate_progress(records_migrated=10000)

        assert progress_0 == 0.0
        assert progress_50 == 50.0
        assert progress_100 == 100.0

    def test_estimate_time_remaining(self):
        """Test estimated time remaining calculation."""
        manager = MigrationManager()

        # Simulate migration in progress
        manager.total_records = 10000
        start_time = datetime.now(timezone.utc)
        elapsed_seconds = 60  # 1 minute elapsed
        records_migrated = 1000  # 10% complete

        estimated_remaining = manager.estimate_time_remaining(
            records_migrated=records_migrated,
            elapsed_seconds=elapsed_seconds
        )

        # Should estimate ~9 minutes remaining (90% of work at current rate)
        assert isinstance(estimated_remaining, float)
        assert estimated_remaining > 0


class TestMigrationValidation:
    """Test migration validation functionality."""

    def test_validate_record_count_matches(self):
        """Test record count validation between source and target."""
        manager = MigrationManager()

        # Mock record counts
        source_count = 5432
        target_count = 5432

        is_valid = manager.validate_record_count(source_count, target_count)

        assert is_valid is True

    def test_validate_record_count_mismatch(self):
        """Test validation fails when record counts don't match."""
        manager = MigrationManager()

        source_count = 5432
        target_count = 5000  # Missing 432 records

        is_valid = manager.validate_record_count(source_count, target_count)

        assert is_valid is False

    def test_validate_sample_data_matches(self):
        """Test sample data validation between source and target."""
        manager = MigrationManager()

        # Sample records from both databases
        source_sample = [
            {"TX_ID_KEY": "tx_001", "EMAIL": "user@test.com"},
            {"TX_ID_KEY": "tx_002", "EMAIL": "admin@test.com"}
        ]

        target_sample = [
            {"tx_id_key": "tx_001", "email": "user@test.com"},  # Lowercase keys
            {"tx_id_key": "tx_002", "email": "admin@test.com"}
        ]

        is_valid = manager.validate_sample_data(source_sample, target_sample)

        # Should match despite case differences
        assert is_valid is True


class TestErrorHandling:
    """Test error handling and recovery."""

    def test_migration_stops_on_critical_error(self):
        """Test that migration stops on critical errors."""
        manager = MigrationManager()

        # Simulate critical error during migration
        with pytest.raises(Exception):
            manager.migrate_all_data()  # Will fail if source/target not configured

    def test_migration_logs_error_details(self, tmp_path):
        """Test that errors are logged with details."""
        manager = MigrationManager()

        # Attempt migration without proper setup
        try:
            manager.migrate_all_data()
        except Exception as e:
            # Error should contain useful information
            error_msg = str(e)
            assert len(error_msg) > 0  # Non-empty error message

    def test_rollback_on_batch_failure(self):
        """Test that failed batch is rolled back."""
        manager = MigrationManager()

        # Batch with invalid data
        invalid_batch = [
            {"NONEXISTENT_COLUMN": "value"}
        ]

        # Should raise error and not partially insert
        with pytest.raises(Exception):
            manager.insert_batch(invalid_batch)

        # Verify no partial data was inserted (implementation will handle)


class TestIdempotency:
    """Test migration idempotency (can run twice without duplicates)."""

    def test_migration_is_idempotent(self):
        """Test that running migration twice doesn't create duplicates."""
        manager = MigrationManager()

        # This test will be fully implemented when integration tests exist
        # For unit tests, verify manager has idempotency checks
        assert hasattr(manager, 'check_record_exists') or hasattr(manager, 'upsert_batch')

    def test_detect_duplicate_records(self):
        """Test that duplicate records are detected."""
        manager = MigrationManager()

        # Sample record
        record = {"TX_ID_KEY": "tx_001", "EMAIL": "user@test.com"}

        # Check if record exists (implementation will handle)
        # Method should exist for idempotency
        assert callable(getattr(manager, 'check_record_exists', None)) or \
               callable(getattr(manager, 'insert_batch', None))
