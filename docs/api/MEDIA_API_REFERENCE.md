# Media & Live TV API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

---

## Live TV (`/api/v1/live`)

### GET `/api/v1/live/channels`

Get live TV channels with optional filters.

- **Auth:** Optional
- **Query Params:** `culture_id`, `category`

### GET `/api/v1/live/{channel_id}`

Get channel details with today's schedule.

- **Auth:** Optional

### GET `/api/v1/live/{channel_id}/epg`

Get EPG (Electronic Program Guide) for channel.

- **Auth:** None
- **Query Params:** `date` (YYYY-MM-DD)

### GET `/api/v1/live/{channel_id}/stream`

Get live stream URL with subscription check.

- **Auth:** Required
- **Response:** Stream URL, type, DRM info, current/next program

---

## Live Quota (`/api/v1/live/quota`)

### GET `/api/v1/live/quota/my-usage`

Get current user's live feature usage statistics.

- **Auth:** Required

### GET `/api/v1/live/quota/check/{feature_type}`

Check if user can start new live feature session.

- **Auth:** Required
- **Path Params:** `feature_type` (FeatureType enum)

### GET `/api/v1/live/quota/session-history`

Get user's recent live feature usage sessions.

- **Auth:** Required
- **Query Params:** `limit` (max 100), `offset`

---

## Live Dubbing

### GET `/api/v1/live/{channel_id}/dubbing/availability`

Check if live dubbing is available for channel.

- **Auth:** Required
- **Response:** Available languages, voices

### GET `/api/v1/live/dubbing/voices`

Get list of available voices for dubbing.

- **Auth:** Required

### PUT `/api/v1/admin/live/{channel_id}/dubbing/config`

Update dubbing configuration for channel. Admin only.

- **Auth:** Required (Admin)

### GET `/api/v1/admin/live/dubbing/stats`

Get dubbing session statistics. Admin only.

- **Auth:** Required (Admin)

---

## Live Catch-Up

### GET `/api/v1/live/{channel_id}/catchup`

Generate or retrieve AI catch-up summary (Beta 500 users only).

- **Auth:** Required

### GET `/api/v1/live/{channel_id}/catchup/available`

Check if catch-up summary is available for a channel.

- **Auth:** Required

---

## Live Highlights

### GET `/api/v1/live/{channel_id}/highlights`

Get recent highlights for a live channel.

- **Auth:** Required
- **Rate Limit:** 60/min

### GET `/api/v1/live/{channel_id}/highlights/status`

Check if highlight detection is active for a channel.

- **Auth:** Required
- **Rate Limit:** 60/min

### POST `/api/v1/live/{channel_id}/highlights/start`

Start highlight detection for a channel. Admin only.

- **Auth:** Required (Admin)
- **Rate Limit:** 10/min

### POST `/api/v1/live/{channel_id}/highlights/stop`

Stop highlight detection for a channel. Admin only.

- **Auth:** Required (Admin)
- **Rate Limit:** 10/min

### GET `/api/v1/admin/highlights/active`

Get all channels with active highlight detection. Admin only.

- **Auth:** Required (Admin)
- **Rate Limit:** 30/min

---

## Radio (`/api/v1/radio`)

### GET `/api/v1/radio/stations`

Get radio stations with optional filters.

- **Auth:** Optional
- **Query Params:** `culture_id`, `genre`

### GET `/api/v1/radio/{station_id}`

Get radio station details (name, logo, genre, current show/song).

- **Auth:** Optional

### GET `/api/v1/radio/{station_id}/stream`

Get radio stream URL with optional validation.

- **Auth:** None
- **Query Params:** `validate` (bool)

---

## Audiobooks (`/api/v1/audiobooks`)

### GET `/api/v1/audiobooks`

Get featured/trending audiobooks with pagination.

- **Auth:** Optional
- **Query Params:** `page`, `page_size`

### GET `/api/v1/audiobooks/{audiobook_id}`

Get single audiobook metadata.

- **Auth:** Optional

### GET `/api/v1/audiobooks/{audiobook_id}/chapters`

Get audiobook with chapters for player.

- **Auth:** Optional

### POST `/api/v1/audiobooks/{audiobook_id}/stream`

Get audiobook stream URL (admin-only).

- **Auth:** Required (Admin)

---

## Recordings (`/api/v1/recordings`)

### POST `/api/v1/recordings/start`

Start manual recording of live channel. Premium only.

- **Auth:** Required (Premium)
- **Request Body:** `StartRecordingRequest`

### POST `/api/v1/recordings/{session_id}/stop`

Stop active recording session.

- **Auth:** Required (Premium)

### DELETE `/api/v1/recordings/{recording_id}`

Delete recording and release quota.

- **Auth:** Required

### GET `/api/v1/recordings`

List user's recordings with pagination.

- **Auth:** Required
- **Query Params:** `page`, `page_size`

### GET `/api/v1/recordings/active/sessions`

Get user's active recording sessions.

- **Auth:** Required

### GET `/api/v1/recordings/quota/status`

Get user's recording quota status.

- **Auth:** Required

### GET `/api/v1/recordings/{recording_id}`

Get recording details (increments view count).

- **Auth:** Required

---

## Recording Schedules (`/api/v1/recordings`)

### POST `/api/v1/recordings/schedule`

Schedule recording from EPG entry. Premium only.

- **Auth:** Required (Premium)
- **Request Body:** `ScheduleRecordingRequest`

### DELETE `/api/v1/recordings/schedule/{schedule_id}`

Cancel a scheduled recording.

- **Auth:** Required

### GET `/api/v1/recordings/schedules`

List user's scheduled recordings with optional status filter.

- **Auth:** Required
- **Query Params:** `status`

### GET `/api/v1/recordings/schedule/conflicts`

Check for scheduling conflicts.

- **Auth:** Required
- **Query Params:** `start_time`, `end_time`, `channel_id`

---

## Series Recording Rules (`/api/v1/recordings`)

### POST `/api/v1/recordings/rules`

Create new series recording rule. Premium only.

- **Auth:** Required (Premium)
- **Request Body:** `CreateSeriesRuleRequest`

### GET `/api/v1/recordings/rules`

List user's series recording rules.

- **Auth:** Required

### PUT `/api/v1/recordings/rules/{rule_id}`

Update a series recording rule. Premium only.

- **Auth:** Required (Premium)
- **Request Body:** `UpdateSeriesRuleRequest`

### DELETE `/api/v1/recordings/rules/{rule_id}`

Delete series rule and cancel pending schedules.

- **Auth:** Required

---

## Media Proxy (`/api/proxy`)

### GET `/api/proxy/media/{encoded_url}`

Proxy GCS media files for authenticated access.

- **Auth:** None
- **Path Params:** `encoded_url` (base64)

### GET `/api/proxy/transcode/{content_id}`

Stream video with real-time audio transcoding (web only).

- **Auth:** None
- **Query Params:** `start` (float seconds)

### GET `/api/proxy/transcode/{content_id}/info`

Get transcoding requirements for content.

- **Auth:** None

---

## TTS Proxy (`/api/v1/tts`)

### POST `/api/v1/tts/synthesize`

Synthesize speech using ElevenLabs API (backend-only credentials).

- **Auth:** Required (OAuth)

### GET `/api/v1/tts/voices`

Get list of available ElevenLabs voices.

- **Auth:** Required (OAuth)

### GET `/api/v1/tts/health`

Health check for TTS service.

- **Auth:** None

---

## Analytics Proxy (`/api/v1/analytics`)

### POST `/api/v1/analytics/track`

Track single analytics event through backend proxy.

- **Auth:** Required (OAuth)

### POST `/api/v1/analytics/batch`

Track multiple analytics events in batch (max 100).

- **Auth:** Required (OAuth)

### GET `/api/v1/analytics/health`

Health check for analytics service.

- **Auth:** None

---

## Wake Word Proxy (`/api/v1/wake-word`)

### POST `/api/v1/wake-word/detect`

Detect wake word in audio stream using Picovoice API.

- **Auth:** Required (OAuth)

### GET `/api/v1/wake-word/models`

Get list of available wake word detection models.

- **Auth:** Required (OAuth)

### GET `/api/v1/wake-word/health`

Health check for wake word service.

- **Auth:** None

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
