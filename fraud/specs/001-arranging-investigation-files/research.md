# Research: Arranging Investigation Files

**Feature**: `001-arranging-investigation-files`  
**Created**: 2025-11-14  
**Status**: Complete  
**Author**: AI Assistant

## Executive Summary

This research document provides a comprehensive analysis of the current state of investigation file organization in the Olorin server, identifying all file creation locations, current organizational patterns, and gaps that must be addressed to achieve unified file organization.

**Key Finding**: Investigation-related files are currently scattered across multiple locations with inconsistent naming patterns and organizational structures. Files are created in at least 8 different locations with varying naming conventions, making it difficult to locate and manage investigation artifacts, logs, reports, and comparisons.

## Current State Analysis

### File Creation Locations Mapped

#### 1. Investigation Artifacts (JSON/HTML)
**Current Locations**:
- `artifacts/investigations/{entity_type}/{entity_id}/` (new structure, partially implemented)
- `artifacts/investigation_{entity_type}_{entity_id}_{date_range}.{ext}` (root level, legacy)

**Creation Points**:
- `app/service/investigation/artifact_persistence.py::persist_artifact()` - Saves comparison response JSON
- `app/service/investigation/comparison_service.py` - Generates HTML reports
- `app/service/investigation/html_report_generator.py` - Generates investigation HTML reports

**Naming Patterns**:
- JSON: `investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.json`
- HTML: `investigation_{entity_type}_{entity_id}_{date_start}_{date_end}.html`

**Issues Identified**:
- Some files still saved to root `artifacts/` directory
- Entity ID normalization inconsistent (dots vs dashes, @ vs -at-)
- No consistent metadata linking files together

#### 2. Comparison Reports
**Current Locations**:
- `artifacts/comparisons/auto_startup/` (auto-generated comparisons)
- `artifacts/comparisons/manual/` (manual comparisons, mostly empty)
- `artifacts/comparisons/comparison_package_{timestamp}/` (zip package contents)

**Creation Points**:
- `app/service/investigation/auto_comparison.py::run_auto_comparison_for_entity()` - Generates comparison HTML
- `app/service/investigation/auto_comparison.py::package_comparison_results()` - Creates zip packages

**Naming Patterns**:
- HTML: `comparison_{entity_type}_{entity_id}_{timestamp}.html`
- ZIP: `comparison_package_{timestamp}.zip`

**Issues Identified**:
- Timestamp format inconsistent (YYYYMMDD_HHMMSS vs YYYYMMDDHHMMSS)
- Manual comparisons directory mostly unused
- Zip packages contain extracted folders, creating duplication

#### 3. Startup Analysis Reports
**Current Locations**:
- `artifacts/reports/startup/` (new structure)
- `artifacts/startup_analysis_{timestamp}.html` (legacy, root level)

**Creation Points**:
- `app/service/reporting/startup_report_generator.py::generate_startup_report()` - Generates startup HTML report
- `app/service/__init__.py` - Triggers report generation during server startup

**Naming Patterns**:
- HTML: `startup_analysis_{timestamp}.html`

**Issues Identified**:
- Some reports still created at root level
- No metadata linking startup reports to related investigations/comparisons

#### 4. Investigation Logs
**Current Locations**:
- `logs/investigations/{MODE}_{investigation_id}_{timestamp}/` (new structure via InvestigationFolderManager)
- `logs/investigations/` (legacy, various subdirectories)
- `investigation_logs/{investigation_id}/` (legacy, via INVESTIGATION_LOGS_DIR env var)

**Creation Points**:
- `app/service/logging/investigation_folder_manager.py::create_investigation_folder()` - Creates folder structure
- `app/service/logging/autonomous_investigation_logger.py::start_investigation_logging()` - Initializes logging
- `app/service/logging/investigation_log_writer.py` - Writes log files

**File Structure**:
```
{MODE}_{investigation_id}_{timestamp}/
├── metadata.json
├── investigation.log
├── structured_activities.jsonl
├── journey_tracking.json
├── comprehensive_investigation_report.html
├── thought_process_*.json
└── results/
    ├── investigation_result.json
    ├── agent_results.json
    └── ...
```

**Issues Identified**:
- Multiple folder naming patterns coexist
- Legacy structure still referenced in some code paths
- No clear link between log folders and artifact folders

#### 5. Chain of Thought Logs
**Current Locations**:
- `logs/chain_of_thought/` (1446+ JSON files)

**Creation Points**:
- `app/service/agent/chain_of_thought_logger.py::save_thought_process()` - Saves agent reasoning

**Naming Patterns**:
- `thought_process_{investigation_id}_{agent_name}_{timestamp}.json`

**Issues Identified**:
- Files not organized by investigation_id
- Large number of files in single directory (performance issue)
- No cleanup or archival strategy

#### 6. Journey Tracking
**Current Locations**:
- `logs/journey_tracking/` (63+ JSON files)
- `logs/investigations/{MODE}_{investigation_id}_{timestamp}/journey_tracking.json` (within investigation folder)

**Creation Points**:
- `app/service/logging/journey_tracker.py` - Tracks investigation journey
- `app/service/agent/journey_tracker.py` - Agent-level journey tracking

**Issues Identified**:
- Duplicate storage (both in dedicated folder and investigation folder)
- Inconsistent file naming

#### 7. Comprehensive Investigation Reports
**Current Locations**:
- `logs/investigations/{MODE}_{investigation_id}_{timestamp}/comprehensive_investigation_report.html` (within log folder)
- `investigation_logs/{investigation_id}/comprehensive_investigation_report.html` (legacy)

**Creation Points**:
- `app/service/reporting/comprehensive_investigation_report.py::generate_comprehensive_report()` - Generates HTML report
- `app/router/reports_router.py::generate_investigation_report()` - API endpoint

**Issues Identified**:
- Reports stored in log folders, not artifact folders
- No clear separation between execution logs and final artifacts
- Legacy path still used by some endpoints

#### 8. Autonomous Investigation Logs
**Current Locations**:
- `logs/autonomous_investigations/autonomous_investigations.jsonl`

**Creation Points**:
- `app/service/logging/autonomous_investigation_logger.py` - Logs autonomous investigation events

**Issues Identified**:
- Single file for all autonomous investigations (scalability issue)
- No organization by investigation_id or timestamp

## Gap Analysis

### Critical Gaps

1. **No Unified Path Resolution Service**
   - Each module constructs paths independently
   - Inconsistent path construction logic
   - No single source of truth for file locations

2. **Inconsistent Entity ID Normalization**
   - Some code uses `entity_value.replace('.', '-').replace('@', '-at-')`
   - Some code uses `slugify()` function
   - Some code uses raw entity values (causes filesystem issues)
   - No centralized normalization logic

3. **Missing File Metadata Linking**
   - No clear way to find all files related to an investigation
   - No metadata files linking artifacts, logs, and reports
   - Difficult to trace file relationships

4. **Legacy Path Support**
   - Multiple code paths still reference legacy locations
   - No migration strategy for existing files
   - Backward compatibility concerns

5. **No Directory Structure Validation**
   - Directories created without validation
   - No checks for path length limits
   - No protection against directory traversal

### Technical Decisions Required

1. **Path Resolution Strategy**
   - **Decision**: Create centralized `FileOrganizationService` with path resolution methods
   - **Rationale**: Single source of truth ensures consistency, easier to maintain and test
   - **Alternatives Considered**: Configuration file (rejected - too static), Database storage (rejected - overkill for filesystem paths)

2. **Entity ID Normalization**
   - **Decision**: Create `EntityNormalizer` utility class with comprehensive normalization rules
   - **Rationale**: Centralized logic ensures consistency, handles edge cases (special characters, length limits)
   - **Alternatives Considered**: Regex-based normalization (rejected - harder to maintain), Database lookup (rejected - unnecessary complexity)

3. **Directory Structure**
   - **Decision**: Use hierarchical structure: `{base}/{category}/{subcategory}/{identifier}/`
   - **Rationale**: Scalable, intuitive, supports querying by category
   - **Alternatives Considered**: Flat structure with prefixes (rejected - doesn't scale), Database-only (rejected - filesystem needed for direct access)

4. **Migration Strategy**
   - **Decision**: Create migration utility script that reorganizes existing files, maintains symlinks during transition
   - **Rationale**: Non-disruptive migration, allows gradual adoption
   - **Alternatives Considered**: One-time migration (rejected - too risky), No migration (rejected - leaves system inconsistent)

5. **Configuration Management**
   - **Decision**: Use Pydantic models with environment variable support for all configuration
   - **Rationale**: Type-safe, validated, follows existing project patterns
   - **Alternatives Considered**: JSON config files (rejected - less flexible), Hardcoded values (rejected - violates constitution)

## Integration Points

### Existing Services to Integrate With

1. **InvestigationFolderManager** (`app/service/logging/investigation_folder_manager.py`)
   - **Current Role**: Creates investigation log folders
   - **Integration**: Use FileOrganizationService for path resolution
   - **Changes Required**: Modify to use unified path resolution

2. **ArtifactPersistence** (`app/service/investigation/artifact_persistence.py`)
   - **Current Role**: Saves investigation artifacts (JSON)
   - **Integration**: Use FileOrganizationService for artifact path resolution
   - **Changes Required**: Replace direct path construction with service calls

3. **AutoComparison** (`app/service/investigation/auto_comparison.py`)
   - **Current Role**: Generates comparison reports and packages
   - **Integration**: Use FileOrganizationService for comparison report paths
   - **Changes Required**: Replace path construction with service calls

4. **StartupReportGenerator** (`app/service/reporting/startup_report_generator.py`)
   - **Current Role**: Generates startup analysis reports
   - **Integration**: Use FileOrganizationService for report paths
   - **Changes Required**: Replace path construction with service calls

5. **ComprehensiveInvestigationReportGenerator** (`app/service/reporting/comprehensive_investigation_report.py`)
   - **Current Role**: Generates comprehensive HTML reports
   - **Integration**: Use FileOrganizationService for report output paths
   - **Changes Required**: Replace path construction with service calls

### API Endpoints Affected

1. **GET /api/v1/reports/investigation/{investigation_id}/html**
   - **Current**: Searches multiple locations for report files
   - **Change**: Use FileOrganizationService to resolve report path

2. **POST /api/v1/reports/investigation/generate**
   - **Current**: Creates reports in investigation log folders
   - **Change**: Use FileOrganizationService to determine output location

3. **GET /api/v1/investigations/{investigation_id}/artifacts**
   - **Current**: May not exist or uses inconsistent paths
   - **Change**: Use FileOrganizationService to locate all related artifacts

## Technical Architecture

### Proposed File Organization Service Structure

```python
# app/service/investigation/file_organization_service.py
class FileOrganizationService:
    """Central service for file path resolution and organization."""
    
    def resolve_investigation_artifact_path(
        self, entity_type: str, entity_id: str, 
        date_start: datetime, date_end: datetime, 
        file_type: str = "json"
    ) -> Path:
        """Resolve path for investigation artifact."""
        
    def resolve_comparison_report_path(
        self, source_type: str, entity_type: str, 
        entity_id: str, timestamp: datetime
    ) -> Path:
        """Resolve path for comparison report."""
        
    def resolve_startup_report_path(self, timestamp: datetime) -> Path:
        """Resolve path for startup analysis report."""
        
    def resolve_investigation_log_path(
        self, mode: str, investigation_id: str, timestamp: datetime
    ) -> Path:
        """Resolve path for investigation log folder."""
        
    def create_directory_structure(self, path: Path) -> None:
        """Create directory structure with validation."""
        
    def normalize_entity_id(self, entity_id: str) -> str:
        """Normalize entity ID for filesystem safety."""
```

### Configuration Model

```python
# app/config/file_organization_config.py
class FileOrganizationConfig(BaseSettings):
    """Configuration for file organization."""
    
    artifacts_base_dir: Path = Path("artifacts")
    logs_base_dir: Path = Path("logs")
    entity_id_max_length: int = 255
    timestamp_format: str = "%Y%m%d_%H%M%S"
    enable_legacy_path_support: bool = True
    migration_mode: bool = False
```

## Risk Assessment

### High Risk Areas

1. **Migration of Existing Files**
   - **Risk**: Data loss during file reorganization
   - **Mitigation**: Create backup before migration, use symlinks during transition, verify file integrity

2. **Breaking Changes to API Endpoints**
   - **Risk**: Existing API consumers may break if file paths change
   - **Mitigation**: Maintain backward compatibility layer, gradual rollout, comprehensive testing

3. **Performance Impact**
   - **Risk**: Path resolution overhead may slow investigation execution
   - **Mitigation**: Cache path resolutions, optimize directory creation, benchmark performance

4. **Concurrent File Operations**
   - **Risk**: Race conditions when multiple investigations create files simultaneously
   - **Mitigation**: Use file locking, atomic directory creation, handle conflicts gracefully

### Medium Risk Areas

1. **Entity ID Collisions**
   - **Risk**: Normalized entity IDs may collide
   - **Mitigation**: Include investigation_id in path when needed, use sequence numbers for conflicts

2. **Filesystem Limits**
   - **Risk**: Very long paths or too many files in single directory
   - **Mitigation**: Enforce path length limits, use hierarchical structure, implement archival strategy

## Success Metrics

1. **Consistency**: 100% of file creation operations use FileOrganizationService
2. **Performance**: Path resolution < 100ms, directory creation < 50ms
3. **Migration**: 100% of existing files successfully reorganized without data loss
4. **Coverage**: All 4 trigger types (startup, script, UI investigation, UI comparison) use unified structure
5. **Extensibility**: New investigation types can be added via configuration only (80% of cases)

## Open Questions

1. **Q**: Should comprehensive investigation reports be stored in artifact folders or log folders?
   - **A**: Artifact folders - they are final outputs, not execution logs

2. **Q**: How should we handle files from failed investigations?
   - **A**: Store in same structure with status indicator in metadata

3. **Q**: Should we implement file archival/cleanup strategy?
   - **A**: Yes, but out of scope for this feature - create separate feature

4. **Q**: How to handle investigation_id conflicts?
   - **A**: Include timestamp in path to ensure uniqueness

## Next Steps

1. Create FileOrganizationService with path resolution methods
2. Create EntityNormalizer utility class
3. Create DirectoryManager for directory creation and validation
4. Refactor existing file creation code to use new service
5. Create migration utility script
6. Add comprehensive tests
7. Update API endpoints to use new paths
8. Document new file organization structure

