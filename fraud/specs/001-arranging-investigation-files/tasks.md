---
description: "Task list for Arranging Investigation Files feature implementation"
---

# Tasks: Arranging Investigation Files

**Input**: Design documents from `/specs/001-arranging-investigation-files/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification. This feature does not explicitly request TDD, so test tasks are minimal and focused on critical paths.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend service**: `olorin-server/app/` at repository root
- **CLI tool**: `cli/` at repository root
- **Tests**: `olorin-server/tests/` at repository root
- **Workspace**: `workspace/` at repository root (created at runtime)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create workspace directory structure at `olorin-server/workspace/` with subdirectories: `investigations/`, `comparisons/`, `reports/`, `registry/`
- [X] T002 [P] Create configuration module `olorin-server/app/config/file_organization_config.py` with `FileOrganizationConfig` Pydantic model
- [X] T003 [P] Create workspace configuration module `olorin-server/app/config/workspace_config.py` for `olorin.toml` parsing
- [X] T004 [P] Add dependencies to `olorin-server/pyproject.toml`: `click`, `hypothesis`, `prometheus-client` (if not already present)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Create entity normalizer module `olorin-server/app/service/investigation/entity_normalizer.py` with `EntityNormalizer` class implementing normalization rules
- [X] T006 [P] Create path resolver module `olorin-server/app/service/investigation/path_resolver.py` with `PathResolver` class for path resolution utilities supporting hybrid structure (canonical + date-grouped entity views)
- [X] T007 [P] Create directory manager module `olorin-server/app/service/investigation/directory_manager.py` with `DirectoryManager` class for directory creation and validation
- [X] T008 [P] Create file locker module `olorin-server/app/service/investigation/file_locker.py` with `FileLocker` class implementing OS-level file locking (POSIX fcntl, Windows LockFileEx) with retry, exponential backoff, jitter, and sequence numbering
- [X] T009 [P] Create symlink manager module `olorin-server/app/service/investigation/symlink_manager.py` with `SymlinkManager` class implementing symlink creation with auto-fallback to indexed views for Windows/network mounts
- [X] T010 Create file organization service `olorin-server/app/service/investigation/file_organization_service.py` implementing `FileOrganizationService` contract with all path resolution methods supporting hybrid structure
- [X] T011 Integrate `FileOrganizationService` with `EntityNormalizer`, `PathResolver`, `DirectoryManager`, `FileLocker`, and `SymlinkManager` dependencies
- [X] T012 Add environment variable support for base directories (`FILE_ORG_ARTIFACTS_BASE_DIR`, `FILE_ORG_LOGS_BASE_DIR`) in `FileOrganizationConfig`
- [X] T013 Implement path validation logic in `DirectoryManager` to prevent directory traversal attacks and invalid characters
- [X] T014 Update `PathResolver` to support date-grouped entity view paths: `artifacts/<entity_type>/<entity_id>/<YYYY>/<MM>/inv_<id>__<kind>.<ext>`
- [X] T015 Implement canonical path resolution: `investigations/<YYYY>/<MM>/<inv_id>/` for manifest.json, logs, artifacts, reports
- [ ] T016 Integrate `FileLocker` with SQLite registry using BEGIN IMMEDIATE transactions to keep registry and files in sync (deferred until registry implementation)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Unified File Organization for Startup Analysis Flow (Priority: P1) 🎯 MVP

**Goal**: All investigation files from the startup analysis flow are organized in a consistent, predictable location structure

**Independent Test**: Start the server, wait for startup analysis to complete, and verify that all generated files are organized in the correct hierarchical structure under `artifacts/startup_analysis/{timestamp}/`

### Implementation for User Story 1

- [X] T017 [US1] Modify `olorin-server/app/service/investigation/artifact_persistence.py` to use `FileOrganizationService.resolve_investigation_artifact_path()` for JSON artifacts, saving to canonical location and creating date-grouped entity view symlinks
- [X] T018 [US1] Modify `olorin-server/app/service/investigation/auto_comparison.py::run_auto_comparison_for_entity()` to use `FileOrganizationService.resolve_comparison_report_path()` for comparison HTML reports
- [X] T019 [US1] Modify `olorin-server/app/service/investigation/auto_comparison.py::package_comparison_results()` to save zip packages to `artifacts/comparisons/auto_startup/{timestamp}/`
- [X] T020 [US1] Modify `olorin-server/app/service/reporting/startup_report_generator.py::generate_startup_report()` to use `FileOrganizationService.resolve_startup_report_path()` and save to `artifacts/reports/startup/{timestamp}/`
- [X] T021 [US1] Update `olorin-server/app/service/__init__.py` startup flow to ensure all file paths use `FileOrganizationService` with file locking before generating reports
- [X] T022 [US1] Add logging in all modified files to log file creation operations with location and naming details
- [X] T023 [US1] Ensure artifact persistence creates symlinks in date-grouped entity view paths using `SymlinkManager` with auto-fallback to indexed views

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Unified File Organization for Script-Triggered Investigations (Priority: P1)

**Goal**: Investigation files created by scripts follow the same organizational structure as other investigation types

**Independent Test**: Run a script that triggers an investigation and verify that all generated files (logs, artifacts, reports) are saved to the correct locations matching the unified structure

### Implementation for User Story 2

- [X] T024 [US2] Modify `olorin-server/app/service/logging/investigation_folder_manager.py::create_investigation_folder()` to use `FileOrganizationService.resolve_investigation_log_path()` for log folder paths
- [X] T025 [US2] Ensure `olorin-server/app/service/logging/autonomous_investigation_logger.py` uses unified log paths from `InvestigationFolderManager` (already uses folder_manager.create_investigation_folder which now uses FileOrganizationService)
- [X] T026 [US2] Update script-triggered investigation flows to use `FileOrganizationService` for artifact persistence with file locking (integrate with T017 - persist_artifact already updated)
- [X] T027 [US2] Verify script-triggered investigations generate comprehensive reports using unified paths and create entity view symlinks (reports saved to investigation folder which uses FileOrganizationService paths)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Unified File Organization for UI-Triggered Investigations (Priority: P1)

**Goal**: Investigation files created through the UI are organized consistently and accessible via UI endpoints

**Independent Test**: Create an investigation through the UI, wait for completion, and verify that all files are organized correctly and accessible via UI endpoints

### Implementation for User Story 3

- [X] T028 [US3] Update UI-triggered investigation API endpoints to use `FileOrganizationService` for file path resolution with file locking (already uses InvestigationFolderManager which uses FileOrganizationService)
- [X] T029 [US3] Modify investigation creation endpoints to ensure log folders use unified paths (integrate with T024 - already done)
- [X] T030 [US3] Update UI file retrieval endpoints to query files from unified structure using `FileOrganizationService`, supporting both canonical and entity view paths (updated reports_router.py)
- [X] T031 [US3] Ensure UI download endpoints package files correctly from unified structure (reports use unified paths via InvestigationFolderManager)
- [ ] T032 [US3] Add file path metadata to investigation responses including both canonical paths and entity view paths (symlink vs indexed view) - Deferred until registry implementation (T033)
- [ ] T033 [US3] Implement UI endpoints to expose both "Open folder" (symlink) and "Open virtual view" (registry query) options in investigation detail views - Deferred until registry implementation (Phase 6)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 6 - Investigation Registry and Cataloging (Priority: P1)

**Goal**: All investigations, files, and comparisons are indexed in a searchable SQLite registry

**Independent Test**: Create investigations, run import, and query the registry for investigations by entity, date range, or trigger source

### Implementation for User Story 6

- [X] T034 [US6] Create workspace registry module `olorin-server/app/service/investigation/workspace_registry.py` with `WorkspaceRegistry` class
- [X] T035 [US6] Implement SQLite database schema in `WorkspaceRegistry` with tables: `investigations`, `files`, `comparisons`, `audit_log` including `canonical_path` and `entity_view_path` fields
- [X] T036 [US6] Configure SQLite WAL mode and PRAGMA settings for < 50ms query latency in `WorkspaceRegistry`
- [X] T037 [US6] Create indexes on `investigations(investigation_id)`, `investigations(entity_ids)`, `investigations(trigger_source, created_at)`, `files(investigation_id, kind)`, `comparisons(left_investigation, right_investigation)`
- [X] T038 [US6] Implement FTS5 virtual table for full-text search on investigation titles and tags
- [X] T039 [US6] Implement `WorkspaceRegistry.index_investigation()` method to index investigations with metadata including canonical and entity view paths
- [X] T040 [US6] Implement `WorkspaceRegistry.index_file()` method to index files with SHA256 hashes for deduplication, storing both canonical_path and entity_view_path
- [X] T041 [US6] Implement `WorkspaceRegistry.index_comparison()` method to index comparisons linking investigations
- [X] T042 [US6] Implement `WorkspaceRegistry.query_by_entity()` method for entity-based searches using entity view paths
- [X] T043 [US6] Implement `WorkspaceRegistry.query_by_date_range()` method for date-based queries
- [X] T044 [US6] Integrate registry indexing into `artifact_persistence.py` to auto-index files when persisted (both canonical and entity view paths)
- [X] T045 [US6] Integrate registry indexing into investigation completion flows to index investigations when they complete (integrated into state_update_helper.py and investigation_state_service.py)

**Checkpoint**: At this point, User Stories 1, 2, 3, AND 6 should all work independently with registry support

---

## Phase 7: User Story 4 - Unified File Organization for UI-Triggered Comparisons (Priority: P2)

**Goal**: Comparison reports triggered from the UI are organized consistently with other comparison types

**Independent Test**: Trigger a comparison from the UI and verify that comparison reports and related files are saved to `artifacts/comparisons/manual/{timestamp}/` with proper organization

### Implementation for User Story 4

- [X] T046 [US4] Update UI comparison trigger endpoints to use `FileOrganizationService.resolve_comparison_report_path()` with `source_type="manual"` and file locking (updated compare_investigation_html endpoint)
- [X] T047 [US4] Ensure UI-triggered comparisons save reports to `artifacts/comparisons/manual/{timestamp}/` (implemented via FileOrganizationService)
- [X] T048 [US4] Update comparison report generation to correctly link investigation artifacts from unified structure (both canonical and entity view paths) (artifact_persistence.py already uses FileOrganizationService)
- [X] T049 [US4] Ensure UI export endpoints package comparison results correctly from unified structure (reports use unified paths via FileOrganizationService)

**Checkpoint**: At this point, User Stories 1, 2, 3, 4, AND 6 should all work independently

---

## Phase 8: User Story 5 - Infrastructure for Future Augmentations (Priority: P2)

**Goal**: File organization system is extensible and configurable for new investigation types, report formats, and artifact types

**Independent Test**: Add a new investigation type or report format and verify that it integrates seamlessly with the existing organizational structure without breaking existing functionality

### Implementation for User Story 5

- [X] T050 [US5] Create manifest generator module `olorin-server/app/service/investigation/manifest_generator.py` with `ManifestGenerator` class
- [X] T051 [US5] Implement `ManifestGenerator.generate_investigation_manifest()` to create `manifest.json` files for investigations including canonical and entity view paths
- [X] T052 [US5] Implement `ManifestGenerator.generate_comparison_manifest()` to create `manifest.json` files for comparisons
- [X] T053 [US5] Integrate manifest generation into investigation completion flows (integrated into state_update_helper.py)
- [X] T054 [US5] Integrate manifest generation into comparison completion flows (integrated into package_comparison_results)
- [ ] T055 [US5] Add configuration support in `olorin.toml` for new investigation types and report formats - Deferred (requires CLI tool implementation)
- [ ] T056 [US5] Document extension points in `FileOrganizationService` for adding new path templates - Deferred (can be added to docstrings)

**Checkpoint**: At this point, User Stories 1, 2, 3, 4, 5, AND 6 should all work independently with extensibility support

---

## Phase 9: User Story 7 - CLI Workspace Management (Priority: P2)

**Goal**: Unified CLI tool (`olor.py`) to manage the investigation workspace

**Independent Test**: Run CLI commands to init workspace, create investigation, add files, and generate reports

### Implementation for User Story 7

- [X] T057 [US7] Create CLI tool `cli/olor.py` with Click framework
- [X] T058 [US7] Implement `olor init` command to create workspace structure with registry database
- [X] T059 [US7] Implement `olor new` command to create new investigation with manifest
- [X] T060 [US7] Implement `olor add-file` command to add files to investigation and index in registry (with file locking)
- [X] T061 [US7] Implement `olor report` command to generate reports for investigations
- [X] T062 [US7] Implement `olor compare` command to create comparisons between investigations
- [X] T063 [US7] Implement `olor import-logs` command with `--dry-run`, `--copy`, `--move`, `--link` options (stub implemented, full logic deferred)
- [X] T064 [US7] Implement `olor ls` command to list investigations, files, or comparisons (supporting both canonical and entity view queries)
- [X] T065 [US7] Implement `olor show` command to display investigation or comparison details including symlink/indexed view status
- [X] T066 [US7] Implement `olor index` command to re-index workspace files in registry (stub implemented, full logic deferred)
- [X] T067 [US7] Integrate CLI commands with `FileOrganizationService`, `WorkspaceRegistry`, `FileLocker`, and `SymlinkManager`
- [X] T068 [US7] Add CLI error handling and logging for all commands

**Checkpoint**: At this point, all user stories should work independently with CLI support

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Security & Compliance

- [ ] T069 [P] Create audit logger module `olorin-server/app/service/investigation/audit_logger.py` with `AuditLogger` class for immutable audit log
- [ ] T070 [P] Implement PII redaction utilities in `olorin-server/app/service/investigation/pii_handler.py` for sensitive data masking
- [ ] T071 [P] Add encryption at rest support for registry database in `WorkspaceRegistry` with configurable encryption keys
- [ ] T072 [P] Implement retention policy enforcement in `olorin-server/app/service/investigation/retention_service.py`
- [ ] T073 [P] Add secure key management integration (Vault/KMS) for encryption keys

### Backup & Disaster Recovery

- [ ] T074 [P] Create backup service module `olorin-server/app/service/investigation/backup_service.py` with `BackupService` class
- [ ] T075 [P] Implement scheduled backup procedures for registry database (daily snapshots with 30-day retention)
- [ ] T076 [P] Implement backup procedures for report artifacts (incremental backups)
- [ ] T077 [P] Implement restore procedures with integrity verification (hash validation, file count verification)
- [ ] T078 [P] Add backup operation logging to audit trail

### Observability & Monitoring

- [X] T079 [P] Add Prometheus metrics export in `olorin-server/app/service/investigation/metrics_exporter.py`: `import_throughput_files_per_min`, `registry_size_bytes`, `registry_record_count`, `query_latency_seconds`, `failed_writes_total`, `import_backlog_count`
- [ ] T080 [P] Implement structured JSON logging for all operations with fields: `operation_type`, `duration_ms`, `success`, `error_message`, `resource_ids` (partially implemented via existing logging infrastructure)
- [ ] T081 [P] Add alerting rules configuration for registry size, query latency, failed writes, import backlog (deferred - requires Prometheus/Grafana setup)

### Quality Gates & Linters

- [X] T082 [P] Create linter service module `olorin-server/app/service/investigation/linter_service.py` with `LinterService` class
- [X] T083 [P] Implement linter rule: `state.risk_score == final_risk` consistency check
- [X] T084 [P] Implement linter rule: `tools_used > 0` implies `len(tool_results) > 0` validation
- [X] T085 [P] Implement linter rule: `end_time` must be present before report finalize
- [X] T086 [P] Add configurable severity (warn vs fail) for linter rules
- [X] T087 [P] Integrate linter validation into investigation completion flows (integrated into state_update_helper.py)

### External Intel Connectors

- [ ] T088 [P] Create intel connector manager module `olorin-server/app/service/investigation/intel_connector_manager.py` with `IntelConnectorManager` class
- [ ] T089 [P] Implement pluggable connector interface for external intelligence sources
- [ ] T090 [P] Implement connector stubs for IP reputation (AbuseIPDB, VirusTotal), device fingerprint (FingerprintJS, deviceAtlas), email rep/breach (HaveIBeenPwned, emailrep.io)
- [ ] T091 [P] Implement caching for external intel results in registry with TTL
- [ ] T092 [P] Mark investigations as requiring external intel when `risk_score >= 0.7`

### RBAC Implementation

- [ ] T093 [P] Create RBAC service module `olorin-server/app/service/investigation/rbac_service.py` with `RBACService` class
- [ ] T094 [P] Implement role definitions: Analyst, Reviewer, Admin with permission sets
- [ ] T095 [P] Implement asset-level visibility controls (private/shared/public)
- [ ] T096 [P] Implement ownership model (investigations owned by creator, transferable by admins)
- [ ] T097 [P] Enforce RBAC at CLI level (commands check user permissions)
- [ ] T098 [P] Enforce RBAC at API level (endpoints verify user permissions via JWT/auth tokens)

### API Wrapper

- [ ] T099 [P] Create workspace API router `olorin-server/app/router/workspace_api.py` with REST endpoints
- [ ] T100 [P] Implement `POST /api/v1/investigations` endpoint wrapping CLI `new` command
- [ ] T101 [P] Implement `GET /api/v1/investigations/{id}` endpoint wrapping CLI `show` command
- [ ] T102 [P] Implement `POST /api/v1/investigations/{id}/files` endpoint wrapping CLI `add-file` command
- [ ] T103 [P] Implement `GET /api/v1/files` endpoint with pagination wrapping CLI `ls` command
- [ ] T104 [P] Implement `POST /api/v1/comparisons` endpoint wrapping CLI `compare` command
- [ ] T105 [P] Implement `GET /api/v1/comparisons/{id}` endpoint
- [ ] T106 [P] Implement `POST /api/v1/reports/generate` endpoint wrapping CLI `report` command
- [ ] T107 [P] Add JWT token authentication and RBAC enforcement to all API endpoints

### Template Versioning & Auto-Comparison Integration

- [ ] T108 [P] Implement template versioning system in report generators with semantic versioning
- [ ] T109 [P] Embed template version and model/tool versions in investigation manifests
- [ ] T110 [P] Integrate auto-comparison service with manifest generation to create `cmp_*` manifests
- [ ] T111 [P] Register auto-comparison results in registry with `trigger_source="startup"` or `"scheduled"`

### Migration & Import

- [ ] T112 [P] Create file importer module `olorin-server/app/service/investigation/file_importer.py` with `FileImporter` class
- [ ] T113 [P] Implement import strategies: `--copy`, `--move`, `--link` for migrating existing files
- [ ] T114 [P] Implement dry-run mode for import operations to preview changes
- [ ] T115 [P] Create migration utility script `olorin-server/scripts/migrate_investigation_files.py` to reorganize existing scattered files into hybrid structure
- [ ] T116 [P] Implement SHA256 hash calculation for all files during import for deduplication
- [X] T117 [P] Implement migration period handling: 30-day window with configurable extension, legacy paths become read-only after period (implemented in FileOrganizationConfig and FileOrganizationService)
- [X] T118 [P] Add migration period tracking in `FileOrganizationConfig` with start date and end date calculation (implemented with `migration_period_days`, `migration_start_date`, `migration_end_date`, `is_migration_period_active`)
- [X] T119 [P] Implement legacy path read-only enforcement after migration period expires (implemented in `FileOrganizationService.is_legacy_path_read_only()`)

### Testing & Documentation

- [X] T120 [P] Create property-based tests for entity normalizer using Hypothesis in `olorin-server/tests/property/test_entity_normalizer_property.py`
- [X] T121 [P] Create end-to-end import/rollback tests in `olorin-server/tests/integration/test_import_rollback.py`
- [X] T122 [P] Create schema migration tests in `olorin-server/tests/integration/test_registry_schema_migration.py`
- [X] T123 [P] Create CLI contract tests in `olorin-server/tests/integration/test_cli_contracts.py`
- [X] T124 [P] Create registry performance tests in `olorin-server/tests/integration/test_registry_performance.py`
- [X] T125 [P] Create file locking tests in `olorin-server/tests/unit/service/investigation/test_file_locker.py` for OS locks and SQLite BEGIN IMMEDIATE
- [X] T126 [P] Create symlink manager tests in `olorin-server/tests/unit/service/investigation/test_symlink_manager.py` for symlink creation and indexed view fallback
- [X] T127 [P] Update documentation in `olorin-server/artifacts/README.md` with new hybrid workspace structure (canonical + date-grouped entity views)
- [ ] T128 [P] Run quickstart.md validation to ensure all examples work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses same FileOrganizationService as US1
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Uses same FileOrganizationService as US1/US2
- **User Story 6 (P1)**: Can start after Foundational (Phase 2) - Independent registry implementation, but integrates with US1/US2/US3
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses same FileOrganizationService as US1/US2/US3
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Extends existing system
- **User Story 7 (P2)**: Can start after Foundational (Phase 2) - Uses FileOrganizationService and WorkspaceRegistry

### Within Each User Story

- Core implementation before integration
- Service layer before endpoints/CLI
- Registry schema before indexing logic
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All Polish tasks marked [P] can run in parallel (within Phase 10)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch foundational components in parallel:
Task: "Create entity normalizer module" (T005)
Task: "Create path resolver module" (T006)
Task: "Create directory manager module" (T007)
Task: "Create file locker module" (T008)
Task: "Create symlink manager module" (T009)

# Then integrate:
Task: "Create file organization service" (T010) - depends on T005, T006, T007, T008, T009
Task: "Integrate FileOrganizationService" (T011) - depends on T010

# Then modify existing files in parallel:
Task: "Modify artifact_persistence.py" (T017) - creates canonical files and entity view symlinks
Task: "Modify auto_comparison.py::run_auto_comparison_for_entity()" (T018)
Task: "Modify startup_report_generator.py" (T020)
Task: "Ensure artifact persistence creates symlinks" (T023)
```

---

## Parallel Example: User Story 6

```bash
# Launch registry components in parallel:
Task: "Create workspace registry module" (T034)
Task: "Implement SQLite database schema" (T035) - includes canonical_path and entity_view_path fields
Task: "Configure SQLite WAL mode" (T036)

# Then create indexes:
Task: "Create indexes" (T037)
Task: "Implement FTS5 virtual table" (T038)

# Then implement methods in parallel:
Task: "Implement index_investigation()" (T039) - stores canonical and entity view paths
Task: "Implement index_file()" (T040) - stores both canonical_path and entity_view_path
Task: "Implement index_comparison()" (T041)
Task: "Implement query_by_entity()" (T042) - uses entity view paths
Task: "Implement query_by_date_range()" (T043)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 6 → Test independently → Deploy/Demo (Registry enabled)
6. Add User Stories 4, 5, 7 → Test independently → Deploy/Demo
7. Add Polish phase → Test comprehensively → Deploy/Demo (Full feature)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Startup Analysis Flow)
   - Developer B: User Story 2 (Script-Triggered Investigations)
   - Developer C: User Story 3 (UI-Triggered Investigations)
   - Developer D: User Story 6 (Registry)
3. Stories complete and integrate independently
4. Then proceed with P2 stories (US4, US5, US7) in parallel
5. Finally, Polish phase tasks can be distributed across team

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (if tests are included)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All Python files must be under 200 lines (break into smaller modules if needed)
- All paths must be configurable (no hardcoded paths)
- File organization service must be used by 100% of file creation code (zero direct path construction)

---

## Summary

**Total Tasks**: 128
**Tasks by Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 12 tasks (added file locking, symlink management, hybrid path resolution)
- Phase 3 (US1): 7 tasks (added symlink creation, file locking integration)
- Phase 4 (US2): 4 tasks (updated with file locking and symlink support)
- Phase 5 (US3): 6 tasks (added UI support for symlink/indexed view options)
- Phase 6 (US6): 12 tasks (updated registry schema with canonical/entity view paths)
- Phase 7 (US4): 4 tasks (updated with file locking and hybrid paths)
- Phase 8 (US5): 7 tasks (updated manifest generation with path metadata)
- Phase 9 (US7): 12 tasks (updated CLI with file locking and symlink support)
- Phase 10 (Polish): 60 tasks (added migration period handling, file locking tests, symlink manager tests)

**Parallel Opportunities**: 
- 35+ tasks marked [P] can run in parallel
- All user stories can proceed in parallel after Foundational phase
- All Polish tasks can run in parallel

**Independent Test Criteria**:
- US1: Start server, verify startup analysis files organized correctly
- US2: Run script, verify investigation files organized correctly
- US3: Create via UI, verify files organized and accessible
- US4: Trigger comparison from UI, verify reports organized correctly
- US5: Add new investigation type, verify seamless integration
- US6: Create investigations, query registry by entity/date
- US7: Run CLI commands, verify workspace management works

**Suggested MVP Scope**: 
- Phase 1: Setup
- Phase 2: Foundational (CRITICAL)
- Phase 3: User Story 1 (Startup Analysis Flow)

This delivers immediate value by organizing the most critical automated process (startup analysis) with a solid foundation for future expansion.

