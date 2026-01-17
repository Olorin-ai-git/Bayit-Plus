# MongoDB Atlas Deployment Guide

This guide walks you through deploying your local MongoDB data to MongoDB Atlas (production cloud database).

---

## Prerequisites

- [ ] Local MongoDB with migrated data (5,212 investigations + 117,923 audit logs)
- [ ] MongoDB Atlas account (free tier works for testing)
- [ ] Atlas cluster created and running
- [ ] Network access configured (IP whitelist)

---

## Step 1: Create MongoDB Atlas Cluster

### Option A: Using MongoDB Atlas Web UI

1. **Sign up/Login to MongoDB Atlas**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free account or login

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose deployment type:
     - **Shared (Free)** - For testing/development
     - **Dedicated (M10+)** - For production (recommended: M30)
   - Select cloud provider: AWS, GCP, or Azure
   - Choose region closest to your users
   - Cluster name: `olorin-production`

3. **Configure Database Access**
   - Go to "Database Access" tab
   - Click "Add New Database User"
   - Username: `olorin_app`
   - Password: Generate strong password (save it!)
   - Database User Privileges: "Read and write to any database"

4. **Configure Network Access**
   - Go to "Network Access" tab
   - Click "Add IP Address"
   - For testing: "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your server's specific IP addresses

5. **Get Connection String**
   - Go to "Database" tab
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: Python, Version: 3.12 or later
   - Copy the connection string:
     ```
     mongodb+srv://olorin_app:<password>@olorin-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password

### Option B: Using MongoDB CLI (Advanced)

```bash
# Install MongoDB Atlas CLI
brew install mongodb-atlas-cli  # macOS
# or
curl https://fastdl.mongodb.org/mongocli/mongodb-atlas-cli_latest_linux_x86_64.tar.gz | tar -xz  # Linux

# Login
atlas auth login

# Create cluster
atlas clusters create olorin-production \
  --provider AWS \
  --region US_EAST_1 \
  --tier M30 \
  --diskSizeGB 10

# Create database user
atlas dbusers create atlasAdmin \
  --username olorin_app \
  --password <secure-password> \
  --role readWriteAnyDatabase

# Whitelist IP
atlas accessLists create \
  --cidr 0.0.0.0/0 \
  --comment "Allow all (temporary)"

# Get connection string
atlas clusters connectionStrings describe olorin-production
```

---

## Step 2: Configure Environment Variables

Add your Atlas connection string to `.env`:

```bash
# MongoDB Atlas Production
MONGODB_ATLAS_URI=mongodb+srv://olorin_app:<password>@olorin-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_ATLAS_DATABASE=olorin

# Keep local for backup
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=olorin
```

**Security Best Practices:**
- Never commit `.env` file to git
- Use environment variables in production (not .env file)
- Store credentials in secret manager (AWS Secrets Manager, GCP Secret Manager, etc.)
- Rotate passwords regularly

---

## Step 3: Run Deployment Script

Deploy your local MongoDB data to Atlas:

```bash
# Test connection first
poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

async def test():
    atlas_uri = os.getenv('MONGODB_ATLAS_URI')
    client = AsyncIOMotorClient(atlas_uri)
    await client.admin.command('ping')
    print('✅ Atlas connection successful!')
    client.close()

asyncio.run(test())
"

# Run full deployment
poetry run python scripts/deploy_to_atlas.py
```

This will:
1. Connect to local MongoDB and Atlas
2. Show pre-migration statistics
3. Migrate all collections in batches
4. Copy all indexes
5. Verify data integrity
6. Display post-migration summary

**Expected Duration:** 5-10 minutes for 123k+ documents

---

## Step 4: Verify Atlas Deployment

Run verification tests:

```bash
# Quick verification
poetry run python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def verify():
    atlas_uri = os.getenv('MONGODB_ATLAS_URI')
    client = AsyncIOMotorClient(atlas_uri)
    db = client['olorin']

    inv_count = await db.investigations.count_documents({})
    audit_count = await db.audit_log.count_documents({})

    print(f'Atlas Investigations: {inv_count:,}')
    print(f'Atlas Audit Logs: {audit_count:,}')

    # Test query
    sample = await db.investigations.find_one({})
    print(f'Sample: {sample.get(\"investigation_id\")}')

    client.close()

asyncio.run(verify())
"

# Full test suite
MONGODB_URI=\$MONGODB_ATLAS_URI poetry run python scripts/test_mongodb_repos.py
```

---

## Step 5: Update Application Configuration

### For Development

Update `.env`:

```bash
# Use Atlas for development
MONGODB_URI=\$MONGODB_ATLAS_URI
MONGODB_DATABASE=olorin
ENABLE_MONGODB=true
```

### For Production

Use environment variables (not .env file):

```bash
# Export in your deployment environment
export MONGODB_URI="mongodb+srv://olorin_app:<password>@olorin-production.xxxxx.mongodb.net/?retryWrites=true&w=majority"
export MONGODB_DATABASE="olorin"
export ENABLE_MONGODB="true"
```

### For Docker/Kubernetes

**Docker Compose:**
```yaml
services:
  olorin-backend:
    environment:
      - MONGODB_URI=mongodb+srv://olorin_app:${ATLAS_PASSWORD}@olorin-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
      - MONGODB_DATABASE=olorin
```

**Kubernetes Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-credentials
type: Opaque
stringData:
  uri: mongodb+srv://olorin_app:<password>@olorin-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## Step 6: Configure Atlas Features

### Enable Monitoring

1. Go to "Metrics" tab in Atlas
2. Review:
   - Query performance
   - Connection count
   - Disk usage
   - Network I/O

### Set Up Alerts

1. Go to "Alerts" tab
2. Create alerts for:
   - Query execution time > 1000ms
   - Connection count > 80% of limit
   - Disk usage > 75%
   - Replication lag > 10 seconds

### Configure Backups

1. Go to "Backup" tab
2. Enable continuous backups
3. Set retention policy:
   - Snapshots: Daily for 7 days
   - Continuous: 24 hours
   - Monthly: 12 months

### Performance Optimization

1. **Enable Vector Search** (for anomaly embeddings):
   ```javascript
   // In Atlas UI: Create Search Index
   {
     "mappings": {
       "fields": {
         "embedding": {
           "type": "knnVector",
           "dimensions": 768,
           "similarity": "cosine"
         }
       }
     }
   }
   ```

2. **Create Atlas Search Index** (for full-text search):
   ```javascript
   // In Atlas UI: Create Search Index
   {
     "mappings": {
       "dynamic": true,
       "fields": {
         "investigation_id": {"type": "string"},
         "status": {"type": "string"},
         "settings": {"type": "document"}
       }
     }
   }
   ```

3. **Enable Time Series Collections**:
   ```javascript
   // For audit_log and detection_runs
   db.createCollection("audit_log", {
     timeseries: {
       timeField: "timestamp",
       metaField: "metadata",
       granularity: "seconds"
     }
   })
   ```

---

## Step 7: Production Checklist

### Security
- [ ] Strong database password set
- [ ] IP whitelist configured (not 0.0.0.0/0)
- [ ] SSL/TLS encryption enabled
- [ ] Database user has minimal required permissions
- [ ] Connection string stored in secret manager
- [ ] MongoDB Atlas audit logging enabled

### Performance
- [ ] Appropriate cluster tier (M30+ for production)
- [ ] Auto-scaling enabled
- [ ] Indexes verified and optimized
- [ ] Connection pooling configured
- [ ] Query performance monitored

### Reliability
- [ ] Continuous backups enabled
- [ ] Multi-region deployment (for critical apps)
- [ ] Failover tested
- [ ] Disaster recovery plan documented
- [ ] Monitoring alerts configured

### Compliance
- [ ] Data residency requirements met
- [ ] GDPR/privacy compliance verified
- [ ] Encryption at rest enabled
- [ ] Access logs reviewed
- [ ] Security best practices followed

---

## Troubleshooting

### Connection Timeout

**Problem:** Cannot connect to Atlas cluster

**Solutions:**
1. Check IP whitelist includes your IP
2. Verify password is correct (no special characters issues)
3. Ensure firewall allows outbound connections to MongoDB Atlas
4. Check cluster is running (not paused)

### Slow Migration

**Problem:** Migration taking too long

**Solutions:**
1. Increase batch size in deployment script
2. Use faster internet connection
3. Deploy from server in same region as Atlas cluster
4. Temporarily upgrade Atlas tier for faster writes

### Data Mismatch

**Problem:** Document counts don't match

**Solutions:**
1. Re-run migration with `--force` flag
2. Check for errors in migration logs
3. Verify local MongoDB is still running during migration
4. Check network stability

### Authentication Errors

**Problem:** "Authentication failed" errors

**Solutions:**
1. Verify username and password are correct
2. Check database user has correct permissions
3. Ensure password doesn't have special characters that need URL encoding
4. Try creating a new database user

---

## Post-Deployment

### Update Documentation

- [ ] Update deployment docs with Atlas connection details
- [ ] Document backup/restore procedures
- [ ] Update runbooks with Atlas-specific commands
- [ ] Create monitoring dashboard guides

### Team Training

- [ ] Share Atlas dashboard access with team
- [ ] Train on monitoring and alerting
- [ ] Document escalation procedures
- [ ] Review disaster recovery plan

### Cost Optimization

- [ ] Review Atlas pricing tier
- [ ] Enable auto-pause for dev clusters
- [ ] Monitor data transfer costs
- [ ] Optimize indexes to reduce storage

---

## Support

- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com/
- **Support Portal:** https://support.mongodb.com/
- **Community Forums:** https://www.mongodb.com/community/forums/
- **Atlas Status:** https://status.mongodb.com/

---

**Deployment Status:** Ready to execute
**Estimated Time:** 30-60 minutes (setup + migration)
**Data Size:** ~50MB (123k+ documents)
**Recommended Atlas Tier:** M30 (production) or M0 (testing)
