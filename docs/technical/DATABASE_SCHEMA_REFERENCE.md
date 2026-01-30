# Database Schema Reference

**Database:** MongoDB Atlas
**ODM:** Beanie (async Document Object Mapper)
**Driver:** Motor (async MongoDB driver)
**Last Updated:** 2026-01-30

## Overview

Bayit+ uses **MongoDB Atlas** as its primary database with **Beanie ODM** for Python object-document mapping. The database contains 64+ collections covering content management, user data, subscriptions, AI features, and platform operations.

### Key Characteristics

- **Async Operations:** All database operations use Motor's async API
- **Document Validation:** Pydantic models for schema validation
- **Indexes:** Strategic indexes for query performance
- **Multi-Language:** Hebrew, English, Spanish support
- **Audit Trail:** Comprehensive logging for critical operations

### Database Connection

```python
# Connection configuration
MONGODB_URI = "mongodb+srv://..."  # From Google Cloud Secret Manager
DATABASE_NAME = "bayit_plus"

# Async connection via olorin-shared
from olorin_shared.database import init_mongodb, get_mongodb_client

client = await init_mongodb(settings.MONGODB_URI)
db = get_mongodb_database(client, "bayit_plus")
```

---

## Core Collections

### Users & Authentication

#### Collection: `user`

**Purpose:** User accounts, profiles, and authentication

**Model:** `app.models.user.User`

**Key Fields:**
| Field | Type | Description | Required | Indexed |
|-------|------|-------------|----------|---------|
| `_id` | ObjectId | User ID | Yes | Primary |
| `email` | EmailStr | User email (unique) | Yes | Unique |
| `name` | str | Display name | Yes | No |
| `firebase_uid` | str | Firebase Auth UID | No | Unique |
| `password_hash` | str | Bcrypt password hash | No | No |
| `is_active` | bool | Account active status | Yes | Yes |
| `role` | str | User role (user/admin/beta) | Yes | Yes |
| `subscription_tier` | str | Subscription level | No | Yes |
| `devices` | List[Device] | Registered devices | No | No |
| `preferences` | dict | User preferences | No | No |
| `created_at` | datetime | Account creation | Yes | Yes |
| `updated_at` | datetime | Last modification | Yes | No |
| `last_login` | datetime | Last login time | No | Yes |

**Device Sub-Document:**
```python
class Device:
    device_id: str         # SHA-256 hash
    device_name: str       # "iPhone 15 Pro"
    device_type: str       # mobile, desktop, tv, tablet
    browser: Optional[str] # Chrome, Safari, Firefox
    os: Optional[str]      # iOS 17.2, Windows 11
    platform: Optional[str] # iOS, Android, Web, tvOS
    ip_address: Optional[str]
    last_active: datetime
    registered_at: datetime
    is_current: bool
```

**Indexes:**
```python
IndexModel([("email", ASCENDING)], unique=True)
IndexModel([("firebase_uid", ASCENDING)], unique=True, sparse=True)
IndexModel([("is_active", ASCENDING)])
IndexModel([("role", ASCENDING)])
IndexModel([("created_at", DESCENDING)])
```

**Example Document:**
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "user@example.com",
  "name": "John Doe",
  "firebase_uid": "abc123xyz",
  "is_active": true,
  "role": "user",
  "subscription_tier": "premium",
  "devices": [
    {
      "device_id": "a3f5...",
      "device_name": "iPhone 15 Pro",
      "device_type": "mobile",
      "platform": "iOS",
      "last_active": ISODate("2026-01-30T12:00:00Z")
    }
  ],
  "created_at": ISODate("2026-01-01T00:00:00Z"),
  "updated_at": ISODate("2026-01-30T12:00:00Z")
}
```

---

#### Collection: `profile`

**Purpose:** User profiles (separate from auth for performance)

**Model:** `app.models.profile.Profile`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `bio` | str | User biography |
| `avatar_url` | str | Profile picture URL |
| `language_preference` | str | Preferred language (he/en/es) |
| `subtitle_preferences` | dict | Subtitle settings |
| `playback_preferences` | dict | Playback settings |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING)], unique=True)
```

---

### Content Management

#### Collection: `content`

**Purpose:** All video-on-demand (VOD) content

**Model:** `app.models.content.Content`

**Key Fields:**
| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `_id` | ObjectId | Content ID | Primary |
| `title` | str | Hebrew title | Text |
| `title_en` | str | English title | Text |
| `title_es` | str | Spanish title | Text |
| `description` | str | Hebrew description | Text |
| `description_en` | str | English description | Text |
| `description_es` | str | Spanish description | Text |
| `thumbnail` | str | Thumbnail URL | No |
| `backdrop` | str | Backdrop image URL | No |
| `poster_url` | str | TMDB poster URL | No |
| `section_ids` | List[str] | Content sections | Yes |
| `primary_section_id` | str | Main section | Yes |
| `content_format` | str | movie/series/documentary | Yes |
| `audience_id` | str | Age rating | Yes |
| `genre_ids` | List[str] | Genre classifications | Yes |
| `topic_tags` | List[str] | Theme tags | Yes |
| `subcategory_ids` | List[str] | Sub-categories | Yes |
| `stream_url` | str | HLS/DASH stream URL | No |
| `duration` | str | "1:45:00" | No |
| `year` | int | Release year | Yes |
| `rating` | float | TMDB rating | No |
| `cast` | List[str] | Cast members | No |
| `director` | str | Director name | No |
| `tmdb_id` | int | TMDB identifier | Unique |
| `is_featured` | bool | Featured content | Yes |
| `view_count` | int | Total views | Yes |
| `created_at` | datetime | Added date | Yes |

**5-Axis Taxonomy System:**

1. **Section** - Where content lives in navigation (can be in multiple)
   - Example: `["movies", "judaism"]` - cross-listing support

2. **Format** - Structural content type
   - Values: `movie`, `series`, `documentary`, `short`, `clip`

3. **Audience** - Age appropriateness
   - Values: `general`, `kids`, `family`, `mature`

4. **Genre** - Mood/style (multiple allowed)
   - Example: `["drama", "thriller"]`

5. **Topic Tags** - Themes (multiple allowed)
   - Example: `["jewish", "educational", "history"]`

**Indexes:**
```python
# Full-text search
IndexModel([
    ("title", TEXT),
    ("title_en", TEXT),
    ("title_es", TEXT),
    ("description", TEXT)
], weights={"title": 10, "title_en": 10, "title_es": 10, "description": 5})

# Performance indexes
IndexModel([("section_ids", ASCENDING)])
IndexModel([("primary_section_id", ASCENDING)])
IndexModel([("content_format", ASCENDING)])
IndexModel([("audience_id", ASCENDING)])
IndexModel([("genre_ids", ASCENDING)])
IndexModel([("topic_tags", ASCENDING)])
IndexModel([("is_featured", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("view_count", DESCENDING)])
IndexModel([("tmdb_id", ASCENDING)], unique=True, sparse=True)
IndexModel([("year", DESCENDING)])
IndexModel([("created_at", DESCENDING)])
```

---

#### Collection: `podcast`

**Purpose:** Podcast shows and metadata

**Model:** `app.models.content.Podcast`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | str | Podcast title |
| `description` | str | Podcast description |
| `thumbnail` | str | Podcast artwork |
| `rss_feed_url` | str | RSS feed URL |
| `author` | str | Podcast author |
| `language` | str | Primary language |
| `categories` | List[str] | Podcast categories |
| `episode_count` | int | Total episodes |
| `last_updated` | datetime | Last RSS check |

**Indexes:**
```python
IndexModel([("rss_feed_url", ASCENDING)], unique=True)
IndexModel([("title", TEXT)])
IndexModel([("created_at", DESCENDING)])
```

---

#### Collection: `podcastepisode`

**Purpose:** Individual podcast episodes

**Model:** `app.models.content.PodcastEpisode`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `podcast_id` | str | Reference to Podcast._id |
| `title` | str | Episode title |
| `description` | str | Episode description |
| `audio_url` | str | Audio file URL |
| `duration` | int | Duration in seconds |
| `published_date` | datetime | Publication date |
| `episode_number` | int | Episode number |
| `season_number` | int | Season number |
| `transcript` | str | Episode transcript |

**Indexes:**
```python
IndexModel([("podcast_id", ASCENDING), ("published_date", DESCENDING)])
IndexModel([("podcast_id", ASCENDING), ("episode_number", ASCENDING)])
```

---

#### Collection: `livechannel`

**Purpose:** Live TV channels and streams

**Model:** `app.models.content.LiveChannel`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `channel_name` | str | Channel name |
| `channel_number` | int | Channel number |
| `stream_url` | str | HLS stream URL |
| `logo_url` | str | Channel logo |
| `language` | str | Primary language |
| `country` | str | Country of origin |
| `is_active` | bool | Channel status |
| `supports_dubbing` | bool | AI dubbing available |
| `epg_enabled` | bool | EPG data available |

**Indexes:**
```python
IndexModel([("channel_number", ASCENDING)], unique=True)
IndexModel([("is_active", ASCENDING)])
IndexModel([("country", ASCENDING)])
```

---

#### Collection: `radiostation`

**Purpose:** Internet radio stations

**Model:** `app.models.content.RadioStation`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `station_name` | str | Station name |
| `stream_url` | str | Stream URL |
| `logo_url` | str | Station logo |
| `country` | str | Country |
| `language` | str | Language |
| `genre` | str | Music genre |
| `is_active` | bool | Station status |

---

### Beta 500 Program (Closed Beta)

#### Collection: `betauser`

**Purpose:** Beta 500 program participants

**Model:** `app.models.beta.BetaUser`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `email` | str | User email |
| `credits_balance` | int | AI credits remaining |
| `total_credits_granted` | int | Total credits ever granted |
| `session_checkpoint` | datetime | Last credit deduction |
| `fraud_score` | float | Fraud risk score (0.0-1.0) |
| `fingerprint_hash` | str | SHA-256 device fingerprint |
| `is_active` | bool | Beta access status |
| `enrolled_at` | datetime | Enrollment date |
| `last_credit_update` | datetime | Last credit change |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING)], unique=True)
IndexModel([("email", ASCENDING)])
IndexModel([("is_active", ASCENDING)])
IndexModel([("fingerprint_hash", ASCENDING)])
```

---

#### Collection: `betacredittransaction`

**Purpose:** Beta credit transaction history

**Model:** `app.models.beta.BetaCreditTransaction`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `transaction_type` | str | grant/deduct/refund |
| `amount` | int | Credits changed |
| `balance_after` | int | Balance after transaction |
| `reason` | str | Transaction reason |
| `feature_used` | str | ai_search/recommendations/catchup |
| `metadata` | dict | Additional context |
| `created_at` | datetime | Transaction time |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("feature_used", ASCENDING)])
IndexModel([("transaction_type", ASCENDING)])
```

---

### Channel Live Chat

#### Collection: `channelchatmessage`

**Purpose:** Live chat messages for TV channels

**Model:** `app.models.channel_chat.ChannelChatMessage`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | str | Channel identifier |
| `user_id` | str | Reference to User._id |
| `username` | str | Display name |
| `message` | str | Sanitized message text |
| `is_pinned` | bool | Pinned by admin |
| `is_deleted` | bool | Soft delete flag |
| `session_token` | str | WebSocket session |
| `created_at` | datetime | Message timestamp |

**Indexes:**
```python
IndexModel([("channel_id", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("user_id", ASCENDING)])
IndexModel([("is_pinned", ASCENDING), ("created_at", DESCENDING)])
```

---

### AI Features

#### Collection: `contentembedding`

**Purpose:** Vector embeddings for AI search

**Model:** `app.models.content_embedding.ContentEmbedding`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `content_id` | str | Reference to Content._id |
| `embedding_vector` | List[float] | 1536-dim vector (OpenAI) |
| `embedding_model` | str | Model used |
| `text_content` | str | Text used for embedding |
| `metadata` | dict | Additional context |
| `created_at` | datetime | Embedding creation |

**Indexes:**
```python
IndexModel([("content_id", ASCENDING)], unique=True)
IndexModel([("created_at", DESCENDING)])
# Note: Vector search uses Atlas Search index
```

---

#### Collection: `recapsession`

**Purpose:** AI catch-up summary sessions

**Model:** `app.models.content_embedding.RecapSession`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `channel_id` | str | Channel identifier |
| `summary` | str | AI-generated summary |
| `start_time` | datetime | Recap start |
| `end_time` | datetime | Recap end |
| `credits_used` | int | AI credits deducted |
| `transcript_length` | int | Input text length |
| `created_at` | datetime | Session creation |
| `expires_at` | datetime | Cache expiration (3 min TTL) |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("channel_id", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0) # TTL index
```

---

### Subscriptions & Payments

#### Collection: `subscription`

**Purpose:** User subscription records

**Model:** `app.models.subscription.Subscription`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `plan_id` | str | Subscription plan |
| `status` | str | active/canceled/expired |
| `start_date` | datetime | Subscription start |
| `end_date` | datetime | Subscription end |
| `auto_renew` | bool | Auto-renewal enabled |
| `payment_method` | str | Payment type |
| `amount` | float | Subscription price |
| `currency` | str | Currency code |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING)])
IndexModel([("status", ASCENDING)])
IndexModel([("end_date", ASCENDING)])
```

---

#### Collection: `transaction`

**Purpose:** Payment transaction history

**Model:** `app.models.admin.Transaction`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `amount` | float | Transaction amount |
| `currency` | str | Currency code |
| `transaction_type` | str | payment/refund |
| `status` | str | success/failed/pending |
| `payment_provider` | str | stripe/paypal |
| `provider_transaction_id` | str | External transaction ID |
| `created_at` | datetime | Transaction time |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("provider_transaction_id", ASCENDING)], unique=True, sparse=True)
IndexModel([("status", ASCENDING)])
```

---

### User Activity & Analytics

#### Collection: `watchhistory`

**Purpose:** User viewing history

**Model:** `app.models.watchlist.WatchHistory`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `content_id` | str | Reference to Content._id |
| `watched_at` | datetime | Watch timestamp |
| `duration_watched` | int | Seconds watched |
| `progress` | float | 0.0-1.0 completion |
| `device_type` | str | Device used |
| `platform` | str | Platform used |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING), ("watched_at", DESCENDING)])
IndexModel([("content_id", ASCENDING)])
```

---

#### Collection: `searchquery`

**Purpose:** Search analytics

**Model:** `app.models.search_analytics.SearchQuery`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | Reference to User._id |
| `query_text` | str | Search query |
| `search_type` | str | traditional/ai |
| `results_count` | int | Results returned |
| `clicked_result` | str | Content clicked |
| `response_time_ms` | int | Query latency |
| `created_at` | datetime | Search timestamp |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("search_type", ASCENDING)])
IndexModel([("created_at", DESCENDING)])
```

---

### Security & Audit

#### Collection: `auditlog`

**Purpose:** System audit trail

**Model:** `app.models.admin.AuditLog`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | str | User who performed action |
| `action_type` | str | Action performed |
| `resource_type` | str | Resource affected |
| `resource_id` | str | Resource identifier |
| `changes` | dict | Before/after values |
| `ip_address` | str | Request IP |
| `user_agent` | str | Request user agent |
| `created_at` | datetime | Action timestamp |

**Indexes:**
```python
IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("action_type", ASCENDING)])
IndexModel([("resource_type", ASCENDING), ("resource_id", ASCENDING)])
IndexModel([("created_at", DESCENDING)])
```

---

#### Collection: `securityauditlog`

**Purpose:** Security event logging

**Model:** `app.models.security_audit.SecurityAuditLog`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `event_type` | str | Security event type |
| `severity` | str | low/medium/high/critical |
| `user_id` | str | User involved |
| `ip_address` | str | Source IP |
| `details` | dict | Event details |
| `created_at` | datetime | Event timestamp |

**Indexes:**
```python
IndexModel([("event_type", ASCENDING), ("created_at", DESCENDING)])
IndexModel([("severity", ASCENDING)])
IndexModel([("user_id", ASCENDING)])
IndexModel([("created_at", DESCENDING)])
```

---

## Database Operations

### Connecting to MongoDB

```python
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.user import User
from app.models.content import Content

async def connect_to_mongo():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client.bayit_plus,
        document_models=[User, Content, ...]
    )
```

### Query Examples

**Find user by email:**
```python
user = await User.find_one(User.email == "user@example.com")
```

**Find active content in section:**
```python
content = await Content.find(
    Content.section_ids.in_(["movies"]),
    Content.is_featured == True
).sort(-Content.created_at).limit(10).to_list()
```

**Aggregate view count by section:**
```python
pipeline = [
    {"$match": {"is_featured": True}},
    {"$group": {
        "_id": "$primary_section_id",
        "total_views": {"$sum": "$view_count"},
        "content_count": {"$sum": 1}
    }}
]
results = await Content.aggregate(pipeline).to_list()
```

### Index Management

**Create indexes:**
```python
# Done automatically by Beanie during init_beanie()
# Manual creation:
await User.find_one().get_motor_collection().create_index([("email", 1)], unique=True)
```

**Check existing indexes:**
```python
collection = User.find_one().get_motor_collection()
indexes = await collection.index_information()
print(indexes)
```

**Drop index:**
```python
await collection.drop_index("email_1")
```

---

## Data Migrations

### Migration Strategy

**Migration Tracking Collection:** `migrationrecord`

**Model:** `app.models.migration.MigrationRecord`

```python
class MigrationRecord(Document):
    migration_name: str
    applied_at: datetime
    status: str  # success/failed/rolled_back
    details: dict
```

### Running Migrations

```python
# Example migration script
from app.models.content import Content

async def migrate_content_taxonomy():
    """Migrate old category_id to new section_ids"""
    contents = await Content.find_all().to_list()

    for content in contents:
        if content.category_id and not content.section_ids:
            content.section_ids = [content.category_id]
            content.primary_section_id = content.category_id
            await content.save()

    # Record migration
    migration = MigrationRecord(
        migration_name="content_taxonomy_migration_v1",
        applied_at=datetime.now(timezone.utc),
        status="success",
        details={"migrated_count": len(contents)}
    )
    await migration.insert()
```

---

## Backup & Recovery

### Backup Strategy

**Automated Backups:**
- MongoDB Atlas automatic backups (daily)
- Point-in-time recovery available (last 7 days)
- Backup retention: 30 days

**Manual Backup:**
```bash
mongodump --uri="mongodb+srv://..." --db=bayit_plus --out=/backup/$(date +%Y-%m-%d)
```

### Restore from Backup

```bash
mongorestore --uri="mongodb+srv://..." --db=bayit_plus /backup/2026-01-30/bayit_plus
```

### Disaster Recovery

1. **Verify backup availability** in Atlas console
2. **Create restore point** from desired backup
3. **Test restore** in staging environment first
4. **Execute production restore** with downtime announcement
5. **Verify data integrity** post-restore

---

## Performance Optimization

### Query Performance

**Best Practices:**
1. **Use indexes** - Always index fields used in queries
2. **Limit results** - Use `.limit()` and pagination
3. **Project only needed fields** - Use `.project()` to reduce data transfer
4. **Batch operations** - Use `bulk_write()` for multiple updates
5. **Connection pooling** - Motor handles this automatically

**Monitoring:**
```python
# Enable slow query logging
await db.command("profile", 2, slowms=100)  # Log queries > 100ms

# Get slow queries
slow_queries = await db.system.profile.find({"millis": {"$gt": 100}}).to_list()
```

### Index Optimization

**Check index usage:**
```python
explain = await Content.find(Content.title == "Example").explain()
print(explain["executionStats"])
```

**Remove unused indexes:**
```bash
# Check index usage in Atlas UI
# Drop indexes with 0 operations
```

---

## Security

### Access Control

**Database User Roles:**
- **Application User:** Read/write access to `bayit_plus` database
- **Admin User:** Full access + user management
- **Backup User:** Read-only access for backups

**Connection Security:**
- SSL/TLS encryption required
- IP whitelist in Atlas
- Database credentials in Google Cloud Secret Manager

### Data Encryption

**At Rest:**
- MongoDB Atlas encryption at rest (enabled)
- Customer-managed keys (optional, not currently used)

**In Transit:**
- SSL/TLS for all connections
- Certificate verification enabled

### Sensitive Data Handling

**Encrypted Fields:**
- `password_hash` - Bcrypt hashing
- Payment info - Tokenized via Stripe (not stored)
- Personal data - PII flagged for GDPR compliance

**Data Retention:**
- Deleted users: Anonymize after 30 days
- Audit logs: Retain 1 year
- Backups: 30 days retention

---

## Monitoring & Alerts

### MongoDB Atlas Monitoring

**Key Metrics:**
- Query execution time (p95, p99)
- Connection count
- Disk usage
- Index efficiency
- Replication lag

**Alerts Configured:**
- Slow queries > 500ms
- Connection pool exhaustion
- Disk usage > 80%
- Replication lag > 10s

### Application Monitoring

```python
from app.core.metrics import mongodb_query_duration

# Track query performance
with mongodb_query_duration.time():
    results = await Content.find_all().to_list()
```

---

## Troubleshooting

### Common Issues

**Issue: Connection Timeout**

**Solution:**
```python
# Increase timeout
client = AsyncIOMotorClient(
    settings.MONGODB_URI,
    serverSelectionTimeoutMS=5000,  # 5 seconds
    connectTimeoutMS=10000  # 10 seconds
)
```

**Issue: Slow Queries**

**Solution:**
1. Check query uses indexes: `.explain()`
2. Add missing indexes
3. Use projection to reduce data transfer
4. Implement caching for frequent queries

**Issue: Duplicate Key Error**

**Solution:**
```python
try:
    await user.insert()
except DuplicateKeyError:
    # Handle duplicate email
    raise HTTPException(status_code=400, detail="Email already exists")
```

---

## Related Documents

- [API Overview](../api/API_OVERVIEW.md)
- [Backend Development Guide](../guides/BACKEND_DEVELOPMENT_GUIDE.md)
- [Testing Strategy](TESTING_STRATEGY.md)
- [Performance Optimization](../performance/PERFORMANCE_GUIDE.md)

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Backend Team
**Next Review:** 2026-04-30
