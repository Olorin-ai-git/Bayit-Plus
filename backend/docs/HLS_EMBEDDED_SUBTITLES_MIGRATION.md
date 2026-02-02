# HLS Embedded Subtitles Migration Guide

This guide explains how to migrate existing HLS content to use embedded subtitles (EXT-X-MEDIA tags in HLS manifests).

## Overview

The migration script (`scripts/migrate_hls_embedded_subtitles.py`) automatically:

1. ✅ Finds all existing HLS content (movies/series with `.m3u8` URLs)
2. ✅ Checks if content has subtitle tracks in the database
3. ✅ Generates VTT files for all subtitle languages
4. ✅ Creates a master manifest (`master.m3u8`) with subtitle references
5. ✅ Uploads VTT files and master manifest to GCS
6. ✅ Updates content documents with new master manifest URL

## Prerequisites

- Backend running with access to MongoDB and Google Cloud Storage
- Existing HLS content with `playlist.m3u8` files on GCS
- Subtitle tracks stored in MongoDB (SubtitleTrackDoc collection)

## Usage

### 1. Dry Run (Recommended First Step)

See what would be migrated without making any changes:

```bash
cd backend
poetry run python scripts/migrate_hls_embedded_subtitles.py --dry-run --all
```

**Output Example:**
```
==========================================================
Checking: Ice Age (movie_12345)
==========================================================
✅ Has HLS stream: https://storage.googleapis.com/bayit-plus-media-new/movies/Ice_Age/hls/playlist.m3u8
✅ Has 6 subtitle tracks in 3 languages: ['en', 'he', 'es']
🔍 DRY RUN - Would migrate this content

==========================================================
MIGRATION SUMMARY
==========================================================
Total content checked: 42
  - Has HLS stream: 38
  - Has subtitles: 25
  - Already migrated: 10
  - Needs migration: 15

🔍 DRY RUN - No changes made
```

### 2. Migrate All Content

Migrate all movies and series:

```bash
poetry run python scripts/migrate_hls_embedded_subtitles.py --all
```

### 3. Migrate by Content Type

**Migrate only movies:**
```bash
poetry run python scripts/migrate_hls_embedded_subtitles.py --content-type movies
```

**Migrate only series:**
```bash
poetry run python scripts/migrate_hls_embedded_subtitles.py --content-type series
```

### 4. Migrate Specific Content

Migrate a single content item by ID:

```bash
poetry run python scripts/migrate_hls_embedded_subtitles.py --content-id "movie_12345"
```

### 5. Force Re-migration

If you need to regenerate manifests for content that already has `master.m3u8`:

```bash
poetry run python scripts/migrate_hls_embedded_subtitles.py --all --force
```

## What Gets Changed

### Before Migration

**GCS Structure:**
```
/movies/Ice_Age/hls/
├── playlist.m3u8       # Video playlist (referenced in database)
├── segment_000.ts
├── segment_001.ts
└── ...
```

**Database:**
```json
{
  "stream_url": "https://storage.googleapis.com/.../playlist.m3u8"
}
```

### After Migration

**GCS Structure:**
```
/movies/Ice_Age/hls/
├── master.m3u8         # NEW - Master manifest with subtitle references
├── playlist.m3u8       # Original video playlist (still there)
├── segment_000.ts
├── segment_001.ts
├── ...
├── subtitles_en.vtt    # NEW - English subtitles
├── subtitles_he.vtt    # NEW - Hebrew subtitles
└── subtitles_es.vtt    # NEW - Spanish subtitles
```

**master.m3u8 Content:**
```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE="en",URI="subtitles_en.vtt"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Hebrew",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,LANGUAGE="he",URI="subtitles_he.vtt"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Spanish",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,LANGUAGE="es",URI="subtitles_es.vtt"

#EXT-X-STREAM-INF:BANDWIDTH=2000000,SUBTITLES="subs"
playlist.m3u8
```

**Database:**
```json
{
  "stream_url": "https://storage.googleapis.com/.../master.m3u8"
}
```

## Migration Logic

The script processes each content item with this logic:

```
┌─────────────────────────────────────┐
│ 1. Check if has HLS stream (.m3u8) │
└──────────────┬──────────────────────┘
               │ NO → Skip
               ▼ YES
┌─────────────────────────────────────┐
│ 2. Check if has subtitle tracks    │
└──────────────┬──────────────────────┘
               │ NO → Skip
               ▼ YES
┌─────────────────────────────────────┐
│ 3. Check if already has master.m3u8│
└──────────────┬──────────────────────┘
               │ YES → Skip (unless --force)
               ▼ NO
┌─────────────────────────────────────┐
│ 4. Generate VTT files from database │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 5. Create master.m3u8 manifest      │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 6. Upload VTT files + master to GCS │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 7. Update content.stream_url        │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│          ✅ MIGRATED                │
└─────────────────────────────────────┘
```

## Safety Features

### 1. Dry Run Mode
- Use `--dry-run` to preview changes
- No files uploaded, no database changes
- Shows exactly what would be migrated

### 2. Idempotency
- Safe to run multiple times
- Skips already-migrated content automatically
- Use `--force` to re-migrate if needed

### 3. Original Files Preserved
- Original `playlist.m3u8` is NOT deleted
- All video segments remain unchanged
- Only adds new files (master manifest + VTT files)

### 4. Rollback Option
If needed, you can rollback by updating the database:

```python
# Revert to original playlist.m3u8
content.stream_url = content.stream_url.replace("master.m3u8", "playlist.m3u8")
await content.save()
```

## Monitoring Progress

The script provides detailed logging:

```bash
==========================================================
Checking: Ice Age (movie_12345)
==========================================================
✅ Has HLS stream: https://storage.googleapis.com/.../playlist.m3u8
✅ Has 6 subtitle tracks in 3 languages: ['en', 'he', 'es']
🚀 Starting migration...
  1. Generating VTT files...
  ✅ Generated 3 VTT files
  2. Generating master manifest...
  ✅ Generated master manifest
  3. Uploading VTT files to GCS...
     ✅ Uploaded subtitles_en.vtt
     ✅ Uploaded subtitles_he.vtt
     ✅ Uploaded subtitles_es.vtt
  4. Uploading master manifest to GCS...
  ✅ Uploaded master.m3u8
  5. Updating content document...
  ✅ Updated content with master URL
✅ Migration complete!
```

## Error Handling

The script handles various error conditions:

- **Invalid GCS URL**: Skips content with malformed URLs
- **Missing subtitles**: Skips content without subtitle tracks
- **Upload failures**: Logs error and continues to next content
- **Database errors**: Fails gracefully with detailed error message

## Performance

**Estimated Time:**
- ~5-10 seconds per content item (depends on number of subtitle languages)
- For 100 content items with 3 languages each: ~10-15 minutes

**Batch Processing:**
The script processes content sequentially to avoid:
- Overwhelming the database
- GCS rate limits
- Memory issues with temporary files

## Verification

After migration, verify the results:

### 1. Check GCS Files

```bash
# List files in HLS directory
gsutil ls gs://bayit-plus-media-new/movies/Ice_Age/hls/

# Should show:
# master.m3u8
# playlist.m3u8
# segment_*.ts
# subtitles_en.vtt
# subtitles_he.vtt
# subtitles_es.vtt
```

### 2. Check Database

```python
from app.models.content import MovieDoc

movie = await MovieDoc.get("movie_12345")
print(movie.stream_url)
# Should contain "master.m3u8"
```

### 3. Test Playback

- Open the video in web player
- Check subtitle menu shows all languages
- Test AirPlay casting → subtitles should work automatically

## Troubleshooting

### Issue: "No subtitles found in database"

**Solution:** The content doesn't have subtitle tracks in MongoDB. Add subtitles first:
```bash
# Check if subtitles exist
python scripts/check_subtitles.py --content-id movie_12345

# Add subtitles if needed
# (Use your subtitle upload/import workflow)
```

### Issue: "Invalid GCS URL format"

**Solution:** The content's `stream_url` or `hls_url` field is malformed. Update the database:
```python
content.stream_url = "https://storage.googleapis.com/bucket/path/to/playlist.m3u8"
await content.save()
```

### Issue: "Upload permission denied"

**Solution:** Check Google Cloud credentials:
```bash
# Verify credentials
gcloud auth application-default login

# Check service account permissions
gcloud projects get-iam-policy PROJECT_ID
```

## Best Practices

1. **Always start with dry run** to preview changes
2. **Migrate in batches** (by content type) rather than all at once
3. **Test with one content item first** before bulk migration
4. **Keep original playlist.m3u8** - don't delete after migration
5. **Monitor logs** for any errors or warnings

## Support

If you encounter issues:

1. Check the logs for detailed error messages
2. Verify GCS permissions and MongoDB connection
3. Test with `--dry-run` first
4. Use `--content-id` to test single content items

## Example Workflow

Complete migration workflow:

```bash
# Step 1: Dry run to see what needs migration
poetry run python scripts/migrate_hls_embedded_subtitles.py --dry-run --all

# Step 2: Test with one content item
poetry run python scripts/migrate_hls_embedded_subtitles.py --content-id "movie_12345"

# Step 3: Verify the test migration worked
# - Check GCS for master.m3u8 and VTT files
# - Test playback in web player
# - Test AirPlay casting

# Step 4: Migrate all movies
poetry run python scripts/migrate_hls_embedded_subtitles.py --content-type movies

# Step 5: Migrate all series
poetry run python scripts/migrate_hls_embedded_subtitles.py --content-type series

# Step 6: Review summary and check for any failures
```

## Future Content

For all new content uploaded after this migration:
- The HLS conversion service automatically includes embedded subtitles
- No manual migration needed
- Master manifests generated during initial conversion
