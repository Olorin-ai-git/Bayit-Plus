# Suggested Modifications: Integrating Operating Model

**Date**: 2025-11-14  
**Based on**: `olorin_investigation_workspace_integrated_operating_model.md`

## Summary of Key Additions

The operating model introduces several important concepts that should be integrated into the spec and plan:

1. **Workspace Structure**: Date-based organization (YYYY/MM) with canonical folder layout
2. **SQLite Registry**: Indexing and cataloging system for investigations, files, and comparisons
3. **CLI Tool (`olor.py`)**: Unified command-line interface for workspace management
4. **Manifest Schema**: JSON manifests for investigations and comparisons
5. **Dual ID Support**: Support for both `inv_*`/`cmp_*` (folder-first) and `investigation_*`/`comparison_*` (file-first) naming
6. **Configuration File**: `olorin.toml` as single source of truth for paths and templates
7. **Ingestion/Import**: Automated import of existing logs/artifacts with deduplication
8. **Enhanced Migration**: More comprehensive migration strategy with dry-run support

---

## Suggested Modifications to spec.md

### 1. Add New User Story: Workspace Registry and Cataloging (Priority: P1)

**Add after User Story 5**:

```markdown
### User Story 6 - Investigation Registry and Cataloging (Priority: P1)

As a security analyst or developer, I want all investigations, files, and comparisons to be indexed in a searchable registry so that I can quickly find, query, and report on investigation data across the entire workspace.

**Why this priority**: Without a registry, finding investigations requires filesystem traversal which is slow and error-prone at scale. A registry enables fast queries, deduplication, and comprehensive reporting.

**Independent Test**: Can be fully tested by creating investigations, running import, and querying the registry for investigations by entity, date range, or trigger source. Delivers immediate value by enabling fast search and reporting capabilities.

**Acceptance Scenarios**:

1. **Given** investigations are created, **When** files are added, **Then** all files are indexed in the SQLite registry with SHA256 hashes for deduplication
2. **Given** I need to find investigations by entity, **When** I query the registry, **Then** I can retrieve all investigations for that entity with file paths and metadata
3. **Given** I import existing logs/artifacts, **When** import completes, **Then** all files are indexed and linked to investigations (or auto-created investigations)
4. **Given** I need to generate a report on all investigations, **When** I query the registry, **Then** I can retrieve aggregated statistics and file counts
```

### 2. Add New User Story: CLI Workspace Management (Priority: P2)

**Add after User Story 6**:

```markdown
### User Story 7 - CLI Workspace Management (Priority: P2)

As a developer or operations engineer, I want a unified CLI tool to manage the investigation workspace so that I can bootstrap workspaces, import files, create investigations, and generate reports from the command line.

**Why this priority**: CLI enables automation, scripting, and integration with other tools. While not immediately critical, it significantly enhances operational capabilities.

**Independent Test**: Can be fully tested by running CLI commands to init workspace, create investigation, add files, and generate reports. Delivers value by enabling automation and integration.

**Acceptance Scenarios**:

1. **Given** I want to set up a new workspace, **When** I run `olor init`, **Then** workspace structure is created with registry database
2. **Given** I have existing logs/artifacts, **When** I run `olor import-logs --dry-run`, **Then** I see a preview of how files will be organized
3. **Given** I run `olor import-logs`, **When** import completes, **Then** files are organized and indexed in the registry
4. **Given** I create an investigation via CLI, **When** I add files and generate reports, **Then** all operations update the registry and follow path templates
```

### 3. Enhance Functional Requirements

**Add to Functional Requirements section**:

```markdown
- **FR-021**: System MUST maintain a SQLite registry database indexing all investigations, files, and comparisons with metadata (investigation_id, file paths, SHA256 hashes, timestamps, entity_ids)
- **FR-022**: System MUST support dual ID formats: folder-first (`inv_YYYYMMDD_HHMMSS_slug`) and file-first (`investigation_*`) with automatic mapping via normalizer
- **FR-023**: System MUST generate manifest.json files for each investigation containing investigation facts (type, graph_type, trigger_source, tags, entity_ids, metrics)
- **FR-024**: System MUST generate manifest.json files for comparisons linking two investigation IDs with metadata
- **FR-025**: System MUST support workspace structure with date-based organization: `investigations/<YYYY>/<MM>/<inv_id>/` and `comparisons/<YYYY>/<MM>/<cmp_id>/`
- **FR-026**: System MUST provide CLI tool (`olor.py`) with commands: `init`, `new`, `add-file`, `report`, `compare`, `import-logs`, `ls`, `show`, `index`
- **FR-027**: System MUST support configuration file (`olorin.toml`) as single source of truth for path templates, normalization rules, and default settings
- **FR-028**: System MUST calculate SHA256 hashes for all files to enable deduplication and integrity verification
- **FR-029**: System MUST support import strategies: `--copy`, `--move`, `--link` for migrating existing files
- **FR-030**: System MUST support dry-run mode for import operations to preview changes before execution
```

### 4. Add New Key Entity

**Add to Key Entities section**:

```markdown
- **Workspace Registry**: SQLite database indexing investigations, files, and comparisons. Key tables: `investigations` (id, title, type, graph_type, trigger_source, tags, entity_ids, timestamps), `files` (investigation_id, path, kind, sha256, size, mime, relpath), `comparisons` (id, left_investigation, right_investigation, title, notes, timestamps)
- **Investigation Manifest**: JSON file (`manifest.json`) in each investigation folder containing investigation facts, metadata, and file references
- **Comparison Manifest**: JSON file (`manifest.json`) in each comparison folder linking two investigations with metadata
- **CLI Tool (`olor.py`)**: Command-line interface for workspace management, file import, investigation creation, and report generation
- **Workspace Configuration (`olorin.toml`)**: Configuration file defining path templates, normalization rules, default graph types per trigger, and workspace settings
```

### 5. Enhance Success Criteria

**Add to Success Criteria section**:

```markdown
- **SC-011**: Registry indexes 100% of investigations, files, and comparisons with complete metadata
- **SC-012**: Registry queries return results in < 50ms for entity-based searches
- **SC-013**: CLI commands complete successfully with proper error handling and logging
- **SC-014**: Import operation successfully organizes 100% of existing files without data loss
- **SC-015**: Manifest files are generated for 100% of investigations and comparisons
- **SC-016**: Dual ID format support enables backward compatibility with existing file names
- **SC-017**: Configuration file (`olorin.toml`) is used as single source of truth for all path resolution
```

---

## Suggested Modifications to plan.md

### 1. Update Summary

**Replace current summary with**:

```markdown
## Summary

Create a unified file organization system for investigation-related files (investigations, comparisons, reports, logs) that consolidates scattered files across multiple locations into a consistent, hierarchical workspace structure. The system includes:

1. **Workspace Structure**: Date-based organization (`investigations/<YYYY>/<MM>/<inv_id>/`) with canonical folder layout
2. **File Organization Service**: Centralized path resolution and directory management
3. **SQLite Registry**: Indexing and cataloging system for fast queries and deduplication
4. **CLI Tool**: Unified command-line interface (`olor.py`) for workspace management
5. **Manifest System**: JSON manifests for investigations and comparisons
6. **Configuration File**: `olorin.toml` as single source of truth for paths and templates
7. **Import/Ingestion**: Automated import of existing logs/artifacts with dry-run support

The system supports startup analysis flow, script-triggered investigations, UI-triggered investigations, and UI-triggered comparisons, with extensibility for future augmentations (RBAC, storage backends, plugin detectors).
```

### 2. Update Technical Context

**Add to Storage section**:

```markdown
**Storage**: 
- Filesystem (workspace structure with date-based organization)
- SQLite registry database (investigations, files, comparisons indexing)
- PostgreSQL (investigation metadata - existing)
- Configuration file (`olorin.toml`) for path templates and settings
```

**Add to Primary Dependencies**:

```markdown
**Primary Dependencies**: FastAPI, Pathlib, Pydantic, SQLAlchemy, SQLite3, Click (for CLI), hashlib (for SHA256)
```

**Add to Constraints**:

```markdown
- SQLite registry must support concurrent reads (WAL mode)
- CLI tool must be dependency-light (minimal external dependencies)
- Configuration file must support environment variable overrides
- Manifest files must be valid JSON and follow schema
```

**Add to Scale/Scope**:

```markdown
- Registry must support 100,000+ investigations
- Registry queries must complete in < 50ms
- CLI operations must complete in < 5 seconds for typical operations
- Import operation must handle 10,000+ files efficiently
```

### 3. Update Project Structure

**Add to Source Code structure**:

```text
olorin-server/
├── app/
│   ├── service/
│   │   ├── investigation/
│   │   │   ├── file_organization_service.py    # NEW: Central file organization service
│   │   │   ├── workspace_registry.py            # NEW: SQLite registry management
│   │   │   ├── manifest_generator.py            # NEW: Generate manifest.json files
│   │   │   ├── file_importer.py                 # NEW: Import existing logs/artifacts
│   │   │   ├── path_resolver.py                 # NEW: Path resolution utilities
│   │   │   ├── directory_manager.py             # NEW: Directory creation and management
│   │   │   ├── entity_normalizer.py             # NEW: Entity ID normalization
│   │   │   └── [existing files...]
│   │   └── [existing services...]
│   └── config/
│       └── workspace_config.py                  # NEW: Workspace configuration (olorin.toml)
├── cli/
│   └── olor.py                                  # NEW: CLI tool for workspace management
├── scripts/
│   └── migrate_investigation_files.py           # NEW: Migration utility
└── workspace/                                   # NEW: Default workspace directory
    ├── investigations/
    ├── comparisons/
    ├── reports/
    └── registry/
        └── registry.sqlite
```

### 4. Add New Technical Decisions

**Add new section after Project Structure**:

```markdown
## Additional Technical Decisions

### Workspace Structure Decision

**Decision**: Use date-based organization (`investigations/<YYYY>/<MM>/<inv_id>/`) instead of entity-based (`investigations/<entity_type>/<entity_id>/`)

**Rationale**: 
- Date-based organization prevents directory bloat (some entities have many investigations)
- Easier to archive old investigations by date
- Better performance for date-range queries
- Entity information stored in registry and manifest.json for querying

**Trade-offs**:
- Entity-based queries require registry lookup (acceptable with indexed registry)
- Slightly longer paths (mitigated by short folder names)

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
```

### 5. Update Research.md Integration

**Add note to research.md section**:

```markdown
### Operating Model Integration

The research phase identified the need for a workspace registry and CLI tool based on the integrated operating model. Key additions:

1. **SQLite Registry**: Enables fast queries and deduplication
2. **Manifest Files**: Provide investigation/comparison metadata
3. **CLI Tool**: Enables automation and integration
4. **Workspace Structure**: Date-based organization for scalability
5. **Configuration File**: Single source of truth for paths

These additions enhance the file organization system with cataloging, search, and operational capabilities.
```

### 6. Update Data Model Integration

**Add to data-model.md section**:

```markdown
### Registry Models

**WorkspaceRegistry**:
- SQLite database with tables: `investigations`, `files`, `comparisons`
- Indexes on: `investigation_id`, `entity_ids`, `trigger_source`, `created_at`
- SHA256 hashes for deduplication

**Manifest Models**:
- `InvestigationManifest`: JSON schema for investigation metadata
- `ComparisonManifest`: JSON schema for comparison metadata
```

### 7. Add Migration Strategy Enhancement

**Add new section**:

```markdown
## Enhanced Migration Strategy

### Phase 1: Workspace Bootstrap
1. Run `olor init` to create workspace structure
2. Create `olorin.toml` with path templates
3. Initialize SQLite registry

### Phase 2: Dry-Run Import
1. Run `olor import-logs --dry-run` to preview changes
2. Review import plan and adjust configuration if needed
3. Verify no data loss scenarios

### Phase 3: Execute Import
1. Choose import strategy: `--copy`, `--move`, or `--link`
2. Run `olor import-logs` to organize existing files
3. Verify registry contents and file organization

### Phase 4: Legacy Report Migration
1. Move `startup_analysis_report.html` to template path
2. Wrap legacy `comparison_*.html` in `cmp_*` folders with manifests
3. Create investigation shells for missing investigations

### Phase 5: Reindex and Verify
1. Run `olor index` to rebuild registry
2. Verify file counts and integrity
3. Test queries and reporting
```

---

## Implementation Priority

### Phase 1 (P1 - Critical)
1. File Organization Service (existing plan)
2. Workspace structure with date-based organization
3. SQLite registry with basic indexing
4. Manifest generation for investigations

### Phase 2 (P1 - Critical)
1. CLI tool (`olor.py`) with core commands (`init`, `new`, `add-file`, `index`)
2. Import functionality with dry-run support
3. Dual ID format support and mapping

### Phase 3 (P2 - Important)
1. Comparison manifest generation
2. Enhanced CLI commands (`report`, `compare`, `import-logs`, `ls`, `show`)
3. Configuration file (`olorin.toml`) support
4. Migration utility enhancements

### Phase 4 (P2 - Important)
1. RBAC support (owners, visibility)
2. Storage backend abstraction (S3/GCS support)
3. Plugin detector hooks
4. Observability and monitoring

---

## Integration Points

### Existing Services Integration

1. **FileOrganizationService**: Enhanced to support workspace structure and manifest generation
2. **InvestigationFolderManager**: Modified to create workspace-compliant folders
3. **ArtifactPersistence**: Updated to use workspace structure and register files
4. **AutoComparison**: Updated to create comparison manifests and register in registry

### New Services

1. **WorkspaceRegistry**: SQLite registry management
2. **ManifestGenerator**: Generate investigation/comparison manifests
3. **FileImporter**: Import existing logs/artifacts with deduplication
4. **CLI Tool**: Unified command-line interface

---

## Configuration File Schema (`olorin.toml`)

```toml
[workspace]
root = "./workspace"
registry_path = "registry/registry.sqlite"

[paths]
investigations = "investigations/{yyyy}/{mm}/{inv_id}"
comparisons = "comparisons/{yyyy}/{mm}/{cmp_id}"
reports = "reports/{category}/{timestamp}"
startup_reports = "reports/startup/{date}/startup_{date}.html"

[id]
format = "inv_{date}_{time}_{slug}"  # or "investigation_{entity_type}_{entity_id}_{date_range}"
slug_max = 48
allowed_chars = "A-Za-z0-9-_"
normalize_dots = true
normalize_at = true

[registry]
enable_sha256 = true
enable_deduplication = true
index_entity_ids = true

[graph]
default_startup = "hybrid"
default_script = "clean"
default_ui = "hybrid"

[import]
default_strategy = "copy"  # copy, move, link
dry_run_default = true
create_auto_investigations = true
```

---

---

## Critical Missing Pieces (Additional Modifications)

### 1. Privacy, Retention, and Security Baselines

**Add to Functional Requirements**:

```markdown
- **FR-036**: System MUST handle PII and secrets according to data classification policies, with redaction/masking capabilities for sensitive data in logs and artifacts
- **FR-037**: System MUST support encryption at rest for registry database and sensitive artifacts (configurable encryption keys)
- **FR-038**: System MUST support encryption in transit for all file operations and API communications (TLS 1.3+)
- **FR-039**: System MUST enforce retention windows with configurable policies (e.g., investigations older than 90 days auto-archive, 365 days auto-delete)
- **FR-040**: System MUST provide secure key management for encryption keys (integration with key management service or secure key storage)
- **FR-041**: System MUST support data deletion workflows with audit trail and optional soft-delete (mark as deleted, retain for audit period)
```

**Add to Key Entities**:

```markdown
- **Retention Policy**: Defines retention windows, archival rules, and deletion policies for investigations, files, and comparisons. Key attributes: retention_days, archival_days, deletion_days, policy_type (hard/soft delete)
- **Security Configuration**: Defines encryption settings, PII handling rules, and access controls. Key attributes: encryption_at_rest, encryption_in_transit, pii_redaction_rules, key_management_service
```

### 2. Audit Trail & Provenance

**Add to Functional Requirements**:

```markdown
- **FR-042**: System MUST maintain an immutable audit log for all create/update/delete operations on manifests, imports, comparisons, and report generation
- **FR-043**: Audit log MUST include: operation type, user/service identifier, timestamp, resource ID, before/after state (for updates), and operation result
- **FR-044**: Audit log MUST be stored separately from registry (append-only file or separate audit table) and protected from tampering
- **FR-045**: System MUST support audit log queries by user, resource, operation type, and time range
- **FR-046**: System MUST embed provenance information in manifests (who created/modified, when, from which trigger source, using which tools/models)
```

**Add to Key Entities**:

```markdown
- **Audit Log Entry**: Represents an immutable audit record. Key attributes: operation_type, user_id, service_id, timestamp, resource_type, resource_id, before_state, after_state, result, ip_address
- **Provenance Metadata**: Embedded in manifests, tracks creation/modification history. Key attributes: created_by, created_at, modified_by, modified_at, trigger_source, tool_versions, model_versions
```

### 3. External Intel Connectors

**Add to Functional Requirements**:

```markdown
- **FR-047**: System MUST provide pluggable connector framework for external intelligence sources (IP reputation, device fingerprint scoring, email reputation/breach databases)
- **FR-048**: System MUST mark investigations as requiring external intel when high-risk indicators are detected (risk_score >= 0.7)
- **FR-049**: System MUST track confidence scores and flag investigations with missing external intel data as lower confidence
- **FR-050**: System MUST support connector stubs for: IP reputation (AbuseIPDB, VirusTotal), device fingerprint scoring (FingerprintJS, deviceAtlas), email reputation/breach (HaveIBeenPwned, emailrep.io)
- **FR-051**: System MUST cache external intel results in registry with TTL to avoid rate limits
```

**Add to Key Entities**:

```markdown
- **External Intel Connector**: Pluggable interface for external intelligence sources. Key attributes: connector_type, connector_name, enabled, cache_ttl, rate_limit, api_key_config
- **Intel Result**: Cached external intelligence data. Key attributes: entity_type, entity_id, connector_type, result_data, confidence_score, cached_at, expires_at
```

### 4. Quality Gates / Linters in Pipeline

**Add to Functional Requirements**:

```markdown
- **FR-052**: Pipeline MUST enforce linter gates that fail builds/investigations if: (a) state.risk_score != final_risk (inconsistency check), (b) tools_used > 0 but tool_results is empty, (c) end_time missing before report finalize
- **FR-053**: Linter gates MUST be configurable (warn vs fail) and report specific validation errors
- **FR-054**: System MUST provide pre-commit hooks or CI/CD integration for linter validation
- **FR-055**: Failed linter checks MUST be logged to audit trail and prevent report generation until resolved
```

**Add to Key Entities**:

```markdown
- **Linter Rule**: Defines validation rules for investigations. Key attributes: rule_name, rule_type (consistency/required_field/completeness), severity (warn/fail), validation_function, error_message_template
- **Linter Result**: Result of linter validation. Key attributes: investigation_id, rule_name, passed, error_message, timestamp
```

### 5. Observability Details (Concrete SLOs)

**Add to Success Criteria**:

```markdown
- **SC-018**: Registry query latency p95 < 50ms, p99 < 100ms for entity-based searches
- **SC-019**: Import throughput > 1000 files/minute for typical file sizes (< 10MB)
- **SC-020**: Registry size monitoring with alerts when > 10GB or > 1M records
- **SC-021**: Failed write operations < 0.1% of total operations
- **SC-022**: Import backlog monitoring with alerts when > 10,000 pending files
- **SC-023**: All critical operations emit metrics (Prometheus format) and logs (structured JSON)
```

**Add to Functional Requirements**:

```markdown
- **FR-056**: System MUST expose Prometheus metrics for: import_throughput_files_per_min, registry_size_bytes, registry_record_count, query_latency_seconds (histogram), failed_writes_total, import_backlog_count
- **FR-057**: System MUST provide alerting rules for: registry_size > threshold, query_latency p95 > 50ms, failed_writes > 0.1%, import_backlog > threshold
- **FR-058**: System MUST log all operations with structured JSON including: operation_type, duration_ms, success, error_message (if failed), resource_ids
```

### 6. Backup/DR for Registry & Reports

**Add to Functional Requirements**:

```markdown
- **FR-059**: System MUST provide scheduled backup procedures for registry database (daily snapshots with 30-day retention)
- **FR-060**: System MUST provide backup procedures for report artifacts (incremental backups with configurable retention)
- **FR-061**: System MUST support restore procedures with integrity verification (hash validation, file count verification)
- **FR-062**: System MUST support scheduled disaster recovery drills (quarterly) with documented procedures
- **FR-063**: Backup operations MUST be logged to audit trail with backup location, size, and verification status
```

**Add to Key Entities**:

```markdown
- **Backup Record**: Tracks backup operations. Key attributes: backup_id, backup_type (registry/reports/full), backup_location, backup_size, backup_timestamp, verification_status, retention_until
```

### 7. Indexing Strategy for SQLite

**Add to Technical Context**:

```markdown
**SQLite Indexing Strategy**:
- Primary indexes: `investigations(investigation_id)`, `investigations(entity_ids)`, `investigations(trigger_source, created_at)`, `files(investigation_id, kind)`, `comparisons(left_investigation, right_investigation)`
- Composite indexes: `investigations(trigger_source, created_at, status)` for common queries
- Full-text search: FTS5 virtual table for investigation titles and tags
- WAL mode: Enabled for concurrent reads
- PRAGMA settings: `journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-64000` (64MB), `temp_store=MEMORY`
```

**Add to Functional Requirements**:

```markdown
- **FR-064**: Registry MUST use SQLite WAL mode with optimized PRAGMA settings for < 50ms query latency
- **FR-065**: Registry MUST maintain indexes on: investigation_id, entity_ids (JSON index), trigger_source, created_at, file paths, comparison links
- **FR-066**: Registry MUST support full-text search on investigation titles and tags using FTS5
```

### 8. Test Strategy & CI/CD

**Add to Technical Context**:

```markdown
**Testing Strategy**:
- **Unit Tests**: Property-based tests for entity normalizer (Hypothesis), path resolver edge cases, manifest schema validation
- **Integration Tests**: End-to-end import/rollback tests, registry query performance tests, CLI command contract tests
- **Schema Migration Tests**: Verify registry schema migrations preserve data integrity
- **CLI Contract Tests**: Verify CLI commands match expected behavior and output formats
- **Performance Tests**: Load testing for registry queries, import throughput, concurrent operations
- **Security Tests**: Encryption/decryption tests, PII redaction tests, access control tests
```

**Add to Functional Requirements**:

```markdown
- **FR-067**: System MUST include property-based tests for entity normalizer using Hypothesis (test normalization idempotency, edge cases, special characters)
- **FR-068**: System MUST include end-to-end import/rollback tests that verify import → verify → rollback → verify original state
- **FR-069**: System MUST include schema migration tests that verify data integrity after registry schema changes
- **FR-070**: System MUST include CLI contract tests that verify command output formats and error handling
- **FR-071**: CI/CD pipeline MUST run all tests including performance benchmarks before deployment
```

### 9. RBAC Specifics

**Add to Functional Requirements**:

```markdown
- **FR-072**: System MUST support role-based access control with roles: Analyst (read investigations, create comparisons), Reviewer (read/write investigations, approve reports), Admin (full access, manage workspace)
- **FR-073**: System MUST support asset-level visibility controls (investigations/comparisons can be marked private/shared/public)
- **FR-074**: System MUST enforce RBAC at CLI level (commands check user permissions before execution)
- **FR-075**: System MUST enforce RBAC at API level (endpoints verify user permissions via JWT/auth tokens)
- **FR-076**: System MUST support ownership model (investigations owned by creator, transferable by admins)
```

**Add to Key Entities**:

```markdown
- **Role**: Defines user permissions. Key attributes: role_name (Analyst/Reviewer/Admin), permissions (list of allowed operations), scope (workspace/team/global)
- **Access Control Entry**: Defines access permissions for specific resources. Key attributes: resource_type, resource_id, user_id, role, visibility (private/shared/public), granted_at, granted_by
```

### 10. API Wrapper for CLI

**Add to Functional Requirements**:

```markdown
- **FR-077**: System MUST provide REST API endpoints wrapping CLI functionality: `POST /api/v1/investigations`, `GET /api/v1/investigations/{id}`, `POST /api/v1/investigations/{id}/files`, `GET /api/v1/files`, `POST /api/v1/comparisons`, `GET /api/v1/comparisons/{id}`, `POST /api/v1/reports/generate`
- **FR-078**: API endpoints MUST authenticate requests using JWT tokens or API keys
- **FR-079**: API endpoints MUST enforce RBAC permissions matching CLI behavior
- **FR-080**: API endpoints MUST return consistent JSON responses with error handling
- **FR-081**: API MUST support pagination for list endpoints (investigations, files, comparisons)
```

**Add to Project Structure**:

```text
olorin-server/
├── app/
│   ├── router/
│   │   └── workspace_api.py          # NEW: REST API wrapper for CLI
│   └── [existing routers...]
```

### 11. Cost/Quotas & Archival

**Add to Functional Requirements**:

```markdown
- **FR-082**: System MUST support storage quotas per workspace (configurable limits, alerts at 80%/90%/100%)
- **FR-083**: System MUST support auto-archival of investigations older than retention window (move to archive storage, update registry)
- **FR-084**: System MUST support purge policies for large artifacts (models, images, traces) based on age and size thresholds
- **FR-085**: System MUST track storage usage per investigation and report in registry
- **FR-086**: System MUST provide storage usage reports and recommendations for cleanup
```

**Add to Key Entities**:

```markdown
- **Storage Quota**: Defines storage limits. Key attributes: workspace_id, quota_limit_bytes, current_usage_bytes, alert_thresholds (80/90/100%), enforcement_action (warn/block/archive)
- **Archival Policy**: Defines archival rules. Key attributes: retention_days, archival_trigger, archival_location, purge_after_days
```

### 12. Template Versioning & Report Provenance

**Add to Functional Requirements**:

```markdown
- **FR-087**: System MUST version all report templates (semantic versioning: MAJOR.MINOR.PATCH)
- **FR-088**: System MUST embed template version in generated reports (metadata section)
- **FR-089**: System MUST embed model versions (LLM model, tool versions) in investigation manifests
- **FR-090**: System MUST track which template version was used for each report generation
- **FR-091**: System MUST support template rollback to previous versions if needed
```

**Add to Key Entities**:

```markdown
- **Template Version**: Tracks report template versions. Key attributes: template_name, version (semantic), template_path, created_at, changelog, deprecated (boolean)
- **Report Provenance**: Embedded in reports, tracks generation details. Key attributes: template_version, model_versions (dict), tool_versions (dict), generated_at, generated_by
```

### 13. Auto-Comparison Service Integration

**Add to Functional Requirements**:

```markdown
- **FR-092**: System MUST integrate with auto-comparison service to create `cmp_*` manifests when scheduler triggers comparisons
- **FR-093**: Auto-comparison service MUST identify top risky entities and create comparison investigations
- **FR-094**: Auto-comparison results MUST be registered in registry with trigger_source="startup" or "scheduled"
- **FR-095**: System MUST link auto-comparison manifests to source investigations via left_investigation/right_investigation
- **FR-096**: Auto-comparison service MUST follow same workspace structure and manifest generation as manual comparisons
```

**Add to Integration Points**:

```markdown
### Auto-Comparison Service Integration

**Flow**:
1. Scheduler identifies top risky entities from risk analyzer
2. Auto-comparison service creates comparison investigations for each entity
3. Comparison results generate `cmp_*` manifests with links to source investigations
4. Manifests registered in registry with trigger_source="startup" or "scheduled"
5. Reports generated using same template system as manual comparisons
```

---

## Updated Functional Requirements (Complete List)

**Add these to spec.md Functional Requirements section** (FR-027 through FR-096 as listed above, plus the original FR-021 to FR-030 from previous section):

- **FR-021** through **FR-030**: (Already documented in previous section)
- **FR-031** through **FR-096**: (All new requirements from sections 1-13 above)

**Total**: 76 functional requirements (20 original + 56 new)

---

## Updated Success Criteria (Complete List)

**Add these to spec.md Success Criteria section**:

- **SC-011** through **SC-017**: (Already documented in previous section)
- **SC-018** through **SC-023**: (Observability SLOs from section 5 above)

**Total**: 23 success criteria (10 original + 13 new)

---

## Next Steps

1. ✅ Review and approve suggested modifications
2. **Update spec.md** with:
   - New user stories (User Story 6, 7)
   - All functional requirements (FR-021 through FR-096)
   - All success criteria (SC-011 through SC-023)
   - New key entities (Registry, Manifests, CLI, Config, Audit Log, Intel Connectors, etc.)
3. **Update plan.md** with:
   - Workspace structure and registry details
   - Indexing strategy
   - Test strategy
   - Backup/DR procedures
   - Observability SLOs
   - Security and retention policies
4. **Update data-model.md** with:
   - Registry schemas (investigations, files, comparisons, audit_log)
   - Manifest schemas (investigation, comparison)
   - Security and retention models
   - RBAC models
5. **Update research.md** with:
   - Operating model integration notes
   - Security and compliance requirements
   - External intel connector requirements
6. **Generate tasks.md** with new implementation tasks organized by priority

