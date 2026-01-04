# File Organization System - Usage Guide

**Date**: 2025-11-15  
**Status**: Production Ready

## Overview

The file organization system automatically organizes all investigation files using a hybrid structure:
- **Canonical Storage**: Date-based organization for lifecycle management
- **Entity Views**: Date-grouped entity-based views for fast analyst access
- **SQLite Registry**: Cross-indexed database for fast queries

## Automatic File Organization

### Files Are Automatically Organized

When investigations complete, files are automatically organized:

1. **Investigation Artifacts** → Saved to canonical location and entity view
2. **Comparison Reports** → Saved to `artifacts/comparisons/auto_startup/` or `manual/`
3. **Startup Reports** → Saved to `artifacts/reports/startup/`
4. **Investigation Logs** → Saved to `logs/investigations/{MODE}_{investigation_id}_{timestamp}/`

**You don't need to do anything** - the system handles it automatically!

## File Structure

### Canonical Storage (Date-based)
```
workspace/investigations/<YYYY>/<MM>/<inv_id>/
├── manifest.json
├── artifacts/
│   └── investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.json
├── logs/
└── reports/
```

### Entity-Based Views (Date-grouped)
```
artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/
├── inv_{investigation_id}__artifact.json (symlink/indexed view)
└── inv_{investigation_id}__report.html (symlink/indexed view)
```

### Comparison Reports
```
artifacts/comparisons/
├── auto_startup/{timestamp}/
│   ├── comparison_{entity_type}_{entity_id}_{timestamp}.html
│   └── comparison_package_{timestamp}.zip
└── manual/{timestamp}/
    └── comparison_{entity_type}_{entity_id}_{timestamp}.html
```

### Startup Reports
```
artifacts/reports/startup/
└── startup_analysis_{timestamp}.html
```

## Accessing Files

### Method 1: Via Entity View (Recommended for Analysts)

**Find all investigations for a specific entity:**

```bash
# Navigate to entity-based view
cd artifacts/investigations/email/moeller2media-at-gmail-com/2025/11/

# List investigation files for this entity
ls inv_*__*.json
ls inv_*__*.html
```

**Example:**
```bash
cd olorin-server
cd artifacts/investigations/email/moeller2media-at-gmail-com/2025/11/
ls -la
# Shows: inv_abc123__artifact.json, inv_abc123__report.html
```

### Method 2: Via Canonical Path (For System Operations)

**Find all files for a specific investigation:**

```bash
# Navigate to canonical storage
cd workspace/investigations/2025/11/inv_abc123/

# Access all investigation files
cat manifest.json
ls artifacts/
ls logs/
ls reports/
```

### Method 3: Via Registry Query (Programmatic Access)

**Query investigations by entity:**

```python
from app.service.investigation.workspace_registry import get_registry

registry = get_registry()

# Find all investigations for an entity
investigations = registry.query_by_entity(
    entity_type="email",
    entity_id="moeller2media@gmail.com",
    limit=10
)

for inv in investigations:
    print(f"Investigation: {inv['investigation_id']}")
    print(f"  Path: {inv['canonical_path']}")
    print(f"  Created: {inv['created_at']}")
```

**Query by date range:**

```python
from datetime import datetime, timedelta

# Find investigations from last 30 days
start_date = datetime.now() - timedelta(days=30)
end_date = datetime.now()

investigations = registry.query_by_date_range(
    start_date=start_date,
    end_date=end_date,
    limit=50
)
```

**Full-text search:**

```python
# Search investigations by title or tags
results = registry.search_full_text("fraud", limit=20)

for result in results:
    print(f"Found: {result['title']}")
    print(f"  ID: {result['investigation_id']}")
```

## Using the CLI Tool

### Initialize Workspace

```bash
cd olorin-server
python cli/olor.py init
```

### List Investigations

```bash
# List all investigations
python cli/olor.py ls

# List investigations for specific entity
python cli/olor.py ls --entity-type email --entity-id "moeller2media@gmail.com"

# List investigations by date range
python cli/olor.py ls --start-date 2025-11-01 --end-date 2025-11-15
```

### Show Investigation Details

```bash
# Show investigation details
python cli/olor.py show <investigation_id>

# Show with file list
python cli/olor.py show <investigation_id> --files
```

### Create New Investigation

```bash
# Create new investigation
python cli/olor.py new \
    --entity-type email \
    --entity-id "test@example.com" \
    --title "Test Investigation"
```

### Add Files to Investigation

```bash
# Add file to investigation
python cli/olor.py add-file <investigation_id> /path/to/file.json
```

### Generate Reports

```bash
# Generate report for investigation
python cli/olor.py report <investigation_id>
```

### Create Comparisons

```bash
# Create comparison between two investigations
python cli/olor.py compare <investigation_id_1> <investigation_id_2>
```

### Import Existing Logs

```bash
# Import logs with dry-run (preview)
python cli/olor.py import-logs /path/to/logs --dry-run

# Import logs (copy files)
python cli/olor.py import-logs /path/to/logs --copy

# Import logs (move files)
python cli/olor.py import-logs /path/to/logs --move
```

### Re-index Workspace

```bash
# Re-index all files in workspace
python cli/olor.py index
```

## Common Use Cases

### Use Case 1: Find All Investigations for an Entity

**Via CLI:**
```bash
python cli/olor.py ls --entity-type email --entity-id "moeller2media@gmail.com"
```

**Via Python:**
```python
from app.service.investigation.workspace_registry import get_registry

registry = get_registry()
investigations = registry.query_by_entity("email", "moeller2media@gmail.com")
```

**Via File System:**
```bash
cd artifacts/investigations/email/moeller2media-at-gmail-com/
find . -name "*.json" -o -name "*.html"
```

### Use Case 2: Find Latest Startup Analysis Report

```bash
# Find latest startup report
ls -t artifacts/reports/startup/startup_analysis_*.html | head -1

# Or via Python
from pathlib import Path
startup_reports = sorted(
    Path("artifacts/reports/startup").glob("startup_analysis_*.html"),
    key=lambda x: x.stat().st_mtime,
    reverse=True
)
latest = startup_reports[0] if startup_reports else None
```

### Use Case 3: Find All Comparison Reports from Latest Startup

```bash
# Find latest comparison directory
ls -t artifacts/comparisons/auto_startup/ | head -1

# List all comparison reports in latest directory
ls -la artifacts/comparisons/auto_startup/$(ls -t artifacts/comparisons/auto_startup/ | head -1)/
```

### Use Case 4: Access Investigation Manifest

```bash
# Via canonical path
cat workspace/investigations/2025/11/inv_abc123/manifest.json

# Via Python
import json
from pathlib import Path

manifest_path = Path("workspace/investigations/2025/11/inv_abc123/manifest.json")
with open(manifest_path) as f:
    manifest = json.load(f)
    print(f"Investigation: {manifest['investigation_id']}")
    print(f"Files: {manifest.get('file_references', [])}")
```

### Use Case 5: Query Registry for Recent Investigations

```python
from app.service.investigation.workspace_registry import get_registry
from datetime import datetime, timedelta

registry = get_registry()

# Get investigations from last 7 days
start_date = datetime.now() - timedelta(days=7)
end_date = datetime.now()

recent = registry.query_by_date_range(start_date, end_date, limit=20)

for inv in recent:
    print(f"{inv['investigation_id']}: {inv['title']}")
    print(f"  Entity: {inv.get('entity_type')} = {inv.get('entity_ids', [])}")
    print(f"  Status: {inv['status']}")
    print(f"  Created: {inv['created_at']}")
```

## File Organization Service (Programmatic Access)

### Resolve Paths

```python
from app.config.file_organization_config import FileOrganizationConfig
from app.service.investigation.file_organization_service import FileOrganizationService
from datetime import datetime

config = FileOrganizationConfig()
service = FileOrganizationService(config)

# Resolve investigation artifact path
canonical_path, entity_view_path = service.resolve_investigation_artifact_path(
    entity_type="email",
    entity_id="test@example.com",
    date_start=datetime(2025, 11, 1),
    date_end=datetime(2025, 11, 14),
    file_type="json",
    investigation_id="inv_abc123",
    created_at=datetime(2025, 11, 14)
)

print(f"Canonical: {canonical_path}")
print(f"Entity View: {entity_view_path}")
```

### Create Directory Structure

```python
# Create directory structure
service.create_directory_structure(Path("workspace/investigations/2025/11/inv_test"))
```

### Lock Files for Concurrent Writes

```python
# Lock file before writing
file_handle = service.lock_file_for_write(
    Path("artifacts/investigations/email/test/2025/11/file.json"),
    create_if_missing=True
)

try:
    # Write file
    with open(file_path, 'w') as f:
        json.dump(data, f)
finally:
    # Unlock file
    service.unlock_file(file_handle)
```

## Best Practices

### 1. Use Entity Views for Quick Access
- Navigate to `artifacts/<entity_type>/<entity_id>/` for fast access
- Files are organized by date (YYYY/MM) for easy browsing

### 2. Use Registry for Complex Queries
- Query by entity, date range, or full-text search
- Fast queries (<50ms latency)

### 3. Use Canonical Paths for System Operations
- Access `workspace/investigations/` for complete investigation data
- Includes manifest.json with all file references

### 4. Use CLI for Workspace Management
- `olor.py ls` - List investigations
- `olor.py show` - Show investigation details
- `olor.py index` - Re-index workspace

### 5. Check Migration Period Status
```python
from app.config.file_organization_config import FileOrganizationConfig

config = FileOrganizationConfig()
if config.is_migration_period_active:
    print("Migration period is active - legacy paths still accessible")
else:
    print("Migration period expired - legacy paths are read-only")
```

## Troubleshooting

### Files Not Found

**Check entity normalization:**
```python
from app.service.investigation.entity_normalizer import EntityNormalizer

normalizer = EntityNormalizer()
normalized = normalizer.normalize("user.name@example.com")
print(f"Normalized: {normalized}")
# Output: user-name-at-example-com
```

**Check registry:**
```python
registry = get_registry()
# Query registry to find file locations
files = registry.query_by_entity("email", "test@example.com")
```

### Registry Queries Slow

**Check indexes:**
```python
# Registry automatically creates indexes, but you can verify:
registry = get_registry()
# Queries should be <50ms
```

### Symlinks Not Working

**Check symlink support:**
```python
from app.service.investigation.symlink_manager import SymlinkManager

manager = SymlinkManager()
if manager.symlinks_supported:
    print("Symlinks supported")
else:
    print("Using indexed views (Windows/network mount)")
```

## Examples

### Example 1: Find All Investigations for Email Entity

```bash
# Via CLI
python cli/olor.py ls --entity-type email --entity-id "moeller2media@gmail.com"

# Via Python
from app.service.investigation.workspace_registry import get_registry
registry = get_registry()
results = registry.query_by_entity("email", "moeller2media@gmail.com")
for r in results:
    print(f"{r['investigation_id']}: {r['title']}")
```

### Example 2: Get Latest Startup Report

```bash
# Via file system
ls -t artifacts/reports/startup/startup_analysis_*.html | head -1

# Via Python
from pathlib import Path
reports = sorted(
    Path("artifacts/reports/startup").glob("startup_analysis_*.html"),
    key=lambda x: x.stat().st_mtime,
    reverse=True
)
latest = reports[0] if reports else None
```

### Example 3: Recreate Zip Package

```bash
# Use the recreate script
python scripts/recreate_startup_zip.py
```

## Summary

The file organization system works automatically - you don't need to do anything special. Files are organized when investigations complete.

**Quick Reference:**
- **Entity Views**: `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/` - Fast analyst access
- **Canonical Storage**: `workspace/investigations/<YYYY>/<MM>/<inv_id>/` - Complete investigation data
- **CLI Tool**: `python cli/olor.py` - Workspace management
- **Registry**: `get_registry()` - Fast queries by entity, date, or text search

For more details, see:
- `artifacts/README.md` - File structure documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `VERIFICATION.md` - Verification results

