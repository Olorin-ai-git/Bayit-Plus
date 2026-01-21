# MongoDB Startup Integration Guide

## Overview

This guide shows how to integrate MongoDB initialization into the application startup (`app/service/__init__.py`).

## Integration Points

### 1. Import MongoDB Startup Module

Add to imports section (around line 40):

```python
from app.service.mongodb_startup import (
    initialize_mongodb_on_startup,
    shutdown_mongodb_on_shutdown,
    check_mongodb_health,
)
```

### 2. Add MongoDB Initialization to `on_startup` Function

Add after PostgreSQL initialization (around line 420-450, after database tables are verified):

```python
# Initialize MongoDB Atlas (new database system)
logger.info("=" * 80)
logger.info("🍃 Initializing MongoDB Atlas...")
logger.info("=" * 80)

mongodb_enabled = os.getenv("ENABLE_MONGODB", "false").lower() == "true"

if mongodb_enabled:
    try:
        mongodb_success, mongodb_error = await initialize_mongodb_on_startup()

        if mongodb_success:
            app.state.mongodb_available = True
            logger.info("✅ MongoDB Atlas initialized successfully")
        else:
            # MongoDB initialization failed
            fail_on_mongodb_error = (
                os.getenv("FAIL_ON_MONGODB_ERROR", "false").lower() == "true"
            )

            if fail_on_mongodb_error:
                logger.error(f"❌ MongoDB initialization failed: {mongodb_error}")
                logger.error("   Set FAIL_ON_MONGODB_ERROR=false to continue without MongoDB")
                raise RuntimeError(f"MongoDB initialization failed: {mongodb_error}")
            else:
                logger.warning(f"⚠️  MongoDB initialization failed but continuing: {mongodb_error}")
                logger.warning("   Application will run with PostgreSQL only")
                app.state.mongodb_available = False

    except Exception as e:
        logger.error(f"❌ Unexpected error initializing MongoDB: {e}", exc_info=True)
        app.state.mongodb_available = False

        fail_on_mongodb_error = (
            os.getenv("FAIL_ON_MONGODB_ERROR", "false").lower() == "true"
        )
        if fail_on_mongodb_error:
            raise
else:
    logger.info("⏭️  MongoDB disabled (ENABLE_MONGODB=false)")
    logger.info("   Application will use PostgreSQL only")
    app.state.mongodb_available = False
```

### 3. Add MongoDB Shutdown to `on_shutdown` Function

Add to `on_shutdown` function (around line 1588+):

```python
# Shutdown MongoDB Atlas connections
if hasattr(app.state, "mongodb_available") and app.state.mongodb_available:
    logger.info("🍃 Shutting down MongoDB Atlas...")
    try:
        await shutdown_mongodb_on_shutdown()
    except Exception as e:
        logger.error(f"❌ Error during MongoDB shutdown: {e}", exc_info=True)
```

### 4. Add Health Check Integration

If application has health endpoint (e.g., `/health`), add MongoDB health check:

```python
@router.get("/health")
async def health_check():
    """Health check endpoint with MongoDB status."""
    from app.service.mongodb_startup import check_mongodb_health

    mongodb_healthy, mongodb_status = await check_mongodb_health()

    return {
        "status": "healthy" if mongodb_healthy else "degraded",
        "postgresql": "healthy",  # Existing check
        "mongodb": {
            "healthy": mongodb_healthy,
            "status": mongodb_status,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }
```

## Environment Variables

### Required Variables

```bash
# Enable MongoDB (default: false for backwards compatibility)
ENABLE_MONGODB=true

# Fail startup if MongoDB initialization fails (default: false)
FAIL_ON_MONGODB_ERROR=false
```

### MongoDB Connection Variables

See `.env.mongodb.example` for complete list.

Minimum required:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/olorin
```

## Migration Strategy

### Phase 1: PostgreSQL Only (Current)

```bash
ENABLE_MONGODB=false
```

- Application runs with PostgreSQL
- No MongoDB required
- Existing functionality preserved

### Phase 2: Dual-Database Mode (Migration)

```bash
ENABLE_MONGODB=true
FAIL_ON_MONGODB_ERROR=false
```

- Both PostgreSQL and MongoDB initialized
- MongoDB failure doesn't stop application
- Services gradually migrated to MongoDB
- PostgreSQL remains fallback

### Phase 3: MongoDB Primary (Post-Migration)

```bash
ENABLE_MONGODB=true
FAIL_ON_MONGODB_ERROR=true
```

- MongoDB required for startup
- PostgreSQL optional (deprecated)
- Most services use MongoDB

### Phase 4: MongoDB Only (Future)

```bash
ENABLE_MONGODB=true
FAIL_ON_MONGODB_ERROR=true
# PostgreSQL removed entirely
```

- Only MongoDB in use
- PostgreSQL code removed
- Full migration complete

## Testing

### Test MongoDB Initialization

```bash
# Set environment variables
export ENABLE_MONGODB=true
export MONGODB_URI="mongodb+srv://..."

# Start application
poetry run python -m app.local_server
```

Expected output:
```
================================================================================
🍃 MongoDB Atlas Initialization Starting
================================================================================
📋 Loading MongoDB configuration...
✅ MongoDB configuration loaded successfully
🔌 Connecting to MongoDB Atlas...
✅ Connected to MongoDB successfully
🏗️  Creating collections and indexes...
✅ Collections and indexes created successfully
🔍 Verifying connection...
✅ Connection verified successfully
================================================================================
✅ MongoDB Atlas Initialization Complete
================================================================================
```

### Test Graceful Degradation

```bash
# Invalid MongoDB URI
export MONGODB_URI="mongodb://invalid:27017"
export ENABLE_MONGODB=true
export FAIL_ON_MONGODB_ERROR=false

# Application should start with warning
poetry run python -m app.local_server
```

Expected output:
```
⚠️  MongoDB initialization failed but continuing: ...
   Application will run with PostgreSQL only
```

### Test Hard Failure

```bash
# Invalid MongoDB URI with hard failure
export MONGODB_URI="mongodb://invalid:27017"
export ENABLE_MONGODB=true
export FAIL_ON_MONGODB_ERROR=true

# Application should fail to start
poetry run python -m app.local_server
```

Expected output:
```
❌ MongoDB initialization failed: ...
   Set FAIL_ON_MONGODB_ERROR=false to continue without MongoDB
RuntimeError: MongoDB initialization failed
```

## Rollback Procedure

If MongoDB causes issues, disable it:

```bash
# Disable MongoDB, revert to PostgreSQL only
export ENABLE_MONGODB=false

# Restart application
poetry run python -m app.local_server
```

## Monitoring

### Startup Logs

Monitor startup logs for:
- ✅ Success messages (green checkmarks)
- ⚠️  Warning messages (yellow triangles)
- ❌ Error messages (red X marks)

### Application State

Check `app.state.mongodb_available`:
```python
@router.get("/status")
async def get_status(request: Request):
    return {
        "mongodb_available": request.app.state.mongodb_available,
        "database_available": request.app.state.database_available,
    }
```

### Health Endpoint

```bash
curl http://localhost:8090/health
```

Response:
```json
{
  "status": "healthy",
  "postgresql": "healthy",
  "mongodb": {
    "healthy": true,
    "status": "MongoDB connection healthy"
  }
}
```

## Troubleshooting

### MongoDB Initialization Fails

**Check Configuration:**
```bash
# Verify environment variables
env | grep MONGODB

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

**Common Issues:**
1. **Invalid URI**: Check MONGODB_URI format
2. **Network**: Verify IP whitelist in Atlas
3. **Authentication**: Verify username/password
4. **Permissions**: Ensure user has readWrite role

### Application Won't Start

**Disable MongoDB Temporarily:**
```bash
export ENABLE_MONGODB=false
poetry run python -m app.local_server
```

### Performance Issues

**Check Connection Pool:**
```bash
# Increase pool size
export MONGODB_MAX_POOL_SIZE=200
export MONGODB_MIN_POOL_SIZE=50
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] MongoDB Atlas cluster provisioned (M30+ recommended)
- [ ] Connection string tested and validated
- [ ] IP whitelist configured for all application servers
- [ ] Database user created with correct permissions
- [ ] Atlas Vector Search indexes created
- [ ] Atlas Search indexes created
- [ ] Environment variables configured in secret manager
- [ ] Health checks tested
- [ ] Monitoring and alerts configured
- [ ] Rollback plan documented

### Deployment Steps

1. **Deploy with MongoDB disabled:**
   ```bash
   ENABLE_MONGODB=false
   FAIL_ON_MONGODB_ERROR=false
   ```

2. **Verify application starts normally**

3. **Enable MongoDB (non-critical):**
   ```bash
   ENABLE_MONGODB=true
   FAIL_ON_MONGODB_ERROR=false
   ```

4. **Monitor for 24 hours**

5. **Make MongoDB critical:**
   ```bash
   ENABLE_MONGODB=true
   FAIL_ON_MONGODB_ERROR=true
   ```

6. **Monitor for 7 days**

7. **Complete migration, deprecate PostgreSQL**

### Monitoring During Deployment

Watch for:
- Application startup time
- Memory usage
- Connection pool usage
- Error rates
- Response times

## Support

Issues? Check:
1. This guide
2. `docs/MONGODB_CONFIGURATION.md`
3. `app/service/mongodb_startup.py`
4. Slack: #olorin-backend
5. On-call: PagerDuty rotation
