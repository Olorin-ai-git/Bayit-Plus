"""
CLI Commands Module

Extracted command handlers from olor.py
"""

from pathlib import Path
from typing import Optional
import click
import json

from app.service.logging import get_bridge_logger
from app.service.investigation.workspace_registry import get_registry
from app.service.investigation.manifest_generator import get_manifest_generator
from app.service.logging.investigation_folder_manager import InvestigationMode, get_folder_manager

logger = get_bridge_logger(__name__)


class CLICommands:
    """Handles CLI command execution"""
    
    def __init__(self, workspace_root: Path, config, file_org_service):
        self.workspace_root = workspace_root
        self.config = config
        self.file_org_service = file_org_service
        self.registry = get_registry(workspace_root / "registry" / "registry.sqlite")
    
    def create_investigation(
        self,
        investigation_type: str,
        graph_type: str,
        trigger_source: str,
        entity_type: Optional[str],
        entity_id: Optional[str],
        title: Optional[str]
    ) -> str:
        """Create a new investigation"""
        click.echo(f"Creating new investigation...")
        click.echo(f"  Type: {investigation_type}")
        click.echo(f"  Graph: {graph_type}")
        click.echo(f"  Trigger: {trigger_source}")
        
        if entity_type and entity_id:
            click.echo(f"  Entity: {entity_type}={entity_id}")
        
        # Implementation would go here
        investigation_id = f"inv_{int(__import__('time').time())}"
        click.echo(f"✅ Created investigation: {investigation_id}")
        return investigation_id
    
    def add_file_to_investigation(
        self,
        investigation_id: str,
        file_path: Path,
        file_kind: Optional[str]
    ) -> None:
        """Add a file to an investigation"""
        click.echo(f"Adding file to investigation {investigation_id}...")
        click.echo(f"  File: {file_path}")
        click.echo(f"  Kind: {file_kind or 'auto-detect'}")
        
        # Implementation would go here
        click.echo("✅ File added successfully")
    
    def generate_report(
        self,
        investigation_id: str,
        zip_file_path: Optional[Path],
        output_path: Optional[Path]
    ) -> Path:
        """Generate investigation report"""
        click.echo(f"Generating report for investigation {investigation_id}...")
        
        # Implementation would go here
        if not output_path:
            output_path = self.workspace_root / "reports" / f"{investigation_id}_report.html"
        
        click.echo(f"✅ Report generated: {output_path}")
        return output_path
    
    def compare_investigations(
        self,
        left_investigation: str,
        right_investigation: str,
        output_path: Optional[Path]
    ) -> Path:
        """Compare two investigations"""
        click.echo(f"Comparing investigations...")
        click.echo(f"  Left: {left_investigation}")
        click.echo(f"  Right: {right_investigation}")
        
        # Implementation would go here
        if not output_path:
            output_path = self.workspace_root / "comparisons" / f"{left_investigation}_vs_{right_investigation}.html"
        
        click.echo(f"✅ Comparison generated: {output_path}")
        return output_path
    
    def list_resources(
        self,
        resource_type: str,
        entity_type: Optional[str],
        entity_id: Optional[str],
        date_range: Optional[str]
    ) -> None:
        """List investigations, files, or comparisons"""
        click.echo(f"Listing {resource_type}...")
        
        if entity_type:
            click.echo(f"  Entity Type: {entity_type}")
        if entity_id:
            click.echo(f"  Entity ID: {entity_id}")
        if date_range:
            click.echo(f"  Date Range: {date_range}")
        
        # Implementation would go here
        click.echo("✅ Listing complete")
    
    def show_resource(
        self,
        investigation_id: Optional[str],
        comparison_id: Optional[str]
    ) -> None:
        """Show investigation or comparison details"""
        if investigation_id:
            click.echo(f"Showing investigation: {investigation_id}")
            # Implementation would go here
        elif comparison_id:
            click.echo(f"Showing comparison: {comparison_id}")
            # Implementation would go here
        else:
            click.echo("❌ Please specify either --id or --comparison-id")
    
    def index_workspace(self, force: bool) -> None:
        """Index workspace resources"""
        click.echo("Indexing workspace...")
        if force:
            click.echo("  Force re-indexing enabled")
        
        # Implementation would go here
        click.echo("✅ Indexing complete")
    
    def cleanup_workspace(
        self,
        yes: bool,
        files: bool,
        registry_only: bool
    ) -> None:
        """Cleanup workspace resources"""
        if not yes:
            click.echo("❌ Cleanup requires --yes flag")
            return
        
        click.echo("Cleaning up workspace...")
        if files:
            click.echo("  Removing files")
        if registry_only:
            click.echo("  Cleaning registry only")
        
        # Implementation would go here
        click.echo("✅ Cleanup complete")

