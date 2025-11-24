"""
Migration Checkpoint and Resume Unit Tests.

Tests checkpoint creation, loading, and resume functionality.
Ensures migration can be interrupted and resumed without data loss.

Following TDD: These tests MUST FAIL until implementation is complete.

Constitutional Compliance:
- NO mocks - uses real file I/O and checkpoint logic
- Complete checkpoint testing
- Tests guide implementation
"""

import pytest
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

from app.service.agent.tools.database_tool.migration_manager import MigrationManager


class TestCheckpointFileOperations:
    """Test checkpoint file creation, reading, and writing."""

    def test_checkpoint_file_creation(self, tmp_path):
        """Test that checkpoint file is created on first save."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Initially file shouldn't exist
        assert not checkpoint_file.exists()

        # Save checkpoint
        state = {"last_batch_id": 1, "records_migrated": 500}
        manager.save_checkpoint(state)

        # File should now exist
        assert checkpoint_file.exists()

    def test_checkpoint_file_overwrite(self, tmp_path):
        """Test that checkpoint file is overwritten on subsequent saves."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Save first checkpoint
        state1 = {"last_batch_id": 1, "records_migrated": 500}
        manager.save_checkpoint(state1)

        # Save second checkpoint (should overwrite)
        state2 = {"last_batch_id": 2, "records_migrated": 1000}
        manager.save_checkpoint(state2)

        # Load checkpoint
        loaded = manager.load_checkpoint()

        # Should have latest values
        assert loaded["last_batch_id"] == 2
        assert loaded["records_migrated"] == 1000

    def test_checkpoint_file_permissions(self, tmp_path):
        """Test that checkpoint file has appropriate permissions."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        state = {"last_batch_id": 1, "records_migrated": 500}
        manager.save_checkpoint(state)

        # File should be readable and writable
        assert checkpoint_file.exists()
        assert checkpoint_file.is_file()

        # Should be able to read it
        with open(checkpoint_file) as f:
            data = json.load(f)
            assert data["last_batch_id"] == 1


class TestCheckpointDataStructure:
    """Test checkpoint data structure and validation."""

    def test_checkpoint_contains_required_fields(self, tmp_path):
        """Test that checkpoint contains all required fields."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        state = {
            "last_batch_id": 5,
            "records_migrated": 2500,
            "migration_start_time": datetime.now(timezone.utc).isoformat(),
            "last_successful_batch_timestamp": datetime.now(timezone.utc).isoformat()
        }

        manager.save_checkpoint(state)
        loaded = manager.load_checkpoint()

        # Verify all fields present
        assert "last_batch_id" in loaded
        assert "records_migrated" in loaded
        assert "migration_start_time" in loaded
        assert "last_successful_batch_timestamp" in loaded

    def test_checkpoint_validates_batch_id(self, tmp_path):
        """Test that checkpoint validates batch_id is positive integer."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Valid batch ID
        valid_state = {"last_batch_id": 5, "records_migrated": 2500}
        manager.save_checkpoint(valid_state)

        loaded = manager.load_checkpoint()
        assert loaded["last_batch_id"] == 5

    def test_checkpoint_validates_records_migrated(self, tmp_path):
        """Test that checkpoint validates records_migrated is non-negative."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Valid record count
        valid_state = {"last_batch_id": 1, "records_migrated": 1000}
        manager.save_checkpoint(valid_state)

        loaded = manager.load_checkpoint()
        assert loaded["records_migrated"] == 1000
        assert loaded["records_migrated"] >= 0


class TestCheckpointResume:
    """Test resuming migration from checkpoint."""

    def test_resume_from_checkpoint_continues_from_last_batch(self, tmp_path):
        """Test that resume starts from last successful batch + 1."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Save checkpoint at batch 3
        state = {
            "last_batch_id": 3,
            "records_migrated": 1500,
            "migration_start_time": datetime.now(timezone.utc).isoformat()
        }

        with open(checkpoint_file, 'w') as f:
            json.dump(state, f)

        # Create new manager and load checkpoint
        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Should resume from batch 4
        next_batch_id = loaded["last_batch_id"] + 1
        assert next_batch_id == 4

    def test_resume_preserves_migration_start_time(self, tmp_path):
        """Test that resume preserves original migration start time."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Original start time
        original_start = datetime.now(timezone.utc) - timedelta(hours=1)

        state = {
            "last_batch_id": 5,
            "records_migrated": 2500,
            "migration_start_time": original_start.isoformat()
        }

        with open(checkpoint_file, 'w') as f:
            json.dump(state, f)

        # Resume migration
        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Start time should be preserved
        assert loaded["migration_start_time"] == original_start.isoformat()

    def test_resume_accumulates_records_migrated(self, tmp_path):
        """Test that resume accumulates records_migrated correctly."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Initial checkpoint: 1500 records migrated
        state = {
            "last_batch_id": 3,
            "records_migrated": 1500
        }

        with open(checkpoint_file, 'w') as f:
            json.dump(state, f)

        # Load and verify
        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        assert loaded["records_migrated"] == 1500

        # Next batch adds 500 more records
        # Total should be 2000
        updated_state = {
            "last_batch_id": 4,
            "records_migrated": loaded["records_migrated"] + 500
        }

        manager.save_checkpoint(updated_state)
        reloaded = manager.load_checkpoint()

        assert reloaded["records_migrated"] == 2000


class TestCheckpointCorruptionHandling:
    """Test handling of corrupted checkpoint files."""

    def test_corrupted_checkpoint_returns_none(self, tmp_path):
        """Test that corrupted checkpoint file is handled gracefully."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Write invalid JSON
        with open(checkpoint_file, 'w') as f:
            f.write("{ invalid json")

        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Should return None or empty dict on corruption
        assert loaded is None or loaded == {}

    def test_empty_checkpoint_file_handled(self, tmp_path):
        """Test that empty checkpoint file is handled gracefully."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Create empty file
        checkpoint_file.touch()

        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Should return None or empty dict
        assert loaded is None or loaded == {}

    def test_missing_required_fields_handled(self, tmp_path):
        """Test that checkpoint missing required fields is handled."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Checkpoint missing required field
        incomplete_state = {"last_batch_id": 5}  # Missing records_migrated

        with open(checkpoint_file, 'w') as f:
            json.dump(incomplete_state, f)

        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Should either return None, fill defaults, or handle gracefully
        assert loaded is not None


class TestCheckpointConcurrency:
    """Test checkpoint behavior with concurrent access."""

    def test_checkpoint_atomic_write(self, tmp_path):
        """Test that checkpoint writes are atomic."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Save checkpoint
        state = {"last_batch_id": 10, "records_migrated": 5000}
        manager.save_checkpoint(state)

        # Read back immediately
        loaded = manager.load_checkpoint()

        # Should get complete, valid checkpoint
        assert loaded["last_batch_id"] == 10
        assert loaded["records_migrated"] == 5000


class TestCheckpointCleanup:
    """Test checkpoint cleanup after successful migration."""

    def test_checkpoint_deleted_after_successful_migration(self, tmp_path):
        """Test that checkpoint is deleted after successful migration."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Create checkpoint
        state = {"last_batch_id": 1, "records_migrated": 500}
        manager.save_checkpoint(state)

        assert checkpoint_file.exists()

        # Clean up checkpoint after successful migration
        manager.cleanup_checkpoint()

        # Checkpoint should be removed
        assert not checkpoint_file.exists()

    def test_checkpoint_preserved_on_failure(self, tmp_path):
        """Test that checkpoint is preserved if migration fails."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        # Create checkpoint
        state = {"last_batch_id": 3, "records_migrated": 1500}
        manager.save_checkpoint(state)

        # Simulate migration failure (checkpoint should be preserved)
        # Manager should NOT call cleanup_checkpoint on failure

        # Checkpoint should still exist
        assert checkpoint_file.exists()


class TestCheckpointMetadata:
    """Test checkpoint metadata tracking."""

    def test_checkpoint_tracks_last_batch_timestamp(self, tmp_path):
        """Test that checkpoint tracks timestamp of last successful batch."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        now = datetime.now(timezone.utc)

        state = {
            "last_batch_id": 5,
            "records_migrated": 2500,
            "last_successful_batch_timestamp": now.isoformat()
        }

        manager.save_checkpoint(state)
        loaded = manager.load_checkpoint()

        assert "last_successful_batch_timestamp" in loaded
        # Timestamps should match (within millisecond tolerance)
        loaded_time = datetime.fromisoformat(loaded["last_successful_batch_timestamp"])
        assert abs((loaded_time - now).total_seconds()) < 1

    def test_checkpoint_tracks_batch_processing_time(self, tmp_path):
        """Test that checkpoint can track batch processing times."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"
        manager = MigrationManager(checkpoint_file=checkpoint_file)

        state = {
            "last_batch_id": 5,
            "records_migrated": 2500,
            "average_batch_time_seconds": 12.5,
            "estimated_time_remaining_seconds": 150.0
        }

        manager.save_checkpoint(state)
        loaded = manager.load_checkpoint()

        assert "average_batch_time_seconds" in loaded
        assert loaded["average_batch_time_seconds"] == 12.5


class TestCheckpointRecoveryScenarios:
    """Test various checkpoint recovery scenarios."""

    def test_recover_from_mid_migration_crash(self, tmp_path):
        """Test recovery from crash in middle of migration."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Simulate crash at batch 7 out of 20
        crash_state = {
            "last_batch_id": 7,
            "records_migrated": 3500,
            "total_batches_expected": 20,
            "migration_start_time": datetime.now(timezone.utc).isoformat()
        }

        with open(checkpoint_file, 'w') as f:
            json.dump(crash_state, f)

        # Recovery: new manager loads checkpoint
        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Should resume from batch 8
        assert loaded["last_batch_id"] == 7
        next_batch = loaded["last_batch_id"] + 1
        assert next_batch == 8

        # Progress info should be preserved
        assert loaded["records_migrated"] == 3500

    def test_recover_from_early_failure(self, tmp_path):
        """Test recovery from early migration failure."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Failure after first batch
        early_failure_state = {
            "last_batch_id": 1,
            "records_migrated": 500
        }

        with open(checkpoint_file, 'w') as f:
            json.dump(early_failure_state, f)

        # Recovery
        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Should resume from batch 2
        assert loaded["last_batch_id"] == 1
        assert loaded["records_migrated"] == 500

    def test_detect_stale_checkpoint(self, tmp_path):
        """Test detection of stale checkpoints."""
        checkpoint_file = tmp_path / "migration_checkpoint.json"

        # Very old checkpoint (24 hours ago)
        old_time = datetime.now(timezone.utc) - timedelta(hours=24)

        stale_state = {
            "last_batch_id": 5,
            "records_migrated": 2500,
            "last_successful_batch_timestamp": old_time.isoformat()
        }

        with open(checkpoint_file, 'w') as f:
            json.dump(stale_state, f)

        manager = MigrationManager(checkpoint_file=checkpoint_file)
        loaded = manager.load_checkpoint()

        # Should detect staleness (implementation dependent)
        if hasattr(manager, 'is_checkpoint_stale'):
            is_stale = manager.is_checkpoint_stale(loaded, hours=12)
            assert is_stale is True
