#!/usr/bin/env python3
"""
Olorin Workspace Management CLI

Unified command-line interface for managing the investigation workspace.
Provides commands for workspace initialization, investigation creation, file management,
report generation, and registry operations.

Usage:
    olor init [--root WORKSPACE_ROOT]
    olor new [--type TYPE] [--graph GRAPH] [--trigger TRIGGER] [--entity-type TYPE] [--entity-id ID]
    olor add-file [--id INVESTIGATION_ID] [--path FILE_PATH] [--kind KIND]
    olor report [--id INVESTIGATION_ID] [--output OUTPUT_PATH]
    olor compare [--left LEFT_ID] [--right RIGHT_ID] [--output OUTPUT_PATH]
    olor import-logs [--logs LOGS_DIR] [--artifacts ARTIFACTS_DIR] [--dry-run] [--copy|--move|--link]
    olor ls [investigations|files|comparisons] [--entity-type TYPE] [--entity-id ID] [--date-range START,END]
    olor show [--id INVESTIGATION_ID|--comparison-id COMPARISON_ID]
    olor index [--force]
"""

import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import click
from datetime import datetime
from typing import Optional, List
import json

from app.config.file_organization_config import FileOrganizationConfig
from app.service.investigation.file_organization_service import FileOrganizationService
from app.service.investigation.workspace_registry import WorkspaceRegistry, get_registry
from app.service.investigation.manifest_generator import get_manifest_generator
from app.service.logging.investigation_folder_manager import InvestigationMode, get_folder_manager
from app.service.logging import get_bridge_logger
from app.persistence.database import get_db_session
from app.models.investigation_state import InvestigationState
from app.persistence import IN_MEMORY_INVESTIGATIONS

logger = get_bridge_logger(__name__)


@click.group()
@click.option('--root', type=click.Path(exists=False, file_okay=False, dir_okay=True), default=None,
              help='Workspace root directory (default: current directory)')
@click.pass_context
def cli(ctx, root):
    """Olorin Workspace Management CLI"""
    ctx.ensure_object(dict)
    ctx.obj['workspace_root'] = Path(root) if root else Path.cwd()
    ctx.obj['config'] = FileOrganizationConfig()
    ctx.obj['file_org_service'] = FileOrganizationService(ctx.obj['config'])


@cli.command()
@click.option('--root', type=click.Path(exists=False, file_okay=False, dir_okay=True), default=None,
              help='Workspace root directory (default: current directory)')
def init(root):
    """Initialize workspace structure with registry database"""
    workspace_root = Path(root) if root else Path.cwd()
    
    click.echo(f"Initializing workspace at: {workspace_root}")
    
    # Create workspace directory structure
    directories = [
        workspace_root / "investigations",
        workspace_root / "comparisons",
        workspace_root / "reports",
        workspace_root / "registry"
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
        with open(config_path, 'w') as f:
            f.write(config_content)
        click.echo(f"  ✓ Created configuration file: {config_path}")
    
    click.echo("✅ Workspace initialized successfully")


@cli.command()
@click.option('--type', 'investigation_type', type=click.Choice(['structured', 'hybrid']), default='structured',
              help='Investigation type')
@click.option('--graph', 'graph_type', type=click.Choice(['clean', 'hybrid']), default='clean',
              help='Graph type')
@click.option('--trigger', 'trigger_source', type=click.Choice(['startup', 'script', 'ui']), default='script',
              help='Trigger source')
@click.option('--entity-type', 'entity_type', type=str, help='Entity type (e.g., email, device_id)')
@click.option('--entity-id', 'entity_id', type=str, help='Entity ID')
@click.option('--title', type=str, help='Investigation title')
@click.pass_context
def new(ctx, investigation_type, graph_type, trigger_source, entity_type, entity_id, title):
    """Create new investigation with manifest"""
    import uuid
    
    investigation_id = f"inv_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    
    click.echo(f"Creating investigation: {investigation_id}")
    
    # Create investigation folder
    folder_manager = get_folder_manager()
    mode = InvestigationMode.LIVE if trigger_source == 'script' else InvestigationMode.DEMO
    
    config = {
        "entity_type": entity_type,
        "entity_id": entity_id or entity_type,
        "investigation_type": investigation_type,
        "graph_type": graph_type,
        "trigger_source": trigger_source
    }
    
    investigation_folder, metadata = folder_manager.create_investigation_folder(
        investigation_id=investigation_id,
        mode=mode,
        scenario=title or f"{investigation_type} investigation",
        config=config
    )
    
    click.echo(f"  ✓ Created investigation folder: {investigation_folder}")
    
    # Generate manifest
    manifest_generator = get_manifest_generator()
    manifest = manifest_generator.generate_investigation_manifest(
        investigation_id=investigation_id,
        title=title or f"Investigation {investigation_id[:8]}",
        investigation_type=investigation_type,
        graph_type=graph_type,
        trigger_source=trigger_source,
        status="IN_PROGRESS",
        entity_type=entity_type,
        entity_ids=[entity_id] if entity_id else None,
        canonical_path=str(investigation_folder),
        created_at=datetime.now()
    )
    
    manifest_path = manifest_generator.save_investigation_manifest(
        manifest,
        output_path=investigation_folder / "manifest.json"
    )
    
    click.echo(f"  ✓ Generated manifest: {manifest_path}")
    
    # Index in registry
    registry = get_registry()
    registry.index_investigation(
        investigation_id=investigation_id,
        title=manifest["title"],
        investigation_type=investigation_type,
        graph_type=graph_type,
        trigger_source=trigger_source,
        status="IN_PROGRESS",
        entity_type=entity_type,
        entity_ids=[entity_id] if entity_id else None,
        canonical_path=str(investigation_folder),
        created_at=datetime.now()
    )
    
    click.echo(f"  ✓ Indexed in registry")
    click.echo(f"✅ Investigation created: {investigation_id}")


@cli.command()
@click.option('--id', 'investigation_id', required=True, type=str, help='Investigation ID')
@click.option('--path', 'file_path', required=True, type=click.Path(exists=True), help='File path to add')
@click.option('--kind', 'file_kind', type=click.Choice(['artifact', 'report', 'log', 'metadata']), default='artifact',
              help='File kind')
@click.pass_context
def add_file(ctx, investigation_id, file_path, file_kind):
    """Add files to investigation and index in registry (with file locking)"""
    file_path = Path(file_path)
    
    click.echo(f"Adding file to investigation {investigation_id}: {file_path}")
    
    # Get investigation folder
    folder_manager = get_folder_manager()
    investigation_folder = folder_manager.get_investigation_folder(investigation_id)
    
    if not investigation_folder:
        click.echo(f"❌ Investigation not found: {investigation_id}", err=True)
        sys.exit(1)
    
    # Copy file to investigation folder with file locking
    file_org_service = ctx.obj['file_org_service']
    target_path = investigation_folder / file_path.name
    
    try:
        file_handle = file_org_service.lock_file_for_write(target_path, create_if_missing=True)
        try:
            import shutil
            shutil.copy2(file_path, target_path)
            click.echo(f"  ✓ Copied file: {target_path}")
        finally:
            file_org_service.unlock_file(file_handle)
        
        # Index file in registry
        registry = get_registry()
        registry.index_file(
            investigation_id=investigation_id,
            canonical_path=str(target_path),
            file_kind=file_kind,
            file_ext=file_path.suffix[1:] if file_path.suffix else "unknown",
            relative_path=file_path.name
        )
        
        click.echo(f"  ✓ Indexed in registry")
        click.echo(f"✅ File added successfully")
        
    except Exception as e:
        click.echo(f"❌ Failed to add file: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--id', 'investigation_id', type=str, help='Investigation ID')
@click.option('--unzip', 'zip_file_path', type=click.Path(exists=True, file_okay=True, dir_okay=False), help='Extract zip file and generate comprehensive report from its contents')
@click.option('--output', 'output_path', type=click.Path(exists=False), help='Output path for report')
@click.pass_context
def report(ctx, investigation_id, zip_file_path, output_path):
    """Generate reports for investigations"""
    import zipfile
    import tempfile
    import shutil
    
    # Validate that either --id or --unzip is provided
    if not investigation_id and not zip_file_path:
        click.echo("❌ Must specify either --id INVESTIGATION_ID or --unzip ZIP_FILE", err=True)
        sys.exit(1)
    
    if investigation_id and zip_file_path:
        click.echo("❌ Cannot specify both --id and --unzip. Use one or the other.", err=True)
        sys.exit(1)
    
    try:
        from app.service.reporting.comprehensive_investigation_report import generate_comprehensive_investigation_report
        
        # Handle zip file extraction
        if zip_file_path:
            zip_path = Path(zip_file_path)
            click.echo(f"📦 Extracting zip file: {zip_path}")
            
            # Create temporary directory for extraction
            temp_dir = None
            try:
                temp_dir = Path(tempfile.mkdtemp(prefix="olorin_report_"))
                click.echo(f"   Temporary extraction directory: {temp_dir}")
                
                # Extract zip file
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                # Count extracted files
                extracted_files = list(temp_dir.rglob("*"))
                file_count = sum(1 for f in extracted_files if f.is_file())
                click.echo(f"   Extracted {file_count} files from zip")
                
                # Find investigation folders or use root as investigation folder
                investigation_folder = None
                
                # Look for common investigation folder patterns
                # Pattern 1: Look for folders with metadata.json
                metadata_folders = list(temp_dir.rglob("metadata.json"))
                if metadata_folders:
                    # Use the first metadata.json's parent as investigation folder
                    investigation_folder = metadata_folders[0].parent
                    click.echo(f"   Found investigation folder via metadata.json: {investigation_folder.name}")
                else:
                    # Pattern 2: Look for folders matching investigation patterns
                    # Check for folders with investigation files
                    investigation_patterns = [
                        "investigation.log",
                        "structured_activities.jsonl",
                        "journey_tracking.json",
                        "comprehensive_investigation_report.html"
                    ]
                    
                    for pattern in investigation_patterns:
                        pattern_files = list(temp_dir.rglob(pattern))
                        if pattern_files:
                            investigation_folder = pattern_files[0].parent
                            click.echo(f"   Found investigation folder via {pattern}: {investigation_folder.name}")
                            break
                    
                    # Pattern 3: If zip contains a single top-level directory, use it
                    if not investigation_folder:
                        top_level_dirs = [d for d in temp_dir.iterdir() if d.is_dir()]
                        if len(top_level_dirs) == 1:
                            investigation_folder = top_level_dirs[0]
                            click.echo(f"   Using single top-level directory: {investigation_folder.name}")
                        else:
                            # Pattern 4: Use temp_dir as investigation folder (all files at root)
                            investigation_folder = temp_dir
                            click.echo(f"   Using root directory as investigation folder")
                
                # Determine output path
                if output_path:
                    report_output_path = Path(output_path)
                else:
                    # Generate output path based on zip filename
                    zip_stem = zip_path.stem
                    report_output_path = zip_path.parent / f"{zip_stem}_comprehensive_report.html"
                
                click.echo(f"📊 Generating comprehensive report from extracted files...")
                click.echo(f"   Investigation folder: {investigation_folder}")
                click.echo(f"   Output path: {report_output_path}")
                
                # Generate report from extracted folder
                report_path = generate_comprehensive_investigation_report(
                    investigation_folder=investigation_folder,
                    output_path=report_output_path
                )
                
                click.echo(f"✅ Report generated: {report_path}")
                click.echo(f"   Source: {zip_path}")
                click.echo(f"   Files processed: {file_count}")
                
            finally:
                # Clean up temporary directory
                if temp_dir and temp_dir.exists():
                    try:
                        shutil.rmtree(temp_dir)
                        click.echo(f"   🗑️  Cleaned up temporary directory")
                    except Exception as e:
                        click.echo(f"   ⚠️  Failed to clean up temporary directory: {e}", err=True)
        
        # Handle investigation ID
        else:
            click.echo(f"Generating report for investigation: {investigation_id}")
            
            folder_manager = get_folder_manager()
            investigation_folder = folder_manager.get_investigation_folder(investigation_id)
            
            if not investigation_folder:
                click.echo(f"❌ Investigation not found: {investigation_id}", err=True)
                sys.exit(1)
            
            report_path = generate_comprehensive_investigation_report(
                investigation_folder=investigation_folder,
                output_path=Path(output_path) if output_path else None
            )
            
            click.echo(f"✅ Report generated: {report_path}")
        
    except zipfile.BadZipFile:
        click.echo(f"❌ Invalid zip file: {zip_file_path}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Failed to generate report: {e}", err=True)
        logger.exception("Report generation failed")
        sys.exit(1)


@cli.command()
@click.option('--left', 'left_investigation', required=True, type=str, help='Left investigation ID')
@click.option('--right', 'right_investigation', required=True, type=str, help='Right investigation ID')
@click.option('--output', 'output_path', type=click.Path(exists=False), help='Output path for comparison report')
@click.pass_context
def compare(ctx, left_investigation, right_investigation, output_path):
    """Create comparisons between investigations"""
    click.echo(f"Creating comparison: {left_investigation} vs {right_investigation}")
    
    try:
        from app.service.investigation.investigation_comparison_service import compare_investigations
        
        result = compare_investigations(left_investigation, right_investigation)
        
        # Generate comparison manifest
        manifest_generator = get_manifest_generator()
        comparison_id = f"cmp_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        manifest = manifest_generator.generate_comparison_manifest(
            comparison_id=comparison_id,
            left_investigation=left_investigation,
            right_investigation=right_investigation,
            title=f"Comparison: {left_investigation[:8]} vs {right_investigation[:8]}",
            source_type="manual",
            created_at=datetime.now(),
            metadata=result
        )
        
        # Index comparison in registry
        registry = get_registry()
        registry.index_comparison(
            comparison_id=comparison_id,
            left_investigation=left_investigation,
            right_investigation=right_investigation,
            title=manifest["title"],
            source_type="manual",
            metadata=result
        )
        
        click.echo(f"✅ Comparison created: {comparison_id}")
        click.echo(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        click.echo(f"❌ Failed to create comparison: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--logs', 'logs_dir', type=click.Path(exists=True, file_okay=False), help='Logs directory to import')
@click.option('--artifacts', 'artifacts_dir', type=click.Path(exists=True, file_okay=False), help='Artifacts directory to import')
@click.option('--all', 'import_all', is_flag=True, help='Import all existing logs and artifacts, overriding existing records')
@click.option('--dry-run', is_flag=True, help='Preview changes without making them')
@click.option('--copy', is_flag=True, help='Copy files (preserve originals)')
@click.option('--move', is_flag=True, help='Move files (relocate)')
@click.option('--link', is_flag=True, help='Create symlinks (link)')
@click.pass_context
def import_logs(ctx, logs_dir, artifacts_dir, import_all, dry_run, copy, move, link):
    """Import existing logs/artifacts with --dry-run, --copy, --move, --link options"""
    import re
    import shutil
    import hashlib
    from pathlib import Path
    
    # If --all is specified, automatically detect logs and artifacts directories
    if import_all:
        file_org_service = ctx.obj['file_org_service']
        
        # Detect logs directory
        logs_base = file_org_service.config.logs_base_dir / "investigations"
        if logs_base.exists() and not logs_dir:
            logs_dir = str(logs_base.parent)  # Use parent to scan all logs
        
        # Detect artifacts directory
        artifacts_base = file_org_service.config.artifacts_base_dir
        if artifacts_base.exists() and not artifacts_dir:
            artifacts_dir = str(artifacts_base)
        
        click.echo(f"🔍 Auto-detected directories (--all mode):")
        if logs_dir:
            click.echo(f"   Logs: {logs_dir}")
        if artifacts_dir:
            click.echo(f"   Artifacts: {artifacts_dir}")
    
    if not logs_dir and not artifacts_dir:
        click.echo("❌ Must specify --logs and/or --artifacts (or use --all to auto-detect)", err=True)
        sys.exit(1)
    
    strategy = None
    if copy:
        strategy = "copy"
    elif move:
        strategy = "move"
    elif link:
        strategy = "link"
    else:
        strategy = "copy"  # Default
    
    click.echo(f"📦 Importing files (strategy: {strategy}, dry-run: {dry_run})")
    
    if dry_run:
        click.echo("  [DRY RUN] Preview mode - no changes will be made")
    
    file_org_service = ctx.obj['file_org_service']
    registry = get_registry()
    entity_normalizer = file_org_service.entity_normalizer
    
    imported_count = 0
    indexed_count = 0
    
    # Import artifacts
    if artifacts_dir:
        artifacts_path = Path(artifacts_dir)
        click.echo(f"\n📁 Scanning artifacts directory: {artifacts_path}")
        
        # Pattern: investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.{ext}
        pattern = re.compile(r'investigation_([^_]+)_(.+?)_(\d{8})_(\d{8})\.(json|html)')
        
        # Find all investigation artifact files
        artifact_files = []
        for ext in ['*.json', '*.html']:
            artifact_files.extend(artifacts_path.rglob(ext))
        
        click.echo(f"  Found {len(artifact_files)} potential artifact files")
        
        for artifact_file in artifact_files:
            filename = artifact_file.name
            match = pattern.match(filename)
            
            if not match:
                # Skip files that don't match the pattern
                continue
            
            entity_type, entity_id_raw, date_start_str, date_end_str, file_ext = match.groups()
            
            # Parse dates
            try:
                date_start = datetime.strptime(date_start_str, "%Y%m%d")
                date_end = datetime.strptime(date_end_str, "%Y%m%d")
            except ValueError:
                click.echo(f"  ⚠️ Skipping {filename}: Invalid date format")
                continue
            
            # Normalize entity ID
            entity_id = entity_id_raw.replace('-at-', '@').replace('-', '.')
            
            # Generate investigation ID (use hash of entity + dates for consistency)
            inv_id_hash = hashlib.md5(f"{entity_type}:{entity_id}:{date_start_str}:{date_end_str}".encode()).hexdigest()[:12]
            investigation_id = f"imported_{inv_id_hash}"
            
            # Determine file type
            file_type = "json" if file_ext == "json" else "html"
            file_kind = "artifact" if file_ext == "json" else "report"
            
            # Resolve canonical and entity view paths
            canonical_path, entity_view_path = file_org_service.resolve_investigation_artifact_path(
                entity_type=entity_type,
                entity_id=entity_id,
                date_start=date_start,
                date_end=date_end,
                file_type=file_type,
                investigation_id=investigation_id,
                created_at=date_end
            )
            
            if not canonical_path:
                canonical_path = entity_view_path
            
            click.echo(f"\n  📄 Processing: {filename}")
            click.echo(f"     Entity: {entity_type}={entity_id}")
            click.echo(f"     Dates: {date_start_str} to {date_end_str}")
            click.echo(f"     Investigation ID: {investigation_id}")
            click.echo(f"     Canonical: {canonical_path}")
            if entity_view_path:
                click.echo(f"     Entity View: {entity_view_path}")
            
            if not dry_run:
                try:
                    # Check if source and destination are the same file
                    if artifact_file.resolve() == canonical_path.resolve():
                        click.echo(f"     ⏭️  Skipping (already in correct location): {canonical_path}")
                        imported_count += 1
                        continue
                    
                    # Create directory structure
                    file_org_service.create_directory_structure(canonical_path.parent)
                    if entity_view_path:
                        file_org_service.create_directory_structure(entity_view_path.parent)
                    
                    # Copy/move/link file
                    file_handle = None
                    try:
                        file_handle = file_org_service.lock_file_for_write(canonical_path, create_if_missing=True)
                        
                        if strategy == "copy":
                            shutil.copy2(artifact_file, canonical_path)
                            click.echo(f"     ✓ Copied to: {canonical_path}")
                        elif strategy == "move":
                            shutil.move(str(artifact_file), str(canonical_path))
                            click.echo(f"     ✓ Moved to: {canonical_path}")
                        elif strategy == "link":
                            canonical_path.symlink_to(artifact_file.resolve())
                            click.echo(f"     ✓ Linked to: {canonical_path}")
                        
                        imported_count += 1
                    finally:
                        if file_handle:
                            file_org_service.unlock_file(file_handle)
                    
                    # Create entity view symlink if needed
                    if entity_view_path and canonical_path.exists():
                        view_type, error = file_org_service.create_entity_view_symlink(
                            canonical_path=canonical_path,
                            entity_view_path=entity_view_path,
                            force=False
                        )
                        if error:
                            click.echo(f"     ⚠️ Entity view: {error}")
                        else:
                            click.echo(f"     ✓ Entity view ({view_type}): {entity_view_path}")
                    
                    # Calculate file hash
                    file_hash = None
                    file_size = None
                    if canonical_path.exists():
                        file_size = canonical_path.stat().st_size
                        with open(canonical_path, 'rb') as f:
                            file_hash = hashlib.sha256(f.read()).hexdigest()
                    
                    # Check if file already indexed (unless --all override)
                    file_already_indexed = False
                    if not import_all:
                        try:
                            with registry._get_connection() as conn:
                                cursor = conn.cursor()
                                cursor.execute("SELECT file_id FROM files WHERE canonical_path = ?", (str(canonical_path),))
                                if cursor.fetchone():
                                    file_already_indexed = True
                                    click.echo(f"     ⚠️ File already indexed, skipping (use --all to override)")
                        except Exception as e:
                            click.echo(f"     ⚠️ Failed to check existing index: {e}")
                    
                    # Index file in registry (override if --all)
                    if not file_already_indexed or import_all:
                        # If overriding, delete existing entry first
                        if import_all and file_already_indexed:
                            try:
                                with registry._get_connection() as conn:
                                    cursor = conn.cursor()
                                    cursor.execute("DELETE FROM files WHERE canonical_path = ?", (str(canonical_path),))
                                    click.echo(f"     ↻ Overriding existing record")
                            except Exception as e:
                                click.echo(f"     ⚠️ Failed to delete existing record: {e}")
                        
                        registry.index_file(
                            investigation_id=investigation_id,
                            canonical_path=str(canonical_path),
                            file_kind=file_kind,
                            file_ext=file_ext,
                            entity_view_path=str(entity_view_path) if entity_view_path else None,
                            sha256_hash=file_hash,
                            file_size=file_size
                        )
                        indexed_count += 1
                        click.echo(f"     ✓ Indexed in registry")
                    
                    # Index investigation if not already indexed (or override with --all)
                    try:
                        with registry._get_connection() as conn:
                            cursor = conn.cursor()
                            cursor.execute("SELECT investigation_id FROM investigations WHERE investigation_id = ?", (investigation_id,))
                            existing_inv = cursor.fetchone()
                            
                            if not existing_inv or import_all:
                                if existing_inv and import_all:
                                    # Delete existing investigation entry
                                    cursor.execute("DELETE FROM investigations WHERE investigation_id = ?", (investigation_id,))
                                    click.echo(f"     ↻ Overriding existing investigation record")
                                
                                # Index investigation
                                registry.index_investigation(
                                    investigation_id=investigation_id,
                                    title=f"Imported: {entity_type}={entity_id}",
                                    investigation_type="imported",
                                    graph_type="unknown",
                                    trigger_source="import",
                                    status="COMPLETED",
                                    entity_type=entity_type,
                                    entity_ids=[entity_id],
                                    canonical_path=str(canonical_path.parent.parent.parent) if canonical_path else None,
                                    created_at=date_end,
                                    completed_at=date_end
                                )
                                click.echo(f"     ✓ Indexed investigation in registry")
                            elif existing_inv:
                                click.echo(f"     ⚠️ Investigation already indexed (use --all to override)")
                    except Exception as e:
                        click.echo(f"     ⚠️ Failed to index investigation: {e}")
                    
                except Exception as e:
                    click.echo(f"     ❌ Failed to import {filename}: {e}", err=True)
                    logger.exception(f"Import failed for {filename}")
            else:
                click.echo(f"     [DRY RUN] Would import to: {canonical_path}")
                imported_count += 1
    
    # Import comparison reports
    if artifacts_dir:
        artifacts_path = Path(artifacts_dir)
        comparisons_dir = artifacts_path / "comparisons"
        if comparisons_dir.exists():
            click.echo(f"\n📁 Scanning comparisons directory: {comparisons_dir}")
            
            # Pattern: comparison_{entity_type}_{entity_id}_{timestamp}.html
            comparison_pattern = re.compile(r'comparison_([^_]+)_(.+?)_(\d{8}_\d{6})\.html')
            
            comparison_files = []
            for source_type_dir in ["auto_startup", "manual"]:
                source_path = comparisons_dir / source_type_dir
                if source_path.exists():
                    for timestamp_dir in source_path.iterdir():
                        if timestamp_dir.is_dir():
                            comparison_files.extend(timestamp_dir.glob("comparison_*.html"))
            
            click.echo(f"  Found {len(comparison_files)} comparison report files")
            
            for comparison_file in comparison_files:
                filename = comparison_file.name
                match = comparison_pattern.match(filename)
                
                if not match:
                    continue
                
                entity_type, entity_id_raw, timestamp_str = match.groups()
                
                # Parse timestamp
                try:
                    timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                except ValueError:
                    click.echo(f"  ⚠️ Skipping {filename}: Invalid timestamp format")
                    continue
                
                # Normalize entity ID
                entity_id = entity_id_raw.replace('-at-', '@').replace('-', '.')
                
                # Determine source type from path
                source_type = "auto_startup" if "auto_startup" in str(comparison_file) else "manual"
                
                # Resolve comparison report path
                report_path = file_org_service.resolve_comparison_report_path(
                    source_type=source_type,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    timestamp=timestamp
                )
                
                click.echo(f"\n  📄 Processing comparison: {filename}")
                click.echo(f"     Entity: {entity_type}={entity_id}")
                click.echo(f"     Source: {source_type}")
                click.echo(f"     Timestamp: {timestamp_str}")
                click.echo(f"     Target: {report_path}")
                
                if not dry_run:
                    try:
                        # Check if source and destination are the same file
                        if comparison_file.resolve() == report_path.resolve():
                            click.echo(f"     ⏭️  Skipping (already in correct location): {report_path}")
                            imported_count += 1
                            continue
                        
                        # Create directory structure
                        file_org_service.create_directory_structure(report_path.parent)
                        
                        # Copy/move/link file
                        file_handle = None
                        try:
                            file_handle = file_org_service.lock_file_for_write(report_path, create_if_missing=True)
                            
                            if strategy == "copy":
                                shutil.copy2(comparison_file, report_path)
                                click.echo(f"     ✓ Copied to: {report_path}")
                            elif strategy == "move":
                                shutil.move(str(comparison_file), str(report_path))
                                click.echo(f"     ✓ Moved to: {report_path}")
                            elif strategy == "link":
                                report_path.symlink_to(comparison_file.resolve())
                                click.echo(f"     ✓ Linked to: {report_path}")
                            
                            imported_count += 1
                        finally:
                            if file_handle:
                                file_org_service.unlock_file(file_handle)
                        
                        # Calculate file hash
                        file_hash = None
                        file_size = None
                        if report_path.exists():
                            file_size = report_path.stat().st_size
                            with open(report_path, 'rb') as f:
                                file_hash = hashlib.sha256(f.read()).hexdigest()
                        
                        # Generate comparison ID
                        comparison_id = f"cmp_{timestamp_str}_{hashlib.md5(f'{entity_type}:{entity_id}'.encode()).hexdigest()[:8]}"
                        
                        # Check if comparison already indexed (unless --all override)
                        comparison_already_indexed = False
                        if not import_all:
                            try:
                                with registry._get_connection() as conn:
                                    cursor = conn.cursor()
                                    cursor.execute("SELECT comparison_id FROM comparisons WHERE comparison_id = ?", (comparison_id,))
                                    if cursor.fetchone():
                                        comparison_already_indexed = True
                                        click.echo(f"     ⚠️ Comparison already indexed, skipping (use --all to override)")
                            except Exception as e:
                                click.echo(f"     ⚠️ Failed to check existing comparison: {e}")
                        
                        # Index comparison in registry (override if --all)
                        if not comparison_already_indexed or import_all:
                            # If overriding, delete existing entry first
                            if import_all and comparison_already_indexed:
                                try:
                                    with registry._get_connection() as conn:
                                        cursor = conn.cursor()
                                        cursor.execute("DELETE FROM comparisons WHERE comparison_id = ?", (comparison_id,))
                                        click.echo(f"     ↻ Overriding existing comparison record")
                                except Exception as e:
                                    click.echo(f"     ⚠️ Failed to delete existing comparison: {e}")
                            
                            registry.index_comparison(
                                comparison_id=comparison_id,
                                left_investigation="unknown",
                                right_investigation="unknown",
                                title=f"Imported comparison: {entity_type}={entity_id}",
                                source_type=source_type,
                                entity_type=entity_type,
                                entity_id=entity_id,
                                canonical_path=str(report_path),
                                metadata={
                                    "imported": True,
                                    "original_path": str(comparison_file)
                                }
                            )
                            indexed_count += 1
                            click.echo(f"     ✓ Indexed comparison in registry")
                        
                    except Exception as e:
                        click.echo(f"     ❌ Failed to import {filename}: {e}", err=True)
                        logger.exception(f"Import failed for {filename}")
                else:
                    click.echo(f"     [DRY RUN] Would import to: {report_path}")
                    imported_count += 1
            
            # Import startup reports
            reports_dir = artifacts_path / "reports" / "startup"
            if reports_dir.exists():
                click.echo(f"\n📁 Scanning startup reports directory: {reports_dir}")
                
                # Pattern: startup_analysis_{timestamp}.html
                startup_pattern = re.compile(r'startup_analysis_(\d{8}_\d{6})\.html')
                
                startup_files = []
                # Check timestamp subdirectories
                for timestamp_dir in reports_dir.iterdir():
                    if timestamp_dir.is_dir():
                        startup_files.extend(timestamp_dir.glob("startup_analysis_*.html"))
                # Also check root of reports/startup
                startup_files.extend(reports_dir.glob("startup_analysis_*.html"))
                
                click.echo(f"  Found {len(startup_files)} startup report files")
                
                for startup_file in startup_files:
                    filename = startup_file.name
                    match = startup_pattern.match(filename)
                    
                    if not match:
                        continue
                    
                    timestamp_str = match.group(1)
                    
                    # Parse timestamp
                    try:
                        timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                    except ValueError:
                        click.echo(f"  ⚠️ Skipping {filename}: Invalid timestamp format")
                        continue
                    
                    # Resolve startup report path
                    report_path = file_org_service.resolve_startup_report_path(timestamp)
                    
                    click.echo(f"\n  📄 Processing startup report: {filename}")
                    click.echo(f"     Timestamp: {timestamp_str}")
                    click.echo(f"     Target: {report_path}")
                    
                    if not dry_run:
                        try:
                            # Check if source and destination are the same file
                            if startup_file.resolve() == report_path.resolve():
                                click.echo(f"     ⏭️  Skipping (already in correct location): {report_path}")
                                imported_count += 1
                                continue
                            
                            # Create directory structure
                            file_org_service.create_directory_structure(report_path.parent)
                            
                            # Copy/move/link file
                            file_handle = None
                            try:
                                file_handle = file_org_service.lock_file_for_write(report_path, create_if_missing=True)
                                
                                if strategy == "copy":
                                    shutil.copy2(startup_file, report_path)
                                    click.echo(f"     ✓ Copied to: {report_path}")
                                elif strategy == "move":
                                    shutil.move(str(startup_file), str(report_path))
                                    click.echo(f"     ✓ Moved to: {report_path}")
                                elif strategy == "link":
                                    report_path.symlink_to(startup_file.resolve())
                                    click.echo(f"     ✓ Linked to: {report_path}")
                                
                                imported_count += 1
                            finally:
                                if file_handle:
                                    file_org_service.unlock_file(file_handle)
                            
                            # Calculate file hash
                            file_hash = None
                            file_size = None
                            if report_path.exists():
                                file_size = report_path.stat().st_size
                                with open(report_path, 'rb') as f:
                                    file_hash = hashlib.sha256(f.read()).hexdigest()
                            
                            # Check if startup report already indexed (unless --all override)
                            startup_already_indexed = False
                            if not import_all:
                                try:
                                    with registry._get_connection() as conn:
                                        cursor = conn.cursor()
                                        cursor.execute("SELECT file_id FROM files WHERE canonical_path = ?", (str(report_path),))
                                        if cursor.fetchone():
                                            startup_already_indexed = True
                                            click.echo(f"     ⚠️ Startup report already indexed, skipping (use --all to override)")
                                except Exception as e:
                                    click.echo(f"     ⚠️ Failed to check existing startup report: {e}")
                            
                            # Index file in registry (startup reports are files, not investigations) - override if --all
                            if not startup_already_indexed or import_all:
                                # If overriding, delete existing entry first
                                if import_all and startup_already_indexed:
                                    try:
                                        with registry._get_connection() as conn:
                                            cursor = conn.cursor()
                                            cursor.execute("DELETE FROM files WHERE canonical_path = ?", (str(report_path),))
                                            click.echo(f"     ↻ Overriding existing startup report record")
                                    except Exception as e:
                                        click.echo(f"     ⚠️ Failed to delete existing startup report: {e}")
                                
                                registry.index_file(
                                    investigation_id="startup_report",
                                    canonical_path=str(report_path),
                                    file_kind="report",
                                    file_ext="html",
                                    sha256_hash=file_hash,
                                    file_size=file_size
                                )
                                indexed_count += 1
                                click.echo(f"     ✓ Indexed startup report in registry")
                            
                        except Exception as e:
                            click.echo(f"     ❌ Failed to import {filename}: {e}", err=True)
                            logger.exception(f"Import failed for {filename}")
                    else:
                        click.echo(f"     [DRY RUN] Would import to: {report_path}")
                        imported_count += 1
    
    # Import logs
    if logs_dir:
        logs_path = Path(logs_dir)
        click.echo(f"\n📁 Scanning logs directory: {logs_path}")
        
        # Pattern: {MODE}_{investigation_id}_{timestamp}/
        log_pattern = re.compile(r'([A-Z]+)_([^_]+)_(\d{8}_\d{6})')
        
        log_folders = []
        if logs_path.exists():
            for item in logs_path.iterdir():
                if item.is_dir():
                    match = log_pattern.match(item.name)
                    if match:
                        log_folders.append((item, match))
        
        click.echo(f"  Found {len(log_folders)} investigation log folders")
        
        for log_folder, match in log_folders:
            mode, investigation_id, timestamp_str = match.groups()
            
            # Parse timestamp
            try:
                timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
            except ValueError:
                click.echo(f"  ⚠️ Skipping {log_folder.name}: Invalid timestamp format")
                continue
            
            # Resolve log path
            log_path = file_org_service.resolve_investigation_log_path(
                mode=mode,
                investigation_id=investigation_id,
                timestamp=timestamp
            )
            
            click.echo(f"\n  📁 Processing log folder: {log_folder.name}")
            click.echo(f"     Mode: {mode}")
            click.echo(f"     Investigation ID: {investigation_id}")
            click.echo(f"     Timestamp: {timestamp_str}")
            click.echo(f"     Target: {log_path}")
            
            if not dry_run:
                try:
                    # Create directory structure
                    file_org_service.create_directory_structure(log_path)
                    
                    # Copy/move/link folder contents
                    if strategy == "copy":
                        import shutil
                        if log_path.exists():
                            shutil.rmtree(log_path)
                        shutil.copytree(log_folder, log_path)
                        click.echo(f"     ✓ Copied log folder to: {log_path}")
                    elif strategy == "move":
                        if log_path.exists():
                            import shutil
                            shutil.rmtree(log_path)
                        shutil.move(str(log_folder), str(log_path))
                        click.echo(f"     ✓ Moved log folder to: {log_path}")
                    elif strategy == "link":
                        if log_path.exists():
                            import shutil
                            shutil.rmtree(log_path)
                        log_path.symlink_to(log_folder.resolve())
                        click.echo(f"     ✓ Linked log folder to: {log_path}")
                    
                    imported_count += 1
                    
                    # Index log folder files
                    if log_path.exists():
                        log_files_indexed = 0
                        for log_file in log_path.rglob("*"):
                            if log_file.is_file():
                                try:
                                    # Check if file already indexed (unless --all override)
                                    file_already_indexed = False
                                    if not import_all:
                                        try:
                                            with registry._get_connection() as conn:
                                                cursor = conn.cursor()
                                                cursor.execute("SELECT file_id FROM files WHERE canonical_path = ?", (str(log_file),))
                                                if cursor.fetchone():
                                                    file_already_indexed = True
                                        except Exception:
                                            pass
                                    
                                    if not file_already_indexed or import_all:
                                        # If overriding, delete existing entry first
                                        if import_all and file_already_indexed:
                                            try:
                                                with registry._get_connection() as conn:
                                                    cursor = conn.cursor()
                                                    cursor.execute("DELETE FROM files WHERE canonical_path = ?", (str(log_file),))
                                            except Exception:
                                                pass
                                        
                                        file_hash = None
                                        file_size = log_file.stat().st_size
                                        with open(log_file, 'rb') as f:
                                            file_hash = hashlib.sha256(f.read()).hexdigest()
                                        
                                        registry.index_file(
                                            investigation_id=investigation_id,
                                            canonical_path=str(log_file),
                                            file_kind="log",
                                            file_ext=log_file.suffix[1:] if log_file.suffix else "unknown",
                                            sha256_hash=file_hash,
                                            file_size=file_size
                                        )
                                        indexed_count += 1
                                        log_files_indexed += 1
                                except Exception as e:
                                    click.echo(f"     ⚠️ Failed to index log file {log_file.name}: {e}")
                        
                        click.echo(f"     ✓ Indexed {log_files_indexed} log files")
                    
                except Exception as e:
                    click.echo(f"     ❌ Failed to import {log_folder.name}: {e}", err=True)
                    logger.exception(f"Import failed for {log_folder.name}")
            else:
                click.echo(f"     [DRY RUN] Would import to: {log_path}")
                imported_count += 1
    
    click.echo(f"\n✅ Import complete!")
    click.echo(f"   Files processed: {imported_count}")
    click.echo(f"   Files indexed: {indexed_count}")
    if dry_run:
        click.echo(f"   [DRY RUN] No files were actually imported")


@cli.command()
@click.argument('resource_type', type=click.Choice(['investigations', 'files', 'comparisons']), default='investigations')
@click.option('--entity-type', 'entity_type', type=str, help='Filter by entity type')
@click.option('--entity-id', 'entity_id', type=str, help='Filter by entity ID')
@click.option('--date-range', 'date_range', type=str, help='Date range (format: START,END)')
@click.pass_context
def ls(ctx, resource_type, entity_type, entity_id, date_range):
    """List investigations, files, or comparisons (supporting both canonical and entity view queries)"""
    registry = get_registry()
    
    if resource_type == 'investigations':
        if entity_type:
            results = registry.query_by_entity(entity_type, entity_id)
        elif date_range:
            start_str, end_str = date_range.split(',')
            start_date = datetime.fromisoformat(start_str.strip())
            end_date = datetime.fromisoformat(end_str.strip())
            results = registry.query_by_date_range(start_date, end_date)
        else:
            # List all investigations
            with registry._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM investigations ORDER BY created_at DESC LIMIT 100")
                results = [dict(row) for row in cursor.fetchall()]
        
        click.echo(f"Found {len(results)} investigations:")
        for inv in results:
            click.echo(f"  {inv.get('investigation_id', 'unknown')}: {inv.get('title', 'N/A')} ({inv.get('status', 'N/A')})")
    
    elif resource_type == 'files':
        with registry._get_connection() as conn:
            cursor = conn.cursor()
            if entity_id:
                cursor.execute("""
                    SELECT * FROM files 
                    WHERE investigation_id IN (
                        SELECT investigation_id FROM investigations WHERE entity_ids LIKE ?
                    )
                    ORDER BY created_at DESC LIMIT 100
                """, (f'%"{entity_id}"%',))
            else:
                cursor.execute("SELECT * FROM files ORDER BY created_at DESC LIMIT 100")
            results = [dict(row) for row in cursor.fetchall()]
        
        click.echo(f"Found {len(results)} files:")
        for file in results:
            click.echo(f"  {file.get('canonical_path', 'unknown')} ({file.get('file_kind', 'N/A')})")
    
    elif resource_type == 'comparisons':
        with registry._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM comparisons ORDER BY created_at DESC LIMIT 100")
            results = [dict(row) for row in cursor.fetchall()]
        
        click.echo(f"Found {len(results)} comparisons:")
        for cmp in results:
            click.echo(f"  {cmp.get('comparison_id', 'unknown')}: {cmp.get('title', 'N/A')}")


@cli.command()
@click.option('--id', 'investigation_id', type=str, help='Investigation ID')
@click.option('--comparison-id', 'comparison_id', type=str, help='Comparison ID')
@click.pass_context
def show(ctx, investigation_id, comparison_id):
    """Display investigation or comparison details including symlink/indexed view status"""
    registry = get_registry()
    
    if investigation_id:
        with registry._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM investigations WHERE investigation_id = ?", (investigation_id,))
            row = cursor.fetchone()
            
            if row:
                inv = dict(row)
                click.echo(f"Investigation: {investigation_id}")
                click.echo(json.dumps(inv, indent=2, default=str))
            else:
                click.echo(f"❌ Investigation not found: {investigation_id}", err=True)
                sys.exit(1)
    
    elif comparison_id:
        with registry._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM comparisons WHERE comparison_id = ?", (comparison_id,))
            row = cursor.fetchone()
            
            if row:
                cmp = dict(row)
                click.echo(f"Comparison: {comparison_id}")
                click.echo(json.dumps(cmp, indent=2, default=str))
            else:
                click.echo(f"❌ Comparison not found: {comparison_id}", err=True)
                sys.exit(1)
    else:
        click.echo("❌ Must specify --id or --comparison-id", err=True)
        sys.exit(1)


@cli.command()
@click.option('--force', is_flag=True, help='Force re-indexing of all files')
@click.pass_context
def index(ctx, force):
    """Re-index workspace files in registry"""
    import hashlib
    from pathlib import Path
    
    click.echo("Re-indexing workspace files...")
    
    registry = get_registry()
    folder_manager = get_folder_manager()
    file_org_service = ctx.obj['file_org_service']
    
    indexed_count = 0
    error_count = 0
    
    # Re-index canonical investigation folders
    workspace_base = file_org_service.config.workspace_base_dir / "investigations"
    if workspace_base.exists():
        click.echo(f"\n📁 Scanning canonical investigations: {workspace_base}")
        
        for year_dir in workspace_base.iterdir():
            if not year_dir.is_dir():
                continue
            
            for month_dir in year_dir.iterdir():
                if not month_dir.is_dir():
                    continue
                
                for inv_dir in month_dir.iterdir():
                    if not inv_dir.is_dir():
                        continue
                    
                    investigation_id = inv_dir.name.replace("imported-", "").replace("inv_", "")
                    
                    # Find manifest.json to extract metadata
                    manifest_path = inv_dir / "manifest.json"
                    entity_type = None
                    entity_ids = []
                    created_at = None
                    
                    if manifest_path.exists():
                        try:
                            with open(manifest_path) as f:
                                manifest = json.load(f)
                                entity_type = manifest.get("entity_type")
                                entity_ids = manifest.get("entity_ids", [])
                                created_at_str = manifest.get("created_at")
                                if created_at_str:
                                    created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                        except Exception as e:
                            click.echo(f"  ⚠️ Failed to parse manifest {manifest_path}: {e}")
                    
                    # Index investigation if not already indexed
                    try:
                        with registry._get_connection() as conn:
                            cursor = conn.cursor()
                            cursor.execute("SELECT investigation_id FROM investigations WHERE investigation_id = ?", (investigation_id,))
                            if not cursor.fetchone():
                                registry.index_investigation(
                                    investigation_id=investigation_id,
                                    title=f"Investigation {investigation_id[:8]}",
                                    investigation_type="unknown",
                                    graph_type="unknown",
                                    trigger_source="unknown",
                                    status="COMPLETED",
                                    entity_type=entity_type,
                                    entity_ids=entity_ids if entity_ids else None,
                                    canonical_path=str(inv_dir),
                                    created_at=created_at or datetime.now(),
                                    completed_at=created_at or datetime.now()
                                )
                                indexed_count += 1
                                click.echo(f"  ✓ Indexed investigation: {investigation_id}")
                    except Exception as e:
                        click.echo(f"  ⚠️ Failed to index investigation {investigation_id}: {e}")
                        error_count += 1
                    
                    # Index all files in investigation folder
                    for file_path in inv_dir.rglob("*"):
                        if not file_path.is_file():
                            continue
                        
                        try:
                            # Check if file already indexed
                            with registry._get_connection() as conn:
                                cursor = conn.cursor()
                                cursor.execute("SELECT file_id FROM files WHERE canonical_path = ?", (str(file_path),))
                                if cursor.fetchone():
                                    continue
                            
                            # Calculate file hash and size
                            file_hash = None
                            file_size = file_path.stat().st_size
                            with open(file_path, 'rb') as f:
                                file_hash = hashlib.sha256(f.read()).hexdigest()
                            
                            # Determine file kind and extension
                            file_kind = "unknown"
                            if "artifacts" in str(file_path):
                                file_kind = "artifact" if file_path.suffix == ".json" else "report"
                            elif "logs" in str(file_path):
                                file_kind = "log"
                            elif "reports" in str(file_path):
                                file_kind = "report"
                            
                            registry.index_file(
                                investigation_id=investigation_id,
                                canonical_path=str(file_path),
                                file_kind=file_kind,
                                file_ext=file_path.suffix[1:] if file_path.suffix else "unknown",
                                sha256_hash=file_hash,
                                file_size=file_size
                            )
                            indexed_count += 1
                        except Exception as e:
                            click.echo(f"  ⚠️ Failed to index file {file_path.name}: {e}")
                            error_count += 1
    
    # Re-index entity view artifacts
    artifacts_base = file_org_service.config.artifacts_base_dir / "investigations"
    if artifacts_base.exists():
        click.echo(f"\n📁 Scanning entity view artifacts: {artifacts_base}")
        
        for entity_type_dir in artifacts_base.iterdir():
            if not entity_type_dir.is_dir():
                continue
            
            entity_type = entity_type_dir.name
            
            for entity_id_dir in entity_type_dir.iterdir():
                if not entity_id_dir.is_dir():
                    continue
                
                entity_id = entity_id_dir.name.replace("-at-", "@").replace("-", ".")
                
                # Find all files in entity view
                for file_path in entity_id_dir.rglob("*"):
                    if not file_path.is_file():
                        continue
                    
                    # Skip if it's a symlink (already indexed via canonical path)
                    if file_path.is_symlink():
                        continue
                    
                    try:
                        # Check if file already indexed
                        with registry._get_connection() as conn:
                            cursor = conn.cursor()
                            cursor.execute("SELECT file_id FROM files WHERE entity_view_path = ?", (str(file_path),))
                            if cursor.fetchone():
                                continue
                        
                        # Try to resolve canonical path from symlink
                        canonical_path = None
                        if file_path.is_symlink():
                            try:
                                canonical_path = str(file_path.resolve())
                            except:
                                pass
                        
                        # Extract investigation ID from filename if possible
                        # Pattern: inv_{investigation_id}__{kind}.{ext}
                        inv_match = re.match(r'inv_([^_]+)__(\w+)\.(\w+)', file_path.name)
                        investigation_id = "unknown"
                        if inv_match:
                            investigation_id = inv_match.group(1)
                        
                        # Calculate file hash and size
                        file_hash = None
                        file_size = file_path.stat().st_size
                        with open(file_path, 'rb') as f:
                            file_hash = hashlib.sha256(f.read()).hexdigest()
                        
                        registry.index_file(
                            investigation_id=investigation_id,
                            canonical_path=canonical_path or str(file_path),
                            file_kind=inv_match.group(2) if inv_match else "unknown",
                            file_ext=inv_match.group(3) if inv_match else (file_path.suffix[1:] if file_path.suffix else "unknown"),
                            entity_view_path=str(file_path),
                            sha256_hash=file_hash,
                            file_size=file_size
                        )
                        indexed_count += 1
                    except Exception as e:
                        click.echo(f"  ⚠️ Failed to index entity view file {file_path.name}: {e}")
                        error_count += 1
    
    # Re-index comparison reports
    comparisons_base = file_org_service.config.artifacts_base_dir / "comparisons"
    if comparisons_base.exists():
        click.echo(f"\n📁 Scanning comparison reports: {comparisons_base}")
        
        comparison_pattern = re.compile(r'comparison_([^_]+)_(.+?)_(\d{8}_\d{6})\.html')
        
        for source_type_dir in ["auto_startup", "manual"]:
            source_path = comparisons_base / source_type_dir
            if not source_path.exists():
                continue
            
            for timestamp_dir in source_path.iterdir():
                if not timestamp_dir.is_dir():
                    continue
                
                for comparison_file in timestamp_dir.glob("comparison_*.html"):
                    match = comparison_pattern.match(comparison_file.name)
                    if not match:
                        continue
                    
                    entity_type, entity_id_raw, timestamp_str = match.groups()
                    entity_id = entity_id_raw.replace('-at-', '@').replace('-', '.')
                    
                    try:
                        timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                    except ValueError:
                        continue
                    
                    # Check if comparison already indexed
                    comparison_id = f"cmp_{timestamp_str}_{hashlib.md5(f'{entity_type}:{entity_id}'.encode()).hexdigest()[:8]}"
                    
                    with registry._get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("SELECT comparison_id FROM comparisons WHERE comparison_id = ?", (comparison_id,))
                        if cursor.fetchone():
                            continue
                    
                    # Index comparison
                    registry.index_comparison(
                        comparison_id=comparison_id,
                        left_investigation="unknown",
                        right_investigation="unknown",
                        title=f"Comparison: {entity_type}={entity_id}",
                        source_type=source_type_dir,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        canonical_path=str(comparison_file),
                        metadata={"re_indexed": True}
                    )
                    indexed_count += 1
    
    # Re-index startup reports
    reports_base = file_org_service.config.artifacts_base_dir / "reports" / "startup"
    if reports_base.exists():
        click.echo(f"\n📁 Scanning startup reports: {reports_base}")
        
        startup_pattern = re.compile(r'startup_analysis_(\d{8}_\d{6})\.html')
        
        for startup_file in reports_base.rglob("startup_analysis_*.html"):
            match = startup_pattern.match(startup_file.name)
            if not match:
                continue
            
            try:
                # Check if already indexed
                with registry._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT file_id FROM files WHERE canonical_path = ?", (str(startup_file),))
                    if cursor.fetchone():
                        continue
                
                # Calculate file hash and size
                file_hash = None
                file_size = startup_file.stat().st_size
                with open(startup_file, 'rb') as f:
                    file_hash = hashlib.sha256(f.read()).hexdigest()
                
                registry.index_file(
                    investigation_id="startup_report",
                    canonical_path=str(startup_file),
                    file_kind="report",
                    file_ext="html",
                    sha256_hash=file_hash,
                    file_size=file_size
                )
                indexed_count += 1
            except Exception as e:
                click.echo(f"  ⚠️ Failed to index startup report {startup_file.name}: {e}")
                error_count += 1
    
    click.echo(f"\n✅ Re-indexing complete!")
    click.echo(f"   Files indexed: {indexed_count}")
    if error_count > 0:
        click.echo(f"   Errors: {error_count}")


@cli.command()
@click.option('--yes', '-y', is_flag=True, help='Skip confirmation prompt')
@click.option('--files', is_flag=True, help='Also delete investigation and comparison files from filesystem')
@click.option('--registry-only', is_flag=True, help='Only delete registry records, keep database investigations')
@click.pass_context
def cleanup(ctx, yes, files, registry_only):
    """
    Delete all records from workspace registry and optionally from database/filesystem.
    
    WARNING: This will permanently delete:
    - All investigations from workspace registry (and optionally database)
    - All comparisons from workspace registry
    - All file records from workspace registry
    - All audit log entries
    - Optionally: investigation logs, artifacts, and reports from filesystem
    
    This is irreversible!
    """
    if not yes:
        click.echo("⚠️  WARNING: This will permanently delete ALL records!")
        if not registry_only:
            click.echo("⚠️  This will delete investigations from the database!")
        if files:
            click.echo("⚠️  This will also delete ALL investigation and comparison files!")
        click.echo()
        response = click.prompt("Type 'DELETE ALL' to confirm", type=str)
        if response != "DELETE ALL":
            click.echo("❌ Cleanup cancelled")
            return
    
    registry = get_registry()
    deleted_counts = {
        'investigations': 0,
        'comparisons': 0,
        'files': 0,
        'audit_log': 0
    }
    
    # Initialize variables for file cleanup
    investigation_ids = []
    file_paths = []
    
    try:
        # Delete from workspace registry
        click.echo("\n🗑️  Cleaning up workspace registry...\n")
        
        with registry._get_connection() as conn:
            cursor = conn.cursor()
            
            # Count before deletion
            cursor.execute("SELECT COUNT(*) FROM investigations")
            inv_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM comparisons")
            comp_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM files")
            file_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM audit_log")
            audit_count = cursor.fetchone()[0]
            
            click.echo(f"   Found {inv_count} investigation(s) in registry")
            click.echo(f"   Found {comp_count} comparison(s) in registry")
            click.echo(f"   Found {file_count} file(s) in registry")
            click.echo(f"   Found {audit_count} audit log entry/entries")
            
            # Get file paths before deletion (for optional file cleanup)
            if files:
                cursor.execute("SELECT canonical_path FROM files WHERE canonical_path IS NOT NULL")
                file_paths = [row[0] for row in cursor.fetchall()]
            
            # Delete all records
            cursor.execute("DELETE FROM investigations")
            deleted_counts['investigations'] = cursor.rowcount
            
            cursor.execute("DELETE FROM comparisons")
            deleted_counts['comparisons'] = cursor.rowcount
            
            cursor.execute("DELETE FROM files")
            deleted_counts['files'] = cursor.rowcount
            
            cursor.execute("DELETE FROM audit_log")
            deleted_counts['audit_log'] = cursor.rowcount
            
            # Also clear FTS5 table
            cursor.execute("DELETE FROM investigations_fts")
            
            click.echo(f"\n   ✅ Deleted {deleted_counts['investigations']} investigation(s) from registry")
            click.echo(f"   ✅ Deleted {deleted_counts['comparisons']} comparison(s) from registry")
            click.echo(f"   ✅ Deleted {deleted_counts['files']} file(s) from registry")
            click.echo(f"   ✅ Deleted {deleted_counts['audit_log']} audit log entry/entries")
        
        # Delete from database if not registry-only
        if not registry_only:
            click.echo("\n🗑️  Cleaning up database...\n")
            
            try:
                with get_db_session() as db:
                    # Count before deletion
                    count_before = db.query(InvestigationState).count()
                    click.echo(f"   Found {count_before} investigation(s) in database")
                    
                    # Get investigation IDs before deletion (for file cleanup)
                    investigation_ids = [
                        inv.investigation_id 
                        for inv in db.query(InvestigationState.investigation_id).all()
                    ]
                    
                    # Delete all investigations
                    deleted_count = db.query(InvestigationState).delete()
                    db.commit()
                    
                    click.echo(f"   ✅ Deleted {deleted_count} investigation(s) from database")
                    
                    # Clear in-memory cache
                    in_memory_count = len(IN_MEMORY_INVESTIGATIONS)
                    IN_MEMORY_INVESTIGATIONS.clear()
                    if in_memory_count > 0:
                        click.echo(f"   ✅ Cleared {in_memory_count} investigation(s) from in-memory cache")
                    
            except Exception as e:
                logger.error(f"Failed to delete investigations from database: {e}", exc_info=True)
                click.echo(f"   ❌ Error deleting investigations from database: {e}", err=True)
        
        # Delete files from filesystem if requested
        if files:
            click.echo("\n🗑️  Cleaning up filesystem...\n")
            
            import shutil
            deleted_file_count = 0
            
            # Delete investigation folders
            from app.service.logging.investigation_folder_manager import get_folder_manager
            folder_manager = get_folder_manager()
            
            if not registry_only and investigation_ids:
                # Delete investigation folders from database investigation IDs
                for inv_id in investigation_ids:
                    try:
                        inv_folder = folder_manager.get_investigation_folder(inv_id)
                        if inv_folder and inv_folder.exists():
                            shutil.rmtree(inv_folder)
                            deleted_file_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to delete folder for investigation {inv_id}: {e}")
            
            # Delete files from registry file paths
            for file_path_str in file_paths:
                try:
                    file_path = Path(file_path_str)
                    if file_path.exists():
                        if file_path.is_file():
                            file_path.unlink()
                            deleted_file_count += 1
                        elif file_path.is_dir():
                            shutil.rmtree(file_path)
                            deleted_file_count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete file {file_path_str}: {e}")
            
            # Delete artifact directories
            config = ctx.obj['config']
            artifacts_dir = config.artifacts_base_dir
            if artifacts_dir.exists():
                try:
                    # Delete investigation artifacts
                    inv_artifacts_dir = artifacts_dir / "investigations"
                    if inv_artifacts_dir.exists():
                        shutil.rmtree(inv_artifacts_dir)
                        click.echo(f"   ✅ Deleted investigation artifacts directory")
                    
                    # Delete comparison artifacts
                    comp_artifacts_dir = artifacts_dir / "comparisons"
                    if comp_artifacts_dir.exists():
                        shutil.rmtree(comp_artifacts_dir)
                        click.echo(f"   ✅ Deleted comparison artifacts directory")
                    
                    # Delete report artifacts
                    report_artifacts_dir = artifacts_dir / "reports"
                    if report_artifacts_dir.exists():
                        shutil.rmtree(report_artifacts_dir)
                        click.echo(f"   ✅ Deleted report artifacts directory")
                except Exception as e:
                    logger.warning(f"Failed to delete artifact directories: {e}")
            
            click.echo(f"   ✅ Deleted {deleted_file_count} file(s)/folder(s) from filesystem")
        
        click.echo("\n✅ Cleanup complete!")
        click.echo("   Registry records: ✅")
        if not registry_only:
            click.echo("   Database records: ✅")
        if files:
            click.echo("   Filesystem files: ✅")
            
    except Exception as e:
        logger.error(f"Cleanup failed: {e}", exc_info=True)
        click.echo(f"\n❌ Cleanup failed: {e}", err=True)
        sys.exit(1)


if __name__ == '__main__':
    cli()

