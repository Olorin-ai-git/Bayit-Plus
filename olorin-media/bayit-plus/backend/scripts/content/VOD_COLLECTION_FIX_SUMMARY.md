# VOD Collection Fix Summary

## Problem

The VOD page in bayit-plus was showing as empty because the `is_series` field was incorrectly set on content documents, causing API endpoint queries to return 0 results.

## Root Cause

**Import scripts incorrectly set `is_series=True` on episodes** (content with `series_id` pointing to a parent series), when they should have set `is_series=False`.

### Affected Scripts
- `add_palmach_series.py` (line 109)
- `add_tagad_series.py` (line 105)

### Correct Data Model

| Content Type | `is_series` | `series_id` | Example |
|--------------|-------------|-------------|---------|
| **Parent Series** | `True` | `None` or empty | "Hell on Wheels" |
| **Episode** | `False` | Valid parent ID | "Hell on Wheels S01E01" |
| **Movie** | `False` | `None` or empty | "Winnie the Pooh" |

## Solution Applied

### 1. Data Fix Script

Created `fix_is_series_final.py` which:

1. **Identifies parent series** by finding all unique `series_id` values in the database
2. **Sets parent series** to `is_series=True`
3. **Sets episodes** (content with `series_id` != None) to `is_series=False`
4. **Sets standalone movies** (no `series_id`, not a parent) to `is_series=False`

**Results:**
- ✅ 150 movies will display on `/content/movies`
- ✅ 14 parent series will display on `/content/series`
- ✅ VOD page now works correctly

### 2. Fixed Import Scripts

**Updated `add_palmach_series.py`:**
```python
# OLD (line 109):
is_series=True,  # ❌ WRONG for episodes

# NEW (line 109):
is_series=False,  # ✅ Episodes are NOT series
```

**Updated `add_tagad_series.py`:**
```python
# OLD (line 105):
is_series=True,  # ❌ WRONG for episodes

# NEW (line 105):
is_series=False,  # ✅ Episodes are NOT series
```

## Files Created/Modified

### Created:
1. `scripts/content/fix_is_series_final.py` - Main data fix script (✅ SUCCESSFUL)
2. `scripts/content/fix_is_series_field.py` - Initial attempt (superseded by final version)
3. `scripts/content/fix_is_series_field_v2.py` - Second attempt (superseded by final version)
4. `scripts/content/check_series_structure.py` - Diagnostic tool
5. `scripts/content/diagnose_series_links.py` - Diagnostic tool
6. `scripts/content/VOD_COLLECTION_FIX_SUMMARY.md` - This document

### Modified:
1. `scripts/content/add_palmach_series.py` - Fixed episode creation
2. `scripts/content/add_tagad_series.py` - Fixed episode creation

## Prevention Guidelines

### For Future Content Import Scripts

When creating content import scripts, **always follow this pattern:**

```python
# For PARENT SERIES (container for episodes)
parent_series = Content(
    title="Series Name",
    is_series=True,      # ✅ Parent series = True
    series_id=None,      # ✅ No parent
    is_published=True,
    stream_url="",       # Often empty for parent series
    ...
)

# For EPISODES (belonging to a series)
episode = Content(
    title="Series Name - S01E01",
    is_series=False,     # ✅ Episodes = False
    series_id=str(parent_series.id),  # ✅ Points to parent
    season=1,
    episode=1,
    is_published=True,
    stream_url="/path/to/episode.mp4",
    ...
)

# For STANDALONE MOVIES
movie = Content(
    title="Movie Title",
    is_series=False,     # ✅ Movies = False
    series_id=None,      # ✅ No parent
    is_published=True,
    stream_url="/path/to/movie.mp4",
    ...
)
```

### Key Rules

1. **ONLY parent series** should have `is_series=True`
2. **Episodes** (with `series_id` set) should have `is_series=False`
3. **Movies** (standalone content) should have `is_series=False`
4. **Never set `is_series=True` on episodes** - this breaks the API queries

### API Endpoint Queries

The API endpoints use these queries:

**`/content/movies` endpoint:**
```python
{
    "is_published": True,
    "is_series": {"$ne": True},  # NOT a series
    "$or": [
        {"series_id": None},
        {"series_id": {"$exists": False}},
        {"series_id": ""}
    ]
}
```

**`/content/series` endpoint:**
```python
{
    "is_published": True,
    "is_series": True,            # IS a series
    "$or": [
        {"series_id": None},
        {"series_id": {"$exists": False}},
        {"series_id": ""}
    ]
}
```

## How to Run the Fix

If this issue occurs again in the future:

```bash
cd olorin-media/bayit-plus/backend
poetry run python scripts/content/fix_is_series_final.py
```

The script is **idempotent** - safe to run multiple times.

## Verification

After running the fix, verify with:

```bash
# Check series structure
poetry run python scripts/content/check_series_structure.py

# Check series links
poetry run python scripts/content/diagnose_series_links.py
```

Or query MongoDB directly:

```javascript
// Count movies
db.content.count({
  is_published: true,
  is_series: { $ne: true },
  $or: [
    { series_id: null },
    { series_id: { $exists: false } },
    { series_id: "" }
  ]
})

// Count series
db.content.count({
  is_published: true,
  is_series: true,
  $or: [
    { series_id: null },
    { series_id: { $exists: false } },
    { series_id: "" }
  ]
})
```

## Status

- ✅ Data fixed
- ✅ Import scripts updated
- ✅ VOD page now displays content correctly
- ✅ Movies endpoint: 150 items
- ✅ Series endpoint: 14 items
