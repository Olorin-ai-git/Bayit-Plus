# Feature Specification: Dual-Database Support - Snowflake and PostgreSQL

**Feature Branch**: `001-snowflake-migration-plan`
**Created**: November 1, 2025
**Status**: Draft
**Input**: User description: "snowflake migration plan: read /Users/gklainert/Documents/olorin/docs/analysis/snowflake-integration-analysis-2025-11-01.md snowflake costs money, create a migration plan from snowflake to mysql or a simalar free database. the ultimate requirement in maintaining EXACTLY the same database schema, tables, and values from the existing snowflake database."

**Critical Requirement**: Keep existing Snowflake integration as-is. Switching between Snowflake and PostgreSQL will be done through a .env configuration parameter.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Database Provider Selection via Configuration (Priority: P1)

As a **system administrator**, I want to select between Snowflake and PostgreSQL via environment configuration, so that I can control database costs while maintaining identical functionality.

**Why this priority**: This is the foundational capability that enables cost control without code changes. Without this, we cannot switch databases in different environments.

**Independent Test**: Can be fully tested by changing `DATABASE_PROVIDER=postgresql` in `.env`, restarting the application, and verifying all investigation queries execute successfully against PostgreSQL instead of Snowflake.

**Acceptance Scenarios**:

1. **Given** `.env` has `DATABASE_PROVIDER=snowflake`, **When** investigation starts, **Then** queries execute against Snowflake database
2. **Given** `.env` has `DATABASE_PROVIDER=postgresql`, **When** investigation starts, **Then** queries execute against PostgreSQL database with identical schema
3. **Given** invalid `DATABASE_PROVIDER` value, **When** application starts, **Then** system fails fast with clear error message indicating valid options
4. **Given** `DATABASE_PROVIDER` not set, **When** application starts, **Then** system defaults to PostgreSQL and logs warning about default selection

---

### User Story 2 - Schema-Identical PostgreSQL Database (Priority: P1)

As a **fraud investigator**, I want PostgreSQL to have the exact same 186-column schema as Snowflake, so that all investigation queries and evidence collection work identically regardless of database provider.

**Why this priority**: Without schema parity, investigations will fail or produce inconsistent results. This is critical for operational continuity.

**Independent Test**: Can be fully tested by running the same investigation query against both Snowflake and PostgreSQL, verifying identical column names, data types, and result structure.

**Acceptance Scenarios**:

1. **Given** TRANSACTIONS_ENRICHED table exists in PostgreSQL, **When** schema is inspected, **Then** all 186 columns match Snowflake exactly (names, types, nullability)
2. **Given** investigation query uses Snowflake column names, **When** executed against PostgreSQL, **Then** query succeeds without modification
3. **Given** data exists in both databases, **When** same query runs on both, **Then** result structure is identical (column order, types, formatting)
4. **Given** schema validation runs, **When** comparing Snowflake and PostgreSQL, **Then** 100% schema match is confirmed

---

### User Story 3 - Transparent Database Abstraction Layer (Priority: P1)

As a **developer**, I want existing code to work without changes when switching databases, so that no refactoring of investigation logic, LangChain tools, or orchestration handlers is required.

**Why this priority**: Minimizes migration risk and development effort. Existing tested code continues to work, reducing regression potential.

**Independent Test**: Can be fully tested by switching `DATABASE_PROVIDER` and running the complete test suite without code changes, verifying 100% pass rate.

**Acceptance Scenarios**:

1. **Given** database abstraction layer exists, **When** SnowflakeQueryTool executes query, **Then** correct database client is used based on config
2. **Given** PostgreSQL is selected, **When** query uses Snowflake-specific SQL syntax, **Then** syntax is automatically translated to PostgreSQL equivalent
3. **Given** existing LangChain tools, **When** database provider changes, **Then** no tool code modifications required
4. **Given** investigation orchestration handlers, **When** database provider changes, **Then** handlers work identically without code changes

---

### User Story 4 - One-Time Data Migration from Snowflake to PostgreSQL (Priority: P2)

As a **system administrator**, I want to migrate existing 5,000+ Snowflake records to PostgreSQL while preserving all data exactly, so that I can switch to cost-free PostgreSQL without data loss.

**Why this priority**: Enables initial migration and testing. Lower priority than P1 because system can operate on PostgreSQL with new data while migration is prepared.

**Independent Test**: Can be fully tested by running migration script, then comparing record counts and sample data between Snowflake and PostgreSQL to verify 100% data parity.

**Acceptance Scenarios**:

1. **Given** migration script runs, **When** comparing record counts, **Then** PostgreSQL has exactly same number of records as Snowflake
2. **Given** migration complete, **When** sampling random records, **Then** all 186 column values match exactly between databases
3. **Given** migration in progress, **When** error occurs, **Then** transaction rolls back and detailed error log is created
4. **Given** migration script with resume capability, **When** restarted after failure, **Then** continues from last successful batch

---

### User Story 5 - Database-Specific Performance Optimization (Priority: P2)

As a **developer**, I want database-specific query optimizations to be applied automatically, so that PostgreSQL and Snowflake each use their optimal query patterns.

**Why this priority**: Ensures good performance on both platforms. Medium priority because basic functionality works without optimization.

**Independent Test**: Can be fully tested by executing identical investigation on both databases, comparing execution times and query plans.

**Acceptance Scenarios**:

1. **Given** PostgreSQL is selected, **When** query is constructed, **Then** PostgreSQL-specific indexing hints are used
2. **Given** Snowflake is selected, **When** query is constructed, **Then** Snowflake clustering is leveraged
3. **Given** time-range query, **When** PostgreSQL executes it, **Then** BETWEEN syntax is used instead of DATEADD
4. **Given** aggregation query, **When** PostgreSQL executes it, **Then** native PostgreSQL aggregation functions are used

---

### Edge Cases

- What happens when database connection fails during provider switch? System should fail gracefully with clear error indicating connection issue and configured provider.
- How does system handle schema drift if Snowflake schema is updated but PostgreSQL is not? Schema validation should detect mismatch and prevent application startup with detailed error.
- What happens if migration script is run twice? Idempotent operation: detect existing data and skip or update based on conflict resolution strategy.
- How does system handle timezone differences between Snowflake and PostgreSQL datetime storage? Standardize on UTC storage and apply timezone conversion in abstraction layer.
- What happens when PostgreSQL is selected but database doesn't exist? Application startup fails with clear error and setup instructions.
- How does system handle column name case sensitivity (Snowflake uppercase vs PostgreSQL lowercase)? Abstraction layer normalizes column names to maintain compatibility.
- What happens during investigation if database provider is changed mid-execution? Investigation continues with original provider until completion; new investigations use new provider.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Database Abstraction & Configuration

- **FR-001**: System MUST support configuration-driven database provider selection via `DATABASE_PROVIDER` environment variable
- **FR-002**: System MUST support values `snowflake` and `postgresql` for `DATABASE_PROVIDER`
- **FR-003**: System MUST fail fast on application startup if `DATABASE_PROVIDER` has invalid value
- **FR-004**: System MUST default to PostgreSQL if `DATABASE_PROVIDER` is not set, with warning log
- **FR-005**: System MUST maintain existing Snowflake integration code unchanged
- **FR-006**: System MUST create database abstraction layer that transparently routes queries to configured provider

#### Schema Compatibility

- **FR-007**: PostgreSQL schema MUST have exactly 186 columns matching Snowflake `TRANSACTIONS_ENRICHED` table
- **FR-008**: PostgreSQL column names MUST match Snowflake column names exactly (accounting for case sensitivity)
- **FR-009**: PostgreSQL data types MUST be functionally equivalent to Snowflake types (e.g., VARCHAR for STRING, TIMESTAMP for TIMESTAMP_NTZ)
- **FR-010**: PostgreSQL primary key MUST be `TX_ID_KEY` matching Snowflake
- **FR-011**: PostgreSQL MUST support clustering/indexing on `(TX_DATE, EMAIL)` equivalent to Snowflake clustering
- **FR-012**: System MUST validate schema parity between Snowflake and PostgreSQL on startup when both are configured

#### Query Compatibility

- **FR-013**: All existing SnowflakeQueryTool queries MUST execute on PostgreSQL without code changes
- **FR-014**: System MUST automatically translate Snowflake-specific SQL syntax to PostgreSQL equivalents at runtime
- **FR-015**: System MUST cache translated queries to avoid redundant translation overhead
- **FR-016**: System MUST translate `DATEADD(day, -N, CURRENT_TIMESTAMP())` to PostgreSQL `CURRENT_TIMESTAMP - INTERVAL 'N days'`
- **FR-017**: System MUST translate Snowflake's `CURRENT_TIMESTAMP()` to PostgreSQL's `CURRENT_TIMESTAMP`
- **FR-018**: System MUST handle column name case sensitivity differences (Snowflake uppercase, PostgreSQL lowercase)
- **FR-019**: System MUST maintain LIMIT clause behavior identically on both databases

#### Data Migration

- **FR-020**: System MUST provide one-time migration script to copy all data from Snowflake to PostgreSQL
- **FR-021**: Migration script MUST preserve all 186 column values exactly as stored in Snowflake
- **FR-022**: Migration script MUST be idempotent (safe to run multiple times)
- **FR-023**: Migration script MUST provide batch processing with configurable batch size
- **FR-024**: Migration script MUST support resume capability after failure
- **FR-025**: Migration script MUST log detailed progress and any data transformation issues

#### Connection Management

- **FR-026**: System MUST maintain separate connection pools for Snowflake and PostgreSQL with independent configuration
- **FR-027**: PostgreSQL client MUST support async execution matching Snowflake client architecture
- **FR-028**: System MUST configure PostgreSQL connection parameters via environment variables
- **FR-029**: System MUST support timeout configuration for PostgreSQL queries
- **FR-030**: System MUST implement retry logic for PostgreSQL connection failures
- **FR-031**: Each database provider MUST have independently tunable pool size, max overflow, and timeout parameters

#### Security & Validation

- **FR-032**: PostgreSQL integration MUST enforce same schema-locked mode as Snowflake (SELECT-only)
- **FR-033**: PostgreSQL queries MUST be validated for dangerous keywords (DELETE, DROP, INSERT, UPDATE, etc.)
- **FR-034**: PostgreSQL connection credentials MUST be loaded from environment variables or Firebase Secrets
- **FR-035**: System MUST validate all column references against PostgreSQL schema before query execution
- **FR-036**: PostgreSQL role MUST have SELECT-only permissions matching `FRAUD_ANALYST_ROLE`

### Key Entities *(include if feature involves data)*

- **DatabaseProvider**: Abstraction representing either Snowflake or PostgreSQL client
  - Attributes: provider_type, connection_params, client_instance, schema_validator
  - Methods: execute_query(), validate_schema(), get_connection()

- **DatabaseConfig**: Configuration for database provider selection
  - Attributes: provider (snowflake|postgresql), connection_string, credentials, pool_settings
  - Source: Environment variables and Firebase Secrets

- **SchemaValidator**: Validates schema parity between databases
  - Attributes: expected_columns (333), column_type_mappings, validation_rules
  - Methods: validate_schema_parity(), compare_schemas(), report_differences()

- **QueryTranslator**: Translates Snowflake SQL to PostgreSQL SQL at runtime with caching
  - Attributes: syntax_mappings, function_translations, type_conversions, query_cache
  - Methods: translate_query(), translate_function(), translate_type(), get_cached_translation(), cache_translation()

- **MigrationManager**: Handles data migration from Snowflake to PostgreSQL
  - Attributes: source_client, target_client, batch_size, resume_state
  - Methods: migrate_data(), validate_migration(), resume_from_checkpoint()

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing investigation queries execute successfully on PostgreSQL without code changes
- **SC-002**: Schema validation confirms 186/186 columns match between Snowflake and PostgreSQL
- **SC-003**: Data migration completes with 100% record parity (same row count, same data values)
- **SC-004**: Application startup time increases by less than 10% when using PostgreSQL vs Snowflake
- **SC-005**: Investigation query performance on PostgreSQL within 20% of Snowflake performance for equivalent queries
- **SC-006**: Zero breaking changes to existing codebase (LangChain tools, orchestration handlers, query builder)
- **SC-007**: Database provider switch completes in under 30 seconds (configuration change + restart)
- **SC-008**: All existing tests pass without modification when `DATABASE_PROVIDER=postgresql`
- **SC-009**: Migration script processes 5,000 records in under 5 minutes with default batch size
- **SC-010**: System operates cost-free on PostgreSQL (zero Snowflake warehouse charges when PostgreSQL is selected)

---

## Technical Approach *(technology-agnostic where possible)*

### Database Provider Abstraction

**Concept**: Create an abstraction layer that presents a unified interface regardless of underlying database provider.

**Key Components**:
1. **DatabaseClientFactory**: Creates appropriate client (Snowflake or PostgreSQL) based on configuration
2. **QueryInterface**: Unified query execution interface implemented by both clients
3. **SchemaInterface**: Unified schema validation interface
4. **ResultsInterface**: Unified result parsing and formatting

### Configuration Structure

**Docker Setup for PostgreSQL**:
```bash
# PostgreSQL runs in Docker container for development
# docker-compose.yml or docker run command to start PostgreSQL:
# docker run --name olorin-postgres -e POSTGRES_PASSWORD=<dev-password> -p 5432:5432 -d postgres:15-alpine
```

**Environment Variables**:
```bash
# Database Provider Selection
DATABASE_PROVIDER=postgresql  # or 'snowflake'

# PostgreSQL Configuration (when DATABASE_PROVIDER=postgresql)
# Note: For Docker, POSTGRES_HOST=localhost when connecting from host machine
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=fraud_analytics
POSTGRES_SCHEMA=public
POSTGRES_USER=olorin
POSTGRES_PASSWORD=<from-secret-manager>
POSTGRES_POOL_SIZE=5
POSTGRES_POOL_MAX_OVERFLOW=10
POSTGRES_QUERY_TIMEOUT=300

# Snowflake Configuration (when DATABASE_PROVIDER=snowflake)
SNOWFLAKE_ACCOUNT=olorin_fraud.snowflakecomputing.com
SNOWFLAKE_USER=Olorin
SNOWFLAKE_PASSWORD=<from-secret-manager>
SNOWFLAKE_DATABASE=FRAUD_ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_TRANSACTIONS_TABLE=TRANSACTIONS_ENRICHED
SNOWFLAKE_POOL_SIZE=5
SNOWFLAKE_POOL_MAX_OVERFLOW=10
SNOWFLAKE_QUERY_TIMEOUT=300

# Common Configuration
TRANSACTIONS_TABLE=transactions_enriched  # lowercase for PostgreSQL
```

### PostgreSQL Schema Mapping

**Snowflake to PostgreSQL Type Mappings**:
- `STRING` → `VARCHAR` or `TEXT`
- `NUMBER(38,0)` → `BIGINT`
- `NUMBER(10,2)` → `NUMERIC(10,2)`
- `FLOAT` → `DOUBLE PRECISION`
- `BOOLEAN` → `BOOLEAN`
- `TIMESTAMP_NTZ` → `TIMESTAMP WITHOUT TIME ZONE`
- `TIMESTAMP_TZ` → `TIMESTAMP WITH TIME ZONE`
- `DATE` → `DATE`
- `VARIANT` (JSON) → `JSONB`
- `ARRAY` → `TEXT[]` or `JSONB`

### SQL Syntax Translation Examples

**Time Functions**:
```sql
-- Snowflake
DATEADD(day, -7, CURRENT_TIMESTAMP())

-- PostgreSQL
CURRENT_TIMESTAMP - INTERVAL '7 days'
```

**String Functions**:
```sql
-- Snowflake
SPLIT_PART(column, ',', 1)

-- PostgreSQL
SPLIT_PART(column, ',', 1)  -- Same!
```

**Aggregation**:
```sql
-- Snowflake
LISTAGG(column, ',')

-- PostgreSQL
STRING_AGG(column, ',')
```

### Migration Strategy

**Phase 1: Foundation (P1)**
1. Create database abstraction layer
2. Implement PostgreSQL client matching Snowflake client interface
3. Create query translator for Snowflake → PostgreSQL syntax
4. Update configuration loader to support `DATABASE_PROVIDER`

**Phase 2: Schema & Data (P1)**
5. Create PostgreSQL schema creation script (186 columns)
6. Implement schema validation comparing Snowflake and PostgreSQL (runs on every startup + CI checks)
7. Create data migration script with batch processing
8. Populate PostgreSQL with existing Snowflake data

**Phase 3: Integration (P1)**
9. Update database client factory to route based on `DATABASE_PROVIDER`
10. Add PostgreSQL support to existing SnowflakeQueryTool (rename to DatabaseQueryTool)
11. Test all investigation workflows on PostgreSQL
12. Validate 100% query compatibility

**Phase 4: Optimization (P2)**
13. Add PostgreSQL-specific indexing strategies
14. Implement query performance monitoring for both databases
15. Optimize PostgreSQL configuration for investigation workloads
16. Add connection pooling tuning

**Phase 5: Advanced Features (P3)**
17. Add database health monitoring and alerting
18. Create database performance comparison dashboards
19. Implement database performance profiling tools

---

## Non-Functional Requirements

### Performance
- **NFR-001**: PostgreSQL query execution time MUST be within 20% of equivalent Snowflake query OR 5 seconds maximum (whichever is lower), with query translation caching enabled
- **NFR-002**: Query translation cache hit rate MUST exceed 80% for repeated query patterns
- **NFR-003**: Database provider initialization MUST complete in under 5 seconds; on timeout, application MUST fail-fast with clear error message indicating provider and connection details
- **NFR-004**: Connection pool MUST support minimum 100 concurrent connections
- **NFR-005**: Query timeout MUST be configurable per environment

### Reliability
- **NFR-006**: Database abstraction layer MUST have 99.9% uptime
- **NFR-007**: Connection retry logic MUST attempt 3 retries with exponential backoff
- **NFR-008**: Migration script MUST support checkpoint/resume for reliability
- **NFR-009**: Schema validation MUST run on every application startup in all environments (development, staging, production)
- **NFR-010**: CI/CD pipeline MUST include automated schema validation checks before deployment

### Maintainability
- **NFR-011**: Zero code changes required in existing investigation logic
- **NFR-012**: Database provider switch MUST require only environment variable change
- **NFR-013**: All database-specific code MUST be isolated in abstraction layer
- **NFR-014**: Comprehensive logging for debugging database-specific issues

### Security
- **NFR-015**: PostgreSQL credentials MUST never be hardcoded
- **NFR-016**: All database connections MUST use SSL/TLS
- **NFR-017**: Query validation MUST block dangerous SQL keywords
- **NFR-018**: Database roles MUST enforce read-only access

### Cost
- **NFR-019**: PostgreSQL operation MUST have zero Snowflake costs
- **NFR-020**: PostgreSQL MUST run in Docker container for development (zero infrastructure cost)
- **NFR-021**: Migration MUST be one-time cost (minimal Snowflake query usage)

---

## Clarifications

### Session 2025-11-01

- Q: What is the preferred PostgreSQL hosting option? → A: Docker container locally for development only
- Q: Should bidirectional sync be implemented immediately, or is one-time migration sufficient? → A: One-time migration only (no sync capability)
- Q: Should SQL syntax translation happen at build-time or runtime? → A: Runtime translation with query caching
- Q: Should Snowflake and PostgreSQL share a connection pool or have separate pools? → A: Separate connection pools per provider
- Q: Should schema validation run on every startup or only during development? → A: Startup validation in all environments + CI pipeline checks

---

## Open Questions

1. **[DEFERRED TO PLANNING]**: Should we support MySQL as well, or only PostgreSQL? PostgreSQL recommended for better type compatibility with Snowflake.

2. **[DEFERRED TO PLANNING]**: What is the timeline for completely decommissioning Snowflake? Or should both remain active indefinitely?

---

## Related Documentation

- **Snowflake Integration Analysis**: `/docs/analysis/snowflake-integration-analysis-2025-11-01.md`
- **Snowflake Schema**: `scripts/snowflake_setup.sql` (186 columns)
- **Current Snowflake Client**: `app/service/agent/tools/snowflake_tool/real_client.py`
- **Query Builder**: `app/service/agent/tools/snowflake_tool/query_builder.py`
- **Schema Constants**: `app/service/agent/tools/snowflake_tool/schema_constants.py`
