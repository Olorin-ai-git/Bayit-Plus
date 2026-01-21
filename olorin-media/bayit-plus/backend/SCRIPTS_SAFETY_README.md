# Database Scripts Safety Guide

## ⚠️ Important Safety Changes

All database scripts have been modified to prevent accidental data loss. This document explains the changes and how to use the scripts safely.

## Scripts Modified

### 1. **DISABLED Scripts**
These scripts have been disabled for safety:

- `update_working_content.py.DISABLED` - **DANGEROUS**: Deleted all VOD content
  - Renamed to `.DISABLED` to prevent accidental execution
  - If you need this functionality, use the seed scripts with upsert mode instead

### 2. **Seed Scripts (Now Use Upsert by Default)**

#### `scripts/seed_data.py`
- **Default behavior**: Upserts (updates or creates) content without deleting existing data
- **Usage**:
  ```bash
  # Safe: Add/update content without deleting
  poetry run python -m scripts.seed_data

  # DANGEROUS: Clear all data first (requires confirmation)
  poetry run python -m scripts.seed_data --clear
  ```
- **Safety features**:
  - Requires typing 'DELETE ALL' to confirm deletion
  - Uses upsert operations to preserve existing content
  - Shows clear status indicators (✓ created, ⊙ exists)

#### `scripts/seed_demo_content.py`
- **Default behavior**: DISABLED deletion - will not clear existing data
- **Safety features**:
  - Delete operations are disabled by default
  - Will exit if --clear flag is used

### 3. **Update Scripts (Now Use Upsert)**

#### `update_live_channels.py`
- **Old behavior**: Deleted all channels, then recreated
- **New behavior**: Updates existing channels or creates new ones
- **Safety features**:
  - Uses MongoDB `update_one` with `upsert=True`
  - Shows ✓ Created or ⟳ Updated for each channel
  - Preserves channels not in the script

#### `update_podcasts_with_real_data.py`
- **Old behavior**: Deleted all podcasts, then recreated
- **New behavior**: Updates existing podcasts or creates new ones
- **Safety features**:
  - Uses MongoDB `update_one` with `upsert=True`
  - Matches podcasts by title
  - Shows ✓ created or ⟳ updated for each podcast

#### `update_podcasts_from_103fm.py`
- **Old behavior**: Deleted all podcasts, then recreated
- **New behavior**: Updates existing podcasts or creates new ones
- **Safety features**:
  - Uses MongoDB `update_one` with `upsert=True`
  - Preserves existing podcast data

### 4. **Fix Scripts (Now Require Confirmation)**

#### `fix_segal_barko_correct.py`
- **Behavior**: Fixes a specific podcast's episodes
- **Safety features**:
  - Shows count of episodes to be deleted
  - Requires typing 'yes' to confirm
  - Only affects one specific podcast
  - Can be safely cancelled

## Content Addition Scripts (Safe by Design)

These scripts only add content and never delete:

- `add_palmach_series.py` - Adds Palmach episodes
- `add_tagad_series.py` - Adds Tagad episodes
- `scripts/import_free_content.py` - Adds public domain content
- `add_apple_podcasts_feed.py` - Adds podcast feeds
- `add_rss_feeds.py` - Adds RSS feeds

## Best Practices

### ✅ DO
- Use seed scripts without `--clear` flag for safe updates
- Run addition scripts (add_*.py) to expand content
- Test scripts on a backup database first
- Review script output before confirming deletions

### ❌ DON'T
- Run seed scripts with `--clear` flag in production without backup
- Execute `.DISABLED` scripts without reviewing their code
- Modify deletion confirmation prompts
- Run multiple deletion scripts consecutively

## Backup Recommendations

Before running any script that modifies data:

```bash
# Create a MongoDB backup
mongodump --db bayit_plus --out /path/to/backup/$(date +%Y%m%d)

# Restore from backup if needed
mongorestore --db bayit_plus /path/to/backup/20260111/bayit_plus
```

## Emergency Recovery

If data is accidentally deleted:
1. Stop the script immediately (Ctrl+C)
2. Check if MongoDB oplog is enabled for point-in-time recovery
3. Restore from the most recent backup
4. Re-run safe addition scripts to restore local content:
   - `poetry run python add_palmach_series.py`
   - `poetry run python add_tagad_series.py`
   - `poetry run python -m scripts.import_free_content`

## Script Status Indicators

- `✓` Created - New item added
- `⊙` Exists - Item already exists (skipped)
- `⟳` Updated - Existing item updated
- `✗` Cancelled - Operation cancelled by user

## Questions?

If you need to perform a full database reset:
1. Create a backup first
2. Review what data will be lost
3. Use `poetry run python -m scripts.seed_data --clear`
4. Type 'DELETE ALL' when prompted
5. Run addition scripts to restore custom content

---

**Last Updated**: 2026-01-11
**Changes**: Converted all delete operations to upsert operations, added confirmation prompts
