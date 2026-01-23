# Pre-Migration Checklist

**Date**: 2025-11-02
**Migration**: Snowflake → PostgreSQL
**Status**: ⚠️ AWAITING USER APPROVAL

---

## ⚠️ CRITICAL: User Approval Required

**This is a LIVE data migration operation that**:
- ✅ Connects to production Snowflake database (costs money)
- ✅ Connects to production PostgreSQL database
- ✅ Migrates actual data (potentially thousands/millions of records)
- ⚠️ Cannot be easily reversed without a full restore

**User must explicitly approve before proceeding.**

---

## Pre-Migration Checklist

### 1. Database Connectivity ⚠️ NOT VERIFIED

- [ ] Snowflake connection configured and tested
  - **Required**: `SNOWFLAKE_CONNECTION_STRING` environment variable
  - **Required**: `SNOWFLAKE_TRANSACTIONS_TABLE` (default: TRANSACTIONS_ENRICHED)

- [ ] PostgreSQL connection configured and tested
  - **Required**: `POSTGRES_HOST`
  - **Required**: `POSTGRES_PORT`
  - **Required**: `POSTGRES_DATABASE`
  - **Required**: `POSTGRES_USER`
  - **Required**: `POSTGRES_PASSWORD`
  - **Required**: `POSTGRES_TRANSACTIONS_TABLE` (default: transactions_enriched)

**Verification Command**:
```bash
cd /Users/gklainert/Documents/olorin/olorin-server

# Test Snowflake connection
poetry run python -c "
from app.service.agent.tools.database_tool import get_database_provider
import asyncio

async def test_snowflake():
    sf = get_database_provider('snowflake')
    await sf.connect()
    print('✅ Snowflake connection successful')
    await sf.disconnect()

asyncio.run(test_snowflake())
"

# Test PostgreSQL connection
poetry run python -c "
from app.service.agent.tools.database_tool import get_database_provider
import asyncio

async def test_postgres():
    pg = get_database_provider('postgresql')
    await pg.connect()
    print('✅ PostgreSQL connection successful')
    await pg.disconnect()

asyncio.run(test_postgres())
"
```

---

### 2. Schema Validation ⚠️ NOT VERIFIED

- [ ] PostgreSQL schema matches Snowflake schema (333 columns)
- [ ] All indexes created in PostgreSQL
- [ ] Table exists in both databases

**Verification Command**:
```bash
poetry run python -c "
from app.service.agent.tools.database_tool import SchemaValidator, get_database_provider
import asyncio

async def validate_schema():
    sf = get_database_provider('snowflake')
    pg = get_database_provider('postgresql')
    validator = SchemaValidator()

    await sf.connect()
    await pg.connect()

    result = await validator.validate_schema_parity(sf, pg)

    if result['is_valid']:
        print('✅ Schema validation PASSED')
        print(f'   Snowflake columns: {result[\"snowflake_columns\"]}')
        print(f'   PostgreSQL columns: {result[\"postgresql_columns\"]}')
    else:
        print('❌ Schema validation FAILED')
        print(f'   Mismatched columns: {len(result[\"mismatched_columns\"])}')

    await sf.disconnect()
    await pg.disconnect()

    return result['is_valid']

asyncio.run(validate_schema())
"
```

---

### 3. Data Volume Assessment ⚠️ NOT VERIFIED

- [ ] Know total record count in Snowflake
- [ ] Estimated migration time calculated
- [ ] Sufficient disk space in PostgreSQL

**Verification Command**:
```bash
poetry run python -c "
from app.service.agent.tools.database_tool import get_database_provider
import asyncio

async def count_records():
    sf = get_database_provider('snowflake')
    await sf.connect()

    result = await sf.execute_query('SELECT COUNT(*) as total FROM TRANSACTIONS_ENRICHED')
    total = result[0]['total']

    print(f'Total records to migrate: {total:,}')
    print(f'Estimated time at 200 rec/sec: {total/200/60:.1f} minutes')
    print(f'Estimated time at 500 rec/sec: {total/500/60:.1f} minutes')

    await sf.disconnect()

asyncio.run(count_records())
"
```

---

### 4. Backup & Rollback Plan ⚠️ NOT VERIFIED

- [ ] PostgreSQL database backup taken (in case rollback needed)
- [ ] Backup verified and restorable
- [ ] Rollback procedure documented

**Backup Command** (PostgreSQL):
```bash
# Create backup before migration
pg_dump -h localhost -U olorin_user -d olorin_db > pre_migration_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and is non-empty
ls -lh pre_migration_backup_*.sql
```

---

### 5. Migration Configuration ⚠️ NEEDS APPROVAL

**Recommended Migration Strategy**:

#### Option A: Test Migration (RECOMMENDED FIRST)
```bash
# Migrate ONLY 100 records as a test
poetry run python scripts/migrate_snowflake_to_postgres.py \
  --batch-size 100 \
  --checkpoint-file test_migration_checkpoint.json

# Validate test migration
poetry run python scripts/migrate_snowflake_to_postgres.py \
  --validate-only \
  --checkpoint-file test_migration_checkpoint.json
```

**Expected Duration**: 1-2 seconds
**Risk**: Very Low (only 100 records)

#### Option B: Full Migration (AFTER TEST SUCCEEDS)
```bash
# Full migration with default batch size (500 records/batch)
poetry run python scripts/migrate_snowflake_to_postgres.py \
  --batch-size 500

# Or custom batch size
poetry run python scripts/migrate_snowflake_to_postgres.py \
  --batch-size 1000
```

**Expected Duration**: Depends on total record count
- 10,000 records: ~20-50 seconds
- 100,000 records: ~3-8 minutes
- 1,000,000 records: ~30-80 minutes

**Risk**: Medium (full data migration)

---

### 6. Monitoring & Validation ⚠️ NOT CONFIGURED

- [ ] Migration progress logging enabled
- [ ] Slow query monitoring configured
- [ ] Post-migration validation planned

**Migration Features** (automatically included):
- ✅ Batch processing
- ✅ Checkpoint/resume capability
- ✅ Progress logging
- ✅ Time estimates
- ✅ Automatic validation
- ✅ Idempotent (ON CONFLICT DO NOTHING)

---

## Migration Execution Plan

### Phase 1: Pre-Flight Checks (REQUIRED)
1. ✅ Verify database connections
2. ✅ Validate schema parity (333 columns)
3. ✅ Count total records
4. ✅ Take PostgreSQL backup
5. ✅ Review and approve migration parameters

### Phase 2: Test Migration (RECOMMENDED)
1. ✅ Migrate 100 test records
2. ✅ Validate test data
3. ✅ Verify query performance
4. ✅ Check data integrity

### Phase 3: Full Migration (ONLY AFTER TEST SUCCEEDS)
1. ✅ Execute full migration with approved batch size
2. ✅ Monitor progress and performance
3. ✅ Validate complete migration
4. ✅ Clean up checkpoint file

### Phase 4: Post-Migration (VERIFICATION)
1. ✅ Run schema validation
2. ✅ Run query parity tests
3. ✅ Run performance benchmarks
4. ✅ Verify all 333 columns populated
5. ✅ Test application queries

---

## User Approval Required

**Before proceeding with migration, please confirm**:

1. **Database Configuration**:
   - [ ] I confirm Snowflake connection is configured
   - [ ] I confirm PostgreSQL connection is configured
   - [ ] I confirm PostgreSQL schema matches Snowflake (333 columns)

2. **Migration Strategy**:
   - [ ] I approve starting with test migration (100 records)
   - [ ] OR I approve full migration directly (specify batch size: ___)

3. **Risk Acknowledgment**:
   - [ ] I understand this connects to LIVE databases
   - [ ] I understand Snowflake queries cost money
   - [ ] I have taken a PostgreSQL backup
   - [ ] I have a rollback plan if migration fails

4. **Migration Parameters** (to be confirmed):
   - Batch size: _____ (default: 500)
   - Checkpoint file: _____ (default: migration_checkpoint.json)
   - Validation: _____ (default: enabled)

---

## Next Steps

**Awaiting user confirmation for**:

1. Run pre-flight database connectivity checks
2. Run schema validation (333 columns)
3. Count total records in Snowflake
4. Take PostgreSQL backup
5. Execute test migration (100 records)
6. If test succeeds, execute full migration

**User must explicitly type "APPROVED" to proceed with migration.**

---

**Safety Officer**: Claude Code
**Status**: ⚠️ AWAITING USER APPROVAL
**Date**: 2025-11-02
