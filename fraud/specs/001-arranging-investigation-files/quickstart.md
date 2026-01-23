# Quickstart: Arranging Investigation Files

**Feature**: `001-arranging-investigation-files`  
**Date**: 2025-11-14  
**Status**: Draft

## Overview

This quickstart guide provides step-by-step instructions for using the unified file organization system to organize investigation files consistently across all trigger types (startup, script, UI investigation, UI comparison).

## Prerequisites

- Python 3.11+
- Olorin server codebase
- Understanding of investigation file types (artifacts, logs, reports, comparisons)

## Installation

The file organization system is integrated into the Olorin server. No separate installation required.

## Configuration

### Environment Variables

Set the following environment variables (optional, defaults provided):

```bash
# Base directories
FILE_ORG_ARTIFACTS_BASE_DIR=artifacts
FILE_ORG_LOGS_BASE_DIR=logs

# Entity ID normalization
FILE_ORG_ENTITY_ID_MAX_LENGTH=255

# Timestamp format
FILE_ORG_TIMESTAMP_FORMAT=%Y%m%d_%H%M%S

# Legacy support
FILE_ORG_ENABLE_LEGACY_PATH_SUPPORT=true

# Migration mode
FILE_ORG_MIGRATION_MODE=false
```

## Basic Usage

### 1. Initialize File Organization Service

```python
from app.service.investigation.file_organization_service import FileOrganizationService
from app.config.file_organization_config import FileOrganizationConfig

# Load configuration from environment variables
config = FileOrganizationConfig()
service = FileOrganizationService(config)
```

### 2. Resolve Investigation Artifact Path

```python
from datetime import datetime

# Resolve path for investigation artifact
artifact_path = service.resolve_investigation_artifact_path(
    entity_type="email",
    entity_id="user@example.com",
    date_start=datetime(2025, 10, 28),
    date_end=datetime(2025, 11, 14),
    file_type="json"
)

# Create directory structure
service.create_directory_structure(artifact_path.parent)

# Save artifact
with open(artifact_path, 'w') as f:
    json.dump(investigation_data, f)
```

### 3. Resolve Comparison Report Path

```python
from datetime import datetime

# Resolve path for comparison report
comparison_path = service.resolve_comparison_report_path(
    source_type="auto_startup",
    entity_type="email",
    entity_id="user@example.com",
    timestamp=datetime.now()
)

# Create directory structure
service.create_directory_structure(comparison_path.parent)

# Generate and save comparison report
with open(comparison_path, 'w') as f:
    f.write(comparison_html)
```

### 4. Resolve Startup Report Path

```python
from datetime import datetime

# Resolve path for startup report
startup_path = service.resolve_startup_report_path(
    timestamp=datetime.now()
)

# Create directory structure
service.create_directory_structure(startup_path.parent)

# Generate and save startup report
with open(startup_path, 'w') as f:
    f.write(startup_html)
```

### 5. Resolve Investigation Log Path

```python
from datetime import datetime

# Resolve path for investigation log folder
log_path = service.resolve_investigation_log_path(
    mode="LIVE",
    investigation_id="auto-comp-99f767a73c33",
    timestamp=datetime.now()
)

# Create directory structure
service.create_directory_structure(log_path)

# Create standard log files
(log_path / "metadata.json").write_text(...)
(log_path / "investigation.log").write_text(...)
```

## Integration Examples

### Integrating with Artifact Persistence

**Before** (direct path construction):
```python
def persist_artifact(...):
    artifacts_dir = Path("artifacts")
    safe_entity_id = entity_value.replace('.', '-').replace('@', '-at-')
    investigation_dir = artifacts_dir / "investigations" / entity_type / safe_entity_id
    # ...
```

**After** (using FileOrganizationService):
```python
from app.service.investigation.file_organization_service import get_file_organization_service

def persist_artifact(...):
    service = get_file_organization_service()
    artifact_path = service.resolve_investigation_artifact_path(
        entity_type=entity_type,
        entity_id=entity_value,
        date_start=window_a_start,
        date_end=window_b_end,
        file_type="json"
    )
    service.create_directory_structure(artifact_path.parent)
    # Save artifact to artifact_path
```

### Integrating with Auto Comparison

**Before** (inconsistent paths):
```python
reports_dir = Path("artifacts/comparisons/auto_startup")
# Manual path construction...
```

**After** (unified paths):
```python
from app.service.investigation.file_organization_service import get_file_organization_service

service = get_file_organization_service()
comparison_path = service.resolve_comparison_report_path(
    source_type="auto_startup",
    entity_type=entity_type,
    entity_id=entity_value,
    timestamp=datetime.now()
)
service.create_directory_structure(comparison_path.parent)
# Generate and save comparison report
```

### Integrating with Startup Report Generator

**Before** (hardcoded path):
```python
output_path = Path(f"artifacts/reports/startup/startup_analysis_{timestamp}.html")
```

**After** (service-based):
```python
from app.service.investigation.file_organization_service import get_file_organization_service

service = get_file_organization_service()
startup_path = service.resolve_startup_report_path(timestamp=datetime.now())
service.create_directory_structure(startup_path.parent)
# Generate and save startup report
```

## Migration

### Migrating Existing Files

Use the migration utility script:

```bash
python scripts/migrate_investigation_files.py \
    --source-dir artifacts \
    --target-dir artifacts \
    --dry-run
```

**Options**:
- `--source-dir`: Source directory to scan for files
- `--target-dir`: Target directory (usually same as source)
- `--dry-run`: Preview changes without applying
- `--create-symlinks`: Create symlinks during transition

### Migration Process

1. **Backup existing files**:
   ```bash
   cp -r artifacts artifacts.backup
   cp -r logs logs.backup
   ```

2. **Run migration in dry-run mode**:
   ```bash
   python scripts/migrate_investigation_files.py --dry-run
   ```

3. **Review migration plan**:
   - Check migration log for file movements
   - Verify no data loss

4. **Run actual migration**:
   ```bash
   python scripts/migrate_investigation_files.py --create-symlinks
   ```

5. **Verify migration**:
   - Check file counts match
   - Verify file integrity
   - Test file access

6. **Remove symlinks** (after verification period):
   ```bash
   find artifacts -type l -delete
   find logs -type l -delete
   ```

## Common Patterns

### Pattern 1: Save Investigation Artifact

```python
def save_investigation_artifact(investigation_data, entity_type, entity_id, date_start, date_end):
    service = get_file_organization_service()
    
    # Resolve paths for both JSON and HTML
    json_path = service.resolve_investigation_artifact_path(
        entity_type, entity_id, date_start, date_end, "json"
    )
    html_path = service.resolve_investigation_artifact_path(
        entity_type, entity_id, date_start, date_end, "html"
    )
    
    # Create directory structure (same for both)
    service.create_directory_structure(json_path.parent)
    
    # Save files
    json_path.write_text(json.dumps(investigation_data))
    html_path.write_text(generate_html(investigation_data))
    
    return json_path, html_path
```

### Pattern 2: Find All Files for Investigation

```python
def find_investigation_files(investigation_id, entity_type, entity_id):
    service = get_file_organization_service()
    
    # Find log folder
    # (requires investigation metadata to get mode and timestamp)
    
    # Find artifacts
    # (requires date range from investigation)
    
    # Find comparison reports
    # (search comparison directories)
    
    # Return all file paths
    return {
        "log_folder": log_path,
        "artifacts": artifact_paths,
        "comparisons": comparison_paths
    }
```

### Pattern 3: Handle Entity ID Normalization

```python
def process_entity(entity_id):
    service = get_file_organization_service()
    
    # Normalize entity ID
    normalized = service.normalize_entity_id(entity_id)
    
    # Use normalized ID for file paths
    # Original entity_id preserved in file content/metadata
    return normalized
```

## Error Handling

### Handle Path Resolution Errors

```python
try:
    path = service.resolve_investigation_artifact_path(...)
except ValueError as e:
    logger.error(f"Invalid path parameters: {e}")
    # Use fallback path or raise exception
```

### Handle Directory Creation Errors

```python
try:
    service.create_directory_structure(path)
except OSError as e:
    logger.error(f"Failed to create directory: {e}")
    # Handle disk full, permission errors, etc.
    raise
```

### Handle Entity ID Normalization

```python
try:
    normalized = service.normalize_entity_id(entity_id)
except ValueError as e:
    logger.warning(f"Entity ID normalization failed: {e}")
    # Use fallback normalization
    normalized = "unknown"
```

## Best Practices

1. **Always use FileOrganizationService**: Never construct paths directly
2. **Create directories before writing**: Use `create_directory_structure()` first
3. **Normalize entity IDs**: Always normalize before using in paths
4. **Handle errors gracefully**: Provide fallbacks for edge cases
5. **Log file operations**: Log all file creation for debugging
6. **Validate paths**: Check path validity before file operations
7. **Use consistent timestamps**: Use same timestamp format throughout
8. **Preserve original entity IDs**: Store original in file content/metadata

## Troubleshooting

### Issue: Path too long

**Solution**: Entity ID normalization limits length. If still too long, use hash suffix:
```python
normalized = service.normalize_entity_id(entity_id)
if len(normalized) > 200:
    normalized = normalized[:200] + "-" + hashlib.md5(entity_id.encode()).hexdigest()[:8]
```

### Issue: Directory creation fails

**Solution**: Check permissions and disk space:
```python
try:
    service.create_directory_structure(path)
except PermissionError:
    # Check directory permissions
except OSError as e:
    if e.errno == errno.ENOSPC:
        # Disk full
```

### Issue: Entity ID contains invalid characters

**Solution**: Normalization handles this automatically, but verify:
```python
normalized = service.normalize_entity_id(entity_id)
assert all(c.isalnum() or c == '-' for c in normalized)
```

## Next Steps

1. Review integration examples for your use case
2. Update existing code to use FileOrganizationService
3. Run migration utility for existing files
4. Test file organization with your investigation types
5. Monitor file organization performance and errors

