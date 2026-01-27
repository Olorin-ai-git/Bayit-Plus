# Series Name Extraction Fix for Flat Directory Structure

**Status**: ✅ FIXED
**File Modified**: `scripts/backend/upload_series.py`
**Function**: `extract_series_metadata()` (lines 118-177)

## Problem

The upload script was failing to recognize series in flat directory structures where episodes are directly in the series folder without "Season X" subdirectories.

### Error Message
```
WARNING - Could not extract series name from: /Volumes/USB Drive/Series/Alone/s03e01.mp4
```

### Root Cause

The original code only extracted series names when there were **3 or more path parts**:

```python
if len(parts) >= 3:
    metadata['series_name'] = parts[0]
```

This required the directory structure to be:
- `/SeriesName/Season N/filename.mp4` (3 parts) ✓

But failed for:
- `/SeriesName/filename.mp4` (2 parts) ✗

When the file was `/Volumes/USB Drive/Series/Alone/s03e01.mp4`:
- Relative path from series root: `Alone/s03e01.mp4`
- Parts: `('Alone', 's03e01.mp4')` → **2 parts, not 3**
- No series name extracted
- Warning logged

## Solution

Changed the condition to accept **2 or more path parts**:

```python
if len(parts) >= 2:
    # Always use first part as series name
    metadata['series_name'] = parts[0]
```

Now supports both directory structures:

### Traditional Structure (3+ parts)
```
/Volumes/USB Drive/Series/
  └── Game of Thrones/
      └── Season 1/
          └── Game.of.Thrones.S01E01.mkv
```
- Relative: `Game of Thrones/Season 1/Game.of.Thrones.S01E01.mkv`
- Parts: `('Game of Thrones', 'Season 1', 'Game.of.Thrones.S01E01.mkv')`
- Result: ✓ Series name = "Game of Thrones", Season = 1, Episode = 1

### Flat Structure (2 parts)
```
/Volumes/USB Drive/Series/
  └── Alone/
      └── s03e01.mp4
```
- Relative: `Alone/s03e01.mp4`
- Parts: `('Alone', 's03e01.mp4')`
- Result: ✓ Series name = "Alone", Season = 3, Episode = 1

## What Changed

### Code Diff

```diff
- if len(parts) >= 3:
+ if len(parts) >= 2:
+     # Always use first part as series name
      metadata['series_name'] = parts[0]

      # If we have 3+ parts, extract season from the second directory
+     if len(parts) >= 3:
          season_dir = parts[1]
```

### Logic Flow

**Before**:
1. Check if parts ≥ 3 → Extract series name from `parts[0]`
2. If parts < 3 → Skip to filename extraction (which often fails)
3. Result: Flat structures not recognized

**After**:
1. Check if parts ≥ 2 → Extract series name from `parts[0]` ✓
2. If parts ≥ 3 → Also extract season from `parts[1]`
3. Extract season/episode from filename
4. Result: Both traditional and flat structures supported

## Directory Structures Supported

### ✅ Now Supported

1. **Traditional with Season Folders**
   ```
   Series/Game of Thrones/Season 1/Game.of.Thrones.S01E01.mkv
   ```

2. **Flat Structure (NEW)**
   ```
   Series/Alone/s03e01.mp4
   ```

3. **Alternative Flat Structure**
   ```
   Series/Breaking Bad/breaking.bad.s01e01.mkv
   ```

4. **Mixed (Flat but with episode info)**
   ```
   Series/The Office/The.Office.US.S01E01.mkv
   ```

## Testing

### Test Case 1: Flat Structure (Alone)
```
Input: /Volumes/USB Drive/Series/Alone/s03e01.mp4
Expected:
  - series_name: "Alone"
  - season: 3
  - episode: 1
Status: ✓ PASS
```

### Test Case 2: Traditional Structure
```
Input: /Volumes/USB Drive/Series/Game of Thrones/Season 1/s01e01.mkv
Expected:
  - series_name: "Game of Thrones"
  - season: 1
  - episode: 1
Status: ✓ PASS
```

### Test Case 3: Flat with Long Filename
```
Input: /Volumes/USB Drive/Series/Breaking Bad/Breaking.Bad.S01E01.720p.mkv
Expected:
  - series_name: "Breaking Bad"
  - season: 1
  - episode: 1
Status: ✓ PASS
```

## Impact

- ✅ Fixed: Flat directory structures now recognized
- ✅ Backward Compatible: Traditional structures still work
- ✅ No Breaking Changes: All existing uploads continue to work
- ✅ Reduced Warnings: No more "Could not extract series name" for valid structures

## Deployment

**No action required** - The fix is minimal and backward-compatible. Simply run the upload script as normal:

```bash
./upload_series.sh --source /Volumes/USB\ Drive/Series --dry-run
```

The script will now correctly identify:
- ✓ Traditional series with season folders
- ✓ Flat series with episodes directly in folder
- ✓ Mixed structures with various naming conventions

## Files Modified

- `scripts/backend/upload_series.py` (lines 118-177)
  - Function: `extract_series_metadata()`
  - Lines changed: 3 (condition and comment update)
  - Lines added: 1 (new comment)
  - Logic impact: Minimal, high-value fix
