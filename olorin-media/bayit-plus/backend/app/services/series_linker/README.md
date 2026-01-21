# Series Linker Service

Episode-to-series linking and episode deduplication service.

## Overview

This service provides automated episode linking to parent series containers, using multiple strategies including title matching, TMDB API integration, and intelligent duplicate resolution.

## Module Structure

```
series_linker/
├── constants.py          # Episode patterns, dataclasses
├── episode_matcher.py    # Episode-to-series matching logic
├── tmdb_integration.py   # TMDB API integration
├── series_creator.py     # Series container creation from TMDB
├── linking.py            # Episode linking operations
├── deduplication.py      # Episode selection logic
├── duplicate_resolver.py # Duplicate detection and resolution
├── batch_operations.py   # Batch processing utilities
├── validation.py         # Unlinked episode discovery
└── service.py            # Main SeriesLinkerService coordinator
```

## Usage

```python
from app.services.series_linker_service import SeriesLinkerService, get_series_linker_service

# Get service instance
service = get_series_linker_service()

# Find unlinked episodes
unlinked = await service.find_unlinked_episodes(limit=100)

# Link episode to series
result = await service.link_episode_to_series(
    episode_id="episode_123",
    series_id="series_456",
    audit_id="audit_789"
)

# Auto-link all unlinked episodes
results = await service.auto_link_unlinked_episodes()

# Find and resolve duplicates
duplicates = await service.find_duplicate_episodes()
resolved = await service.auto_resolve_duplicate_episodes()
```

## Configuration

All configuration comes from `app.core.config.settings`:

- `SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD` - Minimum similarity for title matching (default: 0.8)
- `SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD` - Minimum confidence for auto-linking (default: 0.9)
- `SERIES_LINKER_AUTO_LINK_BATCH_SIZE` - Batch size for auto-linking (default: 100)
- `SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY` - Strategy for duplicate resolution (default: "quality")
- `SERIES_LINKER_CREATE_MISSING_SERIES` - Whether to create missing series from TMDB (default: True)

## Episode Title Patterns

Supports multiple episode title formats:
- `S01E01`, `s01e01`, `S1E1` - Standard season/episode notation
- `1x01` - Alternative season/episode format
- `Season 1 Episode 1` - Long-form notation
- `EP01`, `Ep.01` - Episode-only format (assumes season 1)

## Backward Compatibility

All imports from the original `series_linker_service.py` continue to work:

```python
from app.services.series_linker_service import (
    SeriesLinkerService,
    UnlinkedEpisode,
    DuplicateGroup,
    LinkingResult,
    DeduplicationResult,
    get_series_linker_service
)
```
