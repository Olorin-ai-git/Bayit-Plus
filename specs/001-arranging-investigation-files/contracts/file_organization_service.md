# Contract: FileOrganizationService

**Feature**: `001-arranging-investigation-files`  
**Date**: 2025-11-14  
**Status**: Draft

## Service Contract

### Class: FileOrganizationService

**Location**: `app/service/investigation/file_organization_service.py`

### Constructor

```python
def __init__(self, config: FileOrganizationConfig) -> None
```

**Parameters**:
- `config` (FileOrganizationConfig): Configuration for file organization

**Returns**: None

**Side Effects**: None

**Exceptions**: None

### Method: resolve_investigation_artifact_path

```python
def resolve_investigation_artifact_path(
    self,
    entity_type: str,
    entity_id: str,
    date_start: datetime,
    date_end: datetime,
    file_type: str = "json"
) -> Path
```

**Purpose**: Resolve filesystem path for investigation artifact (JSON or HTML).

**Parameters**:
- `entity_type` (str): Type of entity (e.g., "email", "device_id", "ip")
- `entity_id` (str): Entity identifier (will be normalized)
- `date_start` (datetime): Start date of investigation window
- `date_end` (datetime): End date of investigation window
- `file_type` (str, optional): File type extension ("json" or "html"), default "json"

**Returns**: Path object to investigation artifact file

**Path Structure**: `artifacts/investigations/{entity_type}/{normalized_entity_id}/investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.{ext}`

**Exceptions**:
- `ValueError`: If entity_type or entity_id is empty
- `ValueError`: If file_type is not "json" or "html"

**Preconditions**:
- `entity_type` is not empty
- `entity_id` is not empty
- `date_start` <= `date_end`

**Postconditions**:
- Returned path is absolute or relative to server root
- Path components are filesystem-safe
- Entity ID is normalized

### Method: resolve_comparison_report_path

```python
def resolve_comparison_report_path(
    self,
    source_type: str,
    entity_type: str,
    entity_id: str,
    timestamp: datetime
) -> Path
```

**Purpose**: Resolve filesystem path for comparison report HTML.

**Parameters**:
- `source_type` (str): Source of comparison ("auto_startup" or "manual")
- `entity_type` (str): Type of entity
- `entity_id` (str): Entity identifier (will be normalized)
- `timestamp` (datetime): Timestamp for comparison

**Returns**: Path object to comparison report file

**Path Structure**: `artifacts/comparisons/{source_type}/{timestamp_folder}/comparison_{entity_type}_{entity_id}_{timestamp}.html`

**Exceptions**:
- `ValueError`: If source_type is not "auto_startup" or "manual"
- `ValueError`: If entity_type or entity_id is empty

**Preconditions**:
- `source_type` is "auto_startup" or "manual"
- `entity_type` is not empty
- `entity_id` is not empty

**Postconditions**:
- Returned path is absolute or relative to server root
- Path components are filesystem-safe
- Entity ID is normalized

### Method: resolve_startup_report_path

```python
def resolve_startup_report_path(
    self,
    timestamp: datetime
) -> Path
```

**Purpose**: Resolve filesystem path for startup analysis report HTML.

**Parameters**:
- `timestamp` (datetime): Timestamp for startup report

**Returns**: Path object to startup report file

**Path Structure**: `artifacts/reports/startup/{timestamp_folder}/startup_analysis_{timestamp}.html`

**Exceptions**: None

**Preconditions**: None

**Postconditions**:
- Returned path is absolute or relative to server root
- Path components are filesystem-safe

### Method: resolve_investigation_log_path

```python
def resolve_investigation_log_path(
    self,
    mode: str,
    investigation_id: str,
    timestamp: datetime
) -> Path
```

**Purpose**: Resolve filesystem path for investigation log folder.

**Parameters**:
- `mode` (str): Investigation mode ("LIVE", "MOCK", "DEMO")
- `investigation_id` (str): Investigation identifier
- `timestamp` (datetime): Timestamp for investigation

**Returns**: Path object to investigation log folder

**Path Structure**: `logs/investigations/{MODE}_{investigation_id}_{timestamp}/`

**Exceptions**:
- `ValueError`: If mode is not "LIVE", "MOCK", or "DEMO"
- `ValueError`: If investigation_id is empty

**Preconditions**:
- `mode` is "LIVE", "MOCK", or "DEMO"
- `investigation_id` is not empty

**Postconditions**:
- Returned path is absolute or relative to server root
- Path components are filesystem-safe

### Method: create_directory_structure

```python
def create_directory_structure(self, path: Path) -> None
```

**Purpose**: Create directory structure for given path with validation.

**Parameters**:
- `path` (Path): Path to directory to create

**Returns**: None

**Side Effects**: Creates directory and parent directories if needed

**Exceptions**:
- `OSError`: If directory creation fails (permissions, disk full, etc.)
- `ValueError`: If path validation fails (directory traversal, invalid characters)

**Preconditions**:
- `path` is a valid Path object
- Path passes validation checks

**Postconditions**:
- Directory and all parent directories exist
- Directory has appropriate permissions (755)
- Operation is logged

### Method: normalize_entity_id

```python
def normalize_entity_id(self, entity_id: str) -> str
```

**Purpose**: Normalize entity ID for filesystem safety.

**Parameters**:
- `entity_id` (str): Raw entity identifier

**Returns**: Normalized entity ID string

**Normalization Rules**:
1. Convert to lowercase
2. Replace `.` with `-`
3. Replace `@` with `-at-`
4. Replace other special characters with `-`
5. Strip leading/trailing dashes
6. Limit to max_length (from config, default 255)
7. Handle empty strings (return "unknown")

**Exceptions**:
- `ValueError`: If entity_id is None

**Preconditions**:
- `entity_id` is not None

**Postconditions**:
- Returned string is filesystem-safe
- Returned string length <= max_length
- Returned string contains only alphanumeric characters and dashes

## Usage Examples

### Example 1: Resolve Investigation Artifact Path

```python
from app.service.investigation.file_organization_service import FileOrganizationService
from app.config.file_organization_config import FileOrganizationConfig
from datetime import datetime

config = FileOrganizationConfig()
service = FileOrganizationService(config)

path = service.resolve_investigation_artifact_path(
    entity_type="email",
    entity_id="user@example.com",
    date_start=datetime(2025, 10, 28),
    date_end=datetime(2025, 11, 14),
    file_type="json"
)
# Returns: Path("artifacts/investigations/email/user-at-example-com/investigation_email_user@example.com_20251028_20251114.json")
```

### Example 2: Create Directory Structure

```python
path = service.resolve_investigation_artifact_path(...)
service.create_directory_structure(path.parent)
# Creates: artifacts/investigations/email/user-at-example-com/
```

### Example 3: Normalize Entity ID

```python
normalized = service.normalize_entity_id("user.name@example.com")
# Returns: "user-name-at-example-com"
```

## Testing Requirements

### Unit Tests
- Test path resolution for all file types
- Test entity ID normalization with various inputs
- Test directory creation with valid and invalid paths
- Test error handling for invalid inputs

### Integration Tests
- Test file creation using resolved paths
- Test directory structure creation
- Test path resolution consistency across service calls

### Contract Tests
- Verify all methods follow contract specifications
- Verify preconditions and postconditions
- Verify exception handling

