# Implementation Plan: Arranging Investigation Files

**Branch**: `001-arranging-investigation-files` | **Date**: 2025-11-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/gklainert/Documents/olorin/specs/001-arranging-investigation-files/spec.md`

## Summary

Create a unified file organization system for investigation-related files (investigations, comparisons, reports, logs) that consolidates scattered files across multiple locations into a consistent, hierarchical workspace structure. The system includes:

1. **Workspace Structure**: Hybrid approach with date-based canonical organization (`investigations/<YYYY>/<MM>/<inv_id>/`) and date-grouped entity-based artifact views (`artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>`)
2. **File Organization Service**: Centralized path resolution and directory management
3. **SQLite Registry**: Indexing and cataloging system for fast queries and deduplication
4. **CLI Tool**: Unified command-line interface (`olor.py`) for workspace management
5. **Manifest System**: JSON manifests for investigations and comparisons
6. **Configuration File**: `olorin.toml` as single source of truth for paths and templates
7. **Import/Ingestion**: Automated import of existing logs/artifacts with dry-run support
8. **Security & Compliance**: Encryption, PII handling, retention policies, audit trails
9. **Quality Gates**: Linter validation for risk score consistency, tool usage validation
10. **Observability**: Prometheus metrics, alerting, structured logging with SLOs
11. **Backup/DR**: Scheduled backups, restore procedures, integrity verification
12. **RBAC**: Role-based access control with asset-level visibility
13. **External Intel**: Pluggable connectors for IP rep, device fingerprint, email rep/breach

The system supports startup analysis flow, script-triggered investigations, UI-triggered investigations, and UI-triggered comparisons, with extensibility for future augmentations (storage backends, plugin detectors, template versioning).

## Technical Context

**Language/Version**: Python 3.11+  
**Primary Dependencies**: FastAPI, Pathlib, Pydantic, SQLAlchemy, SQLite3, Click (for CLI), hashlib (for SHA256), Hypothesis (for property-based testing), prometheus-client (for metrics)  
**Storage**: 
- Filesystem (workspace structure with hybrid organization: date-based canonical + date-grouped entity views)
- SQLite registry database (investigations, files, comparisons indexing)
- PostgreSQL (investigation metadata - existing)
- Configuration file (`olorin.toml`) for path templates and settings
- Audit log (append-only file or separate audit table)

**Testing**: 
- **Unit Tests**: Property-based tests for entity normalizer (Hypothesis), path resolver edge cases, manifest schema validation
- **Integration Tests**: End-to-end import/rollback tests, registry query performance tests, CLI command contract tests
- **Schema Migration Tests**: Verify registry schema migrations preserve data integrity
- **CLI Contract Tests**: Verify CLI commands match expected behavior and output formats
- **Performance Tests**: Load testing for registry queries, import throughput, concurrent operations
- **Security Tests**: Encryption/decryption tests, PII redaction tests, access control tests
- Minimum 30% coverage, integration tests for file operations

**Target Platform**: Linux server (FastAPI on port 8090)  
**Project Type**: Backend service (part of web application)  

**Performance Goals**: 
- File path resolution < 100ms response time
- Directory creation < 50ms per operation
- Registry query latency p95 < 50ms, p99 < 100ms for entity-based searches
- Import throughput > 1000 files/minute for typical file sizes (< 10MB)
- File organization operations complete within investigation execution time
- Zero impact on investigation execution performance

**Constraints**:
- Maximum 200-line file size limit (all Python files)
- No hardcoded paths (all paths configurable via environment variables or `olorin.toml`)
- Backward compatibility with existing file locations during 30-day migration period (after which legacy paths become read-only)
- File path validation to prevent directory traversal attacks
- Entity ID normalization for filesystem safety (max 255 characters, special character handling)
- SQLite registry must support concurrent reads (WAL mode)
- CLI tool must be dependency-light (minimal external dependencies)
- Configuration file must support environment variable overrides
- Manifest files must be valid JSON and follow schema
- File locking with retry for concurrent writes (OS locks + SQLite BEGIN IMMEDIATE)

**Scale/Scope**:
- Support 1000+ concurrent investigations
- Handle 10,000+ investigation artifacts
- Registry must support 100,000+ investigations
- Registry queries must complete in < 50ms
- CLI operations must complete in < 5 seconds for typical operations
- Import operation must handle 10,000+ files efficiently
- Organize files across 4 trigger types (startup, script, UI investigation, UI comparison)
- Support 10+ entity types (email, device_id, ip, etc.)
- Migration of existing scattered files without data loss

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Olorin Project does not have a formal constitution file.** Based on SYSTEM MANDATE and existing plan patterns, applying these principles:

### Core Principles Applied

✅ **No Mocks/Stubs/TODOs**: All code must be production-ready with complete implementations. File organization service must handle all edge cases.

✅ **Configuration-Driven Design**: All file paths, base directories, and naming patterns must come from environment variables with Pydantic validation. No hardcoded paths.

✅ **File Size Compliance**: All source files must be under 200 lines. Break large files into focused modules (path_resolver.py, directory_manager.py, file_organizer.py, etc.).

✅ **Dependency Injection**: File Organization Service receives base directories and configuration through constructors. No inline path construction.

✅ **No Hardcoded Values**: 
- Base directories: Environment variables (ARTIFACTS_BASE_DIR, LOGS_BASE_DIR)
- Naming patterns: Configuration-driven (ENTITY_ID_MAX_LENGTH, TIMESTAMP_FORMAT)
- File extensions: Configurable (ARTIFACT_EXTENSIONS, LOG_EXTENSIONS)

✅ **Schema-Locked Mode**: 
- No DDL in code (file organization uses existing database schema)
- File metadata stored in existing InvestigationState model
- File paths stored as strings in JSON fields

### Constitutional Compliance Status

✅ **PASS**: All principles satisfied. No violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/001-arranging-investigation-files/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
olorin-server/
├── app/
│   ├── service/
│   │   ├── investigation/
│   │   │   ├── file_organization_service.py    # NEW: Central file organization service
│   │   │   ├── workspace_registry.py            # NEW: SQLite registry management
│   │   │   ├── manifest_generator.py            # NEW: Generate manifest.json files
│   │   │   ├── file_importer.py                 # NEW: Import existing logs/artifacts
│   │   │   ├── audit_logger.py                 # NEW: Immutable audit log management
│   │   │   ├── intel_connector_manager.py      # NEW: Pluggable external intel connectors
│   │   │   ├── linter_service.py               # NEW: Quality gate validation
│   │   │   ├── backup_service.py                # NEW: Scheduled backups and restore
│   │   │   ├── rbac_service.py                 # NEW: Role-based access control
│   │   │   ├── path_resolver.py                 # NEW: Path resolution utilities
│   │   │   ├── directory_manager.py            # NEW: Directory creation and management
│   │   │   ├── entity_normalizer.py             # NEW: Entity ID normalization
│   │   │   ├── file_locker.py                  # NEW: File locking with retry (OS locks + SQLite)
│   │   │   ├── symlink_manager.py              # NEW: Symlink creation with indexed view fallback
│   │   │   ├── artifact_persistence.py          # MODIFY: Use file organization service
│   │   │   ├── auto_comparison.py                # MODIFY: Use file organization service
│   │   │   └── investigation_transaction_mapper.py  # MODIFY: Use file organization service
│   │   ├── logging/
│   │   │   ├── investigation_folder_manager.py  # MODIFY: Integrate with file organization service
│   │   │   └── autonomous_investigation_logger.py  # MODIFY: Use unified paths
│   │   └── reporting/
│   │       ├── startup_report_generator.py      # MODIFY: Use file organization service
│   │       └── comprehensive_investigation_report.py  # MODIFY: Use unified paths
│   ├── router/
│   │   └── workspace_api.py                     # NEW: REST API wrapper for CLI
│   └── config/
│       ├── file_organization_config.py          # NEW: Configuration models
│       └── workspace_config.py                  # NEW: Workspace configuration (olorin.toml)
├── cli/
│   └── olor.py                                  # NEW: CLI tool for workspace management
├── scripts/
│   └── migrate_investigation_files.py           # NEW: Migration utility
├── workspace/                                   # NEW: Default workspace directory
│   ├── investigations/
│   ├── comparisons/
│   ├── reports/
│   └── registry/
│       └── registry.sqlite
└── tests/
    ├── unit/
    │   └── service/
    │       └── investigation/
    │           ├── test_file_organization_service.py
    │           ├── test_path_resolver.py
    │           ├── test_directory_manager.py
    │           ├── test_entity_normalizer.py
    │           ├── test_workspace_registry.py
    │           ├── test_manifest_generator.py
    │           ├── test_file_importer.py
    │           ├── test_linter_service.py
    │           ├── test_file_locker.py
    │           └── test_symlink_manager.py
    ├── integration/
    │   ├── test_file_organization_integration.py
    │   ├── test_registry_performance.py
    │   ├── test_import_rollback.py
    │   └── test_cli_contracts.py
    └── property/
        └── test_entity_normalizer_property.py   # NEW: Property-based tests with Hypothesis
```

**Structure Decision**: Backend service structure. The file organization system is integrated into the existing `app/service/investigation/` directory structure. New service modules are created as focused, single-responsibility files under 200 lines each. Configuration is separated into `app/config/` following existing patterns. Migration utilities are placed in `scripts/` directory. CLI tool is placed in `cli/` directory at repository root. Workspace directory structure is created at runtime.

## Execution Flow

### Step 1: Load Feature Spec ✅
- ✅ Feature spec loaded from `/Users/gklainert/Documents/olorin/specs/001-arranging-investigation-files/spec.md`
- ✅ Analyzed 7 user stories (4 P1, 3 P2)
- ✅ Identified 91 functional requirements
- ✅ Reviewed 23 success criteria
- ✅ Noted 20 edge cases
- ✅ Integrated 5 clarifications from clarification session

### Step 2: Fill Technical Context ✅
- ✅ Language: Python 3.11+
- ✅ Dependencies: FastAPI, Pathlib, Pydantic, SQLite3, Click, Hypothesis, prometheus-client
- ✅ Storage: Filesystem + SQLite + PostgreSQL + Config file + Audit log
- ✅ Performance goals defined
- ✅ Constraints identified (including 30-day migration period, file locking strategy)
- ✅ Scale/scope documented

### Step 3: Fill Constitution Check ✅
- ✅ Reviewed constitutional principles from existing plans
- ✅ Verified compliance with all principles
- ✅ No violations identified
- ✅ Status: PASS

### Step 4: Fill Project Structure ✅
- ✅ Documented file structure
- ✅ Identified new files to create (including file_locker.py, symlink_manager.py)
- ✅ Identified existing files to modify
- ✅ Structure decision documented

### Step 5: Execute Phase 0 → research.md
**Status**: ✅ COMPLETE
- ✅ Created comprehensive research document mapping all file locations
- ✅ Identified 8 file creation locations with inconsistent patterns
- ✅ Documented gap analysis and technical decisions
- ✅ Defined integration points and risk assessment

### Step 6: Execute Phase 1 → data-model.md, contracts/, quickstart.md
**Status**: ✅ COMPLETE
- ✅ Created data-model.md with configuration models, path structures, and validation rules
- ✅ Created contracts/file_organization_service.md with service contract specifications
- ✅ Created quickstart.md with usage examples and integration patterns

### Step 7: Re-evaluate Constitution Check
**Status**: ✅ COMPLETE
- ✅ Re-evaluated after Phase 1 design
- ✅ All constitutional principles still satisfied
- ✅ No violations identified
- ✅ Design follows configuration-driven, no-hardcoded-values principles

### Step 8: Plan Phase 2 → tasks.md
**Status**: ✅ COMPLETE
- ✅ Tasks.md generated via `/speckit.tasks` command
- ✅ Tasks organized by user story and implementation phase
- ✅ Each task references specific files and requirements

### Step 9: STOP - Ready for implementation
**Status**: ✅ COMPLETE

## Progress Tracking

- [x] Step 1: Load feature spec
- [x] Step 2: Fill Technical Context
- [x] Step 3: Fill Constitution Check
- [x] Step 4: Fill Project Structure
- [x] Step 5: Execute Phase 0 → research.md
- [x] Step 6: Execute Phase 1 → data-model.md, contracts/, quickstart.md
- [x] Step 7: Re-evaluate Constitution Check
- [x] Step 8: Plan Phase 2 → tasks.md (complete)
- [x] Step 9: STOP - Ready for implementation

## Additional Technical Decisions

### Workspace Structure Decision

**Decision**: Use hybrid approach - Date-based canonical storage (`investigations/<YYYY>/<MM>/<inv_id>/`) with date-grouped entity-based artifact views (`artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>`)

**Rationale**: 
- Date-based canonical organization prevents directory bloat and enables lifecycle management
- Date-grouped entity views scale cleanly, easier to browse, natural retention/archival by month
- Entity information stored in registry and manifest.json for querying
- Symlinks/indexed views provide analyst speed while maintaining single source of truth

**Trade-offs**:
- Entity-based queries require registry lookup (acceptable with indexed registry)
- Symlink creation may fail on Windows/network mounts (mitigated by indexed view fallback)

### Registry Database Decision

**Decision**: Use SQLite instead of PostgreSQL for registry

**Rationale**:
- Lightweight, no separate database server required
- Sufficient for investigation/file indexing use case
- Supports concurrent reads (WAL mode)
- Easy backup (single file)
- Can be embedded in workspace directory

**Trade-offs**:
- Limited concurrent writes (acceptable for this use case)
- No distributed access (workspace is local)

### Dual ID Format Support

**Decision**: Support both `inv_*`/`cmp_*` (folder-first) and `investigation_*`/`comparison_*` (file-first) naming

**Rationale**:
- Backward compatibility with existing file names
- Folder-first format is shorter and cleaner
- File-first format matches existing patterns
- Normalizer maps between formats automatically

**Implementation**:
- Primary format: `inv_YYYYMMDD_HHMMSS_slug` / `cmp_YYYYMMDD_HHMMSS_slug`
- Legacy format: `investigation_*` / `comparison_*` (mapped via normalizer)
- Registry stores both formats for lookup

### SQLite Indexing Strategy

**Decision**: Use optimized indexes and PRAGMA settings for < 50ms query latency

**Implementation**:
- Primary indexes: `investigations(investigation_id)`, `investigations(entity_ids)`, `investigations(trigger_source, created_at)`, `files(investigation_id, kind)`, `comparisons(left_investigation, right_investigation)`
- Composite indexes: `investigations(trigger_source, created_at, status)` for common queries
- Full-text search: FTS5 virtual table for investigation titles and tags
- WAL mode: Enabled for concurrent reads
- PRAGMA settings: `journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-64000` (64MB), `temp_store=MEMORY`

### File Locking Strategy

**Decision**: Use OS-level file locking with retry and sequence numbering

**Implementation**:
- OS locks: POSIX fcntl (Linux/macOS), Windows LockFileEx
- Retry with exponential backoff and jitter on lock failure
- On repeated conflicts, append sequence number to filename (`name__seqN.ext`)
- Mirror locking in SQLite registry using BEGIN IMMEDIATE transaction to keep registry and files in sync

### Symlink Management Strategy

**Decision**: Hybrid symlinks/indexed views with auto-fallback

**Implementation**:
- Create symlinks where filesystem supports them (fast access, human-friendly)
- Auto-fallback to indexed views for Windows/network mounts where symlinks break
- Registry drives complex lookups/dedupe/provenance
- UI exposes both "Open folder" (symlink) and "Open virtual view" (registry query)
- Registry maintains conflict checks (hash/size) while symlinks are presentation-only

### Migration Period Decision

**Decision**: 30-day migration period with configurable extension

**Rationale**:
- Short migration window for faster cleanup
- After period, legacy paths become read-only
- Configurable extension available if needed

## Security & Compliance

### Encryption

- **At Rest**: Registry database and sensitive artifacts encrypted using configurable encryption keys
- **In Transit**: All file operations and API communications use TLS 1.3+
- **Key Management**: Integration with key management service (Vault, AWS KMS) or secure local storage

### PII Handling

- **Redaction**: Automatic redaction/masking of PII in logs and artifacts based on data classification policies
- **Access Control**: RBAC enforcement for sensitive investigations
- **Audit Trail**: All PII access logged to audit trail

### Retention & Archival

- **Retention Windows**: Configurable policies (default: 90 days retention, 365 days archival, 730 days deletion)
- **Auto-Archival**: Investigations older than retention window automatically archived
- **Soft Delete**: Optional soft-delete with audit period retention
- **Purge Policies**: Large artifacts (models, images, traces) purged based on age and size thresholds

## Backup & Disaster Recovery

### Backup Procedures

- **Registry**: Daily snapshots with 30-day retention
- **Reports**: Incremental backups with configurable retention
- **Verification**: Hash validation and file count verification after backup
- **Audit**: All backup operations logged to audit trail

### Restore Procedures

- **Integrity Verification**: Hash validation, file count verification
- **Documentation**: Documented restore procedures for registry and reports
- **DR Drills**: Quarterly disaster recovery drills with documented procedures

## Observability & Monitoring

### Metrics (Prometheus)

- `import_throughput_files_per_min` (gauge)
- `registry_size_bytes` (gauge)
- `registry_record_count` (gauge)
- `query_latency_seconds` (histogram)
- `failed_writes_total` (counter)
- `import_backlog_count` (gauge)

### Alerting Rules

- Registry size > 10GB or > 1M records
- Query latency p95 > 50ms
- Failed writes > 0.1% of total operations
- Import backlog > 10,000 pending files

### Logging

- Structured JSON logging for all operations
- Fields: `operation_type`, `duration_ms`, `success`, `error_message` (if failed), `resource_ids`
- Log levels: DEBUG (detailed), INFO (operations), WARNING (degraded), ERROR (failures)

## Quality Gates & Linters

### Linter Rules

1. **Risk Score Consistency**: `state.risk_score == final_risk` (fail if inconsistent)
2. **Tool Usage Validation**: `tools_used > 0` implies `len(tool_results) > 0` (fail if empty)
3. **End Time Check**: `end_time` must be present before report finalize (fail if missing)

### Implementation

- Configurable severity (warn vs fail)
- Pre-commit hooks or CI/CD integration
- Failed checks logged to audit trail
- Report generation blocked until resolved

## External Intel Connectors

### Connector Framework

- Pluggable interface for external intelligence sources
- Supported connectors: IP reputation (AbuseIPDB, VirusTotal), device fingerprint (FingerprintJS, deviceAtlas), email rep/breach (HaveIBeenPwned, emailrep.io)
- Caching with TTL to avoid rate limits
- Confidence tracking for missing intel data

### Integration

- Investigations with `risk_score >= 0.7` marked as requiring external intel
- Missing intel data flagged as lower confidence
- Results cached in registry with expiration

## RBAC Implementation

### Roles

- **Analyst**: Read investigations, create comparisons
- **Reviewer**: Read/write investigations, approve reports
- **Admin**: Full access, manage workspace

### Visibility Controls

- Asset-level visibility: private/shared/public
- Ownership model: investigations owned by creator, transferable by admins
- Enforcement: CLI and API level permission checks

## API Wrapper

### Endpoints

- `POST /api/v1/investigations` - Create investigation
- `GET /api/v1/investigations/{id}` - Get investigation
- `POST /api/v1/investigations/{id}/files` - Add file to investigation
- `GET /api/v1/files` - List files (paginated)
- `POST /api/v1/comparisons` - Create comparison
- `GET /api/v1/comparisons/{id}` - Get comparison
- `POST /api/v1/reports/generate` - Generate report

### Authentication & Authorization

- JWT tokens or API keys for authentication
- RBAC enforcement matching CLI behavior
- Consistent JSON responses with error handling
- Pagination for list endpoints

## Template Versioning

### Version Management

- Semantic versioning: MAJOR.MINOR.PATCH
- Template version embedded in generated reports
- Model/tool versions embedded in investigation manifests
- Template rollback support for previous versions

## Auto-Comparison Integration

### Flow

1. Scheduler identifies top risky entities from risk analyzer
2. Auto-comparison service creates comparison investigations for each entity
3. Comparison results generate `cmp_*` manifests with links to source investigations
4. Manifests registered in registry with trigger_source="startup" or "scheduled"
5. Reports generated using same template system as manual comparisons

## Complexity Tracking

> **No constitutional violations identified. Complexity tracking not required.**
