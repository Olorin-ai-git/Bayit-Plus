# MongoDB Centralized Connection - Testing Guide

## Overview

This guide provides step-by-step testing procedures to verify that all Olorin platforms successfully use the centralized MongoDB Atlas connection from `olorin-shared`.

## Pre-Testing Checklist

Before testing, ensure:

- [ ] Centralized MongoDB module created in `olorin-shared`
- [ ] All platforms updated to use `olorin-shared` database functions
- [ ] Google Cloud Secret Manager configured (or local `.env` files)
- [ ] MongoDB Atlas cluster accessible (IP whitelist configured)
- [ ] Python 3.11+ installed for backend services

---

## Test 1: Olorin-Shared Module Verification

### 1.1 Import Test

```bash
cd /path/to/olorin-core/backend-core/olorin-shared
python3 -c "from olorin_shared.database import init_mongodb, get_mongodb_database; print('✓ Import successful')"
```

**Expected Output**:
```
✓ Import successful
```

### 1.2 Module Structure Test

```bash
python3 << 'EOF'
from olorin_shared.database import (
    MongoDBConnection,
    init_mongodb,
    close_mongodb_connection,
    get_mongodb_client,
    get_mongodb_database
)

print("✓ All required functions imported successfully:")
print("  - MongoDBConnection")
print("  - init_mongodb")
print("  - close_mongodb_connection")
print("  - get_mongodb_client")
print("  - get_mongodb_database")
EOF
```

---

## Test 2: Connection Test Script

Create a test script to verify MongoDB connection:

```python
# test_mongodb_connection.py
import asyncio
import os
import sys
from olorin_shared.database import init_mongodb, get_mongodb_database, close_mongodb_connection

async def test_connection(db_name: str):
    """Test MongoDB connection for a specific database."""
    print(f"\n{'='*60}")
    print(f"Testing MongoDB Connection: {db_name}")
    print(f"{'='*60}")

    try:
        # Initialize connection
        print("1. Initializing MongoDB connection...")
        await init_mongodb()
        print("   ✓ Connection initialized")

        # Get database instance
        print("2. Getting database instance...")
        db = get_mongodb_database()
        print(f"   ✓ Database: {db.name}")

        # Test ping
        print("3. Pinging database...")
        result = await db.command("ping")
        print(f"   ✓ Ping successful: {result}")

        # List collections
        print("4. Listing collections...")
        collections = await db.list_collection_names()
        print(f"   ✓ Found {len(collections)} collections:")
        for col in collections[:10]:  # Show first 10
            print(f"     - {col}")
        if len(collections) > 10:
            print(f"     ... and {len(collections) - 10} more")

        # Test query (count documents in a collection)
        if collections:
            first_collection = collections[0]
            print(f"5. Testing query on '{first_collection}'...")
            count = await db[first_collection].count_documents({})
            print(f"   ✓ Document count: {count}")

        # Close connection
        print("6. Closing connection...")
        await close_mongodb_connection()
        print("   ✓ Connection closed")

        print(f"\n{'='*60}")
        print(f"✅ SUCCESS: {db_name} connection test passed")
        print(f"{'='*60}\n")
        return True

    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ FAILED: {db_name} connection test")
        print(f"Error: {e}")
        print(f"{'='*60}\n")
        return False


async def main():
    """Run tests for all databases."""
    print("\n" + "="*60)
    print("MongoDB Centralized Connection - Test Suite")
    print("="*60)

    # Test configurations
    tests = [
        {
            "name": "Bayit+ (bayit_plus)",
            "env": {
                "MONGODB_URI": os.getenv("BAYIT_MONGODB_URI"),
                "MONGODB_DB_NAME": "bayit_plus"
            }
        },
        {
            "name": "Israeli Radio Manager (israeli_radio)",
            "env": {
                "MONGODB_URI": os.getenv("RADIO_MONGODB_URI"),
                "MONGODB_DB_NAME": "israeli_radio"
            }
        },
        {
            "name": "Olorin Fraud Detection (olorin)",
            "env": {
                "MONGODB_URI": os.getenv("OLORIN_MONGODB_URI"),
                "MONGODB_DB_NAME": "olorin"
            }
        }
    ]

    results = []

    for test_config in tests:
        # Set environment variables for this test
        for key, value in test_config["env"].items():
            if value:
                os.environ[key] = value

        # Run test
        success = await test_connection(test_config["name"])
        results.append((test_config["name"], success))

        # Small delay between tests
        await asyncio.sleep(1)

    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    for name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {name}")
    print("="*60 + "\n")

    # Exit with appropriate code
    all_passed = all(success for _, success in results)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    asyncio.run(main())
```

### Running the Connection Test

```bash
# Set environment variables (or use .env file)
export BAYIT_MONGODB_URI="mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
export RADIO_MONGODB_URI="mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
export OLORIN_MONGODB_URI="mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Run test
cd /path/to/olorin-core/backend-core/olorin-shared
python3 test_mongodb_connection.py
```

---

## Test 3: Platform-Specific Tests

### 3.1 Bayit+ Backend Test

```bash
cd /path/to/olorin-media/bayit-plus/backend

# Set environment variables
export MONGODB_URI="mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
export MONGODB_DB_NAME="bayit_plus"

# Start server
poetry run uvicorn app.main:app --reload --port 8000
```

**Verification Steps**:

1. Check startup logs for:
   ```
   ✅ Connected to MongoDB Atlas: bayit_plus
      Max pool size: 100
      Min pool size: 20
   Connected to MongoDB via olorin-shared: bayit_plus
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:8000/api/health
   ```

3. Test database query endpoint:
   ```bash
   curl http://localhost:8000/api/content?limit=5
   ```

### 3.2 Israeli Radio Manager Test

```bash
cd /path/to/olorin-media/israeli-radio-manager/backend

# Set environment variables
export MONGODB_URI="mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
export MONGODB_DB_NAME="israeli_radio"

# Start server
poetry run uvicorn app.main:app --reload --port 8001
```

**Verification Steps**:

1. Check startup logs for:
   ```
   Connected to MongoDB via olorin-shared: israeli_radio
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:8001/api/health
   ```

3. Test database query endpoint:
   ```bash
   curl http://localhost:8001/api/content
   ```

### 3.3 Olorin Fraud Detection Test

```bash
cd /path/to/olorin-fraud/backend

# Set environment variables
export MONGODB_URI="mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
export MONGODB_DB_NAME="olorin"

# Start server
poetry run uvicorn app.main:app --reload --port 8002
```

**Verification Steps**:

1. Check startup logs for MongoDB connection
2. Test health endpoint:
   ```bash
   curl http://localhost:8002/health
   ```

3. Test investigations endpoint:
   ```bash
   curl http://localhost:8002/api/v1/investigations
   ```

---

## Test 4: Connection Pooling Verification

Test that connection pooling is working correctly:

```python
# test_connection_pooling.py
import asyncio
from olorin_shared.database import init_mongodb, get_mongodb_client

async def test_pooling():
    """Test connection pool reuse."""
    await init_mongodb()
    client = get_mongodb_client()

    print(f"Pool size config: max={client.max_pool_size}, min={client.min_pool_size}")

    # Simulate multiple concurrent connections
    tasks = []
    for i in range(20):
        tasks.append(client.admin.command("ping"))

    results = await asyncio.gather(*tasks)
    print(f"✓ Successfully executed {len(results)} concurrent pings")
    print("✓ Connection pooling working correctly")

asyncio.run(test_pooling())
```

---

## Test 5: Error Handling Tests

### 5.1 Test Invalid Connection String

```python
# test_invalid_connection.py
import os
import asyncio
from olorin_shared.database import init_mongodb

async def test_invalid_connection():
    """Test error handling with invalid credentials."""
    # Set invalid connection string
    os.environ["MONGODB_URI"] = "mongodb+srv://invalid:invalid@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority"
    os.environ["MONGODB_DB_NAME"] = "test_db"

    try:
        await init_mongodb()
        print("❌ Should have failed with invalid credentials")
    except Exception as e:
        print(f"✓ Correctly raised exception: {type(e).__name__}")
        print(f"  Message: {str(e)[:100]}")

asyncio.run(test_invalid_connection())
```

### 5.2 Test Missing Environment Variables

```python
# test_missing_env_vars.py
import os
from olorin_shared.database import MongoDBConnection

def test_missing_env():
    """Test error handling with missing environment variables."""
    # Clear environment variables
    os.environ.pop("MONGODB_URI", None)
    os.environ.pop("MONGODB_DB_NAME", None)

    try:
        conn = MongoDBConnection()
        print("❌ Should have failed with missing env vars")
    except Exception as e:
        print(f"✓ Correctly raised exception: {type(e).__name__}")
        print(f"  Message: {str(e)}")

test_missing_env()
```

---

## Test 6: Performance Benchmarks

### 6.1 Connection Initialization Time

```python
# test_performance.py
import asyncio
import time
from olorin_shared.database import init_mongodb, close_mongodb_connection

async def benchmark_connection():
    """Benchmark connection initialization time."""
    start = time.time()
    await init_mongodb()
    init_time = time.time() - start

    print(f"Connection initialization: {init_time:.3f} seconds")

    if init_time < 2.0:
        print("✓ Performance: Excellent (< 2s)")
    elif init_time < 5.0:
        print("⚠ Performance: Acceptable (2-5s)")
    else:
        print("❌ Performance: Poor (> 5s)")

    await close_mongodb_connection()

asyncio.run(benchmark_connection())
```

### 6.2 Query Performance

```python
# test_query_performance.py
import asyncio
import time
from olorin_shared.database import init_mongodb, get_mongodb_database

async def benchmark_queries():
    """Benchmark query performance."""
    await init_mongodb()
    db = get_mongodb_database()

    # Get first collection
    collections = await db.list_collection_names()
    if not collections:
        print("No collections to test")
        return

    test_collection = db[collections[0]]

    # Benchmark count query
    start = time.time()
    count = await test_collection.count_documents({})
    count_time = time.time() - start

    print(f"Count query: {count_time:.3f}s ({count} documents)")

    # Benchmark find query
    start = time.time()
    docs = await test_collection.find({}).limit(100).to_list(length=100)
    find_time = time.time() - start

    print(f"Find query (100 docs): {find_time:.3f}s")

asyncio.run(benchmark_queries())
```

---

## Test 7: Integration Tests

### 7.1 Multi-Database Test

Test that all three databases can be accessed simultaneously:

```python
# test_multi_database.py
import asyncio
import os
from olorin_shared.database import MongoDBConnection

async def test_multiple_databases():
    """Test accessing multiple databases sequentially."""
    databases = [
        {"name": "bayit_plus", "expected_collections": ["users", "content"]},
        {"name": "israeli_radio", "expected_collections": ["content", "schedules"]},
        {"name": "olorin", "expected_collections": ["investigations"]}
    ]

    for db_config in databases:
        os.environ["MONGODB_DB_NAME"] = db_config["name"]

        # Create new connection for this database
        conn = MongoDBConnection()
        await conn.connect()
        db = conn.get_database()

        # Verify collections exist
        collections = await db.list_collection_names()
        print(f"\n{db_config['name']}:")
        print(f"  Collections found: {len(collections)}")

        for expected in db_config["expected_collections"]:
            if expected in collections:
                print(f"  ✓ {expected}")
            else:
                print(f"  ❌ {expected} (missing)")

        await conn.close()

asyncio.run(test_multiple_databases())
```

---

## Troubleshooting

### Issue: "ConfigurationError: MONGODB_URI environment variable is required"

**Solution**: Set environment variables before running tests:
```bash
export MONGODB_URI="mongodb+srv://..."
export MONGODB_DB_NAME="your_database"
```

### Issue: "ConnectionFailure: Server selection timeout"

**Possible causes**:
1. MongoDB Atlas IP whitelist doesn't include your IP
2. Invalid connection string
3. Network/firewall issues

**Solution**:
```bash
# 1. Check MongoDB Atlas Network Access
# Add your IP: https://cloud.mongodb.com → Network Access → Add IP Address

# 2. Test connection with mongosh
mongosh "mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/bayit_plus"

# 3. Check network
ping cluster0.ydrvaft.mongodb.net
```

### Issue: "Authentication failed"

**Solution**: Verify credentials in MongoDB Atlas:
1. Go to Database Access
2. Check user `admin_db_user` exists
3. Verify password is correct
4. Check user has read/write permissions on target database

### Issue: Import errors

**Solution**: Ensure `olorin-shared` is installed:
```bash
cd /path/to/bayit-plus/backend
poetry install  # or pip install -e ../packages/olorin-shared
```

---

## Success Criteria

All tests pass if:

- [ ] ✅ All three platforms start successfully
- [ ] ✅ Health endpoints respond correctly
- [ ] ✅ Database queries return data
- [ ] ✅ Connection logs show "via olorin-shared"
- [ ] ✅ Connection pooling working (max 100, min 20)
- [ ] ✅ No authentication errors
- [ ] ✅ Performance benchmarks acceptable (< 2s init, < 100ms queries)
- [ ] ✅ Error handling works correctly
- [ ] ✅ All expected collections present in each database

---

## Production Deployment Testing

### Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Google Cloud Secret Manager configured
- [ ] IAM permissions granted to service accounts
- [ ] MongoDB password rotated (if exposed)
- [ ] Connection pooling configured correctly
- [ ] Monitoring and alerting set up

### Post-Deployment Verification

```bash
# 1. Check application logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# 2. Monitor connection metrics
# Look for MongoDB connection pool metrics in Sentry or Cloud Monitoring

# 3. Test production endpoints
curl https://api.bayit.tv/api/health
curl https://radio.olorin.ai/api/health
curl https://fraud.olorin.ai/health

# 4. Check Secret Manager access
gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com" --limit 20
```

---

**Last Updated**: January 21, 2026
**Author**: Olorin.ai Backend Team
**Status**: Testing Guide Complete ✅
