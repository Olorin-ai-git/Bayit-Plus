# MongoDB Configuration Guide

## Overview

This guide covers MongoDB Atlas configuration for olorin-server, including connection setup, performance tuning, security best practices, and monitoring.

## Quick Start

### 1. Create MongoDB Atlas Account

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free tier or select paid tier
3. Verify email address

### 2. Create Cluster

1. Click "Build a Database"
2. Select cluster tier:
   - **Development**: M0 Free tier
   - **Staging**: M10 (2GB RAM, 10GB storage)
   - **Production**: M30+ (8GB+ RAM, 40GB+ storage)
3. Select region closest to your application
4. Name your cluster (e.g., `olorin-production`)

### 3. Configure Database Access

1. Go to "Database Access" in Atlas UI
2. Click "Add New Database User"
3. Create user with username/password authentication
4. Select "Built-in Role": `readWrite` for application database
5. Add user to allowlist
6. **Important**: Save credentials securely (you cannot view password again)

### 4. Configure Network Access

1. Go to "Network Access" in Atlas UI
2. Click "Add IP Address"
3. Options:
   - **Development**: Add your current IP (`0.0.0.0/0` for testing only - insecure!)
   - **Production**: Add your server IPs specifically
   - **Cloud**: Configure VPC peering or PrivateLink

### 5. Get Connection String

1. Click "Connect" on your cluster
2. Select "Connect your application"
3. Choose driver "Python" and version "3.11 or later"
4. Copy connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `olorin` (or your database name)

Example:
```
mongodb+srv://olorin-user:<password>@olorin-prod.abc123.mongodb.net/olorin?retryWrites=true&w=majority
```

### 6. Enable Atlas Features

#### Atlas Vector Search (for anomaly similarity search)

1. Go to cluster → "Search" tab
2. Click "Create Search Index"
3. Use "Visual Editor"
4. Index name: `anomaly_vector_index`
5. Database: `olorin`
6. Collection: `anomaly_events`
7. Index configuration:
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

#### Atlas Search (for full-text search)

1. Go to cluster → "Search" tab
2. Click "Create Search Index"
3. Use "Visual Editor"
4. Index name: `investigations_search`
5. Database: `olorin`
6. Collection: `investigations`
7. Index configuration:
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

### 7. Configure Environment

Copy `.env.mongodb.example` to `.env`:

```bash
cp .env.mongodb.example .env
```

Edit `.env` and set:

```bash
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/olorin?retryWrites=true&w=majority
MONGODB_DATABASE=olorin

# Optional (defaults shown)
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=20
MONGODB_ENABLE_VECTOR_SEARCH=true
MONGODB_ENABLE_ATLAS_SEARCH=true
```

### 8. Verify Connection

```bash
poetry run python -c "from app.persistence.mongodb import init_mongodb; import asyncio; asyncio.run(init_mongodb())"
```

Expected output:
```
INFO: MongoDB connection successful
INFO: Collections and indexes created
```

## Configuration Reference

### Connection Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB Atlas connection URI |
| `MONGODB_DATABASE` | No | `olorin` | Database name |

### Connection Pool Settings

| Variable | Default | Min | Max | Description |
|----------|---------|-----|-----|-------------|
| `MONGODB_MAX_POOL_SIZE` | 100 | 1 | 500 | Maximum connections in pool |
| `MONGODB_MIN_POOL_SIZE` | 20 | 1 | 100 | Minimum connections maintained |
| `MONGODB_MAX_IDLE_TIME_MS` | 45000 | 1000 | 300000 | Connection idle timeout |
| `MONGODB_CONNECT_TIMEOUT_MS` | 30000 | 1000 | 120000 | Connection establishment timeout |
| `MONGODB_SOCKET_TIMEOUT_MS` | 60000 | 1000 | 300000 | Socket read/write timeout |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | 30000 | 1000 | 120000 | Server selection timeout |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_ENABLE_VECTOR_SEARCH` | true | Enable Atlas Vector Search for anomalies |
| `MONGODB_ENABLE_ATLAS_SEARCH` | true | Enable Atlas full-text search |
| `MONGODB_ENABLE_TIME_SERIES` | true | Enable time series collections |

### Embedding Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_MODEL_NAME` | `all-MiniLM-L6-v2` | Sentence transformer model |
| `EMBEDDING_BATCH_SIZE` | 32 | Batch size for embedding generation |
| `EMBEDDING_DIMENSION` | 384 | Embedding vector dimension |

## Performance Tuning

### Connection Pooling

**Development:**
```bash
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
```

**Production:**
```bash
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=20
```

**High-Load Production:**
```bash
MONGODB_MAX_POOL_SIZE=200
MONGODB_MIN_POOL_SIZE=50
```

### Cluster Sizing

| Environment | Tier | RAM | Storage | Connections | Use Case |
|-------------|------|-----|---------|-------------|----------|
| Dev | M0 | 512MB | 512MB | 500 | Development only |
| Staging | M10 | 2GB | 10GB | 3000 | Testing, staging |
| Production | M30 | 8GB | 40GB | 10000 | Production (< 10K users) |
| High-Scale | M50 | 32GB | 160GB | 32000 | Production (> 10K users) |

### Index Optimization

Required indexes are automatically created by `ensure_mongodb_collections()`.

**Monitor Index Performance:**
```javascript
// In MongoDB Atlas UI → Performance Advisor
db.investigations.aggregate([
  { $indexStats: {} }
])
```

**Check Slow Queries:**
```javascript
// In MongoDB Atlas UI → Profiler
db.system.profile.find().sort({ts: -1}).limit(10)
```

### Query Optimization Tips

1. **Always use indexes**: All repository queries use indexed fields
2. **Limit results**: Use `limit` parameter in queries
3. **Project only needed fields**: Repository methods return full documents
4. **Use covered queries**: Query only indexed fields when possible
5. **Batch operations**: Use `create_batch()` for bulk inserts

## Security Best Practices

### 1. Strong Authentication

```bash
# Generate strong password
openssl rand -base64 32

# Use in connection string (URL-encoded if needed)
MONGODB_URI=mongodb+srv://username:STRONG_PASSWORD@...
```

### 2. Network Security

**Production Checklist:**
- [ ] IP whitelist configured (no `0.0.0.0/0`)
- [ ] VPC peering or PrivateLink enabled
- [ ] TLS/SSL enabled (default with `mongodb+srv://`)
- [ ] Database user has least-privilege access
- [ ] Enable 2FA on MongoDB Atlas account

### 3. Secret Management

**Development:**
- Store in `.env` file (never commit to git)
- Add `.env` to `.gitignore`

**Production:**
- Use Firebase Secrets Manager
- Use AWS Secrets Manager
- Use HashiCorp Vault
- Use Kubernetes Secrets

**Example with Firebase Secrets:**
```bash
# Store secret
firebase functions:secrets:set MONGODB_URI

# Access in code (automatic)
```

### 4. Audit Logging

Enable MongoDB audit logging in Atlas:
1. Go to cluster → "Security" → "Audit Logging"
2. Enable "Database Activities"
3. Filter by:
   - Authentication events
   - DDL operations (CREATE/DROP)
   - DML operations (INSERT/UPDATE/DELETE)

### 5. Encryption

**At Rest:**
- Enabled by default in Atlas (AES-256)
- Optionally use Customer Key Management (BYOK)

**In Transit:**
- Required with `mongodb+srv://` (TLS 1.2+)
- Certificate validation automatic

**Client-Side Field Level Encryption (CSFLE):**
```python
# For highly sensitive fields (e.g., PII)
from pymongo.encryption import ClientEncryption

# Configure in mongodb.py if needed
```

## Monitoring & Alerts

### Atlas Monitoring

**Key Metrics to Monitor:**
1. **Connections**: Current vs. max pool size
2. **Operation Execution Time**: p99 < 200ms
3. **Disk Usage**: < 80% capacity
4. **CPU Usage**: < 80% utilization
5. **Replication Lag**: < 100ms
6. **Index Miss Ratio**: < 5%

### Set Up Alerts

In Atlas UI → "Alerts":

1. **High Connection Count**
   - Metric: Connections / Connection Limit
   - Threshold: > 80%
   - Action: Email, PagerDuty, Slack

2. **Slow Queries**
   - Metric: Query Execution Time p99
   - Threshold: > 500ms
   - Action: Email

3. **High Disk Usage**
   - Metric: Disk Usage
   - Threshold: > 80%
   - Action: Email, auto-scale

4. **Replication Lag**
   - Metric: Oplog Window
   - Threshold: < 1 hour
   - Action: Email, PagerDuty

### Application Metrics

Using Prometheus (enabled by default):

```bash
# Scrape endpoint
curl http://localhost:9090/metrics

# Key metrics:
mongodb_connection_pool_size
mongodb_operations_total
mongodb_operation_duration_seconds
mongodb_errors_total
```

### Grafana Dashboard

Import prebuilt dashboard:
1. Go to Grafana → Dashboards → Import
2. Use Dashboard ID: `2583` (MongoDB Atlas)
3. Configure data source

## Troubleshooting

### Connection Issues

**Problem:** `ServerSelectionTimeoutError: No servers found`

**Solutions:**
1. Check IP whitelist includes your server IP
2. Verify connection string is correct
3. Test network connectivity: `ping cluster-name.mongodb.net`
4. Check firewall rules

**Problem:** `Authentication failed`

**Solutions:**
1. Verify username/password are correct
2. Check user has permissions on database
3. Ensure password is URL-encoded in connection string
4. Try resetting database user password

### Performance Issues

**Problem:** Slow queries (> 500ms)

**Solutions:**
1. Check indexes are being used: Run query with `.explain()`
2. Review Performance Advisor in Atlas
3. Increase cluster tier if CPU/RAM saturated
4. Optimize query patterns (use projection, limit results)

**Problem:** Connection pool exhausted

**Solutions:**
1. Increase `MONGODB_MAX_POOL_SIZE`
2. Check for connection leaks (unclosed connections)
3. Add connection pooling monitoring
4. Scale up cluster tier

### Data Issues

**Problem:** Data not appearing

**Solutions:**
1. Verify correct database and collection names
2. Check tenant_id filtering
3. Verify indexes are created
4. Check data validation errors

**Problem:** Vector search not working

**Solutions:**
1. Verify Atlas Vector Search index exists
2. Check index status is "Active"
3. Verify embedding dimensions match (384 for default model)
4. Ensure `MONGODB_ENABLE_VECTOR_SEARCH=true`

## Backup & Recovery

### Automatic Backups

Atlas provides automated backups:
1. Go to cluster → "Backup" tab
2. Configure backup schedule (recommended: every 6 hours)
3. Set retention period (recommended: 7 days minimum)
4. Enable point-in-time recovery (PITR)

### Manual Backup

```bash
# Export database
mongodump --uri="mongodb+srv://..." --db=olorin --out=backup/

# Restore database
mongorestore --uri="mongodb+srv://..." --db=olorin backup/olorin/
```

### Disaster Recovery Plan

1. **Regular backups**: Automated daily backups to separate region
2. **Replication**: Enable multi-region clusters for HA
3. **Monitoring**: 24/7 monitoring with PagerDuty alerts
4. **Runbook**: Document recovery procedures
5. **Testing**: Test recovery quarterly

## Migration from PostgreSQL

See separate guide: [docs/POSTGRES_TO_MONGODB_MIGRATION.md](./POSTGRES_TO_MONGODB_MIGRATION.md)

Quick steps:
1. Set up MongoDB Atlas cluster
2. Configure connection string
3. Run migration script: `poetry run python scripts/migrate_postgres_to_mongodb.py`
4. Validate data: `poetry run python scripts/verify_migration.py`
5. Update application to use MongoDB
6. Monitor for issues
7. Decommission PostgreSQL after 7-day verification period

## Cost Optimization

### Cluster Sizing

**Start small, scale up:**
- Begin with M10 for production
- Monitor metrics for 2 weeks
- Scale up if CPU > 80% or RAM > 80%
- Scale down if resources underutilized

### Index Management

**Minimize indexes:**
- Only create indexes actually used by queries
- Remove unused indexes (check with Index Stats)
- Combine indexes where possible (compound indexes)

### Data Lifecycle

**Archive old data:**
- Set TTL indexes on time series collections
- Move completed investigations to cold storage
- Compress old documents

### Reserved Capacity

**Save 40-60% with prepayment:**
- Purchase reserved capacity for production
- 1-year or 3-year commitment
- Significant discounts vs. on-demand

## Support & Resources

### Documentation
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [Motor (async driver) Docs](https://motor.readthedocs.io/)
- [PyMongo Reference](https://pymongo.readthedocs.io/)

### Community
- [MongoDB Community Forums](https://www.mongodb.com/community/forums/)
- [Stack Overflow - mongodb](https://stackoverflow.com/questions/tagged/mongodb)

### Professional Support
- [MongoDB Professional Services](https://www.mongodb.com/services)
- [Atlas Support Plans](https://www.mongodb.com/cloud/atlas/support)

### Internal Support
- Slack: #olorin-backend
- Email: backend-team@company.com
- On-call: PagerDuty rotation

## Appendix: Sample Queries

### Find Investigations by User
```python
investigations = await investigation_repository.find_by_user(
    user_id="user-123",
    tenant_id="tenant-456",
    limit=20
)
```

### Vector Search for Similar Anomalies
```python
similar = await vector_search_service.find_similar_anomalies(
    query_embedding=embedding,
    tenant_id="tenant-456",
    limit=10
)
```

### Aggregate Transaction Scores
```python
distribution = await transaction_score_repository.get_score_distribution(
    investigation_id="inv-123",
    tenant_id="tenant-456"
)
```

### Time Series Query
```python
runs = await detection_run_repository.find_in_time_range(
    start_time=yesterday,
    end_time=today,
    detector_id="detector-456"
)
```
