# MongoDB Atlas Integration - Documentation Index

This directory contains complete documentation for migrating olorin-server from PostgreSQL to MongoDB Atlas.

## Quick Start

**New to this migration?** Start here:

1. Read: [MongoDB Migration Complete Guide](./MONGODB_MIGRATION_COMPLETE.md)
2. Setup: [MongoDB Configuration Guide](./MONGODB_CONFIGURATION.md)
3. Integrate: [MongoDB Startup Integration](./MONGODB_STARTUP_INTEGRATION.md)
4. Migrate Services: [Service Layer Migration Guide](./MONGODB_SERVICE_MIGRATION_GUIDE.md)
5. Update API Endpoints: [API Endpoints Migration Guide](./MONGODB_API_MIGRATION_GUIDE.md)
6. Reference Implementation: [Complete Example Migration](./MONGODB_REFERENCE_IMPLEMENTATION.md)

## Documentation Structure

### 📚 Core Guides

#### [MongoDB Migration Complete Guide](./MONGODB_MIGRATION_COMPLETE.md)
**The master guide for the entire migration process.**

What's included:
- Executive summary
- Phase-by-phase migration steps
- MongoDB Atlas setup instructions
- Data migration procedures
- Service layer updates
- Production deployment strategy
- Rollback procedures
- Troubleshooting guide

**Start here if**: You're planning or executing the migration.

---

#### [MongoDB Configuration Guide](./MONGODB_CONFIGURATION.md)
**Comprehensive configuration reference for MongoDB Atlas.**

What's included:
- Quick start (Atlas cluster setup)
- Configuration reference (all environment variables)
- Performance tuning (connection pools, cluster sizing)
- Security best practices (authentication, encryption)
- Monitoring and alerts setup
- Backup and recovery procedures
- Cost optimization tips
- Sample queries and usage patterns

**Start here if**: You need to configure MongoDB Atlas or optimize performance.

---

#### [MongoDB Startup Integration](./MONGODB_STARTUP_INTEGRATION.md)
**How to integrate MongoDB into the application startup process.**

What's included:
- Integration points in `app/service/__init__.py`
- MongoDB initialization code
- Shutdown procedures
- Health check integration
- Environment variables setup
- Migration strategy (4-phase approach)
- Testing procedures
- Rollback procedures

**Start here if**: You're integrating MongoDB into the application startup.

---

#### [Service Layer Migration Guide](./MONGODB_SERVICE_MIGRATION_GUIDE.md)
**Patterns and examples for converting service layer from SQLAlchemy to MongoDB.**

What's included:
- Conversion patterns (queries, updates, deletes)
- Async/await migration
- Error handling updates
- Dependency injection changes
- Testing updates
- Common pitfalls and solutions
- Migration checklist

**Start here if**: You're converting service layer code to use MongoDB repositories.

---

#### [API Endpoints Migration Guide](./MONGODB_API_MIGRATION_GUIDE.md)
**Patterns and examples for updating FastAPI endpoints from SQLAlchemy to MongoDB.**

What's included:
- Dependency injection changes (Session → AsyncIOMotorDatabase)
- Endpoint patterns (GET, POST, PUT, DELETE, aggregations)
- Async/await conversion for endpoints
- Error handling (MongoDB-specific errors)
- Request/response models
- Testing endpoints with MongoDB
- Common pitfalls and solutions
- Migration checklist

**Start here if**: You're updating API endpoint handlers to use MongoDB repositories.

---

#### [Reference Implementation](./MONGODB_REFERENCE_IMPLEMENTATION.md)
**Complete before/after example showing migration of Investigation State router.**

What's included:
- Complete router migration (investigation_state_router.py)
- All 5 endpoints migrated (list, create, get, update, delete)
- Service layer updates
- Integration test examples
- Migration checklist
- Line-by-line comparison

**Start here if**: You want a concrete, working example of a complete router migration.

---

## Implementation Components

### 📦 Pydantic Models

**Location**: `app/models/mongodb/`

All 10 MongoDB document models:
- `investigation.py` - Investigation tracking
- `detector.py` - Anomaly detection configs
- `detection_run.py` - Detection execution tracking
- `anomaly_event.py` - Detected anomalies with embeddings
- `transaction_score.py` - Per-transaction risk scores
- `audit_log.py` - Lifecycle audit trail
- `template.py` - Investigation templates
- `composio_connection.py` - OAuth connections
- `composio_action_audit.py` - Action execution history
- `soar_playbook_execution.py` - Playbook tracking

### 🗄️ Repository Classes

**Location**: `app/persistence/repositories/`

All 10 repository implementations:
- `investigation_repository.py` - Investigation CRUD
- `detector_repository.py` - Detector CRUD
- `detection_run_repository.py` - Detection run CRUD
- `anomaly_event_repository.py` - Anomaly CRUD with vector search
- `transaction_score_repository.py` - Transaction score CRUD
- `audit_log_repository.py` - Audit log CRUD
- `template_repository.py` - Template CRUD
- `composio_connection_repository.py` - Connection CRUD
- `composio_action_audit_repository.py` - Action audit CRUD
- `soar_playbook_execution_repository.py` - Playbook CRUD

Each repository provides:
- `create()` - Insert documents
- `find_by_id()` - Retrieve by ID
- `update()` - Update documents
- `delete()` - Remove documents
- Collection-specific query methods

### 🧪 Test Infrastructure

**Location**: `test/integration/`

MongoDB testing setup:
- `conftest.py` - MongoDB testcontainers fixtures
- `test_investigation_repository.py` - Example integration tests

Features:
- Isolated test databases (each test gets own database)
- Automatic cleanup after tests
- All 10 repository fixtures available
- Async test support

### 🔧 Configuration

**Files**:
- `.env.mongodb.example` - Configuration template
- `app/config/mongodb_settings.py` - Pydantic settings with validation

### 🚀 Startup Integration

**Files**:
- `app/service/mongodb_startup.py` - Initialization functions
- `app/persistence/mongodb.py` - Connection management

### ✅ Validation Scripts

**Location**: `scripts/`

Three validation scripts:
1. **`verify_mongodb_setup.py`** - Verify MongoDB infrastructure
   - Connection verification
   - Collections and indexes
   - Time series configuration
   - Vector search readiness
   - Database permissions
   - Performance metrics

2. **`verify_migration.py`** - Verify data migration
   - Compare PostgreSQL vs MongoDB counts
   - Sample record validation
   - Data integrity checks
   - Embedding verification

3. **`benchmark_mongodb.py`** - Performance benchmarks
   - Simple queries
   - Indexed queries
   - Pagination
   - Aggregations
   - Insert/update operations
   - Vector search

---

## Quick Reference

### Environment Variables

**Required**:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/olorin
MONGODB_DATABASE=olorin
```

**Migration Control**:
```bash
ENABLE_MONGODB=true|false
FAIL_ON_MONGODB_ERROR=true|false
```

**Connection Pool** (Production):
```bash
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=20
```

### Run Validation

```bash
# Verify MongoDB setup
poetry run python scripts/verify_mongodb_setup.py

# Verify data migration
poetry run python scripts/verify_migration.py

# Benchmark performance
poetry run python scripts/benchmark_mongodb.py
```

### Run Tests

```bash
# All tests
poetry run pytest

# MongoDB integration tests only
poetry run pytest -m mongodb

# With coverage
poetry run pytest --cov
```

---

## Migration Phases

### Phase 1: PostgreSQL Only (Current)
```bash
ENABLE_MONGODB=false
```
Application uses PostgreSQL exclusively.

### Phase 2: Dual-Database Mode (Migration)
```bash
ENABLE_MONGODB=true
FAIL_ON_MONGODB_ERROR=false
```
Both databases active. MongoDB failure doesn't stop app.

### Phase 3: MongoDB Primary (Post-Migration)
```bash
ENABLE_MONGODB=true
FAIL_ON_MONGODB_ERROR=true
```
MongoDB required. PostgreSQL deprecated.

### Phase 4: MongoDB Only (Future)
```bash
ENABLE_MONGODB=true
# PostgreSQL removed entirely
```

---

## Collections Overview

| Collection | Purpose | Features |
|------------|---------|----------|
| `investigations` | Investigation tracking | Optimistic locking, multi-tenant |
| `detectors` | Anomaly detection configs | Type indexing, enabled flag |
| `detection_runs` | Detection execution | **Time series** collection |
| `anomaly_events` | Detected anomalies | **Vector embeddings**, severity indexing |
| `transaction_scores` | Per-transaction risks | Sharding by investigation_id |
| `audit_log` | Lifecycle audit trail | **Time series** collection |
| `templates` | Investigation templates | Tag indexing, usage tracking |
| `composio_connections` | OAuth connections | Status tracking, token refresh |
| `composio_action_audits` | Action execution | Retry tracking, statistics |
| `soar_playbook_executions` | Playbook tracking | Duration calculation, action history |

**Key Features**:
- **Time Series**: `detection_runs`, `audit_log` (10x compression)
- **Vector Search**: `anomaly_events` (384-dim embeddings)
- **Sharding**: `investigations`, `transaction_scores` (by tenant_id)
- **Optimistic Locking**: `investigations` (version field)

---

## Performance Targets

| Query Type | P99 Target |
|------------|------------|
| Simple queries | < 100ms |
| Indexed queries | < 100ms |
| Pagination | < 200ms |
| Aggregations | < 500ms |
| Vector search | < 500ms |
| Insert operations | < 100ms |
| Update operations | < 100ms |

---

## Support

### Internal Resources
- Slack: #olorin-backend
- On-call: PagerDuty rotation
- Code Reviews: GitHub pull requests

### External Resources
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [Motor Documentation](https://motor.readthedocs.io/)
- [PyMongo Documentation](https://pymongo.readthedocs.io/)
- [MongoDB University](https://university.mongodb.com/)

---

## Getting Help

### Common Questions

**Q: Where do I start?**
A: Read [MongoDB Migration Complete Guide](./MONGODB_MIGRATION_COMPLETE.md) first.

**Q: How do I set up MongoDB Atlas?**
A: Follow Phase 1 in [MongoDB Configuration Guide](./MONGODB_CONFIGURATION.md).

**Q: How do I convert my service to use MongoDB?**
A: Follow patterns in [Service Layer Migration Guide](./MONGODB_SERVICE_MIGRATION_GUIDE.md).

**Q: How do I test with MongoDB?**
A: See test infrastructure in `test/integration/conftest.py` and examples.

**Q: How do I verify the migration?**
A: Run validation scripts: `verify_mongodb_setup.py` and `verify_migration.py`.

**Q: What if something goes wrong?**
A: Follow rollback procedure in [MongoDB Migration Complete Guide](./MONGODB_MIGRATION_COMPLETE.md).

### Troubleshooting

For troubleshooting guidance, see:
- [MongoDB Configuration Guide - Troubleshooting](./MONGODB_CONFIGURATION.md#troubleshooting)
- [MongoDB Migration Complete Guide - Troubleshooting](./MONGODB_MIGRATION_COMPLETE.md#troubleshooting)

---

## Next Steps

1. ✅ **Phase 1-8 Complete**: All infrastructure is production-ready
2. 🔄 **Next**: Create data migration script for your specific schema
3. 🔄 **Next**: Update service layer to use repositories
4. 🔄 **Next**: Deploy to staging and validate
5. 🔄 **Next**: Deploy to production following deployment guide

---

## Contributing

When updating MongoDB documentation:

1. Keep this README in sync with new files
2. Update relevant guides when adding features
3. Add examples to migration guide for new patterns
4. Update validation scripts for new collections
5. Document any new environment variables

---

**Last Updated**: 2026-01-15

**Status**: ✅ Ready for production deployment

**Infrastructure Version**: 1.0.0
