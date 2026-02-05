# Content & Search API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

---

## Search (`/api/v1/search`)

### GET `/api/v1/search/unified`

Unified search across all content with advanced filtering. Supports full-text search, subtitle search, multi-criteria filtering, pagination, and caching.

- **Auth:** Optional
- **Query Params:** `query`, `content_types`, `genres`, `year_min`, `year_max`, `rating_min`, `subtitle_languages`, `subscription_tier`, `is_kids_content`, `search_in_subtitles`, `page`, `limit`
- **Response:** `SearchResults`

### GET `/api/v1/search/subtitles`

Search for specific dialogue within subtitle files. Returns content with matching subtitle cues highlighted with timestamps.

- **Auth:** Optional
- **Query Params:** `query` (min 2 chars), `content_types`, `language`, `limit`
- **Response:** `SearchResults`

### GET `/api/v1/search/filters/options`

Get available filter options for advanced search (genres, year range, subtitle languages, content types, subscription tiers).

- **Auth:** None

### GET `/api/v1/search/suggestions`

Get autocomplete suggestions for search query.

- **Auth:** None
- **Query Params:** `query` (min 2 chars), `limit` (1-10, default 5)

### GET `/api/v1/search/trending`

Get trending search queries from last 7 days.

- **Auth:** None
- **Query Params:** `limit` (1-20, default 10)

### GET `/api/v1/search/categories`

Get predefined search categories with metadata (id, label, icon, filters).

- **Auth:** None

### POST `/api/v1/search/scene`

Search for specific scenes within content or series with timestamps for deep-linking. IDOR protection and tiered rate limiting.

- **Auth:** Optional
- **Rate Limit:** Anonymous: 10/min, Authenticated: 30/min, Premium: 100/min
- **Request Body:** `SceneSearchRequest`
  ```json
  { "query": "string", "content_id": "string (optional)", "series_id": "string (optional)", "language": "string", "limit": 10, "min_score": 0.5 }
  ```

### POST `/api/v1/search/llm`

Natural language search using Claude AI. Premium feature only.

- **Auth:** Required (Premium)
- **Request Body:** `LLMSearchRequest`
  ```json
  { "query": "string", "include_user_context": false, "limit": 10 }
  ```

---

## Search Analytics (`/api/v1/search/analytics`)

### POST `/api/v1/search/analytics/click`

Track when a user clicks on a search result for CTR analysis.

- **Auth:** Optional

### GET `/api/v1/search/analytics/popular`

Get most popular search queries.

- **Auth:** None
- **Query Params:** `limit` (1-50, default 10), `days` (1-90, default 7)

### GET `/api/v1/search/analytics/no-results`

Get queries that returned no results.

- **Auth:** None
- **Query Params:** `limit` (1-100, default 20), `days` (1-90, default 7)

### GET `/api/v1/search/analytics/metrics`

Get aggregated search metrics (CTR, search type distribution, performance).

- **Auth:** None
- **Query Params:** `days` (1-90, default 7)

---

## Content Taxonomy (`/api/v1/content`)

### GET `/api/v1/content/sections`

Get all content sections for navigation.

- **Auth:** None
- **Query Params:** `show_on_nav`, `show_on_homepage`
- **Headers:** `Accept-Language`

### GET `/api/v1/content/sections/{section_id}`

Get single section by ID or slug.

- **Auth:** None

### GET `/api/v1/content/sections/{section_id}/subcategories`

Get subcategories for section.

- **Auth:** None

### GET `/api/v1/content/genres`

Get all genres.

- **Auth:** None
- **Query Params:** `show_in_filter`

### GET `/api/v1/content/audiences`

Get all audience classifications.

- **Auth:** None

### GET `/api/v1/content/browse`

Unified content browse with filters.

- **Auth:** None
- **Query Params:** `section`, `subcategory`, `genres`, `audience`, `topics`, `content_format`, `page`, `limit`, `sort`

### GET `/api/v1/content/section/{section_slug}/content`

Get content for specific section.

- **Auth:** None
- **Query Params:** `subcategory`, `page`, `limit`

---

## EPG - Electronic Program Guide (`/api/v1/epg`)

### GET `/api/v1/epg`

Get EPG data for specified channels and time range with timezone support.

- **Auth:** Optional
- **Query Params:** `channel_ids`, `start_time` (ISO 8601), `end_time` (ISO 8601), `timezone` (default: UTC)

### POST `/api/v1/epg/search`

Traditional text search in EPG data.

- **Auth:** None
- **Query Params:** `query`, `channel_ids`, `start_time`, `end_time`, `category`

### POST `/api/v1/epg/llm-search`

LLM-powered natural language search in EPG data using Claude AI. Premium feature.

- **Auth:** Required (Premium)
- **Request Body:** `LLMSearchRequest`

### GET `/api/v1/epg/{channel_id}/schedule`

Get full day schedule for a specific channel.

- **Auth:** None
- **Query Params:** `date` (YYYY-MM-DD)

### GET `/api/v1/epg/{channel_id}/current`

Get currently airing program for a channel.

- **Auth:** None

### GET `/api/v1/epg/{channel_id}/next`

Get next program for a channel.

- **Auth:** None

### GET `/api/v1/epg/catchup/{program_id}/stream`

Get catch-up TV stream for a past program (DVR-style playback). Premium feature. 7-day retention.

- **Auth:** Required (Premium)

### GET `/api/v1/epg/catchup/{program_id}/availability`

Check if catch-up is available for a program.

- **Auth:** Optional

### GET `/api/v1/epg/catchup/available`

Get list of programs available for catch-up.

- **Auth:** Optional
- **Query Params:** `channel_id`, `limit` (1-100, default 50)

---

## Chapters (`/api/v1/chapters`)

### GET `/api/v1/chapters/{content_id}`

Get chapters for a specific content item. Returns cached or generates on-demand.

- **Auth:** Optional

### POST `/api/v1/chapters/{content_id}/generate`

Generate or regenerate chapters for content.

- **Auth:** Required
- **Query Params:** `force` (bool)
- **Body:** `transcript` (optional string)

### GET `/api/v1/chapters/live/{channel_id}`

Get chapters for live channel content.

- **Auth:** Optional

### POST `/api/v1/chapters/{content_id}/approve`

Approve AI-generated chapters (admin only).

- **Auth:** Required (Admin)

### GET `/api/v1/chapters/categories/list`

Get available chapter categories with labels and icons.

- **Auth:** None

---

## Subtitles (`/api/v1/subtitles`)

### GET `/api/v1/subtitles/{content_id}/cues`

Get subtitle cues with Hebrew/English mode support.

- **Auth:** None
- **Query Params:** `language`, `hebrew_mode`, `english_mode`, `start_time`, `end_time`

### POST `/api/v1/subtitles/{content_id}/nikud`

Start async nikud (vowel marks) generation job.

- **Auth:** None
- **Query Params:** `language`, `force`

### POST `/api/v1/subtitles/{content_id}/shoresh`

Start async shoresh (root words) generation job.

- **Auth:** None

### POST `/api/v1/subtitles/{content_id}/heblish`

Start async heblish (English injections in Hebrew) generation job.

- **Auth:** None

### POST `/api/v1/subtitles/{content_id}/grammar-flip`

Start async Grammar-Flip generation job.

- **Auth:** None

### POST `/api/v1/subtitles/{content_id}/slang-synthesis`

Start async Slang Synthesis generation job.

- **Auth:** None

### POST `/api/v1/subtitles/{content_id}/engrew`

Start async Engrew (Hebrew injections in English) generation job.

- **Auth:** None

### GET `/api/v1/subtitles/job/{job_id}`

Get AI generation job status for polling.

- **Auth:** None

### POST `/api/v1/subtitles/job/{job_id}/cancel`

Cancel in-progress AI generation job.

- **Auth:** None

### GET `/api/v1/subtitles/{content_id}/job/active`

Get all active generation jobs for content.

- **Auth:** None

### POST `/api/v1/subtitles/nikud/text`

Add nikud to arbitrary Hebrew text (on-the-fly).

- **Auth:** None
- **Request Body:**
  ```json
  { "text": "string" }
  ```

### GET `/api/v1/subtitles/cache/stats`

Get cache statistics for all subtitle AI services.

- **Auth:** None

### POST `/api/v1/subtitles/translate/word`

Translate single word with context (tap-to-translate).

- **Auth:** None
- **Request Body:**
  ```json
  { "word": "string", "source_lang": "string", "target_lang": "string" }
  ```

### POST `/api/v1/subtitles/translate/phrase`

Translate phrase or sentence.

- **Auth:** None
- **Request Body:**
  ```json
  { "phrase": "string", "source_lang": "string", "target_lang": "string" }
  ```

---

## Subtitle Preferences (`/api/v1/subtitles`)

### GET `/api/v1/subtitles/preferences/{content_id}`

Get user's preferred subtitle language for content.

- **Auth:** Required

### POST `/api/v1/subtitles/preferences/{content_id}`

Set user's subtitle language preference.

- **Auth:** Required
- **Request Body:**
  ```json
  { "language": "string", "hebrew_mode": "string" }
  ```

### PATCH `/api/v1/subtitles/preferences/{content_id}/hebrew-mode`

Update Hebrew mode for existing preference.

- **Auth:** Required

### DELETE `/api/v1/subtitles/preferences/{content_id}`

Delete user's subtitle preference for content.

- **Auth:** Required

### GET `/api/v1/subtitles/preferences`

Get all subtitle preferences for current user.

- **Auth:** Required

---

## Trending (`/api/v1/trending`)

### GET `/api/v1/trending/topics`

Get current trending topics from Israeli news with AI analysis.

- **Auth:** Optional

### GET `/api/v1/trending/headlines`

Get raw headlines from Israeli news sources.

- **Auth:** None
- **Query Params:** `source` (ynet/walla/mako), `limit` (max 50, default 20)

### GET `/api/v1/trending/recommendations`

Get content recommendations based on trending topics in Israel.

- **Auth:** Optional
- **Query Params:** `limit` (max 20, default 10)

### GET `/api/v1/trending/summary`

Get AI-generated brief summary of what's happening in Israel today (Morning Ritual feature).

- **Auth:** Optional

### GET `/api/v1/trending/category/{category}`

Get trending topics filtered by category (security, politics, tech, culture, sports, economy, entertainment).

- **Auth:** Optional

---

## VOD Audio Tracks (`/api/v1/vod`)

### POST `/api/v1/vod/{content_id}/audio-tracks/generate`

Trigger audio generation for subtitle variants (admin only). 4 variants: Heblish, Slang, Grammar-Flip, Engrew.

- **Auth:** Required (Admin)

### GET `/api/v1/vod/{content_id}/audio-tracks`

List all available audio tracks for content (only completed).

- **Auth:** None

### GET `/api/v1/vod/{content_id}/audio-tracks/status`

Get audio generation status for all variants.

- **Auth:** None

### GET `/api/v1/vod/{content_id}/hls/manifest.m3u8`

Generate dynamic HLS master manifest with alternate audio tracks.

- **Auth:** None

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
