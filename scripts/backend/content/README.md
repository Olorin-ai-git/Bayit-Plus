# Content Management Scripts

Production-ready scripts for content operations.

## URL Migrator

**File:** `url_migrator.py`

Unified URL migration tool that replaces 7+ individual scripts:

### Replaced Scripts (archived):
- `fix_all_bucket_urls.py`
- `update_bucket_urls.py`
- `migrate_storage_urls.py`
- `fix_remaining_urls.py`
- `update_all_old_bucket_urls.py`
- `fix_atlas_urls.py`
- `fix_movie_stream_urls.py`

### Features:
- **Configuration-driven** - All transformation rules from `settings`
- **MongoDB transactions** - ACID compliance with automatic retry
- **Rollback capability** - Stores original values before changes
- **Dry-run mode** - Preview changes before executing
- **Background indexes** - Non-blocking index creation
- **Full audit trail** - MongoDB-backed migration registry

### Usage:

```bash
# Dry run (preview changes)
python url_migrator.py bucket_upgrade

# Execute migration
python url_migrator.py bucket_upgrade --execute

# Rollback migration
python url_migrator.py --rollback MIGRATION_ID

# List recent migrations
python url_migrator.py --list
```

### Transformation Types:

1. **bucket_upgrade** - Upgrade old bucket URLs to new bucket
   - Configured via `OLD_BUCKET_NAME` and `NEW_BUCKET_NAME` in settings

2. **s3_to_gcs** - Migrate S3 URLs to GCS
   - Configured via `S3_PATTERN` and `GCS_PATTERN` in settings

3. **atlas_url_fix** - Fix Atlas-specific URL issues
   - Fixes double slashes and malformed URLs

### Configuration:

All transformation rules come from `backend/app/core/config.py`:

```python
OLD_BUCKET_NAME: str = "bayit-plus-media/"
NEW_BUCKET_NAME: str = "bayit-plus-media-new/"
S3_PATTERN: str = r"s3\.amazonaws\.com"
GCS_PATTERN: str = "storage.googleapis.com"
```

### Safety Features:

- **Pre-migration index verification** - Ensures indexes exist before bulk updates
- **Transaction retry logic** - Handles transient errors with exponential backoff
- **Rollback storage** - Stores original values for 90 days (TTL)
- **Checksum verification** - SHA256 of affected document IDs
- **Duplicate prevention** - Cannot execute same migration twice

### Monitoring:

Check migration status:
```bash
python url_migrator.py --list
```

Rollback data is automatically cleaned up after 90 days via MongoDB TTL index.

### Migration Registry:

All migrations are tracked in MongoDB `_migrations` collection:
- Execution timestamp
- User who executed
- Number of documents affected
- Rollback availability
- Environment (production/staging/development)
- Full audit trail

### Error Handling:

- **Transient errors** - Automatically retried (max 3 attempts)
- **Non-transient errors** - Migration fails, no changes applied
- **Rollback errors** - Transaction ensures atomic rollback

### Testing:

Always run dry-run first to preview changes:
```bash
# See what would change
python url_migrator.py bucket_upgrade

# Review the output, then execute if correct
python url_migrator.py bucket_upgrade --execute
```
