"""
End-to-End Import/Rollback Tests

Tests import operations with verification and rollback capabilities.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import json

from app.service.investigation.workspace_registry import WorkspaceRegistry, get_registry
from app.service.investigation.file_organization_service import FileOrganizationService
from app.config.file_organization_config import FileOrganizationConfig


class TestImportRollback:
    """Test suite for import and rollback operations"""

    def setup_method(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.source_dir = Path(self.temp_dir) / "source"
        self.target_dir = Path(self.temp_dir) / "target"
        self.source_dir.mkdir()
        self.target_dir.mkdir()
        
        self.registry_path = self.target_dir / "registry" / "registry.sqlite"
        self.registry_path.parent.mkdir(parents=True)
        self.registry = WorkspaceRegistry(registry_path=self.registry_path)
        
        self.config = FileOrganizationConfig()
        self.file_org_service = FileOrganizationService(self.config)

    def create_test_investigation_files(self, investigation_id: str, entity_type: str, entity_id: str):
        """Create test investigation files in source directory"""
        inv_dir = self.source_dir / investigation_id
        inv_dir.mkdir()
        
        # Create metadata.json
        metadata = {
            "investigation_id": investigation_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "created_at": datetime.now().isoformat()
        }
        (inv_dir / "metadata.json").write_text(json.dumps(metadata))
        
        # Create artifact file
        artifact = {
            "investigation_id": investigation_id,
            "risk_score": 0.5,
            "findings": []
        }
        (inv_dir / "artifact.json").write_text(json.dumps(artifact))
        
        # Create report file
        (inv_dir / "report.html").write_text(f"<html><body>Report for {investigation_id}</body></html>")
        
        return inv_dir

    def test_import_investigation_files(self):
        """Test importing investigation files"""
        investigation_id = "inv_import_001"
        entity_type = "email"
        entity_id = "test@example.com"
        
        # Create source files
        source_dir = self.create_test_investigation_files(investigation_id, entity_type, entity_id)
        
        # Import files (simplified - copy to target)
        target_inv_dir = self.target_dir / "investigations" / "2025" / "11" / investigation_id
        target_inv_dir.mkdir(parents=True)
        
        # Copy files
        shutil.copy2(source_dir / "metadata.json", target_inv_dir / "metadata.json")
        shutil.copy2(source_dir / "artifact.json", target_inv_dir / "artifact.json")
        shutil.copy2(source_dir / "report.html", target_inv_dir / "report.html")
        
        # Index in registry
        self.registry.index_investigation(
            investigation_id=investigation_id,
            title="Imported Investigation",
            entity_type=entity_type,
            entity_ids=[entity_id],
            canonical_path=str(target_inv_dir),
            created_at=datetime.now()
        )
        
        # Index files
        self.registry.index_file(
            investigation_id=investigation_id,
            canonical_path=str(target_inv_dir / "artifact.json"),
            file_kind="artifact",
            file_ext="json",
            sha256_hash="test_hash",
            file_size=(target_inv_dir / "artifact.json").stat().st_size
        )
        
        # Verify import
        results = self.registry.query_by_entity(entity_type, entity_id)
        assert len(results) > 0
        assert any(r.get("investigation_id") == investigation_id for r in results)
        
        # Verify files exist
        assert (target_inv_dir / "metadata.json").exists()
        assert (target_inv_dir / "artifact.json").exists()
        assert (target_inv_dir / "report.html").exists()

    def test_rollback_import(self):
        """Test rolling back an import operation"""
        investigation_id = "inv_rollback_001"
        entity_type = "email"
        entity_id = "rollback@example.com"
        
        # Create source files
        source_dir = self.create_test_investigation_files(investigation_id, entity_type, entity_id)
        
        # Import files
        target_inv_dir = self.target_dir / "investigations" / "2025" / "11" / investigation_id
        target_inv_dir.mkdir(parents=True)
        
        shutil.copy2(source_dir / "metadata.json", target_inv_dir / "metadata.json")
        shutil.copy2(source_dir / "artifact.json", target_inv_dir / "artifact.json")
        
        # Index in registry
        self.registry.index_investigation(
            investigation_id=investigation_id,
            title="Rollback Test",
            entity_type=entity_type,
            entity_ids=[entity_id],
            canonical_path=str(target_inv_dir)
        )
        
        # Verify import
        results_before = self.registry.query_by_entity(entity_type, entity_id)
        assert len(results_before) > 0
        
        # Rollback: Remove files and registry entries
        shutil.rmtree(target_inv_dir)
        
        # Remove from registry (simulate rollback)
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM investigations WHERE investigation_id = ?", (investigation_id,))
            cursor.execute("DELETE FROM files WHERE investigation_id = ?", (investigation_id,))
        
        # Verify rollback
        results_after = self.registry.query_by_entity(entity_type, entity_id)
        investigation_ids = [r.get("investigation_id") for r in results_after]
        assert investigation_id not in investigation_ids
        
        # Verify files are gone
        assert not target_inv_dir.exists()

    def test_import_verification(self):
        """Test verifying imported files"""
        investigation_id = "inv_verify_001"
        entity_type = "email"
        entity_id = "verify@example.com"
        
        # Create and import
        source_dir = self.create_test_investigation_files(investigation_id, entity_type, entity_id)
        target_inv_dir = self.target_dir / "investigations" / "2025" / "11" / investigation_id
        target_inv_dir.mkdir(parents=True)
        
        shutil.copy2(source_dir / "artifact.json", target_inv_dir / "artifact.json")
        
        # Index file with hash
        import hashlib
        file_content = (target_inv_dir / "artifact.json").read_bytes()
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        self.registry.index_file(
            investigation_id=investigation_id,
            canonical_path=str(target_inv_dir / "artifact.json"),
            file_kind="artifact",
            file_ext="json",
            sha256_hash=file_hash,
            file_size=len(file_content)
        )
        
        # Verify file hash matches
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT sha256_hash FROM files WHERE investigation_id = ?",
                (investigation_id,)
            )
            stored_hash = cursor.fetchone()[0]
            assert stored_hash == file_hash

    def test_import_with_conflicts(self):
        """Test importing files with conflicts (duplicate hashes)"""
        investigation_id_1 = "inv_conflict_001"
        investigation_id_2 = "inv_conflict_002"
        
        # Create identical files
        content = '{"test": "data"}'
        file1 = self.source_dir / "file1.json"
        file2 = self.source_dir / "file2.json"
        file1.write_text(content)
        file2.write_text(content)
        
        # Calculate hash
        import hashlib
        file_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Index both files
        self.registry.index_file(
            investigation_id=investigation_id_1,
            canonical_path=str(file1),
            file_kind="artifact",
            file_ext="json",
            sha256_hash=file_hash,
            file_size=len(content)
        )
        
        self.registry.index_file(
            investigation_id=investigation_id_2,
            canonical_path=str(file2),
            file_kind="artifact",
            file_ext="json",
            sha256_hash=file_hash,
            file_size=len(content)
        )
        
        # Verify both files are indexed (deduplication handled by registry)
        with self.registry._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM files WHERE sha256_hash = ?",
                (file_hash,)
            )
            count = cursor.fetchone()[0]
            assert count == 2  # Both files indexed (deduplication is optional)

