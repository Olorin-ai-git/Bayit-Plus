# Series Merge Operation - January 23, 2026

## Operation Summary

Successfully merged duplicate series entries for "The Bourgeois" (הבורגנים).

## Series Details

**TMDB ID**: 42984
**Series Name (Hebrew)**: הבורגנים
**Series Name (English)**: The Bourgeois / burganim

### Before Merge

**Target Series** (kept):
- ID: `696f824772937026f35b4991`
- Title: burganim
- Episodes: 1
- Poster: None
- Published: Yes

**Source Series** (merged and unpublished):
- ID: `696c7c0a17d54f3a57e73bf0`
- Title: הבורגנים
- Episodes: 2
- Poster: Yes (TMDB poster)
- Published: Yes

### After Merge

**Final Series State**:
- ID: `696f824772937026f35b4991`
- Title: burganim
- Episodes: **3 total** (2 transferred + 1 original)
- Poster: `https://image.tmdb.org/t/p/w500/7dkkJLLfoJIuicq8mFwePVjBiqX.jpg`
- Backdrop: None
- TMDB ID: 42984
- Published: Yes

**Source Series**:
- Unpublished (not deleted)
- All episodes transferred to target
- Metadata merged into target

## Operations Performed

1. ✅ **Transferred Episodes**: 2 episodes moved from source to target
2. ✅ **Merged Metadata**: Poster, thumbnail, and genres from source to target
3. ✅ **Unpublished Source**: Source series marked as unpublished
4. ✅ **Updated Watchlist**: 0 references (none found)
5. ✅ **Updated Favorites**: 0 references (none found)

## Access

View the merged series at:
**http://localhost:3200/vod/series/696f824772937026f35b4991**

## Script Location

The merge script is available at:
`scripts/backend/content/update_and_merge_series.py`

### Usage

```bash
# From backend directory
poetry run python ../scripts/backend/content/update_and_merge_series.py [poster_url] [backdrop_url]

# To update poster only
poetry run python ../scripts/backend/content/update_and_merge_series.py "https://your-poster-url.jpg"

# To update poster and backdrop
poetry run python ../scripts/backend/content/update_and_merge_series.py \
  "https://your-poster-url.jpg" \
  "https://your-backdrop-url.jpg"
```

## Notes

- The script handles poster updates, episode transfers, and watchlist/favorites reference updates
- Source series is unpublished (not deleted) for data integrity
- All metadata gaps in target series are filled from source series
- TMDB metadata preserved for both series

## Related Files

- Script: `scripts/backend/content/update_and_merge_series.py`
- Content Model: `backend/app/models/content.py`
- Series Organizer: `scripts/backend/organize_series.py`

---

**Date**: 2026-01-23
**Performed By**: Claude Sonnet 4.5
**Status**: ✅ Completed Successfully
