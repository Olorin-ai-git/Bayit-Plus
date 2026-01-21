"""
CLI Workspace Management Module

Extracted workspace management from olor.py
"""

from pathlib import Path
from typing import Optional

import click

from app.config.file_organization_config import FileOrganizationConfig
from app.service.investigation.file_organization_service import FileOrganizationService
from app.service.investigation.workspace_registry import WorkspaceRegistry


class CLIWorkspace:
    """Handles workspace initialization and management"""

    def __init__(self):
        pass

    def initialize_workspace(self, workspace_root: Path) -> None:
        """Initialize workspace structure with registry database"""
        click.echo(f"Initializing workspace at: {workspace_root}")

        # Create workspace directory structure
        directories = [
            workspace_root / "investigations",
            workspace_root / "comparisons",
            workspace_root / "reports",
            workspace_root / "registry",
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            click.echo(f"  ✓ Created directory: {directory}")

        # Initialize registry database
        registry_path = workspace_root / "registry" / "registry.sqlite"
        registry = WorkspaceRegistry(registry_path=registry_path)
        click.echo(f"  ✓ Initialized registry database: {registry_path}")

        # Create olorin.toml configuration file if it doesn't exist
        config_path = workspace_root / "olorin.toml"
        if not config_path.exists():
            config_content = """# Olorin Workspace Configuration

[workspace]
workspace_root = "."

[paths]
canonical_investigations_path_template = "investigations/{YYYY}/{MM}/{inv_id}"
entity_view_artifacts_path_template = "artifacts/{entity_type}/{entity_id}/{YYYY}/{MM}/inv_{inv_id}__{kind}.{ext}"

[registry]
database_path = "registry/registry.sqlite"

[migration]
migration_duration_days = 30
"""
            config_path.write_text(config_content)
            click.echo(f"  ✓ Created configuration file: {config_path}")

        click.echo(f"\n✅ Workspace initialized successfully!")

    def get_workspace_config(self, workspace_root: Path) -> tuple:
        """Get workspace configuration and services"""
        config = FileOrganizationConfig()
        file_org_service = FileOrganizationService(config)
        return config, file_org_service
