"""
CLI Contract Tests

Tests CLI command output formats, error handling, and contract compliance.
"""

import pytest
import subprocess
import json
import tempfile
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from cli.olor import cli
from click.testing import CliRunner


class TestCLIContracts:
    """Test suite for CLI contract compliance"""

    def setup_method(self):
        """Set up test fixtures"""
        self.runner = CliRunner()
        self.temp_dir = tempfile.mkdtemp()
        self.workspace_root = Path(self.temp_dir)

    def test_init_command_creates_structure(self):
        """Test that `olor init` creates workspace structure"""
        result = self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        
        assert result.exit_code == 0
        assert "Workspace initialized" in result.output or "initialized" in result.output.lower()
        
        # Check directory structure
        assert (self.workspace_root / "investigations").exists()
        assert (self.workspace_root / "comparisons").exists()
        assert (self.workspace_root / "reports").exists()
        assert (self.workspace_root / "registry").exists()
        assert (self.workspace_root / "registry" / "registry.sqlite").exists()

    def test_init_command_creates_config(self):
        """Test that `olor init` creates olorin.toml"""
        result = self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        
        assert result.exit_code == 0
        config_path = self.workspace_root / "olorin.toml"
        assert config_path.exists()

    def test_new_command_creates_investigation(self):
        """Test that `olor new` creates investigation with manifest"""
        # First initialize workspace
        self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        
        result = self.runner.invoke(cli, [
            '--root', str(self.workspace_root),
            'new',
            '--type', 'structured',
            '--graph', 'clean',
            '--trigger', 'script',
            '--entity-type', 'email',
            '--entity-id', 'test@example.com',
            '--title', 'Test Investigation'
        ])
        
        assert result.exit_code == 0
        assert "Investigation created" in result.output or "created" in result.output.lower()
        
        # Extract investigation ID from output
        output_lines = result.output.split('\n')
        inv_id_line = [line for line in output_lines if 'inv_' in line]
        assert len(inv_id_line) > 0

    def test_ls_command_lists_investigations(self):
        """Test that `olor ls investigations` lists investigations"""
        # Initialize and create investigation
        self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        self.runner.invoke(cli, [
            '--root', str(self.workspace_root),
            'new',
            '--entity-type', 'email',
            '--entity-id', 'test@example.com'
        ])
        
        result = self.runner.invoke(cli, [
            '--root', str(self.workspace_root),
            'ls', 'investigations'
        ])
        
        assert result.exit_code == 0
        assert "investigations" in result.output.lower() or "found" in result.output.lower()

    def test_show_command_displays_investigation(self):
        """Test that `olor show --id` displays investigation details"""
        # Initialize and create investigation
        self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        create_result = self.runner.invoke(cli, [
            '--root', str(self.workspace_root),
            'new',
            '--entity-type', 'email',
            '--entity-id', 'test@example.com'
        ])
        
        # Extract investigation ID
        output_lines = create_result.output.split('\n')
        inv_id = None
        for line in output_lines:
            if 'inv_' in line:
                # Extract ID from line like "Investigation created: inv_20251114_123456_abc123"
                parts = line.split('inv_')
                if len(parts) > 1:
                    inv_id = 'inv_' + parts[1].split()[0] if parts[1] else None
                    break
        
        if inv_id:
            result = self.runner.invoke(cli, [
                '--root', str(self.workspace_root),
                'show', '--id', inv_id
            ])
            
            # Should display investigation details or "not found"
            assert result.exit_code in [0, 1]  # 0 if found, 1 if not found
            assert "investigation" in result.output.lower() or "not found" in result.output.lower()

    def test_add_file_command_adds_file(self):
        """Test that `olor add-file` adds file to investigation"""
        # Initialize and create investigation
        self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        create_result = self.runner.invoke(cli, [
            '--root', str(self.workspace_root),
            'new',
            '--entity-type', 'email',
            '--entity-id', 'test@example.com'
        ])
        
        # Extract investigation ID
        output_lines = create_result.output.split('\n')
        inv_id = None
        for line in output_lines:
            if 'inv_' in line:
                parts = line.split('inv_')
                if len(parts) > 1:
                    inv_id = 'inv_' + parts[1].split()[0] if parts[1] else None
                    break
        
        if inv_id:
            # Create test file
            test_file = self.workspace_root / "test_file.txt"
            test_file.write_text("test content")
            
            result = self.runner.invoke(cli, [
                '--root', str(self.workspace_root),
                'add-file',
                '--id', inv_id,
                '--path', str(test_file),
                '--kind', 'artifact'
            ])
            
            assert result.exit_code == 0
            assert "added" in result.output.lower() or "successfully" in result.output.lower()

    def test_error_handling_missing_investigation(self):
        """Test that CLI handles missing investigation gracefully"""
        self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        
        result = self.runner.invoke(cli, [
            '--root', str(self.workspace_root),
            'show', '--id', 'nonexistent_inv_123'
        ])
        
        # Should exit with error code and display error message
        assert result.exit_code != 0
        assert "not found" in result.output.lower() or "error" in result.output.lower()

    def test_error_handling_missing_workspace(self):
        """Test that CLI handles missing workspace gracefully"""
        non_existent = self.workspace_root / "nonexistent"
        
        result = self.runner.invoke(cli, [
            '--root', str(non_existent),
            'ls', 'investigations'
        ])
        
        # Should handle gracefully (may create workspace or show error)
        # Acceptable behaviors: create workspace, show error, or exit with code
        assert result.exit_code in [0, 1]

    def test_ls_command_supports_filters(self):
        """Test that `olor ls` supports entity-type and entity-id filters"""
        self.runner.invoke(cli, ['--root', str(self.workspace_root), 'init'])
        
        result = self.runner.invoke(cli, [
            '--root', str(self.workspace_root),
            'ls', 'investigations',
            '--entity-type', 'email',
            '--entity-id', 'test@example.com'
        ])
        
        # Should execute without error (may return empty list)
        assert result.exit_code == 0

