# Podcast History Duplicates Fix

**Date:** 2026-02-05
**Issue:** Duplicate podcast episode items appearing in watch history

## Problem Summary

The podcast player page was showing duplicate history episode items. This was caused by two issues:

1. **Incorrect Content Lookup**: The `/history/continue` endpoint was trying to fetch podcast episodes from the `Content` collection instead of the `PodcastEpisode` collection
2. **No Deduplication**: Multiple `WatchHistory` entries for the same content_id were being returned without deduplication
3. **No Unique Constraint**: The database allowed multiple watch history entries for the same user + content combination

## Files Modified

### Backend

1. **`backend/app/api/routes/history.py`**
   - Added import for `PodcastEpisode` model
   - Updated `get_history()` endpoint to:
     - Fetch podcast episodes from `PodcastEpisode` collection
     - Deduplicate entries by `content_id`
     - Handle both VOD and podcast content types
   - Updated `get_continue_watching()` endpoint to:
     - Fetch podcast episodes from `PodcastEpisode` collection
     - Deduplicate entries by `content_id`
     - Handle both VOD and podcast content types

### Scripts Created

1. **`backend/scripts/cleanup_duplicate_watch_history.py`**
   - Identifies and removes duplicate watch history entries
   - Keeps the most recent entry for each user + content combination
   - **Must be run before applying the unique index**

2. **`backend/scripts/add_watch_history_unique_index.py`**
   - Adds a unique index on `(user_id, content_id)` to prevent future duplicates
   - **Must be run after cleaning up duplicates**

## Solution Details

### Backend API Changes

#### `/history/continue` Endpoint

**Before:**
```python
for item in items:
    content = await Content.get(item.content_id)
    if content:
        result.append({...})
```

**After:**
```python
seen_content_ids = set()  # Deduplicate

for item in items:
    if item.content_id in seen_content_ids:
        continue

    # Fetch content based on type
    if item.content_type == "podcast":
        content = await PodcastEpisode.get(item.content_id)
    else:
        content = await Content.get(item.content_id)

    if content:
        seen_content_ids.add(item.content_id)
        result.append({...})
```

#### Key Improvements

1. **Proper Model Lookup**: Uses `PodcastEpisode` for podcast content
2. **Deduplication**: Tracks `seen_content_ids` to prevent duplicates
3. **Flexible Attributes**: Uses `getattr()` for thumbnail/cover fallback
4. **Limit Enforcement**: Breaks after collecting requested number of unique items

## Deployment Steps

### Step 1: Clean Up Existing Duplicates

```bash
cd backend
poetry run python scripts/cleanup_duplicate_watch_history.py
```

**Expected Output:**
```
🔍 Scanning for duplicate watch history entries...
📊 Found X total watch history entries
  👤 User abc12345... | Content xyz67890... | Found 3 entries, keeping most recent
⚠️  Found Y duplicate groups
📝 Will delete Z duplicate entries

❓ Proceed with deletion? (yes/no): yes
✅ Deleted Z duplicate entries
```

### Step 2: Add Unique Index

```bash
poetry run python scripts/add_watch_history_unique_index.py
```

**Expected Output:**
```
🔍 Adding unique index to watch_history collection...
📋 Existing indexes: [...]
✅ Created unique index: user_id_content_id_unique
✅ Migration complete!
```

### Step 3: Restart Backend Server

```bash
# Stop current server (Ctrl+C)
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Verify Fix

#### Test Continue Watching Endpoint

```bash
# Get auth token (replace with actual token)
TOKEN="your-auth-token"

# Test continue watching endpoint
curl http://localhost:8000/api/v1/history/continue \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": "episode_id_1",
      "title": "Episode Title",
      "thumbnail": "https://...",
      "duration": "45:30",
      "type": "podcast",
      "progress": 65.5,
      "position": 1800
    }
  ]
}
```

#### Verify No Duplicates

- Each `content_id` should appear only once
- Podcast episodes should load correctly
- No 404 errors for podcast content

## Rollback Plan

If issues occur:

1. **Remove Unique Index:**
   ```bash
   cd backend
   poetry run python -c "
   from app.core.database import init_db
   from app.models.watchlist import WatchHistory
   import asyncio

   async def remove_index():
       await init_db()
       collection = WatchHistory.get_motor_collection()
       await collection.drop_index('user_id_content_id_unique')
       print('✅ Index removed')

   asyncio.run(remove_index())
   "
   ```

2. **Revert Code Changes:**
   ```bash
   git checkout HEAD -- backend/app/api/routes/history.py
   ```

3. **Restart Server**

## Testing Checklist

- [ ] Run cleanup script - verify duplicates are removed
- [ ] Add unique index - verify index is created
- [ ] Restart backend server - verify it starts successfully
- [ ] Test `/history/continue` endpoint - verify no duplicates
- [ ] Test podcast episode playback - verify history is saved
- [ ] Test VOD content playback - verify history still works
- [ ] Check frontend - verify continue watching section shows correct items
- [ ] Verify no duplicate entries can be created (unique constraint enforced)

## Performance Impact

- **Minimal**: Added deduplication loop processes max 20 items
- **Database Query**: One additional query per podcast episode (cached)
- **Index**: Unique index improves query performance and prevents duplicates

## Future Improvements

1. **Add Unit Tests**: Create `test_history.py` with tests for deduplication
2. **Add Integration Tests**: Test end-to-end podcast history flow
3. **Monitor Metrics**: Track duplicate prevention in production
4. **Background Job**: Periodic cleanup of any edge-case duplicates

## Related Issues

- Watch history not showing podcast episodes
- Duplicate entries in continue watching section
- Inconsistent history display across content types

## References

- **Backend Endpoint**: `backend/app/api/routes/history.py`
- **Podcast Model**: `backend/app/models/content.py` (PodcastEpisode)
- **Watch History Model**: `backend/app/models/watchlist.py` (WatchHistory)
- **Frontend Service**: `web/src/services/api.js` (historyService)
- **WatchPage**: `web/src/pages/watch/WatchPage.tsx`

---

**Status**: ✅ Completed
**Verified**: Pending deployment testing
**Documentation**: Complete
