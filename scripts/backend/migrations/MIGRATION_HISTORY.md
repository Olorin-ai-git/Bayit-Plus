# Migration History

This directory contains completed and archived data migrations.

## Directory Structure

- `completed/` - Successfully executed migrations (keep for reference)
- `archived/` - Old versions of migrations (superseded)
- `models.py` - Beanie models for migration tracking

## Completed Migrations

### fix_is_series_final.py

**Executed:** 2024 (exact date in MongoDB `_migrations` collection)
**Description:** Corrects `is_series` field in content collection
**Status:** ✅ Completed

Identifies and fixes in correct order:
1. Identify parent series (have episodes pointing to them)
2. Set parent series: `is_series=True`
3. Set episodes (have valid series_id): `is_series=False`
4. Set standalone movies: `is_series=False`

**Idempotent:** Safe to run multiple times
**Documents Affected:** ~1000+ content items
**Rollback:** Not applicable (data correction, not transformation)

**Supersedes:**
- `fix_is_series_field.py` (v1) - archived
- `fix_is_series_field_v2.py` (v2) - archived

## Archived Migrations

### fix_is_series_field.py (v1)

**Status:** ❌ Archived (superseded by final version)
**Issues:** Incomplete logic, didn't handle all cases

### fix_is_series_field_v2.py (v2)

**Status:** ❌ Archived (superseded by final version)
**Issues:** Improved but still had edge cases

## Migration Registry

All migrations (new system, 2026+) are tracked in MongoDB:
- Collection: `_migrations`
- Rollback data: `_migration_rollback` (90-day TTL)

Query migration history:
```bash
python -c "from scripts.utilities import MigrationRegistry; import asyncio; \
asyncio.run(MigrationRegistry().get_recent_migrations())"
```

Or use the unified URL migrator:
```bash
python scripts/production/content/url_migrator.py --list
```

## Adding New Migrations

For new data migrations:

1. **Use the unified tools** (url_migrator.py, podcast_manager.py, etc.)
2. **If creating new migration script:**
   - Use MongoDB transactions
   - Store rollback data via `RollbackStorage`
   - Record in registry via `MigrationRegistry`
   - Follow pattern in `url_migrator.py`

3. **After successful execution:**
   - Move to `completed/` directory
   - Document in this file
   - Verify in MongoDB `_migrations` collection

## Rollback Procedure

For migrations with rollback capability:

```bash
# List migrations
python scripts/production/content/url_migrator.py --list

# Rollback specific migration
python scripts/production/content/url_migrator.py --rollback MIGRATION_ID
```

**Note:** Rollback data expires after 90 days (TTL index).

## Best Practices

1. ✅ **Always dry-run first** - Test before executing
2. ✅ **Backup before major migrations** - Use `backup_database.sh`
3. ✅ **Use transactions** - Ensure atomicity
4. ✅ **Store rollback data** - Enable undo capability
5. ✅ **Document everything** - Update this file
6. ✅ **Verify success** - Check affected documents
7. ✅ **Monitor performance** - Create indexes before bulk updates

## See Also

- `README.md` - Migration models and index setup
- `../utilities/` - Migration utilities and helpers
- `../production/content/url_migrator.py` - Example unified migration tool
