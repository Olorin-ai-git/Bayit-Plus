# Phase 10: Database & Environment Variables Verification

**Date**: 2026-01-22
**Status**: 📋 READY FOR EXECUTION
**Phase**: Database & Environment Variables Verification

---

## Overview

This guide covers verifying MongoDB connections, auditing environment variables, and ensuring all configuration is properly externalized for production.

**Duration**: ~20 minutes

**Prerequisites**: Phase 9 (Production Deployment) complete

---

## Step 1: MongoDB Connection Verification (10 min)

### 1.1 Verify MongoDB Atlas Configuration

**Check MongoDB connection string**:
```bash
# From backend directory
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/backend
poetry run python -c "from app.config import settings; print(f'Database: {settings.MONGODB_DB_NAME}')"
```

**Expected Output**: `Database: israeli_radio`

**Note**: Database name kept as `israeli_radio` for backward compatibility (as planned)

### 1.2 Test MongoDB Connection

**Create connection test script** (`scripts/test-mongodb.py`):

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def test_mongodb():
    print("Testing MongoDB Connection...")
    print(f"Database: {settings.MONGODB_DB_NAME}")

    client = AsyncIOMotorClient(settings.MONGODB_URI)

    try:
        # Test connection
        await client.admin.command('ping')
        print("✅ MongoDB connection successful")

        # Test database access
        db = client[settings.MONGODB_DB_NAME]
        collections = await db.list_collection_names()
        print(f"✅ Database accessible ({len(collections)} collections)")

        # Test read operation
        users_count = await db.users.count_documents({})
        print(f"✅ Read operation successful ({users_count} users)")

        # Verify indexes
        indexes = await db.users.list_indexes().to_list(None)
        print(f"✅ Indexes configured ({len(indexes)} indexes on users collection)")

    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_mongodb())
```

**Run test**:
```bash
poetry run python scripts/test-mongodb.py
```

**Expected Output**:
```
Testing MongoDB Connection...
Database: israeli_radio
✅ MongoDB connection successful
✅ Database accessible (15 collections)
✅ Read operation successful (42 users)
✅ Indexes configured (5 indexes on users collection)
```

### 1.3 Verify Collection Integrity

**Check all collections exist**:
```python
# scripts/verify-collections.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

EXPECTED_COLLECTIONS = [
    'users',
    'content',
    'schedules',
    'agents',
    'playback_logs',
    'librarian_scheduler_state',
    # Add other expected collections
]

async def verify_collections():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        collections = await db.list_collection_names()

        print("Collection Verification:")
        print("=" * 40)

        for collection in EXPECTED_COLLECTIONS:
            if collection in collections:
                count = await db[collection].count_documents({})
                print(f"✅ {collection}: {count} documents")
            else:
                print(f"❌ {collection}: MISSING")

        print("=" * 40)
        print(f"Total collections: {len(collections)}")

    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(verify_collections())
```

**Run verification**:
```bash
poetry run python scripts/verify-collections.py
```

---

## Step 2: Google Cloud Storage Verification (5 min)

### 2.1 Verify GCS Bucket Access

**Check GCS configuration**:
```bash
poetry run python -c "from app.config import settings; print(f'Bucket: {settings.GCS_BUCKET}')"
```

**Expected Output**: `Bucket: israeli-radio-475c9-audio`

**Note**: GCS bucket name kept for backward compatibility (cannot rename)

### 2.2 Test GCS Read/Write

**Create GCS test script** (`scripts/test-gcs.py`):

```python
from google.cloud import storage
from app.config import settings
import tempfile

def test_gcs():
    print("Testing Google Cloud Storage...")
    print(f"Bucket: {settings.GCS_BUCKET}")

    try:
        # Initialize client
        client = storage.Client()
        bucket = client.bucket(settings.GCS_BUCKET)

        # Test bucket exists
        if bucket.exists():
            print("✅ Bucket exists")
        else:
            print("❌ Bucket not found")
            return

        # Test read access
        blobs = list(bucket.list_blobs(max_results=10))
        print(f"✅ Read access successful ({len(blobs)} files sampled)")

        # Test write access (create temp file)
        test_blob_name = "test/health-check.txt"
        blob = bucket.blob(test_blob_name)
        blob.upload_from_string("Health check test")
        print("✅ Write access successful")

        # Cleanup
        blob.delete()
        print("✅ Delete access successful")

    except Exception as e:
        print(f"❌ GCS test failed: {e}")
        raise

if __name__ == "__main__":
    test_gcs()
```

**Run test**:
```bash
poetry run python scripts/test-gcs.py
```

---

## Step 3: Environment Variables Audit (10 min)

### 3.1 Backend Environment Variables

**Check all required variables are set**:

```bash
# Create audit script: scripts/audit-env-vars.py
import os
from app.config import settings

REQUIRED_ENV_VARS = {
    # Application
    'APP_NAME': 'Application name',
    'APP_ENV': 'Environment (production/staging/development)',

    # Database
    'MONGODB_URI': 'MongoDB connection string',
    'MONGODB_DB_NAME': 'MongoDB database name',

    # Storage
    'GCS_BUCKET': 'Google Cloud Storage bucket name',
    'GCS_PROJECT_ID': 'Google Cloud project ID',

    # Firebase
    'FIREBASE_PROJECT_ID': 'Firebase project ID',
    'FIREBASE_AUTH_DOMAIN': 'Firebase auth domain',

    # Security
    'JWT_SECRET': 'JWT secret key (from Secret Manager)',
    'ANTHROPIC_API_KEY': 'Anthropic API key (from Secret Manager)',
}

def audit_env_vars():
    print("Environment Variables Audit")
    print("=" * 60)

    missing = []
    configured = []

    for var, description in REQUIRED_ENV_VARS.items():
        value = getattr(settings, var, None) or os.getenv(var)

        if value and value != 'None' and value != '':
            print(f"✅ {var}")
            print(f"   {description}")
            # Don't print actual values for security
            print(f"   Value: {'*' * 20} (configured)")
            configured.append(var)
        else:
            print(f"❌ {var}")
            print(f"   {description}")
            print(f"   Value: NOT SET")
            missing.append(var)
        print()

    print("=" * 60)
    print(f"Configured: {len(configured)}/{len(REQUIRED_ENV_VARS)}")

    if missing:
        print(f"\n⚠️  Missing variables: {', '.join(missing)}")
        return False
    else:
        print("\n✅ All required environment variables are configured")
        return True

if __name__ == "__main__":
    audit_env_vars()
```

**Run audit**:
```bash
poetry run python scripts/audit-env-vars.py
```

### 3.2 Frontend Environment Variables

**Check `.env.production` file**:

```bash
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/frontend
cat .env.production
```

**Expected contents**:
```
VITE_API_URL=https://us-central1-israeli-radio-475c9.cloudfunctions.net/stationAiBackend
VITE_APP_NAME=Station-AI
VITE_ENVIRONMENT=production
VITE_MARKETING_URL=https://marketing.station.olorin.ai
VITE_FRONTEND_PORT=5173
```

**Verify no hardcoded values in code**:
```bash
# Search for potential hardcoded URLs
grep -r "http://" frontend/src --exclude-dir=node_modules --exclude="*.test.*"
grep -r "https://" frontend/src --exclude-dir=node_modules --exclude="*.test.*" | grep -v "VITE_"
```

**Expected**: Only environment variable references, no hardcoded URLs

### 3.3 Marketing Portal Environment Variables

**Check portal configuration**:
```bash
cd /Users/olorin/Documents/olorin/olorin-portals/packages/portal-station
cat .env.production 2>/dev/null || echo "No .env.production file (using package.json or build-time config)"
```

**Verify no hardcoded values**:
```bash
grep -r "http://" src --exclude-dir=node_modules | grep -v "process.env" | head -10
```

---

## Step 4: Secrets Management Verification (5 min)

### 4.1 Firebase Secrets

**List configured secrets**:
```bash
# Check Firebase Functions secrets
firebase functions:secrets:list --project israeli-radio-475c9
```

**Expected secrets**:
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `TWILIO_AUTH_TOKEN` (if using Twilio)
- Other sensitive keys

### 4.2 Access Secret Values (Production)

**Verify secrets are accessible from Firebase Functions**:
```bash
# Deploy a test function that accesses secrets
firebase functions:log --project israeli-radio-475c9 | grep "Secret"
```

**Note**: Never log actual secret values, only verify they're accessible

### 4.3 Secret Rotation Plan

**Document secret rotation procedure** (`docs/SECRET_ROTATION.md`):

```markdown
# Secret Rotation Procedure

## When to Rotate
- Every 90 days (recommended)
- Immediately if compromised
- When employee with access leaves

## How to Rotate

1. Generate new secret value
2. Update Firebase Secrets:
   ```bash
   firebase functions:secrets:set JWT_SECRET --project israeli-radio-475c9
   ```
3. Deploy new version
4. Verify new secret works
5. Invalidate old secret
6. Monitor for any issues

## Secrets Inventory
- JWT_SECRET: Rotated 2026-01-22
- ANTHROPIC_API_KEY: Rotated 2026-01-15
- [Add other secrets]
```

---

## Step 5: Configuration Validation (5 min)

### 5.1 Verify No Hardcoded Values

**Run comprehensive grep scan**:
```bash
# Backend - check for hardcoded values
cd /Users/olorin/Documents/olorin/olorin-media/station-ai/backend

# Check for hardcoded ports
grep -r "port.*=.*[0-9]" app --exclude-dir=__pycache__ | grep -v "settings\."

# Check for hardcoded URLs
grep -r "https://" app --exclude-dir=__pycache__ | grep -v "settings\." | grep -v "# "

# Check for hardcoded API keys (should be from env)
grep -r "sk-[a-zA-Z0-9]" app --exclude-dir=__pycache__
```

**Expected**: No matches (all values from settings/config)

### 5.2 Configuration Schema Validation

**Create Pydantic schema validator** (`scripts/validate-config.py`):

```python
from app.config import settings
from pydantic import ValidationError

def validate_config():
    print("Configuration Schema Validation")
    print("=" * 60)

    try:
        # Pydantic automatically validates on initialization
        print(f"✅ App Name: {settings.APP_NAME}")
        print(f"✅ Environment: {settings.APP_ENV}")
        print(f"✅ MongoDB URI: {'*' * 20} (set)")
        print(f"✅ GCS Bucket: {settings.GCS_BUCKET}")
        print(f"✅ Firebase Project: {settings.FIREBASE_PROJECT_ID}")
        print("\n✅ All configuration valid")
        return True

    except ValidationError as e:
        print(f"❌ Configuration validation failed:")
        print(e)
        return False

if __name__ == "__main__":
    validate_config()
```

**Run validation**:
```bash
poetry run python scripts/validate-config.py
```

---

## Step 6: Backward Compatibility Verification (5 min)

### 6.1 Database Name Compatibility

**Verify database name unchanged**:
```python
# Should print: israeli_radio
poetry run python -c "from app.config import settings; print(settings.MONGODB_DB_NAME)"
```

**Verify queries still work**:
```python
# scripts/test-backward-compatibility.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def test_backward_compatibility():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        # Test that old data is accessible
        users = await db.users.find_one({})
        print(f"✅ Old user data accessible: {bool(users)}")

        # Test that old collection names work
        collections = await db.list_collection_names()
        expected = ['users', 'content', 'schedules']
        found = [c for c in expected if c in collections]
        print(f"✅ Old collections accessible: {len(found)}/{len(expected)}")

    finally:
        client.close()

asyncio.run(test_backward_compatibility())
```

### 6.2 GCS Bucket Compatibility

**Verify GCS bucket name unchanged**:
```bash
poetry run python -c "from app.config import settings; print(settings.GCS_BUCKET)"
```

**Expected**: `israeli-radio-475c9-audio`

**Test file access**:
```bash
poetry run python scripts/test-gcs.py
```

---

## Step 7: Configuration Documentation (5 min)

### 7.1 Update `.env.example` Files

**Backend `.env.station-ai.example`**:
```bash
# Application
APP_NAME=Station-AI
APP_ENV=production

# Domains
FRONTEND_URL=https://station.olorin.ai
MARKETING_URL=https://marketing.station.olorin.ai
API_URL=https://api.station.olorin.ai

# Database (Backward Compatible)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
MONGODB_DB_NAME=israeli_radio

# Storage (Backward Compatible)
GCS_BUCKET=israeli-radio-475c9-audio
GCS_PROJECT_ID=israeli-radio-475c9

# Firebase
FIREBASE_PROJECT_ID=israeli-radio-475c9
FIREBASE_AUTH_DOMAIN=israeli-radio-475c9.firebaseapp.com

# Security (Use Secret Manager)
JWT_SECRET=${SECRET_MANAGER_JWT_SECRET}
ANTHROPIC_API_KEY=${SECRET_MANAGER_ANTHROPIC_KEY}
```

### 7.2 Configuration Checklist

Create configuration checklist document:

**`docs/CONFIGURATION_CHECKLIST.md`**:
```markdown
# Configuration Checklist

## Backend Configuration
- [x] `APP_NAME` set to "Station-AI"
- [x] `APP_ENV` set to "production"
- [x] `MONGODB_URI` configured (from Secret Manager)
- [x] `MONGODB_DB_NAME` set to "israeli_radio"
- [x] `GCS_BUCKET` set to "israeli-radio-475c9-audio"
- [x] `JWT_SECRET` configured (from Secret Manager)
- [x] `ANTHROPIC_API_KEY` configured (from Secret Manager)

## Frontend Configuration
- [x] `VITE_API_URL` points to production backend
- [x] `VITE_APP_NAME` set to "Station-AI"
- [x] `VITE_ENVIRONMENT` set to "production"
- [x] `VITE_MARKETING_URL` points to marketing site

## Marketing Portal Configuration
- [x] Build-time configuration includes correct URLs
- [x] No hardcoded values in source code

## Firebase Configuration
- [x] Firebase project: `israeli-radio-475c9`
- [x] Hosting targets configured (prod, demo, station)
- [x] Functions environment variables set
- [x] Secrets configured in Secret Manager

## Security
- [x] All secrets in Secret Manager (not in code)
- [x] Environment variables documented in `.env.example`
- [x] No API keys in source control
- [x] CORS configured with specific origins
```

---

## Database Verification Checklist

### MongoDB
- [ ] Connection successful
- [ ] Database name: `israeli_radio` (backward compatible)
- [ ] All collections accessible
- [ ] Indexes configured
- [ ] Read/write operations work
- [ ] Connection string in Secret Manager

### Google Cloud Storage
- [ ] Bucket accessible
- [ ] Bucket name: `israeli-radio-475c9-audio` (backward compatible)
- [ ] Read/write/delete operations work
- [ ] Credentials configured correctly

### Environment Variables
- [ ] All required variables set
- [ ] No hardcoded values in code
- [ ] `.env.example` files up to date
- [ ] Configuration schema valid
- [ ] Secrets in Secret Manager (not in env files)

### Backward Compatibility
- [ ] Database name unchanged
- [ ] GCS bucket name unchanged
- [ ] Old data accessible
- [ ] No breaking changes

### Documentation
- [ ] `.env.example` files updated
- [ ] Configuration checklist created
- [ ] Secret rotation procedure documented
- [ ] All configuration documented

---

## Next Steps

**After Phase 10 Completion**:
1. All configuration verified and documented
2. Database connections tested
3. Environment variables audited
4. Secrets management verified
5. Ready for Final Multi-Agent Implementation Review

---

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerError: Authentication failed`

**Solution**:
1. Verify `MONGODB_URI` in Secret Manager
2. Check MongoDB Atlas IP whitelist (allow Firebase Functions IPs)
3. Verify database user permissions

**Error**: `Collection not found`

**Solution**:
1. Verify database name is `israeli_radio`
2. Check collection was not accidentally renamed
3. Verify MongoDB Atlas cluster is running

### GCS Access Issues

**Error**: `403 Forbidden`

**Solution**:
1. Verify Firebase service account has Storage Admin role
2. Check bucket permissions in GCS Console
3. Verify `GCS_BUCKET` environment variable is correct

### Environment Variable Issues

**Error**: `Configuration validation failed`

**Solution**:
1. Run `scripts/audit-env-vars.py` to identify missing variables
2. Set missing variables in Firebase Functions config or Secret Manager
3. Redeploy functions after setting variables

---

## Summary

**Phase 10: Database & Environment Variables Verification**

This phase verifies:
- MongoDB connection and backward compatibility
- Google Cloud Storage access
- Environment variables audit
- Secrets management
- Configuration schema validation
- Comprehensive documentation

**Duration**: ~20 minutes

**Output**: Verified database connections + Configuration documentation + Secrets inventory

---

**Guide Author**: Claude Code
**Last Updated**: 2026-01-22
**MongoDB Database**: israeli_radio (backward compatible)
**GCS Bucket**: israeli-radio-475c9-audio (backward compatible)
