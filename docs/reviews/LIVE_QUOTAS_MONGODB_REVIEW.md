# Live Quotas MongoDB Atlas & Beanie ODM Review

**Review Date**: 2026-01-23
**Reviewer**: MongoDB/Atlas Expert (`prisma-expert`)
**Scope**: Live Feature Quota implementation for MongoDB Atlas and Beanie ODM best practices

---

## Status: ⚠️ CHANGES REQUIRED

While the implementation demonstrates good understanding of Beanie ODM and basic MongoDB concepts, there are **critical performance and concurrency issues** that must be addressed before production deployment.

---

## Executive Summary

### Critical Issues (Must Fix)
1. **Race Conditions in Concurrent Updates** - No atomic operations for quota updates during high-frequency WebSocket sessions
2. **Missing Aggregation Pipelines** - Admin analytics queries use inefficient application-level aggregation
3. **Index Optimization Gaps** - Missing compound indexes for critical query patterns
4. **No Transaction Support** - Rollover calculations need atomicity guarantees

### Moderate Issues (Should Fix)
1. **Time-Series Collection Opportunity** - Sessions data fits time-series pattern but uses regular collection
2. **Missing Change Streams** - Real-time updates would benefit from MongoDB change streams
3. **Query Pattern Optimization** - Some queries could be more efficient

### Strengths
1. Proper Beanie ODM Document models with Pydantic validation
2. Good index strategy foundation
3. Appropriate field types and default values
4. Clean separation of concerns

---

## Detailed Analysis

### 1. Beanie ODM Usage Quality: **6/10**

#### ✅ Strengths

**Proper Document Models**:
```python
class LiveFeatureQuota(Document):
    user_id: str
    subtitle_usage_current_hour: float = 0.0
    # ... proper field definitions

    class Settings:
        name = "live_feature_quotas"
        indexes = [
            "user_id",
            [("last_hour_reset", 1)],
            [("last_day_reset", 1)],
            [("last_month_reset", 1)],
        ]
```

**Good Pydantic Integration**:
- Field validation via Pydantic BaseModel
- Type hints throughout
- Default factories for datetime fields

#### ❌ Critical Issues

**1. No Atomic Operations for Concurrent Updates**

**Location**: `live_feature_quota_service.py:333-401`

**Problem**:
```python
# Current implementation - NOT ATOMIC
async def update_session(session_id: str, audio_seconds_delta: float, ...):
    session = await LiveFeatureUsageSession.find_one(...)

    # Multiple field updates - race condition window
    session.audio_seconds_processed += audio_seconds_delta
    session.segments_processed += segments_delta
    await session.save()

    # Separate quota update - another race condition
    quota = await LiveFeatureQuotaService.get_or_create_quota(session.user_id)
    quota.subtitle_usage_current_hour += minutes_delta
    await quota.save()
```

**Issue**: If multiple WebSocket updates arrive simultaneously (10s interval × multiple devices), updates will be lost due to read-modify-write pattern.

**Fix Required**: Use atomic MongoDB operations:
```python
# CORRECT - Atomic increment
from pymongo import UpdateOne

async def update_session(session_id: str, audio_seconds_delta: float, ...):
    # Atomic session update
    motor_collection = LiveFeatureUsageSession.get_motor_collection()
    await motor_collection.update_one(
        {"session_id": session_id},
        {
            "$inc": {
                "audio_seconds_processed": audio_seconds_delta,
                "segments_processed": segments_delta,
                "estimated_stt_cost": cost_delta["stt_cost"],
                "estimated_total_cost": cost_delta["total_cost"],
            },
            "$set": {
                "last_activity_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        }
    )

    # Atomic quota update with rollover handling
    quota_collection = LiveFeatureQuota.get_motor_collection()
    field_prefix = "subtitle" if is_subtitle else "dubbing"

    # Complex atomic update with conditional logic
    await quota_collection.update_one(
        {"user_id": session.user_id},
        [
            {
                "$set": {
                    f"{field_prefix}_usage_current_hour": {
                        "$add": [f"${field_prefix}_usage_current_hour", minutes_delta]
                    },
                    f"accumulated_{field_prefix}_minutes": {
                        "$max": [
                            0,
                            {
                                "$subtract": [
                                    f"$accumulated_{field_prefix}_minutes",
                                    {
                                        "$min": [
                                            minutes_delta,
                                            f"$accumulated_{field_prefix}_minutes"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    "updated_at": datetime.utcnow()
                }
            }
        ]
    )
```

**Impact**: HIGH - Data loss and incorrect quota tracking in production

---

**2. Rollover Calculation Needs Transactions**

**Location**: `live_feature_quota_service.py:75-141`

**Problem**:
```python
async def _reset_windows_and_rollover(quota: LiveFeatureQuota) -> bool:
    # Multiple calculations and saves - not atomic
    unused_subtitle = max(0, quota.subtitle_minutes_per_hour - quota.subtitle_usage_current_hour)
    quota.accumulated_subtitle_minutes = min(
        quota.accumulated_subtitle_minutes + unused_subtitle,
        max_subtitle_rollover,
    )
    quota.subtitle_usage_current_hour = 0.0
    await quota.save()
```

**Issue**: If window reset and usage update happen simultaneously, rollover calculation will be incorrect.

**Fix Required**: Use MongoDB multi-document transaction or aggregation pipeline update:
```python
async def _reset_windows_and_rollover(quota: LiveFeatureQuota) -> bool:
    motor_collection = LiveFeatureQuota.get_motor_collection()

    # Use aggregation pipeline for atomic rollover calculation
    result = await motor_collection.update_one(
        {
            "_id": quota.id,
            "last_hour_reset": {"$lt": datetime.utcnow() - timedelta(hours=1)}
        },
        [
            {
                "$set": {
                    "accumulated_subtitle_minutes": {
                        "$min": [
                            {
                                "$add": [
                                    "$accumulated_subtitle_minutes",
                                    {
                                        "$max": [
                                            0,
                                            {
                                                "$subtract": [
                                                    "$subtitle_minutes_per_hour",
                                                    "$subtitle_usage_current_hour"
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {"$multiply": ["$subtitle_minutes_per_hour", "$max_rollover_multiplier"]}
                        ]
                    },
                    "subtitle_usage_current_hour": 0.0,
                    "last_hour_reset": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        ]
    )

    return result.modified_count > 0
```

**Impact**: HIGH - Incorrect quota calculations under concurrent load

---

### 2. Index Optimization: **5/10**

#### ✅ Current Indexes

**LiveFeatureQuota**:
```python
indexes = [
    "user_id",                    # Good - primary lookup
    [("last_hour_reset", 1)],    # Good - window resets
    [("last_day_reset", 1)],
    [("last_month_reset", 1)],
]
```

**LiveFeatureUsageSession**:
```python
indexes = [
    "session_id",                          # Good - session lookup
    "user_id",                             # Good - user history
    [("user_id", 1), ("started_at", -1)], # Good - compound for history queries
    [("status", 1)],                       # Good - active sessions
    [("feature_type", 1), ("started_at", -1)],
]
```

#### ❌ Missing Indexes

**1. Composite Index for Time Range + Feature Type Queries**

**Admin endpoint query pattern** (`admin/live_quotas.py:154-169`):
```python
query = LiveFeatureUsageSession.find(
    LiveFeatureUsageSession.started_at >= start_date,
    LiveFeatureUsageSession.started_at <= end_date,
)
if feature_type:
    query = query.find(LiveFeatureUsageSession.feature_type == feature_type)
if platform:
    query = query.find(LiveFeatureUsageSession.platform == platform)
```

**Missing Index**:
```python
# Add to LiveFeatureUsageSession.Settings.indexes:
[("started_at", -1), ("feature_type", 1), ("platform", 1)],
```

**Impact**: Range queries on time + filters will do collection scans

---

**2. Index for Cost Aggregations**

**Top users query** (`admin/live_quotas.py:236-276`):
```python
query = LiveFeatureUsageSession.find(
    LiveFeatureUsageSession.started_at >= start_date
)
# Then groups by user_id in Python (inefficient)
```

**Missing Index**:
```python
# Add compound index for cost reporting:
[("started_at", -1), ("user_id", 1), ("estimated_total_cost", -1)],
```

---

**3. TTL Index for Session Cleanup**

Sessions should auto-expire after retention period:
```python
# Add TTL index (expires after 90 days):
[("created_at", 1), {"expireAfterSeconds": 7776000}],  # 90 days
```

**Impact**: Manual cleanup required without TTL index

---

### 3. Aggregation Pipeline Design: **3/10**

#### ❌ Missing Aggregation - Using Application-Level Aggregation

**Current Implementation** (`admin/live_quotas.py:236-276`):
```python
# INEFFICIENT - Loads ALL sessions into memory
sessions = await query.to_list()

# Python-level aggregation
user_stats = {}
for session in sessions:
    if session.user_id not in user_stats:
        user_stats[session.user_id] = {...}
    stats = user_stats[session.user_id]
    stats["total_minutes"] += session.duration_seconds / 60.0
    # ... more calculations
```

**Problems**:
- Loads entire dataset into memory
- Network transfer overhead
- Slow for large datasets
- No MongoDB query optimization

**Fix Required - Use Aggregation Pipeline**:
```python
@router.get("/top-users")
async def get_top_users(
    feature_type: Optional[FeatureType] = None,
    days: int = 30,
    limit: int = 20,
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(days=days)

    # Build aggregation pipeline
    match_stage = {"started_at": {"$gte": start_date}}
    if feature_type:
        match_stage["feature_type"] = feature_type.value

    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": "$user_id",
                "total_sessions": {"$sum": 1},
                "total_seconds": {"$sum": "$duration_seconds"},
                "total_cost": {"$sum": "$estimated_total_cost"},
                "subtitle_seconds": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$feature_type", "subtitle"]},
                            "$duration_seconds",
                            0
                        ]
                    }
                },
                "dubbing_seconds": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$feature_type", "dubbing"]},
                            "$duration_seconds",
                            0
                        ]
                    }
                }
            }
        },
        {
            "$project": {
                "user_id": "$_id",
                "total_sessions": 1,
                "total_minutes": {"$divide": ["$total_seconds", 60]},
                "total_cost": {"$round": ["$total_cost", 4]},
                "subtitle_minutes": {"$divide": ["$subtitle_seconds", 60]},
                "dubbing_minutes": {"$divide": ["$dubbing_seconds", 60]},
            }
        },
        {"$sort": {"total_minutes": -1}},
        {"$limit": limit}
    ]

    motor_collection = LiveFeatureUsageSession.get_motor_collection()
    results = await motor_collection.aggregate(pipeline).to_list(None)

    return {
        "period_days": days,
        "feature_type": feature_type.value if feature_type else "all",
        "top_users": results,
    }
```

**Performance Impact**: 10-100x faster for large datasets

---

**Similar Issue in Usage Report** (`admin/live_quotas.py:172-191`):
```python
# Also needs aggregation pipeline instead of Python sum()
total_minutes = sum(s.duration_seconds / 60.0 for s in sessions)
total_cost = sum(s.estimated_total_cost for s in sessions)
```

**Fix**: Use `$facet` aggregation for summary + paginated results in single query.

---

### 4. Atlas-Specific Features: **2/10**

#### ❌ Missing Features

**1. Time-Series Collection for Sessions**

**Current**: Regular collection for `LiveFeatureUsageSession`

**Better**: MongoDB 5.0+ Time-Series collection:
```python
class LiveFeatureUsageSession(Document):
    # ... existing fields

    class Settings:
        name = "live_feature_usage_sessions"
        timeseries = {
            "timeField": "started_at",
            "metaField": "user_id",
            "granularity": "minutes"  # Optimized for minute-level queries
        }
        # Indexes automatically optimized for time-series
```

**Benefits**:
- 10x storage compression
- Optimized time-range queries
- Automatic bucketing for aggregations
- Better for analytics workloads

---

**2. No Change Streams for Real-Time Updates**

**Current**: Frontend polls every 30s (`/live/quota/my-usage`)

**Better**: MongoDB Change Streams with WebSocket push:
```python
# Backend: Watch quota changes
async def watch_user_quota_changes(user_id: str):
    async with LiveFeatureQuota.get_motor_collection().watch(
        pipeline=[{"$match": {"fullDocument.user_id": user_id}}],
        full_document="updateLookup"
    ) as stream:
        async for change in stream:
            if change["operationType"] == "update":
                # Push to WebSocket
                await websocket_manager.send_quota_update(
                    user_id,
                    change["fullDocument"]
                )
```

**Benefits**:
- Instant updates (no polling delay)
- Reduced backend load
- Better user experience

---

**3. Missing Atlas Search for Analytics**

**Use Case**: Admin searches users by email/name with usage filters

**Current**: Not implemented

**Better**: Atlas Search index:
```python
# Create Atlas Search index via Atlas UI or CLI
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "email": {"type": "string"},
      "name": {"type": "string"},
      "subscription_tier": {"type": "string"}
    }
  }
}

# Query in code:
results = await User.get_motor_collection().aggregate([
    {
        "$search": {
            "index": "user_search",
            "compound": {
                "should": [
                    {"text": {"query": search_query, "path": "email"}},
                    {"text": {"query": search_query, "path": "name"}}
                ]
            }
        }
    },
    {"$limit": 20}
]).to_list(None)
```

---

### 5. Performance Concerns: **4/10**

#### ⚠️ High-Frequency Write Operations

**Pattern**: WebSocket updates every 10 seconds per active session

**Location**: `live_feature_quota_service.py:333-401`

**Current Load Estimate**:
- 100 concurrent sessions
- 10-second update interval
- = **600 writes/minute** (10 writes/sec)
- Each write updates 2 documents (session + quota)
- = **1,200 writes/minute** total

**Issues**:
1. **Write Conflicts**: No atomic operations = lost updates
2. **Connection Pool Pressure**: Default Beanie settings may not handle load
3. **No Write Batching**: Individual writes for each update

**Recommendations**:

**1. Use Bulk Write Operations**:
```python
from pymongo import UpdateOne

async def batch_update_sessions(updates: List[dict]):
    """Batch multiple session updates into single operation"""
    motor_collection = LiveFeatureUsageSession.get_motor_collection()

    operations = [
        UpdateOne(
            {"session_id": update["session_id"]},
            {
                "$inc": {
                    "audio_seconds_processed": update["audio_seconds_delta"],
                    "segments_processed": update["segments_delta"],
                },
                "$set": {"last_activity_at": datetime.utcnow()}
            }
        )
        for update in updates
    ]

    result = await motor_collection.bulk_write(operations, ordered=False)
    return result
```

**2. Configure Connection Pool**:
```python
# In database.py or initialization
client = motor.motor_asyncio.AsyncIOMotorClient(
    MONGODB_URL,
    maxPoolSize=100,  # Increase from default 100
    minPoolSize=10,   # Keep connections warm
    maxIdleTimeMS=45000,
    waitQueueTimeoutMS=5000,  # Fail fast if pool exhausted
)
```

**3. Add Write Concern Configuration**:
```python
# For quota-critical operations
await quota.save(write_concern={"w": "majority", "wtimeout": 5000})

# For less critical session metrics (can afford eventual consistency)
await session.save(write_concern={"w": 1})  # Single node write
```

---

#### ⚠️ Query Performance

**Session History Query** (`live_quota.py:98-103`):
```python
query = LiveFeatureUsageSession.find(
    LiveFeatureUsageSession.user_id == str(current_user.id)
).sort([("started_at", -1)])
```

**Current**: Uses compound index `[("user_id", 1), ("started_at", -1)]` ✅ GOOD

**But**: No projection - fetches all fields including cost estimates

**Optimization**:
```python
# Exclude unnecessary fields for frontend display
query = LiveFeatureUsageSession.find(
    LiveFeatureUsageSession.user_id == str(current_user.id),
    projection_model=SessionHistoryProjection  # Custom projection model
).sort([("started_at", -1)])
```

---

### 6. Data Integrity: **7/10**

#### ✅ Strengths

1. **Field Validation**: Pydantic models enforce types
2. **Enum Usage**: `FeatureType`, `UsageSessionStatus` prevent invalid values
3. **Default Values**: Proper defaults for all fields
4. **Timestamp Tracking**: `created_at`, `updated_at` fields

#### ⚠️ Concerns

**1. No Unique Constraint on `user_id`** in `LiveFeatureQuota`:
```python
class Settings:
    name = "live_feature_quotas"
    indexes = [
        "user_id",  # Should be unique!
    ]
```

**Fix**:
```python
indexes = [
    {"keys": [("user_id", 1)], "unique": True},  # Enforce one quota per user
    [("last_hour_reset", 1)],
    [("last_day_reset", 1)],
    [("last_month_reset", 1)],
]
```

---

**2. No Index on `session_id` Uniqueness**:
```python
# Should enforce unique session IDs
indexes = [
    {"keys": [("session_id", 1)], "unique": True},
    "user_id",
    # ... other indexes
]
```

---

**3. Window Reset Logic Vulnerable to Clock Skew**:

**Problem**: Uses `datetime.utcnow()` comparison which can drift

**Better**: Use MongoDB server time:
```python
# Get server time for consistent comparisons
from bson import Timestamp

server_time = await motor_collection.find_one(
    {},
    {"_id": 0, "server_time": {"$literal": "$$NOW"}}
)
# Use server_time for all comparisons
```

---

## Recommendations Priority

### P0 - Critical (Must Fix Before Production)

1. **Implement Atomic Operations for Quota Updates**
   - Use `$inc` for concurrent write safety
   - Estimated effort: 2 days
   - File: `live_feature_quota_service.py`

2. **Add Aggregation Pipelines for Admin Analytics**
   - Replace Python aggregation with MongoDB aggregation
   - Estimated effort: 1 day
   - Files: `admin/live_quotas.py`

3. **Add Missing Compound Indexes**
   - Time range + feature type + platform
   - Cost reporting queries
   - Estimated effort: 0.5 days

4. **Fix Unique Constraints**
   - `user_id` in LiveFeatureQuota
   - `session_id` in LiveFeatureUsageSession
   - Estimated effort: 0.5 days

### P1 - High Priority (Should Fix Soon)

5. **Add Transaction Support for Rollover Calculations**
   - Use aggregation pipeline updates
   - Estimated effort: 1 day

6. **Configure Connection Pool for High Load**
   - Increase pool size
   - Add write concern configuration
   - Estimated effort: 0.5 days

7. **Add TTL Index for Session Cleanup**
   - Auto-expire old sessions
   - Estimated effort: 0.25 days

### P2 - Medium Priority (Nice to Have)

8. **Consider Time-Series Collection for Sessions**
   - Requires schema migration
   - Estimated effort: 2 days

9. **Implement Change Streams for Real-Time Updates**
   - Replace polling with push notifications
   - Estimated effort: 2 days

10. **Add Query Projections to Reduce Data Transfer**
    - Use projection models
    - Estimated effort: 1 day

---

## Code Examples for Fixes

### 1. Atomic Quota Update (P0)

**File**: `backend/app/services/live_feature_quota_service.py`

**Current (lines 374-401)** - Replace with:

```python
@staticmethod
async def update_session(
    session_id: str,
    audio_seconds_delta: float,
    segments_delta: int = 0,
    chars_processed: int = 0,
):
    """Update session with usage increments using atomic operations"""

    # Find session first to get metadata
    session = await LiveFeatureUsageSession.find_one(
        LiveFeatureUsageSession.session_id == session_id
    )

    if not session:
        logger.error(f"Session {session_id} not found")
        return

    # Calculate cost deltas
    minutes_delta = audio_seconds_delta / 60.0
    cost_delta = LiveFeatureQuotaService._estimate_session_cost(
        minutes_delta,
        session.source_language or "he",
        session.target_language or "en",
        session.feature_type,
    )

    # Atomic session update
    session_collection = LiveFeatureUsageSession.get_motor_collection()
    await session_collection.update_one(
        {"session_id": session_id},
        {
            "$inc": {
                "audio_seconds_processed": audio_seconds_delta,
                "segments_processed": segments_delta,
                "estimated_stt_cost": cost_delta["stt_cost"],
                "estimated_translation_cost": cost_delta["translation_cost"],
                "estimated_tts_cost": cost_delta["tts_cost"],
                "estimated_total_cost": cost_delta["total_cost"],
            },
            "$set": {
                "last_activity_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        }
    )

    # Atomic quota update with rollover deduction
    quota_collection = LiveFeatureQuota.get_motor_collection()
    field_prefix = "subtitle" if session.feature_type == FeatureType.SUBTITLE else "dubbing"

    await quota_collection.update_one(
        {"user_id": session.user_id},
        [
            {
                "$set": {
                    # Increment usage counters
                    f"{field_prefix}_usage_current_hour": {
                        "$add": [f"${field_prefix}_usage_current_hour", minutes_delta]
                    },
                    f"{field_prefix}_usage_current_day": {
                        "$add": [f"${field_prefix}_usage_current_day", minutes_delta]
                    },
                    f"{field_prefix}_usage_current_month": {
                        "$add": [f"${field_prefix}_usage_current_month", minutes_delta]
                    },
                    # Deduct from accumulated rollover (atomic)
                    f"accumulated_{field_prefix}_minutes": {
                        "$max": [
                            0,
                            {
                                "$subtract": [
                                    f"$accumulated_{field_prefix}_minutes",
                                    {
                                        "$min": [
                                            minutes_delta,
                                            f"$accumulated_{field_prefix}_minutes"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    # Update cost tracking
                    "estimated_cost_current_month": {
                        "$add": ["$estimated_cost_current_month", cost_delta["total_cost"]]
                    },
                    "total_lifetime_cost": {
                        "$add": ["$total_lifetime_cost", cost_delta["total_cost"]]
                    },
                    "updated_at": datetime.utcnow()
                }
            }
        ]
    )
```

---

### 2. Aggregation Pipeline for Top Users (P0)

**File**: `backend/app/api/routes/admin/live_quotas.py`

**Replace function (lines 221-292)** with:

```python
@router.get("/top-users")
async def get_top_users(
    feature_type: Optional[FeatureType] = Query(None, description="Filter by feature type"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    limit: int = Query(20, ge=1, le=100, description="Number of top users to return"),
    current_user: User = Depends(has_permission(Permission.ANALYTICS_READ)),
):
    """Get top users by usage using MongoDB aggregation pipeline"""
    try:
        from datetime import timedelta

        start_date = datetime.utcnow() - timedelta(days=days)

        # Build match stage
        match_stage = {"started_at": {"$gte": start_date}}
        if feature_type:
            match_stage["feature_type"] = feature_type.value

        # Aggregation pipeline
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": "$user_id",
                    "total_sessions": {"$sum": 1},
                    "total_seconds": {"$sum": "$duration_seconds"},
                    "total_cost": {"$sum": "$estimated_total_cost"},
                    "subtitle_seconds": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$feature_type", "subtitle"]},
                                "$duration_seconds",
                                0
                            ]
                        }
                    },
                    "dubbing_seconds": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$feature_type", "dubbing"]},
                                "$duration_seconds",
                                0
                            ]
                        }
                    }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "user_id": "$_id",
                    "total_sessions": 1,
                    "total_minutes": {"$round": [{"$divide": ["$total_seconds", 60]}, 2]},
                    "total_cost": {"$round": ["$total_cost", 4]},
                    "subtitle_minutes": {"$round": [{"$divide": ["$subtitle_seconds", 60]}, 2]},
                    "dubbing_minutes": {"$round": [{"$divide": ["$dubbing_seconds", 60]}, 2]},
                }
            },
            {"$sort": {"total_minutes": -1}},
            {"$limit": limit}
        ]

        motor_collection = LiveFeatureUsageSession.get_motor_collection()
        top_users = await motor_collection.aggregate(pipeline).to_list(None)

        return {
            "period_days": days,
            "feature_type": feature_type.value if feature_type else "all",
            "top_users": top_users,
        }
    except Exception as e:
        logger.error(f"Error getting top users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get top users")
```

---

### 3. Add Missing Indexes (P0)

**File**: `backend/app/models/live_feature_quota.py`

**Update lines 124-133**:

```python
class LiveFeatureUsageSession(Document):
    # ... existing fields

    class Settings:
        name = "live_feature_usage_sessions"
        indexes = [
            # Unique session ID
            {"keys": [("session_id", 1)], "unique": True},

            # User queries
            "user_id",
            [("user_id", 1), ("started_at", -1)],

            # Status queries
            [("status", 1)],

            # Feature type queries
            [("feature_type", 1), ("started_at", -1)],

            # Admin analytics - time range + filters (NEW)
            [("started_at", -1), ("feature_type", 1), ("platform", 1)],

            # Cost reporting (NEW)
            [("started_at", -1), ("user_id", 1), ("estimated_total_cost", -1)],

            # TTL index - auto-cleanup after 90 days (NEW)
            [("created_at", 1)],  # Configure expireAfterSeconds via Atlas UI or migration
        ]
```

**Update lines 78-86**:

```python
class LiveFeatureQuota(Document):
    # ... existing fields

    class Settings:
        name = "live_feature_quotas"
        indexes = [
            # Unique user ID (FIXED)
            {"keys": [("user_id", 1)], "unique": True},

            # Window resets
            [("last_hour_reset", 1)],
            [("last_day_reset", 1)],
            [("last_month_reset", 1)],
        ]
```

---

## Testing Recommendations

### Performance Testing

**Load Test Script** (`backend/tests/load_test_quotas.py`):

```python
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

async def simulate_concurrent_updates(num_sessions: int = 100):
    """Simulate 100 concurrent WebSocket sessions updating every 10s"""

    tasks = []
    for i in range(num_sessions):
        session_id = f"test-session-{i}"
        task = asyncio.create_task(
            update_session_loop(session_id, duration_seconds=60)
        )
        tasks.append(task)

    start = time.time()
    await asyncio.gather(*tasks)
    duration = time.time() - start

    # Verify no lost updates
    total_expected = num_sessions * 6  # 60s / 10s interval
    total_actual = await verify_update_count()

    assert total_actual == total_expected, f"Lost updates: {total_expected - total_actual}"
    print(f"✅ {num_sessions} sessions, {total_actual} updates in {duration:.1f}s")
```

**Run with**: `poetry run pytest backend/tests/load_test_quotas.py -v`

---

## Migration Script

**Create Migration** (`backend/scripts/migrate_quota_indexes.py`):

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def migrate_indexes():
    """Add missing indexes and unique constraints"""

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_database]

    # 1. Add unique constraint to LiveFeatureQuota.user_id
    quotas = db.live_feature_quotas
    await quotas.create_index([("user_id", 1)], unique=True, background=True)
    print("✅ Added unique index on LiveFeatureQuota.user_id")

    # 2. Add unique constraint to LiveFeatureUsageSession.session_id
    sessions = db.live_feature_usage_sessions
    await sessions.create_index([("session_id", 1)], unique=True, background=True)
    print("✅ Added unique index on LiveFeatureUsageSession.session_id")

    # 3. Add compound indexes for analytics
    await sessions.create_index(
        [("started_at", -1), ("feature_type", 1), ("platform", 1)],
        background=True
    )
    print("✅ Added analytics compound index")

    await sessions.create_index(
        [("started_at", -1), ("user_id", 1), ("estimated_total_cost", -1)],
        background=True
    )
    print("✅ Added cost reporting index")

    # 4. Add TTL index (90 days)
    await sessions.create_index(
        [("created_at", 1)],
        expireAfterSeconds=7776000,  # 90 days
        background=True
    )
    print("✅ Added TTL index (90 days)")

    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_indexes())
```

**Run**: `poetry run python backend/scripts/migrate_quota_indexes.py`

---

## Summary

### Final Verdict: ⚠️ CHANGES REQUIRED

The Live Quotas implementation shows good understanding of MongoDB and Beanie ODM basics, but **requires critical fixes for production readiness**:

**Must Fix (P0)**:
1. Atomic operations for concurrent writes (race conditions)
2. Aggregation pipelines for analytics (performance)
3. Missing compound indexes (query performance)
4. Unique constraints on user_id and session_id (data integrity)

**Estimated Effort**: 4-5 days for P0 fixes

**Once Fixed**: Implementation will be production-ready for MongoDB Atlas with proper performance, concurrency safety, and data integrity.

---

## Approval Status

**Current Status**: ❌ **CHANGES REQUIRED**

**Required Actions**:
- [ ] Implement atomic operations using `$inc` and aggregation pipeline updates
- [ ] Replace Python aggregation with MongoDB aggregation pipelines
- [ ] Add missing compound indexes
- [ ] Add unique constraints on `user_id` and `session_id`
- [ ] Run migration script
- [ ] Run load tests to verify race conditions fixed

**Next Steps**:
1. Implement P0 fixes (4-5 days)
2. Run load tests
3. Re-review for approval

---

**Reviewer**: MongoDB/Atlas Expert (`prisma-expert`)
**Date**: 2026-01-23
**Signature**: Review Complete - Changes Required Before Production
