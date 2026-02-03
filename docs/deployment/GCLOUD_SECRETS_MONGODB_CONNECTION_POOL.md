# MongoDB Connection Pool Configuration - Google Cloud Secret Manager

**Issue**: PyMongo background tasks timing out on connection pool maintenance
**Date**: 2026-02-02
**Type**: Configuration Update

## Problem

MongoDB Atlas connection is experiencing timeout errors in background pool maintenance:
```
pymongo.errors.NetworkTimeout: cluster0-shard-00-00.fnjp1v.mongodb.net:27017: [Errno 60] Operation timed out (configured timeouts: connectTimeoutMS: 30000.0ms)
```

Regular database operations work fine, but long-running background tasks fail when maintaining the connection pool.

## Solution

Add connection pool parameters to the MongoDB URI to optimize connection lifecycle and prevent timeouts.

## Required Secret Updates

### Secret: `MONGODB_URI`

**Current Value Pattern**:
```
mongodb+srv://admin_db_user:Jersey1973!@cluster0.fnjp1v.mongodb.net/bayit_plus?retryWrites=true&w=majority&appName=Cluster0
```

**New Value Pattern** (add connection pool parameters):
```
mongodb+srv://admin_db_user:Jersey1973!@cluster0.fnjp1v.mongodb.net/bayit_plus?retryWrites=true&w=majority&appName=Cluster0&maxIdleTimeMS=60000&minPoolSize=1&maxPoolSize=10&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000&connectTimeoutMS=10000
```

### New Parameters Explained

| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxIdleTimeMS` | 60000 | Close idle connections after 60 seconds to prevent long-lived stale connections |
| `minPoolSize` | 1 | Maintain at least 1 connection in the pool |
| `maxPoolSize` | 10 | Limit maximum connections to 10 |
| `serverSelectionTimeoutMS` | 5000 | Timeout for selecting server (5 seconds) |
| `socketTimeoutMS` | 45000 | Socket operation timeout (45 seconds) |
| `connectTimeoutMS` | 10000 | Initial connection timeout (10 seconds, reduced from 30s) |

## Google Cloud Secret Manager Update Commands

### Step 1: Update the Secret in Google Cloud

```bash
# Navigate to backend directory
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend

# Create a file with the new MongoDB URI value
cat > /tmp/mongodb_uri_new.txt << 'EOF'
mongodb+srv://admin_db_user:Jersey1973!@cluster0.fnjp1v.mongodb.net/bayit_plus?retryWrites=true&w=majority&appName=Cluster0&maxIdleTimeMS=60000&minPoolSize=1&maxPoolSize=10&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000&connectTimeoutMS=10000
EOF

# Update the secret in Google Cloud Secret Manager
gcloud secrets versions add MONGODB_URI --data-file=/tmp/mongodb_uri_new.txt

# Clean up temp file
rm /tmp/mongodb_uri_new.txt
```

### Step 2: Verify the Secret Update

```bash
# List secret versions
gcloud secrets versions list MONGODB_URI

# Get the latest secret value (to verify)
gcloud secrets versions access latest --secret=MONGODB_URI
```

### Step 3: Regenerate .env Files

```bash
# Sync secrets from Google Cloud to local .env files
./scripts/sync-gcloud-secrets.sh
```

### Step 4: Restart Backend Services

```bash
# Local development
pkill -f "uvicorn app.main:app"
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production (if deployed)
kubectl rollout restart deployment/bayit-plus-backend
```

## Verification

After updating and restarting, verify the connection pool is working:

```bash
# Check backend logs for MongoDB connection
tail -f logs/backend.log | grep -i mongo

# Should see successful connection without timeout errors
# Watch for background task errors (should be gone)
```

## Testing

1. Start the backend with the new configuration
2. Monitor logs for 5-10 minutes to ensure no timeout errors
3. Verify database operations work normally
4. Check that background tasks complete without errors

## Rollback (If Needed)

If issues occur, rollback to the previous secret version:

```bash
# List versions to find previous version number
gcloud secrets versions list MONGODB_URI

# Access a specific version (e.g., version 1)
gcloud secrets versions access 1 --secret=MONGODB_URI > /tmp/mongodb_uri_rollback.txt

# Add it as the latest version
gcloud secrets versions add MONGODB_URI --data-file=/tmp/mongodb_uri_rollback.txt

# Regenerate .env and restart
./scripts/sync-gcloud-secrets.sh
pkill -f "uvicorn app.main:app"
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Notes

- **DO NOT edit `.env` files directly** - they are generated from Google Cloud Secret Manager
- The password `Jersey1973!` contains special characters (`!`) - ensure it's properly URL-encoded if needed
- Connection pool parameters are MongoDB-specific and documented at: https://www.mongodb.com/docs/manual/reference/connection-string/
- These parameters are safe to use with MongoDB Atlas and won't affect database performance negatively

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md)
- [MongoDB Atlas Connection Strings](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [PyMongo Connection Pooling](https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html)
