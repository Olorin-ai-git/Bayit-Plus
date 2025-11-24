# Implementation Plan: Dual-Database Support - Snowflake and PostgreSQL

**Branch**: `001-snowflake-migration-plan` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-snowflake-migration-plan/spec.md`

**Note**: This plan implements configuration-driven database provider selection between Snowflake (cloud data warehouse) and PostgreSQL (Docker-hosted development database) while maintaining 100% schema parity and query compatibility.

## Summary

Implement dual-database support that allows switching between Snowflake and PostgreSQL via environment configuration (`DATABASE_PROVIDER`). The system will maintain the existing Snowflake integration unchanged while adding a PostgreSQL alternative with:

- **Identical 333-column schema** (TRANSACTIONS_ENRICHED table)
- **Runtime query translation** with caching for Snowflake SQL → PostgreSQL SQL
- **Separate connection pools** for independent performance tuning
- **One-time data migration** script (no bidirectional sync)
- **Schema validation** on every startup + CI pipeline checks
- **Docker PostgreSQL** for zero-cost development environment

All existing investigation queries, LangChain tools, and orchestration handlers will work without code changes when switching database providers.

## Technical Context

**Language/Version**: Python 3.11 (backend server)
**Primary Dependencies**:
- **Snowflake**: `snowflake-connector-python` (existing)
- **PostgreSQL**: `psycopg2-binary`, `SQLAlchemy` (new)
- **LangChain**: `langchain-community` (existing, no changes)
- **Async**: `asyncio`, `concurrent.futures.ThreadPoolExecutor` (existing)
- **Validation**: `Zod` (TypeScript for config schema if frontend changes needed)

**Storage**:
- **Snowflake Cloud**: FRAUD_ANALYTICS database, PUBLIC schema, TRANSACTIONS_ENRICHED table (333 columns)
- **PostgreSQL Docker**: fraud_analytics database, public schema, transactions_enriched table (333 columns, identical structure)

**Testing**:
- `pytest` for Python unit and integration tests
- Contract testing for database abstraction layer
- Schema validation tests (Snowflake vs PostgreSQL parity)
- Migration validation tests (data integrity)

**Target Platform**: Linux server (FastAPI backend)
**Project Type**: Backend service with database abstraction layer
**Performance Goals**:
- Query execution within 20% of Snowflake performance
- Query translation cache hit rate >80%
- Schema validation <2 seconds on startup
- Migration throughput: 5,000 records in <5 minutes

**Constraints**:
- Zero breaking changes to existing codebase
- Schema-locked mode (SELECT-only, no DDL)
- 100% schema parity enforcement
- Fail-fast on configuration/schema errors

**Scale/Scope**:
- 333 columns per database
- 5,000+ existing records to migrate
- ~20 investigation query patterns
- 100+ concurrent connections supported

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ **PASS** - No violations

**Rationale**:
- **Library-First**: Database abstraction layer is self-contained and independently testable
- **No Hardcoding**: All configuration via environment variables (DATABASE_PROVIDER, connection params)
- **Schema-Locked**: Enforces SELECT-only mode; no DDL in production code
- **Test-First**: TDD approach for abstraction layer, query translator, schema validator, migration script
- **Zero Mocks in Production**: Integration tests use Docker PostgreSQL (real database)
- **Configuration-Driven**: Fail-fast validation for all environment variables

## Project Structure

### Documentation (this feature)

```text
specs/001-snowflake-migration-plan/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (technology evaluation)
├── data-model.md        # Phase 1 output (schema definitions)
├── quickstart.md        # Phase 1 output (developer guide)
└── contracts/           # Phase 1 output (API contracts)
    ├── database-provider.yaml          # DatabaseProvider interface
    ├── query-translator.yaml           # QueryTranslator interface
    ├── schema-validator.yaml           # SchemaValidator interface
    └── migration-manager.yaml          # MigrationManager interface
```

### Source Code (repository root: olorin-server/)

```text
app/
├── service/
│   └── agent/
│       └── tools/
│           ├── snowflake_tool/                      # EXISTING
│           │   ├── real_client.py                   # Snowflake async client
│           │   ├── snowflake_tool.py                # LangChain tool wrapper
│           │   ├── query_builder.py                 # Query generation
│           │   └── schema_constants.py              # 333 column definitions
│           └── database_tool/                       # NEW - Abstraction layer
│               ├── __init__.py
│               ├── database_provider.py             # DatabaseProvider abstraction
│               ├── database_factory.py              # Provider factory
│               ├── postgres_client.py               # PostgreSQL async client
│               ├── query_translator.py              # Snowflake → PostgreSQL SQL
│               ├── query_cache.py                   # Translation cache
│               ├── schema_validator.py              # Schema parity validator
│               └── migration_manager.py             # Data migration script
├── config_loader.py                                 # MODIFY - Add DATABASE_PROVIDER
└── main.py                                          # MODIFY - Initialize provider

scripts/
├── snowflake_setup.sql                              # EXISTING - Snowflake DDL
├── postgres_setup.sql                               # NEW - PostgreSQL DDL (333 columns)
├── migrate_snowflake_to_postgres.py                 # NEW - Migration script
└── validate_schema_parity.py                        # NEW - Schema comparison

tests/
├── unit/
│   ├── test_database_provider.py                    # Unit tests for abstraction
│   ├── test_query_translator.py                    # Translation unit tests
│   ├── test_query_cache.py                         # Cache unit tests
│   └── test_schema_validator.py                    # Validator unit tests
├── integration/
│   ├── test_postgres_client.py                      # PostgreSQL integration
│   ├── test_snowflake_postgres_parity.py           # Schema parity tests
│   └── test_investigation_workflows.py              # End-to-end query tests
└── contract/
    ├── test_database_provider_contract.py           # Provider interface contract
    └── test_query_compatibility.py                  # Query translation contract

docker/
└── docker-compose.yml                               # NEW - PostgreSQL container
```

**Structure Decision**: Backend-only changes using single project structure. All new code lives under `app/service/agent/tools/database_tool/` as a new abstraction layer that wraps both Snowflake and PostgreSQL clients. Existing `snowflake_tool/` remains unchanged; new `database_factory.py` routes queries based on `DATABASE_PROVIDER` environment variable.

## Complexity Tracking

> No Constitution violations - this table is not needed.

## Phase 0: Research & Technology Evaluation

**Objective**: Resolve all technical unknowns and validate technology choices

### Research Tasks

1. **PostgreSQL Type Mapping Research**
   - Investigate Snowflake→PostgreSQL type equivalence for all 333 columns
   - Document edge cases: VARIANT (JSON), ARRAY, TIMESTAMP_NTZ
   - Validate precision/scale preservation for NUMERIC types
   - **Output**: Type mapping table in research.md

2. **Query Translation Patterns**
   - Research Snowflake-specific SQL functions used in existing queries
   - Identify PostgreSQL equivalents (DATEADD, LISTAGG, etc.)
   - Evaluate regex-based vs AST-based translation approaches
   - **Output**: Translation pattern catalog in research.md

3. **Connection Pooling Best Practices**
   - Research async connection pooling for PostgreSQL (asyncpg vs psycopg2)
   - Compare pool configuration strategies for Snowflake vs PostgreSQL
   - Evaluate SQLAlchemy async engine options
   - **Output**: Pooling strategy decision in research.md

4. **Docker PostgreSQL Configuration**
   - Research official PostgreSQL Docker images (postgres:15-alpine recommended)
   - Evaluate volume persistence strategies for development data
   - Document SSL/TLS configuration for local development
   - **Output**: Docker setup guide in research.md

5. **Schema Validation Approaches**
   - Research information_schema querying for both databases
   - Evaluate column-level comparison strategies (name, type, nullability)
   - Investigate CI integration patterns for schema validation
   - **Output**: Validation approach decision in research.md

6. **Migration Script Architecture**
   - Research batch processing strategies for 5,000+ records
   - Evaluate checkpoint/resume patterns for long-running migrations
   - Investigate data transformation edge cases (timezone, JSON)
   - **Output**: Migration architecture in research.md

### Research Deliverables

**File**: `specs/001-snowflake-migration-plan/research.md`

**Required Sections**:
1. PostgreSQL Type Mappings (complete table for 333 columns)
2. Query Translation Catalog (Snowflake function → PostgreSQL equivalent)
3. Connection Pooling Strategy (separate pools, recommended sizes)
4. Docker Setup Guide (docker-compose.yml, environment variables)
5. Schema Validation Approach (startup + CI checks)
6. Migration Architecture (batch processing, checkpointing)

**Gate**: All "NEEDS CLARIFICATION" items resolved before Phase 1

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

### 1.1 Data Model (`data-model.md`)

**Entities**:

1. **DatabaseProvider** (Abstract Interface)
   ```python
   class DatabaseProvider(ABC):
       provider_type: str  # 'snowflake' or 'postgresql'
       connection_params: Dict[str, Any]
       pool: ConnectionPool

       @abstractmethod
       async def execute_query(sql: str, params: Dict) -> List[Dict]
       @abstractmethod
       async def validate_schema() -> ValidationResult
       @abstractmethod
       async def get_connection() -> Connection
   ```

2. **SnowflakeProvider** (Concrete Implementation - wraps existing client)
   - Inherits DatabaseProvider
   - Delegates to existing `real_client.py`

3. **PostgreSQLProvider** (Concrete Implementation - new)
   - Inherits DatabaseProvider
   - Uses asyncpg or psycopg2 async

4. **DatabaseFactory**
   ```python
   class DatabaseFactory:
       @staticmethod
       def create_provider(config: DatabaseConfig) -> DatabaseProvider:
           if config.provider == 'snowflake':
               return SnowflakeProvider(config.snowflake_params)
           elif config.provider == 'postgresql':
               return PostgreSQLProvider(config.postgres_params)
           else:
               raise ValueError(f"Invalid provider: {config.provider}")
   ```

5. **QueryTranslator**
   ```python
   class QueryTranslator:
       syntax_mappings: Dict[str, str]
       function_translations: Dict[str, Callable]
       query_cache: QueryCache

       def translate(sql: str, target: str) -> str:
           # Check cache first
           # Apply regex transformations
           # Return translated SQL
   ```

6. **QueryCache**
   ```python
   class QueryCache:
       cache: Dict[str, str]  # Original SQL → Translated SQL
       max_size: int = 1000

       def get(sql: str) -> Optional[str]
       def put(sql: str, translated: str) -> None
       def hit_rate() -> float
   ```

7. **SchemaValidator**
   ```python
   class SchemaValidator:
       expected_columns: List[ColumnDef]  # 333 columns

       async def validate_parity(
           snowflake: DatabaseProvider,
           postgres: DatabaseProvider
       ) -> ValidationResult

       def compare_schemas(
           schema1: Dict,
           schema2: Dict
       ) -> List[SchemaDifference]
   ```

8. **MigrationManager**
   ```python
   class MigrationManager:
       source: DatabaseProvider
       target: DatabaseProvider
       batch_size: int = 500
       checkpoint_file: str = 'migration_checkpoint.json'

       async def migrate_data() -> MigrationResult
       async def validate_migration() -> ValidationResult
       async def resume_from_checkpoint() -> None
   ```

**Relationships**:
- DatabaseFactory creates DatabaseProvider instances
- QueryTranslator uses QueryCache for performance
- SchemaValidator compares two DatabaseProvider schemas
- MigrationManager uses two DatabaseProvider instances (source + target)

**State Transitions**:
- DatabaseProvider: Disconnected → Connecting → Connected → Executing → Disconnected
- Migration: Idle → Running → Checkpointing → Resuming → Completed/Failed

### 1.2 API Contracts (`contracts/`)

**File**: `contracts/database-provider.yaml` (OpenAPI-style interface definition)

```yaml
DatabaseProvider:
  methods:
    execute_query:
      input:
        sql: string
        params: object
      output:
        results: array<object>
      errors:
        - ConnectionError
        - QueryExecutionError
        - ValidationError

    validate_schema:
      input: null
      output:
        valid: boolean
        differences: array<SchemaDifference>
      errors:
        - SchemaValidationError

    get_connection:
      input: null
      output:
        connection: Connection
      errors:
        - ConnectionError
```

**File**: `contracts/query-translator.yaml`

```yaml
QueryTranslator:
  methods:
    translate:
      input:
        sql: string
        target_dialect: string  # 'postgresql'
      output:
        translated_sql: string
        cache_hit: boolean
      errors:
        - TranslationError
        - UnsupportedSyntaxError
```

**File**: `contracts/schema-validator.yaml`

```yaml
SchemaValidator:
  methods:
    validate_parity:
      input:
        provider1: DatabaseProvider
        provider2: DatabaseProvider
      output:
        valid: boolean
        differences: array<SchemaDifference>
        missing_columns: array<string>
        type_mismatches: array<TypeMismatch>
      errors:
        - ValidationError
```

**File**: `contracts/migration-manager.yaml`

```yaml
MigrationManager:
  methods:
    migrate_data:
      input:
        resume: boolean
      output:
        migrated_count: integer
        failed_count: integer
        duration_seconds: float
      errors:
        - MigrationError
        - CheckpointError

    validate_migration:
      input: null
      output:
        source_count: integer
        target_count: integer
        match: boolean
        sample_validation: array<RecordMatch>
      errors:
        - ValidationError
```

### 1.3 Quickstart Guide (`quickstart.md`)

**Contents**:
1. **Prerequisites**: Python 3.11, Poetry, Docker, existing Snowflake credentials
2. **Docker Setup**: Start PostgreSQL container with docker-compose
3. **Environment Configuration**: Set DATABASE_PROVIDER=postgresql
4. **Schema Initialization**: Run postgres_setup.sql script
5. **Data Migration**: Execute migrate_snowflake_to_postgres.py
6. **Validation**: Run schema parity tests
7. **Switch Providers**: Change DATABASE_PROVIDER environment variable
8. **Run Investigation**: Verify queries work on both databases

### 1.4 Agent Context Update

After generating all Phase 1 artifacts, run:

```bash
cd /Users/gklainert/Documents/olorin
.specify/scripts/bash/update-agent-context.sh claude
```

This will update the Claude-specific context file with:
- New Python modules (database_tool/)
- New dependencies (psycopg2-binary, SQLAlchemy async)
- PostgreSQL Docker configuration
- Migration script usage

## Phase 2: Implementation Planning Complete

**Status**: ✅ Planning phase complete

**Generated Artifacts**:
1. ✅ `plan.md` (this file)
2. ⏳ `research.md` (to be generated)
3. ⏳ `data-model.md` (to be generated)
4. ⏳ `quickstart.md` (to be generated)
5. ⏳ `contracts/` (to be generated)

**Next Steps**:
1. Execute Phase 0 research tasks
2. Generate Phase 1 design artifacts
3. Run `/speckit.tasks` to create actionable task breakdown
4. Begin implementation following TDD approach

**Branch**: `001-snowflake-migration-plan`
**Spec File**: `/Users/gklainert/Documents/olorin/specs/001-snowflake-migration-plan/spec.md`
**Plan File**: `/Users/gklainert/Documents/olorin/specs/001-snowflake-migration-plan/plan.md`

---

**Implementation Note**: This plan stops after Phase 2 as per `/speckit.plan` command design. The actual task breakdown for implementation will be generated by the `/speckit.tasks` command, which will reference this plan and create dependency-ordered, actionable tasks.
