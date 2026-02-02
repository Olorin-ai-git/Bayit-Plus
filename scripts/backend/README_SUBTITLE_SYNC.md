# VOD Subtitle Sync Script

## Problem

The `Content.available_subtitle_languages` field can become out of sync with actual subtitle tracks stored in `SubtitleTrackDoc`. This causes:

- **Movie detail pages** showing all available subtitles (reads from `SubtitleTrackDoc`)
- **VOD cards** showing fewer or missing subtitles (reads from `Content.available_subtitle_languages`)

Example: "25th Hour" had 7 subtitle languages in `SubtitleTrackDoc` but only Spanish in `available_subtitle_languages`.

## Solution

The `sync_all_vod_subtitles.py` script syncs `Content.available_subtitle_languages` with actual subtitle tracks.

## Usage

### Dry Run (Preview Changes)

```bash
cd backend
poetry run python scripts/sync_all_vod_subtitles.py --dry-run
```

This shows what would change **without updating the database**.

### Sync All VOD Content

```bash
cd backend
poetry run python scripts/sync_all_vod_subtitles.py
```

This syncs **all VOD content** (movies and series) with actual subtitle tracks.

### Sync Specific Content

```bash
cd backend
poetry run python scripts/sync_all_vod_subtitles.py --content-id 507f1f77bcf86cd799439011
```

Replace `507f1f77bcf86cd799439011` with the actual content ID.

### Test with Limited Items

```bash
cd backend
poetry run python scripts/sync_all_vod_subtitles.py --limit 10 --dry-run
```

Syncs only the first 10 items (useful for testing).

## Output

The script provides detailed output:

```
2026-02-02 10:30:15 - INFO - Found 1,234 VOD content items
2026-02-02 10:30:16 - INFO - Processing 1/1234: 25th Hour
2026-02-02 10:30:16 - INFO - ✅ Synced 25th Hour
2026-02-02 10:30:17 - INFO - Processing 2/1234: The Godfather
...
================================================================================
SYNC COMPLETE
================================================================================
Mode: LIVE UPDATE
Total VOD items: 1,234
Synced: 156
Already in sync: 1,075
Failed: 3
Time elapsed: 45.32s
================================================================================

156 items were updated:
  • 25th Hour
    Added: ['en', 'he', 'ar', 'fr', 'de', 'it']
    Removed: []
    New languages: ['ar', 'de', 'en', 'es', 'fr', 'he', 'it']
  • Another Movie
    Added: ['he']
    Removed: []
    New languages: ['en', 'es', 'he']
```

## Automatic Sync (Production)

After running this script once, future subtitle imports will automatically sync:

- ✅ `/api/subtitles/{content_id}/import` - Auto-syncs after import
- ✅ `/api/subtitles/{content_id}/fetch-external` - Auto-syncs after fetch
- ✅ `/api/subtitles/{content_id}/{language}` - Auto-syncs after delete

## Admin API Endpoints

You can also trigger sync via API (requires admin auth):

### Sync Single Content

```bash
curl -X POST "http://localhost:8000/api/v1/admin/subtitles/sync/{content_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Sync All Content (with limit)

```bash
curl -X POST "http://localhost:8000/api/v1/admin/subtitles/sync-all?limit=10&dry_run=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Content Not Found

If you get "Content not found", verify the content ID:

```bash
poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from app.core.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    doc = await db['content'].find_one({'title': '25th Hour'})
    print(f'ID: {doc[\"_id\"]}' if doc else 'Not found')

asyncio.run(check())
"
```

### Database Connection Failed

Verify MongoDB connection:

```bash
# Check .env file has MONGODB_URL
grep MONGODB_URL backend/.env

# Test connection
poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import asyncio

async def test():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await client.admin.command('ping')
    print('✅ MongoDB connected')

asyncio.run(test())
"
```

## When to Run This Script

- **After initial setup** - Sync all existing content
- **After bulk subtitle imports** - Ensure all content is in sync
- **When investigating subtitle issues** - Verify data consistency
- **After database migrations** - Resync after schema changes

## Technical Details

### What It Does

1. Queries all VOD content (movies and series)
2. For each content:
   - Reads actual subtitle tracks from `SubtitleTrackDoc`
   - Compares with `Content.available_subtitle_languages`
   - Updates if different
3. Reports statistics and details

### Database Collections

- **Content**: VOD metadata including `available_subtitle_languages` field
- **SubtitleTrackDoc**: Actual subtitle files with cues

### Performance

- Processes ~50-100 items per second
- Runs asynchronously for better performance
- Safe to run on production (uses Beanie ODM updates)
