# Tasks: Dual-Database Support - Snowflake and PostgreSQL

**Input**: Design documents from `/specs/001-snowflake-migration-plan/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: TDD approach - tests written FIRST, must FAIL, then implement

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions

Backend-only changes in `olorin-server/` repository:
- New code: `app/service/agent/tools/database_tool/`
- Existing code: `app/service/agent/tools/snowflake_tool/` (unchanged)
- Scripts: `scripts/`
- Tests: `tests/unit/`, `tests/integration/`, `tests/contract/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Docker PostgreSQL setup

- [X] T001 Create `app/service/agent/tools/database_tool/` directory structure
- [X] T002 [P] Create `docker/docker-compose.yml` with PostgreSQL 15-alpine container configuration (includes SSL/TLS certificate setup for secure connections per NFR-016)
- [X] T003 [P] Add PostgreSQL dependencies to `pyproject.toml` (psycopg2-binary, SQLAlchemy async)
- [X] T004 [P] Create `.env.example` with DATABASE_PROVIDER and all connection parameters
- [X] T005 Create `scripts/postgres_setup.sql` with 186-column schema (mirror of Snowflake)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Extend `app/config_loader.py` to load DATABASE_PROVIDER environment variable with validation
- [X] T007 [P] Create `app/service/agent/tools/database_tool/__init__.py` with module exports
- [X] T008 [P] Create `app/service/agent/tools/database_tool/database_provider.py` with DatabaseProvider abstract base class
- [X] T009 [P] Create `app/service/agent/tools/database_tool/database_factory.py` with provider factory pattern
- [X] T010 Create `tests/conftest.py` with Docker PostgreSQL fixtures for integration tests

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Database Provider Selection via Configuration (Priority: P1) 🎯 MVP

**Goal**: Enable switching between Snowflake and PostgreSQL via `DATABASE_PROVIDER` environment variable with zero code changes

**Independent Test**: Change `DATABASE_PROVIDER=postgresql` in `.env`, restart app, verify all investigation queries execute successfully against PostgreSQL instead of Snowflake

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Contract test for DatabaseProvider interface in `tests/contract/test_database_provider_contract.py`
- [X] T012 [P] [US1] Unit test for DatabaseFactory provider creation in `tests/unit/test_database_factory.py`
- [X] T013 [P] [US1] Integration test for Snowflake provider in `tests/integration/test_snowflake_provider.py`
- [X] T014 [P] [US1] Integration test for PostgreSQL provider in `tests/integration/test_postgres_provider.py`

### Implementation for User Story 1

- [X] T015 [US1] Implement SnowflakeProvider wrapper in `app/service/agent/tools/database_tool/snowflake_provider.py` (wraps existing `real_client.py`)
- [X] T016 [US1] Implement PostgreSQLProvider in `app/service/agent/tools/database_tool/postgres_client.py` with async connection pooling
- [X] T017 [US1] Update `app/main.py` to initialize database provider via factory at startup
- [X] T018 [US1] Add provider selection logic to `app/service/agent/tools/database_tool/database_factory.py`
- [X] T019 [US1] Add fail-fast validation for invalid DATABASE_PROVIDER values in config_loader
- [X] T020 [US1] Add warning logging when DATABASE_PROVIDER defaults to postgresql

**Checkpoint**: At this point, User Story 1 should be fully functional - can switch databases via config

---

## Phase 4: User Story 2 - Schema-Identical PostgreSQL Database (Priority: P1)

**Goal**: PostgreSQL has exact same 333-column schema as Snowflake, all investigation queries work identically

**Independent Test**: Run same investigation query against both databases, verify identical column names, data types, and result structure

### Tests for User Story 2

- [X] T021 [P] [US2] Schema validation test comparing Snowflake and PostgreSQL in `tests/integration/test_schema_parity.py`
- [X] T022 [P] [US2] Unit test for SchemaValidator in `tests/unit/test_schema_validator.py`
- [X] T023 [P] [US2] Integration test for identical query execution in `tests/integration/test_query_parity.py`

### Implementation for User Story 2

- [X] T024 [P] [US2] Create `app/service/agent/tools/database_tool/schema_validator.py` with schema comparison logic
- [X] T025 [US2] Implement schema introspection for Snowflake in SchemaValidator
- [X] T026 [US2] Implement schema introspection for PostgreSQL in SchemaValidator
- [X] T027 [US2] Add schema validation check to app startup (fail-fast on mismatch)
- [X] T028 [US2] Create `scripts/validate_schema_parity.py` standalone validation script
- [X] T029 [US2] Add detailed error reporting for schema differences (missing columns, type mismatches)
- [X] T030 [US2] Verify all 333 columns match exactly between databases

**Checkpoint**: ✅ Schema parity validated, both databases structurally identical

---

## Phase 5: User Story 3 - Transparent Database Abstraction Layer (Priority: P1)

**Goal**: Existing code works without changes when switching databases, no refactoring of investigation logic or LangChain tools required

**Independent Test**: Switch `DATABASE_PROVIDER` and run complete test suite without code changes, verify 100% pass rate

### Tests for User Story 3

- [X] T031 [P] [US3] Query translation unit tests in `tests/unit/test_query_translator.py`
- [X] T032 [P] [US3] Query cache unit tests in `tests/unit/test_query_cache.py`
- [X] T033 [P] [US3] End-to-end investigation workflow tests in `tests/integration/test_investigation_workflows.py`
- [X] T034 [P] [US3] Query compatibility contract tests in `tests/contract/test_query_compatibility.py`

### Implementation for User Story 3

- [X] T035 [P] [US3] Create `app/service/agent/tools/database_tool/query_translator.py` with Snowflake → PostgreSQL SQL translation
- [X] T036 [P] [US3] Create `app/service/agent/tools/database_tool/query_cache.py` with LRU cache implementation
- [X] T037 [US3] Implement DATEADD → INTERVAL translation in QueryTranslator
- [X] T038 [US3] Implement CURRENT_TIMESTAMP() → CURRENT_TIMESTAMP translation
- [X] T039 [US3] Implement LISTAGG → STRING_AGG translation
- [X] T040 [US3] Implement column name case sensitivity normalization (uppercase → lowercase)
- [X] T041 [US3] Add query translation caching with hit rate tracking
- [X] T042 [US3] Integrate QueryTranslator into PostgreSQLProvider execute_query method
- [X] T043 [US3] Add cache hit rate metric logging (target: >80%)
- [X] T044 [US3] Verify zero code changes needed in existing `app/service/agent/tools/snowflake_tool/` directory (VERIFIED: snowflake_tool uses SnowflakeClient directly, abstraction layer works through DatabaseQueryTool/DatabaseSchemaTool in tool_registry.py)

**Checkpoint**: Database abstraction complete, existing code works on both databases

---

## Phase 6: User Story 4 - One-Time Data Migration (Priority: P2)

**Goal**: Migrate existing 5,000+ Snowflake records to PostgreSQL while preserving all data exactly

**Independent Test**: Run migration script, compare record counts and sample data between databases to verify 100% data parity

### Tests for User Story 4

- [X] T045 [P] [US4] Migration manager unit tests in `tests/unit/test_migration_manager.py`
- [X] T046 [P] [US4] Migration validation tests in `tests/integration/test_migration_validation.py` (includes idempotency test: run migration twice, verify no duplicates)
- [X] T047 [P] [US4] Checkpoint/resume tests in `tests/unit/test_migration_checkpoint.py`

### Implementation for User Story 4

- [X] T048 [P] [US4] Create `app/service/agent/tools/database_tool/migration_manager.py` with batch processing
- [X] T049 [US4] Implement batch data extraction from Snowflake (batch_size=500) - implemented in extract_batch()
- [X] T050 [US4] Implement batch data insertion to PostgreSQL with transaction support - implemented in insert_batch()
- [X] T051 [US4] Add checkpoint file creation (`migration_checkpoint.json`) - implemented in save_checkpoint()
- [X] T052 [US4] Implement resume capability from last successful batch - implemented in migrate_batches()
- [X] T053 [US4] Implement UTC timezone standardization for TIMESTAMP columns in MigrationManager - implemented in transform_record()
- [X] T054 [US4] Add data transformation for VARIANT (JSON) → JSONB conversion - implemented in transform_record()
- [X] T055 [US4] Create `scripts/migrate_snowflake_to_postgres.py` CLI script
- [X] T056 [US4] Add progress logging (records processed, elapsed time, estimated completion) - implemented in CLI script
- [X] T057 [US4] Add migration validation (record count comparison, sample data verification) - implemented in validate_migration()
- [X] T058 [US4] Add rollback on error with detailed error logging - implemented via transaction support and exception handling

**Checkpoint**: Data migration complete with 100% record parity

---

## Phase 7: User Story 5 - Database-Specific Performance Optimization (Priority: P2)

**Goal**: PostgreSQL and Snowflake each use their optimal query patterns automatically

**Independent Test**: Execute identical investigation on both databases, compare execution times and query plans

### Tests for User Story 5

- [X] T059 [P] [US5] Performance benchmark tests in `tests/integration/test_performance_benchmarks.py`
- [X] T060 [P] [US5] Index effectiveness tests in `tests/integration/test_index_performance.py`

### Implementation for User Story 5

- [X] T061 [P] [US5] Add PostgreSQL-specific indexing on (tx_date, email) in `scripts/postgres_setup.sql`
- [X] T062 [P] [US5] Implement connection pool tuning for PostgreSQL (separate from Snowflake pool)
- [X] T063 [US5] Add query performance monitoring decorator for both providers
- [X] T064 [US5] Optimize PostgreSQL query execution plans for common investigation patterns
- [X] T065 [US5] Add query timeout configuration per environment
- [X] T066 [US5] Verify performance within 20% of Snowflake for equivalent queries

**Checkpoint**: Both databases optimized for their characteristics

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [X] T067 [P] Create `specs/001-snowflake-migration-plan/quickstart.md` developer onboarding guide
- [X] T068 [P] Create API contracts in `specs/001-snowflake-migration-plan/contracts/` (database-provider.yaml, query-translator.yaml, schema-validator.yaml, migration-manager.yaml)
- [X] T069 [P] Add comprehensive logging for database operations across all providers
- [X] T070 [P] Add CI pipeline schema validation check before deployment
- [X] T071 Security audit: verify no credentials hardcoded, all from environment/secrets
- [X] T072 Performance profiling: verify query cache hit rate >80%
- [X] T073 Code cleanup: remove any commented-out code, ensure proper documentation
- [X] T074 Integration test coverage: verify all user stories tested end-to-end
- [X] T075 Run full test suite on both Snowflake and PostgreSQL providers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Provider selection foundation
- **User Story 2 (Phase 4)**: Depends on US1 - Needs provider abstraction for validation
- **User Story 3 (Phase 5)**: Depends on US1 - Needs provider abstraction for translation
- **User Story 4 (Phase 6)**: Depends on US1 + US2 + US3 - Needs working providers, schema parity, and query translation
- **User Story 5 (Phase 7)**: Depends on US1 + US2 + US3 - Performance optimization requires functional abstraction
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Setup (Phase 1)
    ↓
Foundational (Phase 2) ← BLOCKS all stories
    ↓
User Story 1 (Phase 3) ← Provider selection (MVP foundation)
    ↓
    ├→ User Story 2 (Phase 4) ← Schema parity validation
    │       ↓
    └→ User Story 3 (Phase 5) ← Query translation & abstraction
            ↓
            ├→ User Story 4 (Phase 6) ← Data migration
            └→ User Story 5 (Phase 7) ← Performance optimization
                ↓
            Polish (Phase 8)
```

### Within Each User Story

1. Tests FIRST → Must FAIL before implementation
2. Models/abstractions → Core implementation → Integration
3. Validation → Logging → Error handling
4. Story complete → Checkpoint validation

### Parallel Opportunities

**Setup Phase**: T002, T003, T004, T005 can run in parallel

**Foundational Phase**: T007, T008, T009 can run in parallel

**User Story 1 Tests**: T011, T012, T013, T014 can run in parallel

**User Story 1 Implementation**: T015, T016 can run in parallel (different files)

**User Story 2 Tests**: T021, T022, T023 can run in parallel

**User Story 2 Implementation**: T024, T025, T026 can run in parallel (schema validator components)

**User Story 3 Tests**: T031, T032, T033, T034 can run in parallel

**User Story 3 Implementation**: T035, T036 can run in parallel (translator and cache)

**User Story 4 Tests**: T045, T046, T047 can run in parallel

**User Story 4 Implementation**: T048, T053 can run in parallel (manager class and CLI script)

**User Story 5 Tests**: T059, T060 can run in parallel

**User Story 5 Implementation**: T061, T062 can run in parallel (indexing and pooling)

**Polish Phase**: T067, T068, T069, T070 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for DatabaseProvider interface in tests/contract/test_database_provider_contract.py"
Task: "Unit test for DatabaseFactory in tests/unit/test_database_factory.py"
Task: "Integration test for Snowflake provider in tests/integration/test_snowflake_provider.py"
Task: "Integration test for PostgreSQL provider in tests/integration/test_postgres_provider.py"

# Then launch parallel implementation:
Task: "Implement SnowflakeProvider wrapper in app/service/agent/tools/database_tool/snowflake_provider.py"
Task: "Implement PostgreSQLProvider in app/service/agent/tools/database_tool/postgres_client.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

**Minimum Viable Product** = Configuration-driven provider selection + schema parity + query compatibility

1. Complete Phase 1: Setup (Docker, dependencies, schema)
2. Complete Phase 2: Foundational (config, abstractions)
3. Complete Phase 3: User Story 1 (provider selection)
4. Complete Phase 4: User Story 2 (schema validation)
5. Complete Phase 5: User Story 3 (query translation)
6. **STOP and VALIDATE**: Test all investigations on both databases
7. **DEPLOY**: PostgreSQL ready for development, Snowflake for production

**At this point**: Core functionality complete, can switch databases via config, all queries work

### Incremental Delivery

1. **MVP (US1-3)** → Deploy: Development team uses PostgreSQL, production uses Snowflake
2. **+US4 (Migration)** → Deploy: Can populate PostgreSQL with existing data
3. **+US5 (Optimization)** → Deploy: Both databases perform optimally
4. **+Polish** → Deploy: Production-ready with full documentation

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. **Developer A**: User Story 1 (provider selection)
2. **Developer B**: User Story 2 (schema validation) - starts after US1
3. **Developer C**: User Story 3 (query translation) - starts after US1
4. **Developer D**: User Story 4 (migration) - starts after US1+US2+US3
5. **Developer E**: User Story 5 (optimization) - starts after US1+US2+US3

Stories integrate cleanly due to well-defined abstraction layer.

---

## Notes

- **[P] tasks**: Different files, no dependencies, safe to parallelize
- **[Story] label**: Maps task to specific user story for traceability
- **TDD Approach**: All tests written FIRST, must FAIL before implementation
- **Independent Stories**: Each story delivers value and is independently testable
- **Commit Strategy**: Commit after each task or logical group
- **Checkpoints**: Stop at any checkpoint to validate story independently
- **Schema-Locked**: No DDL in code, all configuration-driven
- **Zero Breaking Changes**: Existing code unchanged, abstraction layer isolates changes

---

## Task Count Summary

- **Total Tasks**: 75
- **Setup Phase**: 5 tasks
- **Foundational Phase**: 5 tasks
- **User Story 1**: 10 tasks (4 tests + 6 implementation)
- **User Story 2**: 10 tasks (3 tests + 7 implementation)
- **User Story 3**: 14 tasks (4 tests + 10 implementation)
- **User Story 4**: 14 tasks (3 tests + 11 implementation)
- **User Story 5**: 8 tasks (2 tests + 6 implementation)
- **Polish Phase**: 9 tasks

**Parallel Opportunities**: 32 tasks marked [P] for parallel execution

**MVP Scope**: 34 tasks (Setup + Foundational + US1 + US2 + US3)

---

## Success Criteria Validation

✅ **SC-001**: 100% investigation queries execute on PostgreSQL (US3)
✅ **SC-002**: 333/333 columns match (US2)
✅ **SC-003**: 100% record parity (US4)
✅ **SC-004**: Startup time <10% increase (US1)
✅ **SC-005**: Query performance within 20% (US5)
✅ **SC-006**: Zero breaking changes (US3)
✅ **SC-007**: Provider switch <30 seconds (US1)
✅ **SC-008**: All tests pass with DATABASE_PROVIDER=postgresql (US3)
✅ **SC-009**: Migration <5 minutes for 5,000 records (US4)
✅ **SC-010**: Zero Snowflake costs on PostgreSQL (US1)
