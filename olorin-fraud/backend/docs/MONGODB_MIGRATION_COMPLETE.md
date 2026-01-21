# MongoDB Atlas Migration - Complete Guide

## Executive Summary

This guide provides complete instructions for migrating olorin-server from PostgreSQL to MongoDB Atlas. The migration infrastructure is **production-ready** and includes:

- ✅ **10 Pydantic models** - Type-safe document models for all collections
- ✅ **10 Repository classes** - Clean data access layer with async operations
- ✅ **Test infrastructure** - MongoDB testcontainers with isolated test databases
- ✅ **Configuration system** - Environment-driven with fail-fast validation
- ✅ **Startup integration** - Graceful initialization with rollback capability
- ✅ **Validation scripts** - Comprehensive verification and benchmarking
- ✅ **Migration guide** - Service layer conversion patterns
- ✅ **Documentation** - Complete setup and troubleshooting guides

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Setup MongoDB Atlas](#phase-1-setup-mongodb-atlas)
4. [Phase 2: Configure Environment](#phase-2-configure-environment)
5. [Phase 3: Run Validation](#phase-3-run-validation)
6. [Phase 4: Data Migration](#phase-4-data-migration)
7. [Phase 5: Update Services](#phase-5-update-services)
8. [Phase 6: Deploy to Production](#phase-6-deploy-to-production)
9. [Phase 7: Monitor and Verify](#phase-7-monitor-and-verify)
10. [Rollback Procedure](#rollback-procedure)
11. [Troubleshooting](#troubleshooting)

---

## Migration Overview

### Architecture Changes

**Before (PostgreSQL)**:
```
FastAPI → SQLAlchemy ORM → PostgreSQL + pgvector
```

**After (MongoDB Atlas)**:
```
FastAPI → Repository Pattern → Motor (async) → MongoDB Atlas
                                  ↓
                    Vector Search + Atlas Search + Time Series
```

### Key Benefits

1. **Scalability**: Horizontal sharding with tenant_id
2. **Performance**:
   - Time series collections (10x compression)
   - Atlas Vector Search (optimized embeddings)
   - Compound indexes for common queries
3. **Flexibility**: Schema evolution without migrations
4. **Features**:
   - Vector similarity search for anomalies
   - Full-text search capabilities
   - Time series optimizations
   - Multi-tenancy built-in

### Migration Strategy

We use a **phased approach** allowing gradual migration:

- **Phase 1**: PostgreSQL only (current state)
- **Phase 2**: Dual-database mode (migration in progress)
- **Phase 3**: MongoDB primary (post-migration)
- **Phase 4**: MongoDB only (future state)

This allows rollback at any point before Phase 4.

---

## Prerequisites

### Required Tools

- Python 3.11+
- Poetry
- MongoDB Atlas account
- Access to production PostgreSQL database

### Required Access

- MongoDB Atlas Admin Console
- Firebase Secrets Manager (for production)
- Production deployment pipeline

### Estimated Time

- **Staging Migration**: 4-6 hours
- **Production Migration**: 8-12 hours (includes validation)
- **Post-Migration Monitoring**: 7 days

---

## Phase 1: Setup MongoDB Atlas

### Step 1.1: Create MongoDB Atlas Cluster

1. **Go to MongoDB Atlas**: https://cloud.mongodb.com
2. **Create New Cluster**:
   - **Development**: M0 Free tier
   - **Staging**: M10 (2GB RAM, 10GB storage)
   - **Production**: M30+ (8GB+ RAM, 40GB+ storage)
3. **Select Region**: Choose region closest to application servers
4. **Name Cluster**: e.g., `olorin-production`

### Step 1.2: Configure Database Access

1. **Go to Database Access**
2. **Add New Database User**:
   - Username: `olorin-app-user`
   - Authentication: Password (generate strong password)
   - Built-in Role: `readWrite` for `olorin` database
3. **Save credentials securely** (you cannot view password again)

### Step 1.3: Configure Network Access

1. **Go to Network Access**
2. **Add IP Address**:
   - **Development**: Your current IP
   - **Production**: Application server IPs
   - ⚠️ **Never use `0.0.0.0/0` in production**

### Step 1.4: Get Connection String

1. **Click "Connect"** on your cluster
2. **Select "Connect your application"**
3. **Choose Driver**: Python / 3.11 or later
4. **Copy connection string**:
   ```
   mongodb+srv://olorin-app-user:<password>@cluster.mongodb.net/olorin?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with actual password
6. **Replace `<dbname>`** with `olorin`

### Step 1.5: Create Atlas Vector Search Index

Required for anomaly similarity search:

1. **Go to cluster → "Atlas Search" tab**
2. **Click "Create Search Index"**
3. **Select "JSON Editor"**
4. **Configuration**:
   - Database: `olorin`
   - Collection: `anomaly_events`
   - Index Name: `anomaly_vector_index`
   - Definition:
     ```json
     {
       "mappings": {
         "fields": {
           "embedding": {
             "type": "knnVector",
             "dimensions": 384,
             "similarity": "cosine"
           },
           "tenant_id": {"type": "token"},
           "severity": {"type": "token"},
           "detector_id": {"type": "token"}
         }
       }
     }
     ```

### Step 1.6: Create Atlas Search Index (Optional)

For full-text search:

1. **Create another Search Index**
2. **Configuration**:
   - Database: `olorin`
   - Collection: `investigations`
   - Index Name: `investigations_search`
   - Definition:
     ```json
     {
       "mappings": {
         "dynamic": false,
         "fields": {
           "settings.entity_value": {
             "type": "string",
             "analyzer": "lucene.standard"
           },
           "results.findings": {
             "type": "string",
             "analyzer": "lucene.standard"
           },
           "results.summary": {
             "type": "string",
             "analyzer": "lucene.standard"
           }
         }
       }
     }
     ```

---

## Phase 2: Configure Environment

### Step 2.1: Copy Example Configuration

```bash
cd olorin-server
cp .env.mongodb.example .env.mongodb
```

### Step 2.2: Edit Configuration

Edit `.env.mongodb` with your MongoDB Atlas connection string:

```bash
# MongoDB Atlas Connection (REQUIRED)
MONGODB_URI=mongodb+srv://olorin-app-user:YOUR_PASSWORD@cluster.mongodb.net/olorin?retryWrites=true&w=majority

# MongoDB Database Name (REQUIRED)
MONGODB_DATABASE=olorin

# Connection Pool (Production Settings)
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=20
MONGODB_MAX_IDLE_TIME_MS=45000
MONGODB_CONNECT_TIMEOUT_MS=30000
MONGODB_SOCKET_TIMEOUT_MS=60000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=30000

# Atlas Features
MONGODB_ENABLE_VECTOR_SEARCH=true
MONGODB_VECTOR_SEARCH_INDEX=anomaly_vector_index
MONGODB_ENABLE_ATLAS_SEARCH=true
MONGODB_ENABLE_TIME_SERIES=true

# Embedding Settings
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
EMBEDDING_BATCH_SIZE=32
EMBEDDING_DIMENSION=384

# Multi-Tenancy
DEFAULT_TENANT_ID=default
ENABLE_TENANT_ISOLATION=true

# Performance
ENABLE_QUERY_CACHE=true
QUERY_CACHE_TTL=300
```

### Step 2.3: Set Migration Control Variables

Add to `.env`:

```bash
# Enable MongoDB (default: false for backwards compatibility)
ENABLE_MONGODB=true

# Fail startup if MongoDB initialization fails (default: false)
FAIL_ON_MONGODB_ERROR=false
```

### Step 2.4: Production Secret Management

**For production**, store MongoDB URI in Firebase Secrets:

```bash
# Store secret
firebase functions:secrets:set MONGODB_URI

# Verify secret
firebase functions:secrets:access MONGODB_URI
```

---

## Phase 3: Run Validation

### Step 3.1: Verify MongoDB Setup

```bash
cd olorin-server
poetry run python scripts/verify_mongodb_setup.py
```

**Expected Output**:
```
================================================================================
🔍 MongoDB Setup Verification Starting
================================================================================

1. Verifying MongoDB connection...
   ✅ Connected to MongoDB 7.0.4

2. Verifying collections...
   ✅ All 10 collections exist

3. Verifying indexes...
   ✅ All required indexes verified

4. Verifying time series collections...
   ✅ All 2 time series collections verified

5. Verifying Atlas Vector Search...
   ✅ Vector search ready (embedding dimension: 384)

6. Verifying database permissions...
   ✅ Database user has read/write permissions

7. Verifying performance...
   ✅ Query performance acceptable (45.23ms)

================================================================================
📊 Verification Summary
================================================================================
✅ PASS: Connection
✅ PASS: Collections
✅ PASS: Indexes
✅ PASS: Time Series
✅ PASS: Vector Search
✅ PASS: Permissions
✅ PASS: Performance

Total Checks: 7
Passed: 7
Failed: 0

✅ All verifications passed! MongoDB setup is correct.
================================================================================
```

### Step 3.2: Run Performance Benchmark

```bash
poetry run python scripts/benchmark_mongodb.py
```

**Performance Targets**:
- Simple queries: P99 < 100ms
- Indexed queries: P99 < 100ms
- Pagination: P99 < 200ms
- Aggregations: P99 < 500ms
- Vector search: P99 < 500ms

---

## Phase 4: Data Migration

### Step 4.1: Create Migration Script

**Note**: The actual data migration script needs to be created based on your specific PostgreSQL schema. Here's the template:

```python
# scripts/migrate_data_postgres_to_mongodb.py

"""Data Migration from PostgreSQL to MongoDB.

This script migrates all data from PostgreSQL to MongoDB Atlas.
"""

import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from motor.motor_asyncio import AsyncIOMotorClient

from app.config.mongodb_settings import get_mongodb_settings
from app.models.investigation import InvestigationState  # PostgreSQL model
from app.models.mongodb.investigation import Investigation  # MongoDB model
from app.persistence.repositories import InvestigationRepository

async def migrate_investigations(pg_engine, mongodb_repo):
    """Migrate investigations from PostgreSQL to MongoDB."""
    with Session(pg_engine) as session:
        # Batch process in chunks of 1000
        offset = 0
        batch_size = 1000

        while True:
            batch = session.query(InvestigationState).offset(offset).limit(batch_size).all()
            if not batch:
                break

            for pg_inv in batch:
                # Transform PostgreSQL model to MongoDB model
                mongo_inv = Investigation(
                    investigation_id=pg_inv.investigation_id,
                    user_id=pg_inv.user_id,
                    tenant_id=pg_inv.tenant_id or "default",
                    lifecycle_stage=pg_inv.lifecycle_stage,
                    status=pg_inv.status,
                    settings=pg_inv.settings,
                    progress=pg_inv.progress,
                    results=pg_inv.results,
                    version=pg_inv.version or 1,
                    created_at=pg_inv.created_at,
                    updated_at=pg_inv.updated_at,
                )

                # Insert into MongoDB
                await mongodb_repo.create(mongo_inv)

            offset += batch_size
            print(f"Migrated {offset} investigations...")

# Similar functions for other collections...
```

### Step 4.2: Run Migration

```bash
# Set PostgreSQL connection
export DATABASE_URL="postgresql://user:pass@host:5432/olorin"

# Run migration
poetry run python scripts/migrate_data_postgres_to_mongodb.py
```

### Step 4.3: Verify Migration

```bash
poetry run python scripts/verify_migration.py
```

**Expected Output**:
```
================================================================================
🔍 Data Migration Verification Starting
================================================================================

1. Verifying investigations migration...
   ✅ All 1,234 investigations verified

2. Verifying collection counts...
   📊 investigations: 1,234 documents
   📊 detectors: 56 documents
   📊 detection_runs: 8,901 documents
   📊 anomaly_events: 12,456 documents
   ...
   ✅ Total documents across all collections: 45,678

3. Verifying indexes...
   ✅ All required indexes present

4. Verifying data integrity...
   ✅ Data integrity checks passed

5. Verifying embeddings...
   ✅ Embeddings verified: 12,456/12,456 (100.0%)

================================================================================
📊 Migration Verification Summary
================================================================================
✅ All verifications passed! Migration successful.
================================================================================
```

---

## Phase 5: Update Services

### Step 5.1: Review Migration Guide

Read the comprehensive service layer migration guide:

```bash
cat docs/MONGODB_SERVICE_MIGRATION_GUIDE.md
```

### Step 5.2: Update Services Gradually

Convert services one at a time following the patterns in the guide:

```python
# Example: Update InvestigationService

# Before (SQLAlchemy)
class InvestigationService:
    def __init__(self, db: Session):
        self.db = db

    def create_investigation(self, user_id: str, data: dict):
        inv = InvestigationState(...)
        self.db.add(inv)
        self.db.commit()
        return inv

# After (MongoDB)
class InvestigationService:
    def __init__(self, repository: InvestigationRepository):
        self.repository = repository

    async def create_investigation(self, user_id: str, data: dict):
        inv = Investigation(...)
        created = await self.repository.create(inv)
        return created
```

### Step 5.3: Update Dependency Injection

Modify `app/service/__init__.py` to inject repositories instead of database sessions:

```python
# Initialize MongoDB repositories
from app.persistence.repositories import (
    InvestigationRepository,
    DetectorRepository,
    # ... other repositories
)
from app.persistence.mongodb import get_mongodb

db = get_mongodb()
investigation_repository = InvestigationRepository(db)
detector_repository = DetectorRepository(db)
# ... other repositories

# Inject into services
investigation_service = InvestigationService(investigation_repository)
```

### Step 5.4: Update Tests

Update service tests to use MongoDB repositories:

```python
@pytest.mark.asyncio
async def test_create_investigation(investigation_repository):
    service = InvestigationService(investigation_repository)

    result = await service.create_investigation(
        user_id="test-user",
        data={"entity_type": "user", "entity_value": "test@example.com"}
    )

    assert result.investigation_id is not None
    assert result.user_id == "test-user"
```

---

## Phase 6: Deploy to Production

### Step 6.1: Pre-Deployment Checklist

- [ ] MongoDB Atlas cluster provisioned (M30+)
- [ ] Connection string tested
- [ ] IP whitelist configured
- [ ] Database user permissions verified
- [ ] Atlas Vector Search indexes created
- [ ] Environment variables in Firebase Secrets
- [ ] Validation scripts pass
- [ ] Performance benchmarks acceptable
- [ ] Rollback plan documented

### Step 6.2: Deployment Strategy

#### Staging Deployment (Day 1)

```bash
# Enable MongoDB in staging
export ENABLE_MONGODB=true
export FAIL_ON_MONGODB_ERROR=false

# Deploy to staging
firebase deploy --only functions:staging
```

**Monitor for 24 hours**:
- Error rates
- Response times
- Connection pool usage
- Memory usage

#### Canary Deployment (Day 2-3)

```bash
# Deploy to 10% of production traffic
firebase deploy --only functions:production --canary 10

# Monitor for 48 hours
```

#### Full Production Deployment (Day 4)

```bash
# Enable MongoDB for all traffic
export ENABLE_MONGODB=true
export FAIL_ON_MONGODB_ERROR=true

# Deploy to 100% of production
firebase deploy --only functions:production
```

### Step 6.3: Deployment Day Checklist

**Hour 0-1: Pre-Deployment**
- [ ] Notify team of deployment window
- [ ] Enable read-only mode on PostgreSQL
- [ ] Create PostgreSQL backup
- [ ] Run final data migration
- [ ] Verify data integrity

**Hour 1-2: Deployment**
- [ ] Deploy MongoDB-enabled application
- [ ] Verify health endpoints
- [ ] Run smoke tests
- [ ] Check error rates

**Hour 2-3: Validation**
- [ ] Test investigation creation
- [ ] Test anomaly detection workflow
- [ ] Test vector search
- [ ] Verify real-time updates
- [ ] Check all API endpoints

**Hour 3+: Monitoring**
- [ ] Monitor application logs
- [ ] Monitor MongoDB Atlas metrics
- [ ] Monitor application performance
- [ ] Check error rates every hour
- [ ] Verify data consistency

---

## Phase 7: Monitor and Verify

### Step 7.1: MongoDB Atlas Monitoring

**Key Metrics**:
- Connections: Current / Max Pool Size
- Operation Execution Time: P99 < 200ms
- Disk Usage: < 80%
- CPU Usage: < 80%
- Replication Lag: < 100ms
- Index Hit Rate: > 95%

**Access Metrics**:
1. Go to MongoDB Atlas Console
2. Select your cluster
3. Navigate to "Metrics" tab
4. Monitor real-time performance

### Step 7.2: Application Monitoring

```bash
# Check application logs
tail -f logs/backend.log | grep MongoDB

# Check health endpoint
curl http://localhost:8090/health

# Check MongoDB status
curl http://localhost:8090/status/mongodb
```

### Step 7.3: Set Up Alerts

Configure alerts in MongoDB Atlas:

1. **High Connection Count** (> 80% of max)
2. **Slow Queries** (P99 > 500ms)
3. **High Disk Usage** (> 80%)
4. **Replication Lag** (> 1 second)

### Step 7.4: Weekly Validation

For the first month, run weekly validations:

```bash
# Every Monday
poetry run python scripts/verify_migration.py
poetry run python scripts/benchmark_mongodb.py
```

---

## Rollback Procedure

### When to Rollback

Rollback if:
- Error rate > 5%
- P99 latency > 1 second
- Data consistency issues detected
- Critical functionality broken
- Connection pool exhausted

### Rollback Steps

#### Step 1: Disable MongoDB

```bash
# Update environment variables
export ENABLE_MONGODB=false

# Redeploy application
firebase deploy --only functions:production
```

#### Step 2: Re-enable PostgreSQL

The application will automatically use PostgreSQL when `ENABLE_MONGODB=false`.

#### Step 3: Verify Rollback

```bash
# Check application is using PostgreSQL
curl http://localhost:8090/status

# Verify investigations API
curl http://localhost:8090/investigations/
```

#### Step 4: Investigate Issues

1. Review application logs
2. Check MongoDB Atlas metrics
3. Analyze slow queries
4. Review error traces
5. Document findings

#### Step 5: Fix and Retry

After fixing issues:
1. Test fixes in staging
2. Run validation scripts
3. Retry production deployment

---

## Troubleshooting

### Connection Issues

**Problem**: `ServerSelectionTimeoutError: No servers found`

**Solutions**:
1. Check IP whitelist in Atlas
2. Verify connection string format
3. Test network connectivity
4. Check firewall rules
5. Verify credentials

```bash
# Test connection manually
poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test():
    client = AsyncIOMotorClient('YOUR_MONGODB_URI')
    await client.admin.command('ping')
    print('✅ Connection successful')

asyncio.run(test())
"
```

### Performance Issues

**Problem**: Slow queries (> 500ms)

**Solutions**:
1. Check indexes are being used
2. Review Performance Advisor in Atlas
3. Increase cluster tier
4. Optimize query patterns
5. Add missing indexes

```bash
# Run benchmark to identify slow queries
poetry run python scripts/benchmark_mongodb.py
```

### Data Integrity Issues

**Problem**: Missing or incorrect data

**Solutions**:
1. Run data verification script
2. Check migration logs
3. Verify data transformation logic
4. Re-run migration for affected collections

```bash
# Verify data integrity
poetry run python scripts/verify_migration.py
```

### Memory Issues

**Problem**: High memory usage

**Solutions**:
1. Reduce connection pool size
2. Check for connection leaks
3. Review batch sizes
4. Monitor memory usage

```bash
# Adjust pool size
export MONGODB_MAX_POOL_SIZE=50
export MONGODB_MIN_POOL_SIZE=10
```

---

## Success Criteria

The migration is successful when:

- ✅ All 10 collections populated with correct data
- ✅ Data counts match PostgreSQL row counts
- ✅ Sample record validation passes (100% accuracy)
- ✅ All tests pass (87%+ coverage maintained)
- ✅ P99 latency < 200ms
- ✅ Error rate < 0.1%
- ✅ Vector search returns relevant results
- ✅ Real-time updates work correctly
- ✅ Zero data loss incidents
- ✅ 7-day stable operation period completed
- ✅ Team trained on MongoDB operations
- ✅ Documentation complete and reviewed

---

## Additional Resources

### Documentation

- [MongoDB Configuration Guide](./MONGODB_CONFIGURATION.md)
- [Service Layer Migration Guide](./MONGODB_SERVICE_MIGRATION_GUIDE.md)
- [Startup Integration Guide](./MONGODB_STARTUP_INTEGRATION.md)

### Scripts

- `scripts/verify_mongodb_setup.py` - Verify MongoDB infrastructure
- `scripts/verify_migration.py` - Verify data migration
- `scripts/benchmark_mongodb.py` - Performance benchmarks

### Support

- MongoDB Atlas Docs: https://www.mongodb.com/docs/atlas/
- Motor Docs: https://motor.readthedocs.io/
- Internal: Slack #olorin-backend

---

## Conclusion

This migration guide provides everything needed to successfully migrate from PostgreSQL to MongoDB Atlas. Follow the phases sequentially, validate at each step, and monitor closely after deployment.

The infrastructure is production-ready with:
- Complete data access layer (repositories)
- Comprehensive testing infrastructure
- Validation and benchmarking scripts
- Configuration management
- Rollback capability

Good luck with your migration! 🚀
