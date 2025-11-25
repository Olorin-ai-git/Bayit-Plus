"""
Unit tests for SymlinkManager

Tests symlink creation with auto-fallback to indexed views.
"""

import os
import tempfile
from pathlib import Path

import pytest

from app.service.investigation.symlink_manager import SymlinkManager


class TestSymlinkManager:
    """Test suite for SymlinkManager"""

    def test_create_symlink_success(self):
        """Test successful symlink creation"""
        manager = SymlinkManager()

        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "target.txt"
            target.write_text("test content")

            link_path = Path(tmpdir) / "link.txt"

            view_type, error = manager.create_symlink(target, link_path)

            # Should create symlink if supported, otherwise indexed view
            assert view_type in ("symlink", "indexed")
            assert error is None or "indexed" in error.lower()

            # If symlink was created, verify it resolves correctly
            if view_type == "symlink" and link_path.is_symlink():
                assert link_path.resolve() == target.resolve()
                assert link_path.read_text() == "test content"

    def test_create_symlink_target_not_exists(self):
        """Test symlink creation when target doesn't exist"""
        manager = SymlinkManager()

        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "nonexistent.txt"
            link_path = Path(tmpdir) / "link.txt"

            view_type, error = manager.create_symlink(target, link_path)

            # Should fall back to indexed view
            assert view_type == "indexed"
            assert error is not None
            assert "does not exist" in error.lower()

    def test_create_symlink_already_exists(self):
        """Test symlink creation when link path already exists"""
        manager = SymlinkManager()

        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "target.txt"
            target.write_text("target content")

            link_path = Path(tmpdir) / "link.txt"
            link_path.write_text("existing content")

            # Try to create symlink without force
            view_type, error = manager.create_symlink(target, link_path, force=False)

            # Should fall back to indexed view if link exists
            assert view_type == "indexed"
            assert error is not None
            assert "already exists" in error.lower()

    def test_create_symlink_force_overwrite(self):
        """Test symlink creation with force=True to overwrite existing link"""
        manager = SymlinkManager()

        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "target.txt"
            target.write_text("target content")

            link_path = Path(tmpdir) / "link.txt"
            link_path.write_text("old content")

            # Create symlink with force
            view_type, error = manager.create_symlink(target, link_path, force=True)

            # Should succeed (either symlink or indexed view)
            assert view_type in ("symlink", "indexed")

            # If symlink, verify it points to target
            if view_type == "symlink" and link_path.is_symlink():
                assert link_path.resolve() == target.resolve()

    def test_resolve_view_path_symlink(self):
        """Test resolving symlink to canonical path"""
        manager = SymlinkManager()

        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "target.txt"
            target.write_text("content")

            link_path = Path(tmpdir) / "link.txt"

            # Create symlink
            view_type, _ = manager.create_symlink(target, link_path)

            if view_type == "symlink" and link_path.is_symlink():
                # Resolve symlink
                resolved = manager.resolve_view_path(link_path)
                assert resolved == target.resolve()

    def test_resolve_view_path_indexed_view(self):
        """Test resolving indexed view (requires registry)"""

        # Mock registry
        class MockRegistry:
            def resolve_indexed_view(self, virtual_path):
                return str(Path(virtual_path).parent / "canonical.txt")

        registry = MockRegistry()
        manager = SymlinkManager(registry=registry)

        with tempfile.TemporaryDirectory() as tmpdir:
            link_path = Path(tmpdir) / "indexed_link.txt"

            # Resolve indexed view
            resolved = manager.resolve_view_path(link_path)

            # Should resolve via registry
            if resolved:
                assert "canonical.txt" in str(resolved)

    def test_remove_view_symlink(self):
        """Test removing symlink"""
        manager = SymlinkManager()

        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "target.txt"
            target.write_text("content")

            link_path = Path(tmpdir) / "link.txt"

            # Create symlink
            view_type, _ = manager.create_symlink(target, link_path)

            if view_type == "symlink" and link_path.is_symlink():
                # Remove symlink
                result = manager.remove_view(link_path)
                assert result is True
                assert not link_path.exists()
                assert target.exists()  # Target should still exist

    def test_create_symlink_directory(self):
        """Test symlink creation for directory"""
        manager = SymlinkManager()

        with tempfile.TemporaryDirectory() as tmpdir:
            target_dir = Path(tmpdir) / "target_dir"
            target_dir.mkdir()
            (target_dir / "file.txt").write_text("content")

            link_path = Path(tmpdir) / "link_dir"

            view_type, error = manager.create_symlink(target_dir, link_path)

            # Should create symlink or indexed view
            assert view_type in ("symlink", "indexed")

            # If symlink, verify it resolves correctly
            if view_type == "symlink" and link_path.is_symlink():
                assert link_path.resolve() == target_dir.resolve()
                assert (link_path / "file.txt").exists()
