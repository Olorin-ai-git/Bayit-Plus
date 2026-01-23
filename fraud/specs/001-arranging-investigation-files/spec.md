# Feature Specification: Arranging Investigation Files

**Feature Branch**: `001-arranging-investigation-files`  
**Created**: 2025-11-14  
**Status**: Draft  
**Input**: User description: "arranging investigation files. we have too many investigation related files in too many location.sacn alll the codebase to where investigation related files (including comparisons that use investigations) are created check /logs folder and subfolders, check /artifacts and subfolder and map everything. examine existing server side of the reports spec feature which is already implemented. utilize it to create a full solution both for startup analysis flow, script triggered investagions, ui triggered investigations and ui triggered comparisons and also infrastructure for future augmentations"

## Clarifications

### Session 2025-11-14

- Q: Workspace structure organization pattern - entity-based vs date-based vs hybrid? → A: Hybrid approach - Date-based canonical storage (`investigations/<YYYY>/<MM>/<inv_id>/`) for lifecycle management, entity-based artifact views (`artifacts/<entity_type>/<entity_id>/...`) as symlinks/indexed views for analyst speed, registry.sqlite cross-indexes by entity and time
- Q: Entity-based artifact views implementation - symlinks vs indexed views vs hybrid? → A: Hybrid - Create symlinks where filesystem supports them (fast access, human-friendly), auto-fallback to indexed views for Windows/network mounts where symlinks break, registry drives complex lookups/dedupe/provenance, UI exposes both "Open folder" (symlink) and "Open virtual view" (registry query), registry maintains conflict checks (hash/size) while symlinks are presentation-only
- Q: Concurrent file write conflict resolution strategy? → A: File locking with retry - Use OS locks (POSIX fcntl, Windows LockFileEx), back off with jitter, on repeated conflicts write name__seqN.ext, mirror in SQLite with BEGIN IMMEDIATE transaction to keep registry and files in sync
- Q: Entity-based artifact view path structure - flat vs mirrored vs date-grouped? → A: Date-grouped - `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>` (links or indexed views to canonical files), scales cleanly, easier to browse, natural retention/archival by month, plays well with time-range queries
- Q: Migration period duration for backward compatibility with legacy file paths? → A: 30 days - Short migration window for faster cleanup, after which legacy paths become read-only

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified File Organization for Startup Analysis Flow (Priority: P1)

As a security analyst, I want all investigation files from the startup analysis flow to be organized in a consistent, predictable location structure so that I can easily find and access investigation artifacts, comparison reports, and analysis summaries.

**Why this priority**: The startup analysis flow is a critical automated process that generates multiple types of files (investigations, comparisons, startup reports, zip packages). Without proper organization, these files are scattered across multiple locations making them difficult to locate and manage. This is foundational for all other file organization needs.

**Independent Test**: Can be fully tested by starting the server, waiting for startup analysis to complete, and verifying that all generated files are organized in the correct hierarchical structure under `artifacts/startup_analysis/{timestamp}/`. Delivers immediate value by providing a single location for all startup-related investigation artifacts.

**Acceptance Scenarios**:

1. **Given** the server starts and performs startup analysis, **When** investigations complete, **Then** all investigation artifacts (JSON, HTML) are saved to canonical location `investigations/<YYYY>/<MM>/<inv_id>/` and accessible via date-grouped entity-based views `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>` (symlinks where supported, auto-fallback to indexed views for Windows/network mounts) with consistent naming
2. **Given** startup analysis generates comparison reports, **When** comparisons complete, **Then** all comparison reports are saved to `artifacts/comparisons/auto_startup/{timestamp}/` with clear naming
3. **Given** startup analysis generates a startup report, **When** the report is created, **Then** it is saved to `artifacts/reports/startup/{timestamp}/` and referenced in comparison packages
4. **Given** startup analysis creates a zip package, **When** packaging completes, **Then** the zip file is saved to `artifacts/comparisons/auto_startup/{timestamp}/` and contains all related files in a logical structure
5. **Given** I need to find a specific startup analysis result, **When** I navigate to `artifacts/startup_analysis/{timestamp}/`, **Then** I can find all related files (investigations, comparisons, reports, zip) in one location

---

### User Story 2 - Unified File Organization for Script-Triggered Investigations (Priority: P1)

As a developer or security analyst, I want investigation files created by scripts to follow the same organizational structure as other investigation types so that all investigations are consistently organized regardless of their trigger source.

**Why this priority**: Script-triggered investigations are a common use case for automated testing, batch processing, and custom workflows. They must follow the same organizational principles as other investigation types to maintain consistency across the system.

**Independent Test**: Can be fully tested by running a script that triggers an investigation and verifying that all generated files (logs, artifacts, reports) are saved to the correct locations matching the unified structure. Delivers value by ensuring script-based workflows integrate seamlessly with the file organization system.

**Acceptance Scenarios**:

1. **Given** a script triggers an investigation via API or direct service call, **When** the investigation completes, **Then** investigation logs are saved to `logs/investigations/{MODE}_{investigation_id}_{timestamp}/` with all standard files (metadata.json, investigation.log, structured_activities.jsonl, etc.)
2. **Given** a script-triggered investigation generates artifacts, **When** artifacts are persisted, **Then** they are saved to canonical location `investigations/<YYYY>/<MM>/<inv_id>/` and accessible via date-grouped entity-based views `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>` (symlinks where supported, auto-fallback to indexed views) following the same naming convention as other investigations
3. **Given** a script generates a comprehensive report for an investigation, **When** the report is created, **Then** it is saved alongside investigation artifacts in the appropriate location
4. **Given** I need to locate a script-triggered investigation, **When** I search by investigation_id or entity, **Then** I can find all related files using the unified organizational structure

---

### User Story 3 - Unified File Organization for UI-Triggered Investigations (Priority: P1)

As a security analyst using the web UI, I want investigation files created through the UI to be organized consistently so that I can easily access investigation results, reports, and artifacts from the UI without navigating scattered file locations.

**Why this priority**: UI-triggered investigations are the primary user-facing workflow. Users expect to be able to access investigation results and reports directly from the UI, which requires consistent file organization that the UI can reliably query and display.

**Independent Test**: Can be fully tested by creating an investigation through the UI, waiting for completion, and verifying that all files are organized correctly and accessible via UI endpoints. Delivers value by ensuring seamless integration between UI workflows and file storage.

**Acceptance Scenarios**:

1. **Given** I create an investigation through the UI, **When** the investigation completes, **Then** all investigation files are saved to the unified structure and accessible via UI endpoints
2. **Given** I view an investigation in the UI, **When** I request investigation artifacts or reports, **Then** the UI can reliably locate and serve files from the unified organizational structure
3. **Given** I generate a report for a UI-triggered investigation, **When** the report is created, **Then** it is saved to the appropriate location and linked correctly in the investigation metadata
4. **Given** I download investigation results from the UI, **When** the download is requested, **Then** all related files are packaged correctly from the unified structure

---

### User Story 4 - Unified File Organization for UI-Triggered Comparisons (Priority: P2)

As a security analyst, I want comparison reports triggered from the UI to be organized consistently with other comparison types so that I can easily find and compare investigation results across different time periods or entities.

**Why this priority**: UI-triggered comparisons are a key analytical tool. While important, they are secondary to investigation organization. Consistent organization enables users to compare results across different investigation types and sources.

**Independent Test**: Can be fully tested by triggering a comparison from the UI and verifying that comparison reports and related files are saved to `artifacts/comparisons/manual/{timestamp}/` with proper organization. Delivers value by enabling easy comparison of investigation results.

**Acceptance Scenarios**:

1. **Given** I trigger a comparison from the UI, **When** the comparison completes, **Then** the comparison report is saved to `artifacts/comparisons/manual/{timestamp}/` with clear naming
2. **Given** a UI-triggered comparison references investigations, **When** the comparison is generated, **Then** investigation artifacts are correctly linked and accessible from the comparison report
3. **Given** I need to find a previous comparison, **When** I search by timestamp or entity, **Then** I can locate the comparison report and all related files in the unified structure
4. **Given** I export comparison results from the UI, **When** the export is requested, **Then** all related files are packaged correctly from the unified structure

---

### User Story 5 - Infrastructure for Future Augmentations (Priority: P2)

As a developer, I want the file organization system to be extensible and configurable so that new investigation types, report formats, and artifact types can be added without breaking existing organization or requiring major refactoring.

**Why this priority**: The system needs to accommodate future growth and new features. While not immediately critical, extensibility prevents technical debt and enables smooth addition of new capabilities.

**Independent Test**: Can be fully tested by adding a new investigation type or report format and verifying that it integrates seamlessly with the existing organizational structure without breaking existing functionality. Delivers value by ensuring the system can evolve without major disruption.

**Acceptance Scenarios**:

1. **Given** a new investigation type is added, **When** it generates files, **Then** those files are organized using the unified structure without requiring changes to existing organization logic
2. **Given** a new report format is introduced, **When** reports are generated, **Then** they are saved to appropriate locations following existing naming conventions
3. **Given** configuration changes are needed for file organization, **When** configuration is updated, **Then** existing files remain accessible and new files follow the updated structure
4. **Given** a new artifact type is added, **When** artifacts are persisted, **Then** they integrate with the existing organizational structure without breaking existing functionality

---

### User Story 6 - Investigation Registry and Cataloging (Priority: P1)

As a security analyst or developer, I want all investigations, files, and comparisons to be indexed in a searchable registry so that I can quickly find, query, and report on investigation data across the entire workspace.

**Why this priority**: Without a registry, finding investigations requires filesystem traversal which is slow and error-prone at scale. A registry enables fast queries, deduplication, and comprehensive reporting.

**Independent Test**: Can be fully tested by creating investigations, running import, and querying the registry for investigations by entity, date range, or trigger source. Delivers immediate value by enabling fast search and reporting capabilities.

**Acceptance Scenarios**:

1. **Given** investigations are created, **When** files are added, **Then** all files are indexed in the SQLite registry with SHA256 hashes for deduplication
2. **Given** I need to find investigations by entity, **When** I query the registry, **Then** I can retrieve all investigations for that entity with file paths and metadata
3. **Given** I import existing logs/artifacts, **When** import completes, **Then** all files are indexed and linked to investigations (or auto-created investigations)
4. **Given** I need to generate a report on all investigations, **When** I query the registry, **Then** I can retrieve aggregated statistics and file counts

---

### User Story 7 - CLI Workspace Management (Priority: P2)

As a developer or operations engineer, I want a unified CLI tool to manage the investigation workspace so that I can bootstrap workspaces, import files, create investigations, and generate reports from the command line.

**Why this priority**: CLI enables automation, scripting, and integration with other tools. While not immediately critical, it significantly enhances operational capabilities.

**Independent Test**: Can be fully tested by running CLI commands to init workspace, create investigation, add files, and generate reports. Delivers value by enabling automation and integration.

**Acceptance Scenarios**:

1. **Given** I want to set up a new workspace, **When** I run `olor init`, **Then** workspace structure is created with registry database
2. **Given** I have existing logs/artifacts, **When** I run `olor import-logs --dry-run`, **Then** I see a preview of how files will be organized
3. **Given** I run `olor import-logs`, **When** import completes, **Then** files are organized and indexed in the registry
4. **Given** I create an investigation via CLI, **When** I add files and generate reports, **Then** all operations update the registry and follow path templates

---

### Edge Cases

- What happens when an investigation is triggered from multiple sources simultaneously (e.g., UI and script)?
- How does the system handle investigations with missing entity_type or entity_id?
- What happens when file paths exceed filesystem limits (e.g., very long entity IDs)?
- How does the system handle concurrent file writes to the same location? → **RESOLVED**: File locking with retry (OS locks + SQLite BEGIN IMMEDIATE) with sequence number suffix on repeated conflicts
- What happens when disk space is exhausted during file creation?
- How does the system handle investigations that fail before completing file organization?
- What happens when investigation_id conflicts occur (e.g., duplicate IDs)?
- How does the system handle legacy files that don't match the new organizational structure?
- What happens when entity IDs contain special characters that are invalid for filesystem paths?
- How does the system handle timezone differences in timestamp-based folder names?
- What happens when registry database becomes corrupted or locked?
- How does the system handle PII in investigation files during import and archival?
- What happens when encryption keys are lost or rotated?
- How does the system handle retention policy conflicts (e.g., investigation marked for deletion but referenced in comparison)?
- What happens when external intel connectors are unavailable or rate-limited?
- How does the system handle linter failures during investigation execution?
- What happens when backup operations fail or backup storage is full?
- How does the system handle RBAC permission changes for existing investigations?
- What happens when storage quota is exceeded during file creation?
- How does the system handle template version conflicts or missing templates?
- What happens when auto-comparison service fails to create manifests?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST organize investigation artifacts using hybrid structure: (1) Canonical storage: `investigations/<YYYY>/<MM>/<inv_id>/` contains manifest.json, logs, artifacts, reports; (2) Entity-based views: `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>` provides date-grouped symlinks (where filesystem supports) or indexed views (auto-fallback for Windows/network mounts) pointing to canonical artifacts for analyst speed; (3) Registry maintains conflict checks (hash/size) while symlinks are presentation-only; (4) Date-grouped structure enables natural retention/archival by month and time-range queries
- **FR-002**: System MUST organize all comparison reports under `artifacts/comparisons/{source_type}/{timestamp}/` where `source_type` is either `auto_startup` or `manual`
- **FR-003**: System MUST organize all startup analysis reports under `artifacts/reports/startup/{timestamp}/` with naming format `startup_analysis_{timestamp}.html`
- **FR-004**: System MUST organize all investigation logs under `logs/investigations/{MODE}_{investigation_id}_{timestamp}/` with standard file structure (metadata.json, investigation.log, structured_activities.jsonl, journey_tracking.json, results/, etc.)
- **FR-005**: System MUST create zip packages for comparison results under `artifacts/comparisons/{source_type}/{timestamp}/` with naming format `comparison_package_{timestamp}.zip`
- **FR-006**: System MUST normalize entity IDs for filesystem safety (replace dots with dashes, @ symbols with `-at-`, limit length) when creating directory paths
- **FR-007**: System MUST maintain backward compatibility with existing file locations during 30-day migration period, after which legacy paths become read-only (configurable extension available if needed)
- **FR-008**: System MUST provide a unified service/utility for file path resolution that all investigation and comparison code uses
- **FR-009**: System MUST generate metadata files (metadata.json) that include references to all related files (investigation artifacts, reports, comparisons)
- **FR-010**: System MUST support querying files by investigation_id, entity_type, entity_id, timestamp, or source type
- **FR-011**: System MUST create directory structures automatically when needed (mkdir -p equivalent)
- **FR-012**: System MUST handle file naming conflicts using file locking with retry: (1) Acquire OS-level exclusive lock (POSIX fcntl, Windows LockFileEx) before write; (2) Retry with exponential backoff and jitter on lock failure; (3) On repeated conflicts, append sequence number to filename (`name__seqN.ext`); (4) Mirror locking in SQLite registry using BEGIN IMMEDIATE transaction to keep registry and files in sync
- **FR-013**: System MUST log all file creation operations with location and naming details for debugging
- **FR-014**: System MUST ensure all file paths are relative to server root or configurable base directory
- **FR-015**: System MUST support both investigation_id-based and entity-based file organization simultaneously
- **FR-016**: System MUST integrate with existing Reports Microservice API endpoints for file retrieval
- **FR-017**: System MUST provide migration utilities to reorganize existing scattered files into unified structure
- **FR-018**: System MUST validate file paths before creation to prevent directory traversal and invalid characters
- **FR-019**: System MUST support configurable base directories for artifacts and logs via environment variables
- **FR-020**: System MUST maintain file permissions and ownership consistent with existing system behavior
- **FR-021**: System MUST maintain a SQLite registry database indexing all investigations, files, and comparisons with metadata (investigation_id, file paths, SHA256 hashes, timestamps, entity_ids)
- **FR-022**: System MUST support dual ID formats: folder-first (`inv_YYYYMMDD_HHMMSS_slug`) and file-first (`investigation_*`) with automatic mapping via normalizer
- **FR-023**: System MUST generate manifest.json files for each investigation containing investigation facts (type, graph_type, trigger_source, tags, entity_ids, metrics)
- **FR-024**: System MUST generate manifest.json files for comparisons linking two investigation IDs with metadata
- **FR-025**: System MUST support hybrid workspace structure: (1) Date-based canonical organization: `investigations/<YYYY>/<MM>/<inv_id>/` (contains manifest.json with entity_ids, logs, artifacts, reports) and `comparisons/<YYYY>/<MM>/<cmp_id>/`; (2) Entity-based artifact views: `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>` as date-grouped symlinks (where filesystem supports) or indexed views (auto-fallback for Windows/network mounts) pointing to canonical artifacts; (3) Registry.sqlite cross-indexes by entity and time with SHA256 hashes for deduplication; (4) UI MUST expose both "Open folder" (symlink) and "Open virtual view" (registry query) options
- **FR-026**: System MUST provide CLI tool (`olor.py`) with commands: `init`, `new`, `add-file`, `report`, `compare`, `import-logs`, `ls`, `show`, `index`
- **FR-027**: System MUST support configuration file (`olorin.toml`) as single source of truth for path templates, normalization rules, and default settings
- **FR-028**: System MUST calculate SHA256 hashes for all files to enable deduplication and integrity verification
- **FR-029**: System MUST support import strategies: `--copy`, `--move`, `--link` for migrating existing files
- **FR-030**: System MUST support dry-run mode for import operations to preview changes before execution
- **FR-031**: System MUST handle PII and secrets according to data classification policies, with redaction/masking capabilities for sensitive data in logs and artifacts
- **FR-032**: System MUST support encryption at rest for registry database and sensitive artifacts (configurable encryption keys)
- **FR-033**: System MUST support encryption in transit for all file operations and API communications (TLS 1.3+)
- **FR-034**: System MUST enforce retention windows with configurable policies (e.g., investigations older than 90 days auto-archive, 365 days auto-delete)
- **FR-035**: System MUST provide secure key management for encryption keys (integration with key management service or secure key storage)
- **FR-036**: System MUST support data deletion workflows with audit trail and optional soft-delete (mark as deleted, retain for audit period)
- **FR-037**: System MUST maintain an immutable audit log for all create/update/delete operations on manifests, imports, comparisons, and report generation
- **FR-038**: Audit log MUST include: operation type, user/service identifier, timestamp, resource ID, before/after state (for updates), and operation result
- **FR-039**: Audit log MUST be stored separately from registry (append-only file or separate audit table) and protected from tampering
- **FR-040**: System MUST support audit log queries by user, resource, operation type, and time range
- **FR-041**: System MUST embed provenance information in manifests (who created/modified, when, from which trigger source, using which tools/models)
- **FR-042**: System MUST provide pluggable connector framework for external intelligence sources (IP reputation, device fingerprint scoring, email reputation/breach databases)
- **FR-043**: System MUST mark investigations as requiring external intel when high-risk indicators are detected (risk_score >= 0.7)
- **FR-044**: System MUST track confidence scores and flag investigations with missing external intel data as lower confidence
- **FR-045**: System MUST support connector stubs for: IP reputation (AbuseIPDB, VirusTotal), device fingerprint scoring (FingerprintJS, deviceAtlas), email reputation/breach (HaveIBeenPwned, emailrep.io)
- **FR-046**: System MUST cache external intel results in registry with TTL to avoid rate limits
- **FR-047**: Pipeline MUST enforce linter gates that fail builds/investigations if: (a) state.risk_score != final_risk (inconsistency check), (b) tools_used > 0 but tool_results is empty, (c) end_time missing before report finalize
- **FR-048**: Linter gates MUST be configurable (warn vs fail) and report specific validation errors
- **FR-049**: System MUST provide pre-commit hooks or CI/CD integration for linter validation
- **FR-050**: Failed linter checks MUST be logged to audit trail and prevent report generation until resolved
- **FR-051**: System MUST expose Prometheus metrics for: import_throughput_files_per_min, registry_size_bytes, registry_record_count, query_latency_seconds (histogram), failed_writes_total, import_backlog_count
- **FR-052**: System MUST provide alerting rules for: registry_size > threshold, query_latency p95 > 50ms, failed_writes > 0.1%, import_backlog > threshold
- **FR-053**: System MUST log all operations with structured JSON including: operation_type, duration_ms, success, error_message (if failed), resource_ids
- **FR-054**: System MUST provide scheduled backup procedures for registry database (daily snapshots with 30-day retention)
- **FR-055**: System MUST provide backup procedures for report artifacts (incremental backups with configurable retention)
- **FR-056**: System MUST support restore procedures with integrity verification (hash validation, file count verification)
- **FR-057**: System MUST support scheduled disaster recovery drills (quarterly) with documented procedures
- **FR-058**: Backup operations MUST be logged to audit trail with backup location, size, and verification status
- **FR-059**: Registry MUST use SQLite WAL mode with optimized PRAGMA settings for < 50ms query latency
- **FR-060**: Registry MUST maintain indexes on: investigation_id, entity_ids (JSON index), trigger_source, created_at, file paths, comparison links
- **FR-061**: Registry MUST support full-text search on investigation titles and tags using FTS5
- **FR-062**: System MUST include property-based tests for entity normalizer using Hypothesis (test normalization idempotency, edge cases, special characters)
- **FR-063**: System MUST include end-to-end import/rollback tests that verify import → verify → rollback → verify original state
- **FR-064**: System MUST include schema migration tests that verify data integrity after registry schema changes
- **FR-065**: System MUST include CLI contract tests that verify command output formats and error handling
- **FR-066**: CI/CD pipeline MUST run all tests including performance benchmarks before deployment
- **FR-067**: System MUST support role-based access control with roles: Analyst (read investigations, create comparisons), Reviewer (read/write investigations, approve reports), Admin (full access, manage workspace)
- **FR-068**: System MUST support asset-level visibility controls (investigations/comparisons can be marked private/shared/public)
- **FR-069**: System MUST enforce RBAC at CLI level (commands check user permissions before execution)
- **FR-070**: System MUST enforce RBAC at API level (endpoints verify user permissions via JWT/auth tokens)
- **FR-071**: System MUST support ownership model (investigations owned by creator, transferable by admins)
- **FR-072**: System MUST provide REST API endpoints wrapping CLI functionality: `POST /api/v1/investigations`, `GET /api/v1/investigations/{id}`, `POST /api/v1/investigations/{id}/files`, `GET /api/v1/files`, `POST /api/v1/comparisons`, `GET /api/v1/comparisons/{id}`, `POST /api/v1/reports/generate`
- **FR-073**: API endpoints MUST authenticate requests using JWT tokens or API keys
- **FR-074**: API endpoints MUST enforce RBAC permissions matching CLI behavior
- **FR-075**: API endpoints MUST return consistent JSON responses with error handling
- **FR-076**: API MUST support pagination for list endpoints (investigations, files, comparisons)
- **FR-077**: System MUST support storage quotas per workspace (configurable limits, alerts at 80%/90%/100%)
- **FR-078**: System MUST support auto-archival of investigations older than retention window (move to archive storage, update registry)
- **FR-079**: System MUST support purge policies for large artifacts (models, images, traces) based on age and size thresholds
- **FR-080**: System MUST track storage usage per investigation and report in registry
- **FR-081**: System MUST provide storage usage reports and recommendations for cleanup
- **FR-082**: System MUST version all report templates (semantic versioning: MAJOR.MINOR.PATCH)
- **FR-083**: System MUST embed template version in generated reports (metadata section)
- **FR-084**: System MUST embed model versions (LLM model, tool versions) in investigation manifests
- **FR-085**: System MUST track which template version was used for each report generation
- **FR-086**: System MUST support template rollback to previous versions if needed
- **FR-087**: System MUST integrate with auto-comparison service to create `cmp_*` manifests when scheduler triggers comparisons
- **FR-088**: Auto-comparison service MUST identify top risky entities and create comparison investigations
- **FR-089**: Auto-comparison results MUST be registered in registry with trigger_source="startup" or "scheduled"
- **FR-090**: System MUST link auto-comparison manifests to source investigations via left_investigation/right_investigation
- **FR-091**: Auto-comparison service MUST follow same workspace structure and manifest generation as manual comparisons

### Key Entities *(include if feature involves data)*

- **Investigation Artifact**: Represents investigation results (JSON, HTML) using hybrid organization: (1) Canonical path: `investigations/<YYYY>/<MM>/<inv_id>/` contains actual files; (2) Entity view path: `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>` provides date-grouped symlink (where filesystem supports) or indexed view (auto-fallback for Windows/network mounts) to canonical location; (3) Registry maintains conflict checks (hash/size) while symlinks are presentation-only. Key attributes: entity_type, entity_id, investigation_id, date_range, canonical_file_path, entity_view_path, view_type (symlink/indexed), file_type (json/html)
- **Comparison Report**: Represents comparison analysis between investigation windows. Key attributes: source_type (auto_startup/manual), timestamp, entity_type, entity_id, investigation_ids, report_path, zip_path
- **Investigation Log Folder**: Represents investigation execution logs organized by mode, investigation ID, and timestamp. Key attributes: mode (LIVE/MOCK/DEMO), investigation_id, timestamp, folder_path, metadata_path, log_files
- **Startup Analysis Package**: Represents complete startup analysis results including investigations, comparisons, and reports. Key attributes: timestamp, startup_report_path, comparison_reports, investigation_artifacts, zip_package_path
- **File Organization Service**: Central service for resolving file paths, creating directories, and managing file organization. Key methods: resolve_investigation_artifact_path(), resolve_comparison_report_path(), resolve_startup_report_path(), create_directory_structure()
- **Workspace Registry**: SQLite database cross-indexing investigations, files, and comparisons by entity and time. Key tables: `investigations` (id, title, type, graph_type, trigger_source, tags, entity_ids, timestamps, canonical_path), `files` (investigation_id, canonical_path, entity_view_path, kind, sha256, size, mime, relpath), `comparisons` (id, left_investigation, right_investigation, title, notes, timestamps), `audit_log` (operation_type, user_id, timestamp, resource_type, resource_id, before_state, after_state, result). Registry uses SHA256 hashes for deduplication and enables fast queries by entity or time range
- **Investigation Manifest**: JSON file (`manifest.json`) in each investigation folder containing investigation facts, metadata, and file references. Key attributes: investigation_id, title, type, graph_type, trigger_source, status, tags, entity_ids, run (run_id, graph_version, llm_model, policy_version), metrics (risk, confidence), created_at, updated_at
- **Comparison Manifest**: JSON file (`manifest.json`) in each comparison folder linking two investigations with metadata. Key attributes: comparison_id, left_investigation, right_investigation, title, created_at, notes
- **CLI Tool (`olor.py`)**: Command-line interface for workspace management, file import, investigation creation, and report generation. Key commands: `init`, `new`, `add-file`, `report`, `compare`, `import-logs`, `ls`, `show`, `index`
- **Workspace Configuration (`olorin.toml`)**: Configuration file defining path templates, normalization rules, default graph types per trigger, and workspace settings
- **Retention Policy**: Defines retention windows, archival rules, and deletion policies for investigations, files, and comparisons. Key attributes: retention_days, archival_days, deletion_days, policy_type (hard/soft delete)
- **Security Configuration**: Defines encryption settings, PII handling rules, and access controls. Key attributes: encryption_at_rest, encryption_in_transit, pii_redaction_rules, key_management_service
- **Audit Log Entry**: Represents an immutable audit record. Key attributes: operation_type, user_id, service_id, timestamp, resource_type, resource_id, before_state, after_state, result, ip_address
- **Provenance Metadata**: Embedded in manifests, tracks creation/modification history. Key attributes: created_by, created_at, modified_by, modified_at, trigger_source, tool_versions, model_versions
- **External Intel Connector**: Pluggable interface for external intelligence sources. Key attributes: connector_type, connector_name, enabled, cache_ttl, rate_limit, api_key_config
- **Intel Result**: Cached external intelligence data. Key attributes: entity_type, entity_id, connector_type, result_data, confidence_score, cached_at, expires_at
- **Linter Rule**: Defines validation rules for investigations. Key attributes: rule_name, rule_type (consistency/required_field/completeness), severity (warn/fail), validation_function, error_message_template
- **Linter Result**: Result of linter validation. Key attributes: investigation_id, rule_name, passed, error_message, timestamp
- **Backup Record**: Tracks backup operations. Key attributes: backup_id, backup_type (registry/reports/full), backup_location, backup_size, backup_timestamp, verification_status, retention_until
- **Role**: Defines user permissions. Key attributes: role_name (Analyst/Reviewer/Admin), permissions (list of allowed operations), scope (workspace/team/global)
- **Access Control Entry**: Defines access permissions for specific resources. Key attributes: resource_type, resource_id, user_id, role, visibility (private/shared/public), granted_at, granted_by
- **Storage Quota**: Defines storage limits. Key attributes: workspace_id, quota_limit_bytes, current_usage_bytes, alert_thresholds (80/90/100%), enforcement_action (warn/block/archive)
- **Archival Policy**: Defines archival rules. Key attributes: retention_days, archival_trigger, archival_location, purge_after_days
- **Template Version**: Tracks report template versions. Key attributes: template_name, version (semantic), template_path, created_at, changelog, deprecated (boolean)
- **Report Provenance**: Embedded in reports, tracks generation details. Key attributes: template_version, model_versions (dict), tool_versions (dict), generated_at, generated_by

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All investigation artifacts are organized using hybrid structure: canonical storage in `investigations/<YYYY>/<MM>/<inv_id>/` with 100% consistency, and date-grouped entity-based views in `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>` (symlinks where filesystem supports, auto-fallback to indexed views for Windows/network mounts) accessible across all investigation trigger types (startup, script, UI)
- **SC-002**: All comparison reports are organized under `artifacts/comparisons/{source_type}/{timestamp}/` with clear separation between auto_startup and manual comparisons
- **SC-003**: All startup analysis reports are organized under `artifacts/reports/startup/{timestamp}/` with consistent naming and metadata
- **SC-004**: All investigation logs are organized under `logs/investigations/{MODE}_{investigation_id}_{timestamp}/` with standard file structure in 100% of cases
- **SC-005**: File path resolution service is used by 100% of investigation and comparison file creation code (zero direct path construction)
- **SC-006**: Migration utility successfully reorganizes 100% of existing scattered files into unified structure without data loss
- **SC-007**: All file creation operations complete successfully with proper error handling and logging in 100% of cases
- **SC-008**: UI endpoints can reliably locate and serve investigation files from unified structure with <100ms response time for file path resolution
- **SC-009**: File organization system supports adding new investigation types without code changes (configuration-only) for 80% of new types
- **SC-010**: Zero file path conflicts or naming collisions occur when multiple investigations run concurrently for the same entity
- **SC-011**: Registry indexes 100% of investigations, files, and comparisons with complete metadata
- **SC-012**: Registry queries return results in < 50ms for entity-based searches
- **SC-013**: CLI commands complete successfully with proper error handling and logging
- **SC-014**: Import operation successfully organizes 100% of existing files without data loss
- **SC-015**: Manifest files are generated for 100% of investigations and comparisons
- **SC-016**: Dual ID format support enables backward compatibility with existing file names
- **SC-017**: Configuration file (`olorin.toml`) is used as single source of truth for all path resolution
- **SC-018**: Registry query latency p95 < 50ms, p99 < 100ms for entity-based searches
- **SC-019**: Import throughput > 1000 files/minute for typical file sizes (< 10MB)
- **SC-020**: Registry size monitoring with alerts when > 10GB or > 1M records
- **SC-021**: Failed write operations < 0.1% of total operations
- **SC-022**: Import backlog monitoring with alerts when > 10,000 pending files
- **SC-023**: All critical operations emit metrics (Prometheus format) and logs (structured JSON)
