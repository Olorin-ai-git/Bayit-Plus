# Trivia Data Migration Guide

This guide explains how to migrate existing trivia data from the legacy schema to the new multilingual schema.

## Overview

The migration converts trivia facts from the legacy format (separate `text_he`, `text_en`, `text_es` fields) to the new format (`source_language` + `translations` dictionary) while maintaining backward compatibility.

## Migration Script

**Location**: `backend/scripts/migrate_trivia_to_multilingual.py`

**Purpose**: Converts all existing ContentTrivia documents to use the new multilingual schema

## Before Migration

### Prerequisites

1. ✅ Backend models updated with new schema fields
2. ✅ Translation service implemented
3. ✅ Trivia generator updated to use new schema
4. ✅ API endpoints updated to expose new fields
5. ✅ Frontend updated to consume new fields

### Backup Database

**CRITICAL**: Always backup your database before running migrations:

```bash
# MongoDB Atlas backup
# Use the Atlas UI to create a snapshot before migration

# Or manual backup
mongodump --uri="<MONGODB_URI>" --out=trivia_backup_$(date +%Y%m%d)
```

## Running the Migration

### 1. Dry Run (Preview Changes)

Always run a dry run first to preview changes:

```bash
cd backend
poetry run python scripts/migrate_trivia_to_multilingual.py --dry-run
```

**Expected output**:
```
2026-02-03 10:00:00 [info] Starting trivia migration
2026-02-03 10:00:00 [warning] DRY RUN MODE - No changes will be saved
2026-02-03 10:00:01 [info] Found 1250 trivia documents to process
2026-02-03 10:00:05 [info] Processed 100/1250 trivia documents
...
2026-02-03 10:00:30 [info] Migration complete

============================================================
MIGRATION SUMMARY
============================================================
Total trivia documents:        1250
Migrated trivia documents:     1150
Already using new schema:      100
Total facts processed:         8750
Migrated facts:                8050
Errors:                        0
Mode:                          DRY RUN
============================================================

⚠️  This was a DRY RUN - no changes were saved to database
Run without --dry-run to apply changes
```

### 2. Review Dry Run Results

Check the logs for:
- ✅ All trivia documents found and processed
- ✅ Source language detection working correctly
- ✅ Translations dictionary built properly
- ✅ No errors reported

### 3. Run Live Migration

Once dry run looks good, run the live migration:

```bash
poetry run python scripts/migrate_trivia_to_multilingual.py
```

**Expected output**:
```
============================================================
MIGRATION SUMMARY
============================================================
Total trivia documents:        1250
Migrated trivia documents:     1150
Already using new schema:      100
Total facts processed:         8750
Migrated facts:                8050
Errors:                        0
Mode:                          LIVE
============================================================

✅ Migration complete - all changes saved to database
```

### 4. Verify Migration

After migration, verify data integrity:

```bash
# Check a sample trivia document
poetry run python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.trivia import ContentTrivia

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[ContentTrivia])

    trivia = await ContentTrivia.find_one()
    if trivia:
        fact = trivia.facts[0]
        print(f'Source Language: {fact.source_language}')
        print(f'Translations: {fact.translations}')
        print(f'Legacy Fields Preserved:')
        print(f'  - text_he: {fact.text_he}')
        print(f'  - text_en: {fact.text_en}')
        print(f'  - text_es: {fact.text_es}')

asyncio.run(check())
"
```

**Expected output**:
```
Source Language: en
Translations: {'he': 'הסרט זכה באוסקר', 'en': 'The movie won an Oscar', 'es': 'La película ganó un Oscar'}
Legacy Fields Preserved:
  - text_he: הסרט זכה באוסקר
  - text_en: The movie won an Oscar
  - text_es: La película ganó un Oscar
```

## Migration Logic

### Source Language Detection

The migration uses the following logic to detect source language:

1. If `text` field matches `text_en` → Source is **English**
2. If `text` field matches `text_he` → Source is **Hebrew**
3. Otherwise → Default to **English** (new generation default)

### Translations Dictionary

The migration builds the `translations` dictionary from legacy fields:

```python
translations = {}
if fact.text_he:
    translations["he"] = fact.text_he
if fact.text_en:
    translations["en"] = fact.text_en
if fact.text_es:
    translations["es"] = fact.text_es
```

### Backward Compatibility

**CRITICAL**: The migration preserves all legacy fields (`text_he`, `text_en`, `text_es`) to ensure backward compatibility with any code that still relies on them.

## Command Line Options

```
Usage: migrate_trivia_to_multilingual.py [OPTIONS]

Options:
  --dry-run       Preview changes without writing to database
  --batch-size N  Process N documents at a time (default: 100)
  --help          Show this help message
```

### Examples

```bash
# Dry run with default batch size (100)
poetry run python scripts/migrate_trivia_to_multilingual.py --dry-run

# Dry run with custom batch size
poetry run python scripts/migrate_trivia_to_multilingual.py --dry-run --batch-size 50

# Live migration with custom batch size
poetry run python scripts/migrate_trivia_to_multilingual.py --batch-size 200
```

## Rollback Plan

If migration encounters issues:

### 1. Stop Migration

```bash
# Press Ctrl+C to stop migration
# Migration is designed to be resumable
```

### 2. Restore from Backup

```bash
# Restore from MongoDB Atlas snapshot
# Use the Atlas UI to restore the snapshot

# Or manual restore
mongorestore --uri="<MONGODB_URI>" trivia_backup_20260203
```

### 3. Investigate and Fix

```bash
# Check logs for errors
grep ERROR logs/migration.log

# Run dry run again to verify fix
poetry run python scripts/migrate_trivia_to_multilingual.py --dry-run
```

## Migration Statistics

Track these metrics during migration:

- **Total trivia documents**: Number of ContentTrivia documents in database
- **Migrated trivia**: Documents converted to new schema
- **Already new schema**: Documents already using new schema (skipped)
- **Total facts processed**: Total TriviaFactModel instances processed
- **Migrated facts**: Facts converted to new schema
- **Errors**: Number of errors encountered

## Post-Migration Verification

### 1. API Response Format

Test the API to verify both new and legacy fields are present:

```bash
curl http://localhost:8000/api/v1/trivia/<content_id> | jq '.facts[0]'
```

**Expected response**:
```json
{
  "fact_id": "fact1",
  "text": "The movie won an Oscar",

  "source_language": "en",
  "translations": {
    "he": "הסרט זכה באוסקר",
    "en": "The movie won an Oscar",
    "es": "La película ganó un Oscar"
  },

  "text_he": "הסרט זכה באוסקר",
  "text_en": "The movie won an Oscar",
  "text_es": "La película ganó un Oscar",

  "trigger_time": 120.0,
  "category": "production",
  ...
}
```

### 2. Frontend Display

Verify frontend displays trivia in correct language:

1. Open video player
2. Select subtitle track (English/Hebrew/Spanish)
3. Verify trivia displays in matching language
4. Verify language switch updates trivia language

### 3. Database Consistency

Run consistency checks:

```bash
# Check all facts have source_language
db.content_trivia.aggregate([
  { $unwind: "$facts" },
  { $match: { "facts.source_language": { $exists: false } } },
  { $count: "missing_source_language" }
])

# Check all facts have translations
db.content_trivia.aggregate([
  { $unwind: "$facts" },
  { $match: { "facts.translations": { $exists: false } } },
  { $count: "missing_translations" }
])
```

**Expected**: Both counts should be 0 after successful migration.

## Troubleshooting

### Issue: Migration Slow

**Solution**: Increase batch size

```bash
poetry run python scripts/migrate_trivia_to_multilingual.py --batch-size 500
```

### Issue: Out of Memory

**Solution**: Decrease batch size

```bash
poetry run python scripts/migrate_trivia_to_multilingual.py --batch-size 50
```

### Issue: Errors in Specific Documents

**Solution**: Check logs and fix specific documents

```bash
# Find error in logs
grep "Error migrating trivia" logs/migration.log

# Manually inspect problematic document
poetry run python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.trivia import ContentTrivia

async def inspect():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[ContentTrivia])
    trivia = await ContentTrivia.get('<CONTENT_ID>')
    print(trivia.model_dump_json(indent=2))

asyncio.run(inspect())
"
```

## Testing

The migration script has comprehensive test coverage:

```bash
# Run migration tests
poetry run pytest tests/scripts/test_migrate_trivia_to_multilingual.py -v
```

**Coverage**: 18 tests covering:
- Source language detection (English, Hebrew, default)
- Translations dictionary building
- Fact migration (legacy → new schema)
- Skip already migrated facts
- Preserve legacy fields
- Edge cases (partial translations, empty fields)

## Timeline

Estimated migration time based on database size:

| Documents | Batch Size | Time |
|-----------|-----------|------|
| 100 | 100 | ~10 seconds |
| 1,000 | 100 | ~2 minutes |
| 10,000 | 100 | ~20 minutes |
| 100,000 | 500 | ~2 hours |

**Note**: Times are approximate and depend on database performance.

## Support

For migration issues, contact the development team or check:

- Migration script tests: `tests/scripts/test_migrate_trivia_to_multilingual.py`
- Migration logs: `logs/migration.log`
- Database backup location: `trivia_backup_<DATE>/`
