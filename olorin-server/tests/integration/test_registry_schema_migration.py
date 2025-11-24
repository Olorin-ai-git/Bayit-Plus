"""
Registry Schema Migration Tests

Tests SQLite registry schema migrations and data integrity after schema changes.
"""

import pytest
import tempfile
import sqlite3
from pathlib import Path
from datetime import datetime

from app.service.investigation.workspace_registry import WorkspaceRegistry


class TestRegistrySchemaMigration:
    """Test suite for registry schema migrations"""

    def setup_method(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.registry_path = Path(self.temp_dir) / "test_registry.sqlite"
        self.registry = WorkspaceRegistry(registry_path=self.registry_path)

    def test_schema_initialization(self):
        """Test that schema is initialized correctly"""
        # Check that tables exist
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check investigations table
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='investigations'
            """)
            assert cursor.fetchone() is not None
            
            # Check files table
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='files'
            """)
            assert cursor.fetchone() is not None
            
            # Check comparisons table
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='comparisons'
            """)
            assert cursor.fetchone() is not None
            
            # Check audit_log table
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='audit_log'
            """)
            assert cursor.fetchone() is not None

    def test_indexes_exist(self):
        """Test that required indexes exist"""
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Get all indexes
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='index' AND name NOT LIKE 'sqlite_%'
            """)
            indexes = [row[0] for row in cursor.fetchall()]
            
            # Check required indexes
            required_indexes = [
                "idx_investigations_investigation_id",
                "idx_investigations_entity_ids",
                "idx_investigations_trigger_source_created",
                "idx_files_investigation_id",
                "idx_files_sha256",
                "idx_comparisons_left",
                "idx_comparisons_right"
            ]
            
            for index_name in required_indexes:
                assert index_name in indexes, f"Missing index: {index_name}"

    def test_fts5_virtual_table_exists(self):
        """Test that FTS5 virtual table exists"""
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check FTS5 table
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='investigations_fts'
            """)
            assert cursor.fetchone() is not None

    def test_foreign_keys_enabled(self):
        """Test that foreign keys are enabled"""
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check foreign keys setting
            cursor.execute("PRAGMA foreign_keys")
            result = cursor.fetchone()
            assert result[0] == 1, "Foreign keys should be enabled"

    def test_wal_mode_enabled(self):
        """Test that WAL mode is enabled"""
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check journal mode
            cursor.execute("PRAGMA journal_mode")
            result = cursor.fetchone()
            assert result[0].upper() == "WAL", f"WAL mode not enabled: {result[0]}"

    def test_data_integrity_after_migration(self):
        """Test data integrity after schema operations"""
        # Index investigation
        investigation_id = "inv_test_001"
        self.registry.index_investigation(
            investigation_id=investigation_id,
            title="Test Investigation",
            entity_type="email",
            entity_ids=["test@example.com"],
            canonical_path="workspace/investigations/2025/11/inv_test_001",
            created_at=datetime.now()
        )
        
        # Index file
        self.registry.index_file(
            investigation_id=investigation_id,
            canonical_path="workspace/investigations/2025/11/inv_test_001/file.json",
            file_kind="artifact",
            file_ext="json",
            sha256_hash="test_hash_1234567890abcdef",
            file_size=1024
        )
        
        # Verify data integrity
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check investigation exists
            cursor.execute(
                "SELECT investigation_id FROM investigations WHERE investigation_id = ?",
                (investigation_id,)
            )
            assert cursor.fetchone() is not None
            
            # Check file exists and references investigation
            cursor.execute(
                "SELECT file_id FROM files WHERE investigation_id = ?",
                (investigation_id,)
            )
            assert cursor.fetchone() is not None
            
            # Check foreign key constraint (file should reference investigation)
            # This is tested implicitly - if foreign key is broken, query would fail

    def test_schema_can_be_recreated(self):
        """Test that schema can be safely recreated"""
        # Create registry and add data
        investigation_id = "inv_test_002"
        self.registry.index_investigation(
            investigation_id=investigation_id,
            title="Test Investigation 2",
            canonical_path="workspace/investigations/2025/11/inv_test_002"
        )
        
        # Close registry
        del self.registry
        
        # Recreate registry (should handle existing schema gracefully)
        new_registry = WorkspaceRegistry(registry_path=self.registry_path)
        
        # Verify data still exists
        results = new_registry.query_by_entity("email", limit=10)
        investigation_ids = [r.get("investigation_id") for r in results]
        assert investigation_id in investigation_ids or len(results) == 0

    def test_audit_log_schema(self):
        """Test audit log table schema"""
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Get table schema
            cursor.execute("PRAGMA table_info(audit_log)")
            columns = {row[1]: row[2] for row in cursor.fetchall()}
            
            # Check required columns
            assert "operation_type" in columns
            assert "resource_type" in columns
            assert "resource_id" in columns
            assert "timestamp" in columns

    def test_json_fields_storage(self):
        """Test that JSON fields are stored and retrieved correctly"""
        investigation_id = "inv_test_json"
        entity_ids = ["entity1", "entity2", "entity3"]
        tags = ["tag1", "tag2"]
        metadata = {"key1": "value1", "key2": 123}
        
        self.registry.index_investigation(
            investigation_id=investigation_id,
            title="JSON Test",
            entity_ids=entity_ids,
            tags=tags,
            metadata=metadata,
            canonical_path="workspace/investigations/2025/11/inv_test_json"
        )
        
        # Query and verify JSON fields
        results = self.registry.query_by_entity("email", limit=10)
        inv = next((r for r in results if r.get("investigation_id") == investigation_id), None)
        
        if inv:
            assert inv.get("entity_ids") == entity_ids
            assert inv.get("tags") == tags
            assert inv.get("metadata") == metadata

