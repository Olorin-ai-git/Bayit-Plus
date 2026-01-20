# Olorin Cross-Database Orphan Cleanup

## Overview

With Phase 2 database separation, Olorin platform data resides in a separate database from Bayit+ content data. This creates potential for orphaned records when content is deleted from the Bayit+ database but referenced records remain in the Olorin database.

## Orphan Scenarios

### 1. ContentEmbedding Orphans
**Trigger**: Content deleted from Bayit+ database
**Orphaned Records**: ContentEmbedding documents with invalid `content_id`
**Collections Affected**: `content_embeddings`

```python
# Orphan example
{
  "_id": ObjectId("..."),
  "content_id": "507f1f77bcf86cd799439011",  # Content no longer exists
  "embedding_type": "title",
  "embedding": [...]
}
```

### 2. RecapSession Orphans
**Trigger**: LiveChannel deleted from Bayit+ database
**Orphaned Records**: RecapSession documents with invalid `channel_id`
**Collections Affected**: `recap_sessions`

### 3. DubbingSession Orphans
**Trigger**: IntegrationPartner suspended or deleted
**Orphaned Records**: DubbingSession documents with invalid `partner_id`
**Collections Affected**: `dubbing_sessions`

## Cleanup Strategies

### Strategy 1: Periodic Reconciliation Job (Recommended)

Run a daily/weekly cleanup job that validates cross-database references and removes orphans.

**Implementation**: Use the provided cleanup script
```bash
# Dry-run to preview orphans
poetry run python scripts/olorin/cleanup_orphans.py --dry-run

# Execute cleanup
poetry run python scripts/olorin/cleanup_orphans.py --execute
```

**Scheduling**: Add to cron or Cloud Scheduler
```bash
# Daily at 2 AM
0 2 * * * cd /app && poetry run python scripts/olorin/cleanup_orphans.py --execute
```

### Strategy 2: Soft Deletes with TTL

Instead of hard deleting content, use soft deletes with a grace period.

**Bayit+ Content Model:**
```python
class Content(Document):
    deleted_at: Optional[datetime] = None  # Soft delete timestamp

    class Settings:
        indexes = [
            [("deleted_at", 1), ("expireAfterSeconds", 2592000)]  # 30 days TTL
        ]
```

**Benefits**:
- 30-day window for cleanup jobs to run
- Allows recovery of accidentally deleted content
- Gradual orphan elimination

### Strategy 3: Event-Driven Cleanup

Use MongoDB change streams to trigger cleanup when content is deleted.

**Not recommended because**:
- Requires persistent workers
- Adds complexity
- Cross-database change streams have reliability challenges

## Cleanup Script Implementation

Location: `backend/scripts/olorin/cleanup_orphans.py`

**Features:**
- Validates ContentEmbedding.content_id against Content._id
- Validates RecapSession.channel_id against LiveChannel._id
- Validates DubbingSession.partner_id against IntegrationPartner.partner_id
- Dry-run mode for safety
- Batch deletion for performance
- Comprehensive logging

**Safety checks:**
- Requires `OLORIN_USE_SEPARATE_DATABASE=true`
- Confirms existence in Bayit+ database before deleting
- Uses batch size limit (1000 documents per batch)
- Transaction support where available

## Recommended Production Setup

### 1. Enable Soft Deletes (Bayit+ Content)
```python
# migration script
await Content.update_many(
    {"deleted_at": {"$exists": False}},
    {"$set": {"deleted_at": None}}
)
```

### 2. Schedule Daily Cleanup Job
```yaml
# Cloud Scheduler (GCP)
- name: olorin-orphan-cleanup
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  target:
    http:
      uri: https://backend.bayit.tv/api/v1/admin/olorin/cleanup-orphans
      method: POST
      headers:
        Authorization: Bearer ${ADMIN_API_KEY}
```

### 3. Monitor Orphan Metrics
```python
# Add metrics collection
orphan_counts = {
    "content_embeddings": await count_orphaned_embeddings(),
    "recap_sessions": await count_orphaned_recaps(),
    "dubbing_sessions": await count_orphaned_dubbing_sessions(),
}

# Alert if orphan count exceeds threshold
if any(count > 10000 for count in orphan_counts.values()):
    send_alert("High orphan count detected")
```

## Backup Before Cleanup

**Critical**: Always backup before running cleanup operations.

```bash
# MongoDB Atlas: Enable Point-in-Time Recovery
# Manual backup before cleanup
mongodump --uri="mongodb+srv://..." --db=olorin_platform --out=./backup-$(date +%Y%m%d)

# Verify backup
mongorestore --uri="mongodb+srv://..." --db=olorin_platform_test --dir=./backup-YYYYMMDD --dryRun
```

## Recovery Procedures

### Scenario 1: Accidental Cleanup
If orphans were deleted by mistake:

1. **Stop cleanup jobs immediately**
2. **Restore from backup**:
   ```bash
   mongorestore --uri="mongodb+srv://..." --db=olorin_platform --dir=./backup-YYYYMMDD
   ```
3. **Verify restoration**:
   ```bash
   poetry run python scripts/olorin/verify_orphan_cleanup.py
   ```

### Scenario 2: Content Restored After Cleanup
If content is restored in Bayit+ after embeddings were cleaned:

1. **Re-index content**:
   ```bash
   poetry run python scripts/olorin/embed_content.py --content-id=<restored_content_id>
   ```
2. **Verify embeddings created**:
   ```bash
   poetry run python scripts/olorin/verify_content_indexed.py --content-id=<restored_content_id>
   ```

## Monitoring and Alerts

### Key Metrics to Track

1. **Orphan Growth Rate**
   - Track daily orphan count
   - Alert if growth rate > 1000/day

2. **Cleanup Success Rate**
   - Percentage of orphans successfully removed
   - Alert if success rate < 95%

3. **Cross-Database Latency**
   - Time to validate references
   - Alert if p95 latency > 500ms

4. **Storage Savings**
   - Disk space reclaimed after cleanup
   - Track orphan storage cost

### CloudWatch/Stackdriver Metrics
```python
# Log custom metrics
metrics.gauge("olorin.orphans.content_embeddings", orphan_count)
metrics.gauge("olorin.cleanup.duration_seconds", cleanup_duration)
metrics.increment("olorin.cleanup.documents_deleted", deleted_count)
```

## Best Practices

1. **Always use dry-run first** - Preview orphans before deletion
2. **Run during off-peak hours** - Minimize impact on production
3. **Monitor cleanup duration** - Adjust batch size if needed
4. **Backup before cleanup** - Enable point-in-time recovery
5. **Test recovery procedures** - Regularly test backup restoration
6. **Alert on anomalies** - High orphan counts indicate issues
7. **Document exceptions** - Some orphans may be intentional

## FAQ

**Q: How often should cleanup run?**
A: Daily for production, weekly for development. Adjust based on content deletion rate.

**Q: What if cleanup takes too long?**
A: Increase batch size or run cleanup more frequently to reduce per-run volume.

**Q: Should I clean up all orphans immediately?**
A: No. Use a grace period (7-30 days) in case content is restored.

**Q: Can orphans cause production issues?**
A: Generally no, but they waste storage and can slow down queries if count is very high (>100k).

**Q: How do I know if cleanup is working?**
A: Monitor orphan count metrics over time. Should trend downward or stay stable.

## Related Documentation

- [Phase 2 Database Separation](./PHASE2_DATABASE_SEPARATION.md)
- [Content Metadata Service](../app/services/olorin/content_metadata_service.py)
- [Migration Scripts](../scripts/migrate_olorin_data.py)
