# Centralized MongoDB Connection - Setup Guide

## Overview

All Olorin.ai platforms now use a **centralized MongoDB Atlas connection** through the `olorin-shared` package. This ensures consistent configuration, connection pooling, and easier maintenance across all platforms.

## MongoDB Atlas Architecture

**Shared Cluster**: `cluster0.ydrvaft.mongodb.net`

**Separate Databases per Platform**:
- **Bayit+**: `bayit_plus`
- **Israeli Radio Manager**: `israeli_radio`
- **Olorin Fraud Detection**: `olorin`

**Credentials** (stored in Google Cloud Secret Manager):
- Username: `admin_db_user`
- Password: Stored in secrets
- Connection format: `mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority&appName=Cluster0`

---

## Quick Start

### 1. Install olorin-shared Package

Add to your project's `pyproject.toml`:

```toml
[tool.poetry.dependencies]
olorin-shared = {path = "../../olorin-core/backend-core/olorin-shared", develop = true}
```

Then install:
```bash
poetry install
```

### 2. Set Environment Variables

Create or update `.env` file:

```bash
# MongoDB Atlas Connection (REQUIRED)
MONGODB_URI=mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=<your_database_name>  # bayit_plus, israeli_radio, or olorin

# Optional: Connection Pool Configuration (defaults shown)
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=20
MONGODB_MAX_IDLE_TIME_MS=45000
MONGODB_CONNECT_TIMEOUT_MS=30000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=30000
```

**Database Names**:
- Bayit+: `MONGODB_DB_NAME=bayit_plus`
- Israeli Radio Manager: `MONGODB_DB_NAME=israeli_radio`
- Olorin Fraud Detection: `MONGODB_DB_NAME=olorin`

### 3. Update Application Code

**FastAPI Example** (Bayit+, Israeli Radio Manager):

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from olorin_shared.database import init_mongodb, close_mongodb_connection, get_mongodb_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB
    await init_mongodb()
    yield
    # Shutdown: Close MongoDB
    await close_mongodb_connection()

app = FastAPI(lifespan=lifespan)

# Use in routes
@app.get("/health")
async def health_check():
    db = get_mongodb_database()
    await db.command("ping")
    return {"status": "healthy", "database": db.name}
```

**Legacy Startup/Shutdown Events** (if not using lifespan):

```python
from fastapi import FastAPI
from olorin_shared.database import init_mongodb, close_mongodb_connection

app = FastAPI()

@app.on_event("startup")
async def startup():
    await init_mongodb()

@app.on_event("shutdown")
async def shutdown():
    await close_mongodb_connection()
```

### 4. Access Database in Your Code

```python
from olorin_shared.database import get_mongodb_client, get_mongodb_database

# Get database instance
db = get_mongodb_database()

# Access collections
users = db["users"]
content = db["content"]

# Query example
user = await users.find_one({"email": "user@example.com"})

# Get client (for advanced operations)
client = get_mongodb_client()
```

---

## Google Cloud Secret Manager Setup

### Production Secrets

Store MongoDB credentials in Google Cloud Secret Manager:

```bash
# 1. Bayit+ MongoDB URL
gcloud secrets create bayit-mongodb-url \
  --replication-policy="automatic" \
  --data-file=- <<< "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# 2. Bayit+ Database Name
gcloud secrets create bayit-mongodb-db-name \
  --replication-policy="automatic" \
  --data-file=- <<< "bayit_plus"

# 3. Israeli Radio MongoDB URL (same cluster, different database)
gcloud secrets create israeli-radio-mongodb-url \
  --replication-policy="automatic" \
  --data-file=- <<< "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# 4. Israeli Radio Database Name
gcloud secrets create israeli-radio-mongodb-db-name \
  --replication-policy="automatic" \
  --data-file=- <<< "israeli_radio"

# 5. Olorin Fraud MongoDB URL (same cluster, different database)
gcloud secrets create olorin-mongodb-url \
  --replication-policy="automatic" \
  --data-file=- <<< "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# 6. Olorin Fraud Database Name
gcloud secrets create olorin-mongodb-db-name \
  --replication-policy="automatic" \
  --data-file=- <<< "olorin"
```

### Access Secrets in Cloud Run / App Engine

Environment variables are automatically injected from Secret Manager:

```yaml
# app.yaml or Cloud Run configuration
env_variables:
  MONGODB_URI: ${SECRET:bayit-mongodb-url}
  MONGODB_DB_NAME: ${SECRET:bayit-mongodb-db-name}
```

Or use Secret Manager API directly:

```python
from google.cloud import secretmanager

def get_secret(secret_id: str, project_id: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
```

---

## Migration Guide

### For Bayit+ (olorin-media/bayit-plus)

**Before** (app/core/database.py):
```python
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL, ...)
    await init_beanie(database=db.client[settings.MONGODB_DB_NAME], ...)
```

**After**:
```python
from olorin_shared.database import init_mongodb, get_mongodb_database
from beanie import init_beanie

async def connect_to_mongo():
    await init_mongodb()  # Uses centralized connection
    db_instance = get_mongodb_database()
    await init_beanie(database=db_instance, ...)
```

### For Israeli Radio Manager (olorin-media/israeli-radio-manager)

**Before** (app/main.py):
```python
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

app.state.mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
app.state.db = app.state.mongo_client[settings.mongodb_db]
```

**After**:
```python
from olorin_shared.database import init_mongodb, get_mongodb_database

await init_mongodb()  # Uses centralized connection
app.state.db = get_mongodb_database()
# No need to store client separately
```

### For Olorin Fraud Detection (olorin-fraud)

**Already using MongoDB Atlas** - just need to switch to centralized module:

**Before**:
```python
# Custom MongoDB connection in app/persistence/mongodb/
```

**After**:
```python
from olorin_shared.database import init_mongodb, get_mongodb_database

await init_mongodb()
db = get_mongodb_database()
```

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ Yes | - | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | ✅ Yes | - | Database name (bayit_plus, israeli_radio, olorin) |
| `MONGODB_MAX_POOL_SIZE` | No | 100 | Maximum connections in pool |
| `MONGODB_MIN_POOL_SIZE` | No | 20 | Minimum connections to maintain |
| `MONGODB_MAX_IDLE_TIME_MS` | No | 45000 | Close idle connections after (ms) |
| `MONGODB_CONNECT_TIMEOUT_MS` | No | 30000 | Connection timeout (ms) |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | No | 30000 | Server selection timeout (ms) |

### Connection Pool Sizing

**Development**:
```bash
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
```

**Production**:
```bash
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=20
```

**High-Load Production**:
```bash
MONGODB_MAX_POOL_SIZE=200
MONGODB_MIN_POOL_SIZE=50
```

---

## Testing

### Test Connection

```python
import asyncio
from olorin_shared.database import init_mongodb, get_mongodb_database

async def test_connection():
    await init_mongodb()
    db = get_mongodb_database()

    # Ping test
    result = await db.command("ping")
    print(f"✅ Connected to MongoDB: {db.name}")
    print(f"   Ping result: {result}")

    # List collections
    collections = await db.list_collection_names()
    print(f"   Collections: {collections}")

asyncio.run(test_connection())
```

### Verify Credentials

```bash
# Test connection with mongosh
mongosh "mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/bayit_plus"

# Run commands
> show collections
> db.stats()
> db.users.countDocuments()
```

---

## Troubleshooting

### Problem: `ConfigurationError: MONGODB_URI environment variable is required`

**Solution**: Ensure `.env` file has `MONGODB_URI` set:
```bash
MONGODB_URI=mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/...
```

### Problem: `ConnectionFailure: Server selection timeout`

**Solutions**:
1. Check IP whitelist in MongoDB Atlas (ensure your IP is allowed)
2. Verify connection string is correct (password URL-encoded)
3. Check network/firewall settings
4. Test with `mongosh` command line tool

### Problem: `Authentication failed`

**Solutions**:
1. Verify username is `admin_db_user`
2. Confirm password in Secret Manager is correct
3. Check database user has permissions on target database
4. URL-encode special characters in password

### Problem: `RuntimeError: MongoDB not initialized`

**Solution**: Call `init_mongodb()` during application startup:
```python
@app.on_event("startup")
async def startup():
    await init_mongodb()
```

---

## Benefits of Centralized Connection

✅ **Single Source of Truth**: All platforms use same connection logic
✅ **Consistent Configuration**: Same environment variables across platforms
✅ **Connection Pooling**: Optimized pool settings shared across platforms
✅ **Easier Maintenance**: Update once, applies everywhere
✅ **Better Monitoring**: Centralized connection metrics
✅ **Simplified Secrets**: Unified credential management

---

## Support

**Issues**: Report to #olorin-backend Slack channel
**Documentation**: See `olorin-shared` README
**MongoDB Atlas**: https://cloud.mongodb.com
**Motor Docs**: https://motor.readthedocs.io/

---

**Last Updated**: January 21, 2026
**Author**: Olorin.ai Backend Team
**Status**: Production Ready ✅
