# Modification Summary: Complete Integration Checklist

**Date**: 2025-11-14  
**Status**: Ready for Integration

## Quick Reference: What to Add Where

### ✅ Already Covered (from initial SUGGESTED_MODIFICATIONS.md)

- ✅ Canonical, date-based workspace structure
- ✅ SQLite registry with indexing
- ✅ Unified CLI (`olor.py`)
- ✅ Investigation & comparison manifests
- ✅ Dual ID support (inv_*/cmp_* vs investigation_*/comparison_*)
- ✅ Configuration file (`olorin.toml`)
- ✅ Import/deduplication capabilities
- ✅ Phased migration strategy

### 🔴 Critical Missing Pieces (Now Added)

#### 1. Privacy, Retention, and Security Baselines
- **FR-036** through **FR-041**: PII handling, encryption (at-rest/in-transit), retention windows, key management, deletion workflows
- **Key Entities**: Retention Policy, Security Configuration

#### 2. Audit Trail & Provenance
- **FR-042** through **FR-046**: Immutable audit log, provenance metadata in manifests
- **Key Entities**: Audit Log Entry, Provenance Metadata

#### 3. External Intel Connectors
- **FR-047** through **FR-051**: Pluggable connectors (IP rep, device fingerprint, email rep/breach), confidence tracking
- **Key Entities**: External Intel Connector, Intel Result

#### 4. Quality Gates / Linters
- **FR-052** through **FR-055**: Linter gates (risk_score consistency, tools_used validation, end_time checks)
- **Key Entities**: Linter Rule, Linter Result

#### 5. Observability Details (Concrete SLOs)
- **SC-018** through **SC-023**: Query latency p95<50ms, import throughput, registry size alerts, failed writes monitoring
- **FR-056** through **FR-058**: Prometheus metrics, alerting rules, structured logging

#### 6. Backup/DR for Registry & Reports
- **FR-059** through **FR-063**: Scheduled backups, restore procedures, integrity verification, DR drills
- **Key Entities**: Backup Record

#### 7. Indexing Strategy for SQLite
- **FR-064** through **FR-066**: WAL mode, optimized PRAGMA settings, indexes, FTS5 full-text search
- **Technical Context**: Detailed SQLite indexing strategy

#### 8. Test Strategy & CI/CD
- **FR-067** through **FR-071**: Property-based tests, E2E import/rollback tests, schema migration tests, CLI contract tests
- **Technical Context**: Comprehensive testing strategy

#### 9. RBAC Specifics
- **FR-072** through **FR-076**: Role matrix (Analyst/Reviewer/Admin), asset-level visibility, CLI/API enforcement
- **Key Entities**: Role, Access Control Entry

#### 10. API Wrapper for CLI
- **FR-077** through **FR-081**: REST API endpoints, JWT/auth, RBAC enforcement, pagination
- **Project Structure**: `workspace_api.py` router

#### 11. Cost/Quotas & Archival
- **FR-082** through **FR-086**: Storage quotas, auto-archival, purge policies, usage tracking
- **Key Entities**: Storage Quota, Archival Policy

#### 12. Template Versioning & Report Provenance
- **FR-087** through **FR-091**: Template versioning, model/tool version embedding, template rollback
- **Key Entities**: Template Version, Report Provenance

#### 13. Auto-Comparison Service Integration
- **FR-092** through **FR-096**: Integration with scheduler, cmp_* manifest generation, registry registration
- **Integration Points**: Auto-comparison service flow

---

## Complete Requirement Counts

### Functional Requirements
- **Original**: FR-001 through FR-020 (20 requirements)
- **Workspace/Registry**: FR-021 through FR-030 (10 requirements)
- **Critical Missing**: FR-031 through FR-096 (66 requirements)
- **Total**: **96 functional requirements**

### Success Criteria
- **Original**: SC-001 through SC-010 (10 criteria)
- **Workspace/Registry**: SC-011 through SC-017 (7 criteria)
- **Observability**: SC-018 through SC-023 (6 criteria)
- **Total**: **23 success criteria**

### User Stories
- **Original**: User Story 1-5 (5 stories)
- **New**: User Story 6-7 (2 stories)
- **Total**: **7 user stories**

### Key Entities
- **Original**: 5 entities
- **New**: 15+ entities (Registry, Manifests, CLI, Config, Audit Log, Intel Connectors, Linter Rules, Backup Records, Roles, Storage Quotas, Templates, etc.)
- **Total**: **20+ key entities**

---

## Integration Checklist

### spec.md Updates Required

- [ ] Add User Story 6: Investigation Registry and Cataloging (P1)
- [ ] Add User Story 7: CLI Workspace Management (P2)
- [ ] Add FR-021 through FR-096 (76 new functional requirements)
- [ ] Add SC-011 through SC-023 (13 new success criteria)
- [ ] Add 15+ new key entities (Registry, Manifests, Audit Log, Intel Connectors, etc.)
- [ ] Update edge cases section with security, retention, and compliance scenarios

### plan.md Updates Required

- [ ] Update Summary with workspace structure, registry, CLI, manifests
- [ ] Add SQLite indexing strategy to Technical Context
- [ ] Add test strategy (property-based, E2E, schema migration, CLI contract)
- [ ] Add backup/DR procedures section
- [ ] Add observability SLOs and metrics
- [ ] Add security and retention policies
- [ ] Update Project Structure with new files (workspace_api.py, registry.py, etc.)
- [ ] Add technical decisions for: date-based vs entity-based, SQLite vs PostgreSQL, dual ID support

### data-model.md Updates Required

- [ ] Add Registry schema (investigations, files, comparisons, audit_log tables)
- [ ] Add Manifest schemas (investigation, comparison JSON structures)
- [ ] Add Security models (encryption, PII handling, retention policies)
- [ ] Add RBAC models (roles, access control entries)
- [ ] Add Intel Connector models
- [ ] Add Linter Rule models
- [ ] Add Backup Record models
- [ ] Add Storage Quota and Archival Policy models

### research.md Updates Required

- [ ] Add operating model integration notes
- [ ] Add security and compliance requirements analysis
- [ ] Add external intel connector requirements
- [ ] Add quality gates and linter requirements
- [ ] Add observability requirements
- [ ] Add backup/DR requirements

### contracts/ Updates Required

- [ ] Add workspace_registry.py contract
- [ ] Add manifest_generator.py contract
- [ ] Add file_importer.py contract
- [ ] Add CLI tool contract (olor.py commands)
- [ ] Add workspace_api.py contract (REST API endpoints)

### quickstart.md Updates Required

- [ ] Add workspace initialization examples
- [ ] Add registry query examples
- [ ] Add CLI usage examples
- [ ] Add import/ingestion examples
- [ ] Add security configuration examples
- [ ] Add backup/restore examples

---

## Priority Implementation Phases

### Phase 1 (P1 - Critical Foundation)
1. File Organization Service (existing)
2. Workspace structure with date-based organization
3. SQLite registry with basic indexing
4. Manifest generation for investigations
5. **Security baselines** (encryption, PII handling)
6. **Audit trail** (immutable log)

### Phase 2 (P1 - Critical Operations)
1. CLI tool (`olor.py`) with core commands
2. Import functionality with dry-run
3. Dual ID format support
4. **Quality gates/linters** (risk_score consistency, tools_used validation)
5. **Backup/DR procedures** (scheduled backups, restore)

### Phase 3 (P2 - Important Features)
1. Comparison manifest generation
2. Enhanced CLI commands
3. Configuration file (`olorin.toml`) support
4. **External intel connectors** (stubs and framework)
5. **RBAC implementation** (roles, asset-level visibility)
6. **API wrapper** (REST endpoints)

### Phase 4 (P2 - Important Enhancements)
1. **Observability** (metrics, alerts, SLOs)
2. **Storage quotas & archival** (auto-archive, purge policies)
3. **Template versioning** (semantic versioning, rollback)
4. **Auto-comparison integration** (scheduler → cmp_* manifests)
5. **Test strategy** (property-based, E2E, schema migration)

---

## Key Integration Points

### Existing Services to Enhance
1. **FileOrganizationService**: Add workspace structure, manifest generation
2. **InvestigationFolderManager**: Integrate with registry, add audit logging
3. **ArtifactPersistence**: Add registry indexing, SHA256 hashing
4. **AutoComparison**: Add manifest generation, registry registration
5. **Risk Analyzer**: Add external intel connector integration

### New Services to Create
1. **WorkspaceRegistry**: SQLite registry management
2. **ManifestGenerator**: Generate investigation/comparison manifests
3. **FileImporter**: Import existing logs/artifacts with deduplication
4. **AuditLogger**: Immutable audit log management
5. **IntelConnectorManager**: Pluggable external intel connectors
6. **LinterService**: Quality gate validation
7. **BackupService**: Scheduled backups and restore
8. **RBACService**: Role-based access control
9. **CLI Tool** (`olor.py`): Unified command-line interface
10. **WorkspaceAPI**: REST API wrapper for CLI

---

## Configuration File Schema (Complete)

```toml
[workspace]
root = "./workspace"
registry_path = "registry/registry.sqlite"
audit_log_path = "registry/audit.log"

[paths]
investigations = "investigations/{yyyy}/{mm}/{inv_id}"
comparisons = "comparisons/{yyyy}/{mm}/{cmp_id}"
reports = "reports/{category}/{timestamp}"
startup_reports = "reports/startup/{date}/startup_{date}.html"

[id]
format = "inv_{date}_{time}_{slug}"
slug_max = 48
allowed_chars = "A-Za-z0-9-_"
normalize_dots = true
normalize_at = true

[registry]
enable_sha256 = true
enable_deduplication = true
index_entity_ids = true
wal_mode = true
cache_size_mb = 64

[security]
encryption_at_rest = true
encryption_in_transit = true
pii_redaction_enabled = true
key_management_service = "vault"  # or "local", "aws-kms", etc.

[retention]
default_retention_days = 90
archival_days = 365
deletion_days = 730
soft_delete = true

[observability]
metrics_enabled = true
metrics_port = 9090
alert_registry_size_gb = 10
alert_query_latency_ms = 50
alert_failed_writes_percent = 0.1

[backup]
enabled = true
schedule = "0 2 * * *"  # Daily at 2 AM
retention_days = 30
verify_integrity = true

[quotas]
max_workspace_size_gb = 100
alert_threshold_80 = true
alert_threshold_90 = true
enforcement_action = "warn"  # warn, block, archive

[graph]
default_startup = "hybrid"
default_script = "clean"
default_ui = "hybrid"

[import]
default_strategy = "copy"
dry_run_default = true
create_auto_investigations = true
```

---

## Next Actions

1. ✅ **Review SUGGESTED_MODIFICATIONS.md** - Complete with all 13 missing pieces
2. **Apply modifications to spec.md** - Add all user stories, requirements, success criteria, entities
3. **Apply modifications to plan.md** - Add technical details, strategies, procedures
4. **Update data-model.md** - Add all new schemas and models
5. **Update research.md** - Add operating model integration and requirements
6. **Update contracts/** - Add new service contracts
7. **Update quickstart.md** - Add new usage examples
8. **Generate tasks.md** - Create implementation tasks organized by priority

---

**Status**: All modifications documented and ready for integration into spec.md and plan.md

