# Data Model: Arranging Investigation Files

**Feature**: `001-arranging-investigation-files`  
**Date**: 2025-11-14  
**Phase**: Phase 1 - Design  
**Status**: Complete

## Overview

This document defines the data models, configuration schemas, and file path structures for the unified file organization system. The system uses Pydantic models for configuration validation and Path objects for filesystem operations.

## Configuration Models

### FileOrganizationConfig

**Location**: `app/config/file_organization_config.py`

```python
from pydantic import BaseSettings, Field
from pathlib import Path
from typing import Optional

class FileOrganizationConfig(BaseSettings):
    """Configuration for file organization system."""
    
    # Base directories (configurable via environment variables)
    artifacts_base_dir: Path = Field(
        default=Path("artifacts"),
        description="Base directory for investigation artifacts"
    )
    logs_base_dir: Path = Field(
        default=Path("logs"),
        description="Base directory for investigation logs"
    )
    
    # Entity ID normalization settings
    entity_id_max_length: int = Field(
        default=255,
        ge=1,
        le=255,
        description="Maximum length for normalized entity IDs"
    )
    
    # Timestamp format
    timestamp_format: str = Field(
        default="%Y%m%d_%H%M%S",
        description="Format string for timestamp-based folder names"
    )
    
    # Legacy support
    enable_legacy_path_support: bool = Field(
        default=True,
        description="Enable backward compatibility with legacy file paths"
    )
    
    # Migration mode
    migration_mode: bool = Field(
        default=False,
        description="Enable migration mode (creates symlinks during transition)"
    )
    
    class Config:
        env_prefix = "FILE_ORG_"
        case_sensitive = False
```

## Path Resolution Models

### InvestigationArtifactPath

**Purpose**: Represents path structure for investigation artifacts (JSON/HTML)

**Structure**:
```
artifacts/investigations/{entity_type}/{normalized_entity_id}/investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.{ext}
```

**Components**:
- `base_dir`: `artifacts` (configurable)
- `category`: `investigations`
- `entity_type`: Entity type (email, device_id, ip, etc.)
- `normalized_entity_id`: Filesystem-safe entity ID
- `filename`: `investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.{ext}`

**Example**:
```
artifacts/investigations/email/moeller2media-at-gmail-com/investigation_email_moeller2media-gmail-com_20251028_20251114.json
```

### ComparisonReportPath

**Purpose**: Represents path structure for comparison reports

**Structure**:
```
artifacts/comparisons/{source_type}/{timestamp}/comparison_{entity_type}_{entity_id}_{timestamp}.html
```

**Components**:
- `base_dir`: `artifacts` (configurable)
- `category`: `comparisons`
- `source_type`: `auto_startup` or `manual`
- `timestamp`: Timestamp folder (YYYYMMDD_HHMMSS)
- `filename`: `comparison_{entity_type}_{entity_id}_{timestamp}.html`

**Example**:
```
artifacts/comparisons/auto_startup/20251114_162724/comparison_email_moeller2media_gmail.com_20251114_162724.html
```

### StartupReportPath

**Purpose**: Represents path structure for startup analysis reports

**Structure**:
```
artifacts/reports/startup/{timestamp}/startup_analysis_{timestamp}.html
```

**Components**:
- `base_dir`: `artifacts` (configurable)
- `category`: `reports`
- `subcategory`: `startup`
- `timestamp`: Timestamp folder (YYYYMMDD_HHMMSS)
- `filename`: `startup_analysis_{timestamp}.html`

**Example**:
```
artifacts/reports/startup/20251114_162724/startup_analysis_20251114_162724.html
```

### InvestigationLogPath

**Purpose**: Represents path structure for investigation logs

**Structure**:
```
logs/investigations/{MODE}_{investigation_id}_{timestamp}/
```

**Components**:
- `base_dir`: `logs` (configurable)
- `category`: `investigations`
- `folder_name`: `{MODE}_{investigation_id}_{timestamp}`
- `files`: Standard file structure (metadata.json, investigation.log, etc.)

**Example**:
```
logs/investigations/LIVE_auto-comp-99f767a73c33_20251114_162724/
```

## Service Models

### FileOrganizationService

**Location**: `app/service/investigation/file_organization_service.py`

**Key Methods**:

```python
class FileOrganizationService:
    """Central service for file path resolution and organization."""
    
    def __init__(self, config: FileOrganizationConfig):
        """Initialize with configuration."""
        
    def resolve_investigation_artifact_path(
        self,
        entity_type: str,
        entity_id: str,
        date_start: datetime,
        date_end: datetime,
        file_type: str = "json"
    ) -> Path:
        """Resolve path for investigation artifact."""
        
    def resolve_comparison_report_path(
        self,
        source_type: str,
        entity_type: str,
        entity_id: str,
        timestamp: datetime
    ) -> Path:
        """Resolve path for comparison report."""
        
    def resolve_startup_report_path(
        self,
        timestamp: datetime
    ) -> Path:
        """Resolve path for startup analysis report."""
        
    def resolve_investigation_log_path(
        self,
        mode: str,
        investigation_id: str,
        timestamp: datetime
    ) -> Path:
        """Resolve path for investigation log folder."""
        
    def create_directory_structure(self, path: Path) -> None:
        """Create directory structure with validation."""
        
    def normalize_entity_id(self, entity_id: str) -> str:
        """Normalize entity ID for filesystem safety."""
```

### EntityNormalizer

**Location**: `app/service/investigation/entity_normalizer.py`

**Key Methods**:

```python
class EntityNormalizer:
    """Utility for normalizing entity IDs for filesystem safety."""
    
    def normalize(
        self,
        entity_id: str,
        max_length: int = 255
    ) -> str:
        """Normalize entity ID for filesystem paths.
        
        Rules:
        - Replace dots (.) with dashes (-)
        - Replace @ symbols with -at-
        - Replace other special characters with dashes
        - Limit length to max_length
        - Strip leading/trailing dashes
        """
```

### DirectoryManager

**Location**: `app/service/investigation/directory_manager.py`

**Key Methods**:

```python
class DirectoryManager:
    """Manages directory creation and validation."""
    
    def create_directory(
        self,
        path: Path,
        validate: bool = True
    ) -> Path:
        """Create directory with validation.
        
        Validations:
        - Path length limits
        - Directory traversal prevention
        - Invalid character detection
        """
        
    def validate_path(self, path: Path) -> bool:
        """Validate path before creation."""
```

## Metadata Models

### InvestigationFileMetadata

**Purpose**: Links investigation files together

**Structure**:
```json
{
  "investigation_id": "auto-comp-99f767a73c33",
  "entity_type": "email",
  "entity_id": "moeller2media@gmail.com",
  "created_at": "2025-11-14T16:27:24Z",
  "files": {
    "artifact_json": "artifacts/investigations/email/moeller2media-at-gmail-com/investigation_email_moeller2media-gmail-com_20251028_20251114.json",
    "artifact_html": "artifacts/investigations/email/moeller2media-at-gmail-com/investigation_email_moeller2media-gmail-com_20251028_20251114.html",
    "log_folder": "logs/investigations/LIVE_auto-comp-99f767a73c33_20251114_162724/",
    "comparison_reports": [
      "artifacts/comparisons/auto_startup/20251114_162724/comparison_email_moeller2media_gmail.com_20251114_162724.html"
    ]
  }
}
```

## Database Integration

### InvestigationState Model (Existing)

**Location**: `app/models/investigation_state.py`

**Fields Used**:
- `investigation_id`: Links to file metadata
- `settings_json`: Contains entity_type, entity_id
- `progress_json`: Contains file references

**Enhancement**: Add `file_metadata` field to `progress_json`:
```json
{
  "file_metadata": {
    "artifact_paths": [...],
    "log_path": "...",
    "report_paths": [...]
  }
}
```

## File Naming Conventions

### Investigation Artifacts
- **Format**: `investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.{ext}`
- **Date Format**: `YYYYMMDD`
- **Extensions**: `.json`, `.html`

### Comparison Reports
- **Format**: `comparison_{entity_type}_{entity_id}_{timestamp}.html`
- **Timestamp Format**: `YYYYMMDD_HHMMSS`

### Startup Reports
- **Format**: `startup_analysis_{timestamp}.html`
- **Timestamp Format**: `YYYYMMDD_HHMMSS`

### Investigation Logs
- **Format**: `{MODE}_{investigation_id}_{timestamp}/`
- **Timestamp Format**: `YYYYMMDD_HHMMSS`

## Validation Rules

### Entity ID Normalization
1. Convert to lowercase
2. Replace `.` with `-`
3. Replace `@` with `-at-`
4. Replace other special characters with `-`
5. Strip leading/trailing dashes
6. Limit to max_length (default 255)
7. Handle empty strings (use "unknown")

### Path Validation
1. Check path length < 4096 characters (Linux limit)
2. Prevent directory traversal (`..`, `/`)
3. Validate characters (no null bytes, control characters)
4. Check filesystem compatibility (no reserved names on Windows)

### Directory Creation
1. Create parent directories if needed (`mkdir -p`)
2. Handle existing directories gracefully
3. Set appropriate permissions (755 for directories)
4. Log all directory creation operations

## Error Handling

### Path Resolution Errors
- **Invalid Entity ID**: Use fallback normalization, log warning
- **Path Too Long**: Truncate entity ID, append hash for uniqueness
- **Invalid Characters**: Normalize or reject with clear error

### Directory Creation Errors
- **Permission Denied**: Log error, raise exception with clear message
- **Disk Full**: Log error, raise exception with disk space info
- **Concurrent Creation**: Handle race condition gracefully (check existence before creation)

## Migration Models

### FileMigrationRecord

**Purpose**: Track file migration progress

**Structure**:
```python
@dataclass
class FileMigrationRecord:
    """Record of file migration operation."""
    source_path: Path
    target_path: Path
    migration_timestamp: datetime
    status: str  # "pending", "completed", "failed"
    error_message: Optional[str] = None
```

## Summary

The data model provides:
1. **Configuration**: Pydantic-based configuration with environment variable support
2. **Path Resolution**: Structured path models for all file types
3. **Service Models**: Clear service interfaces for file organization
4. **Metadata**: JSON-based metadata linking related files
5. **Validation**: Comprehensive validation rules for paths and entity IDs
6. **Error Handling**: Clear error handling strategies
7. **Migration**: Models for tracking file migration

All models follow constitutional requirements:
- ✅ No hardcoded values (all configurable)
- ✅ Type-safe (Pydantic models)
- ✅ Validated (Pydantic validation)
- ✅ Documented (comprehensive docstrings)

