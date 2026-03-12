# BYOC YouTube AI Integration Design

## Status: Approved Design (2026-03-11)

## Overview

Elevate YouTube from a limited BYOC source (audio-overlay-only) to a first-class content source with full AI feature support. YouTube content is hybrid: regular uploads get VOD AI features, live streams get Live TV AI features.

## Value Proposition

- **Enrichment**: Make YouTube videos smarter than YouTube itself offers
- **Unified experience**: All content in one app with consistent AI
- **Differentiation**: "YouTube + Bayit AI" as a unique value nobody else provides

## Target Users

Bayit+ users who watch Hebrew/Jewish YouTube content and want translation, learning, and interactive AI on top of it.

---

## Content Type Detection

YouTube videos are classified at fetch time using the `liveBroadcastContent` field from the YouTube Data API `snippet` resource.

| API Value  | Maps To                        | Player Mode | AI Panel          |
| ---------- | ------------------------------ | ----------- | ----------------- |
| `none`     | `MediaContentType.youtubeVOD`  | VOD         | Top bar + sidebar |
| `upcoming` | `MediaContentType.youtubeVOD`  | VOD         | Top bar + sidebar |
| `live`     | `MediaContentType.youtubeLive` | Live TV     | Sparkles toolbar  |

### Caching

- Classification stored alongside `BYOCContentItem` in existing persistence layer
- 24-hour TTL handles live-to-VOD transitions naturally
- Pull-to-refresh for manual override
- Initial 50-video sync classifies at fetch time (no extra API call -- `liveBroadcastContent` is in the `snippet`)

---

## AI Feature Capability Matrix

### YouTube VOD (regular uploads)

| Feature                 | Supported | Notes                                    |
| ----------------------- | --------- | ---------------------------------------- |
| `pause_ask`             | YES       | Tier 1 priority                          |
| `interactive_subtitles` | YES       | Tier 1 priority                          |
| `bilingual_bridge`      | YES       | Tier 1 priority (VOD sheet picker)       |
| `ai_companion`          | YES       | Tier 1 priority                          |
| `vocabulary`            | YES       | Tier 2 (builds on interactive_subtitles) |
| `cultural_context`      | YES       | Tier 2                                   |
| `vod_moments`           | NO        | No TMDB data for character extraction    |
| `live_dubbing`          | NO        | Seek/pause breaks real-time sync         |
| `live_subtitles`        | NO        | Not applicable to VOD                    |
| `live_trivia`           | NO        | Not applicable to VOD                    |
| `catch_up`              | NO        | Not applicable to VOD                    |
| `scene_search`          | NO        | Tier 3                                   |

### YouTube Live (live streams)

| Feature                 | Supported | Notes                                        |
| ----------------------- | --------- | -------------------------------------------- |
| `live_subtitles`        | YES       | Tier 1 priority                              |
| `live_dubbing`          | YES       | Tier 2 (mutually exclusive with subtitles)   |
| `live_trivia`           | YES       | Tier 2 (auto-generates from subtitle stream) |
| `bilingual_bridge`      | YES       | Tier 2 (live mode toggle)                    |
| `scene_search`          | NO        | Tier 3                                       |
| `catch_up`              | NO        | Tier 3                                       |
| `pause_ask`             | NO        | Cannot meaningfully pause live               |
| `interactive_subtitles` | NO        | Not applicable to live                       |
| `ai_companion`          | NO        | Not applicable to live                       |
| `vocabulary`            | NO        | Not applicable to live                       |
| `cultural_context`      | NO        | Not applicable to live                       |
| `vod_moments`           | NO        | Not applicable to live                       |

### Content-Agnostic Features (both modes)

| Feature           | Supported | Notes                  |
| ----------------- | --------- | ---------------------- |
| `llm_search`      | YES       | Works with any content |
| `chatbot`         | YES       | Works with any content |
| `proactive_voice` | YES       | Works with any content |
| `glossary`        | YES       | Works with any content |

### Hebrew Learning Features (Tier 3 -- deferred)

`phonetic_mirror`, `talk_back`, `interactive_mission` require microphone + avatar setup. Higher friction for casual YouTube watching. Deferred to later phase.

---

## Subtitle Sourcing Strategy

### YouTube VOD -- Caption Extraction

1. Backend enrichment receives video ID + user preferred languages
2. `youtube-transcript-api` Python library extracts captions (zero YouTube API quota cost)
3. Preference order: manual captions > auto-generated captions > none
4. Extracted captions translated via existing `ExternalSubtitleService` translation pipeline
5. Stored as subtitle documents in existing enrichment format (`source_provider="youtube"`)

### YouTube VOD -- No Captions Fallback

1. Audio sent through transcription service (same pipeline as live, but one-time batch job)
2. User sees "Generating subtitles..." progress indicator during enrichment
3. More expensive -- only triggered when no captions exist at all

### YouTube Live -- Real-time Pipeline

1. Reuses existing Live TV WebSocket pipeline entirely
2. Audio captured from YouTube live stream, sent through transcription/translation chain
3. No new infrastructure needed

---

## Enrichment Pipeline

Extends existing `POST /api/v1/byoc/enrich` endpoint.

### YouTube-Specific Flow

1. Detect `source_provider="youtube"` in enrichment request
2. Fetch captions via `youtube-transcript-api` (zero quota)
3. Translate to requested languages via existing pipeline
4. Fetch video metadata (title, description, channel, tags) from cached BYOC data
5. Pass metadata to `CulturalContextService` for Jewish/Israeli content annotation
6. Return enrichment status: `full`, `partial`, `processing`, or `none`

### Batch Strategy

- On initial YouTube source add (50 videos): batch-enrich the 10 most recent
- Remaining videos enriched on-demand when user taps play
- Uses existing `POST /api/v1/byoc/enrich/batch` (up to 20 items)

### Exclusions

- No TMDB lookup (YouTube videos don't have TMDB IDs)
- No character extraction or interactive moments generation
- `vod_moments` feature not supported for YouTube sources

---

## Player Integration

No new player mode. Existing VOD and Live TV code paths handle YouTube through content type mapping.

### VOD Path (`youtubeVOD`, `isLive == false`)

Renders standard VOD controls:

- Subtitle picker, split subtitle toggle, playback rate
- Pause & Ask button, AI Companion button
- Cultural context badge on content load

**Suppressed:** Download button (YouTube ToS)

### Live Path (`youtubeLive`, `isLive == true`)

Renders standard Live TV controls:

- `GlassAIFeaturesPanel` / `TVAIFeaturesPanel`
- Live subtitles toggle, dubbing toggle, trivia
- Language selector

**Suppressed:** Recording button (YouTube ToS)

### Badge Update

YouTube BYOC sources promoted from orange headphones badge (`byoc.audioAIOnly`) to blue sparkles badge (`byoc.aiAvailable`).

### ToS Guard

Single `isYouTubeSource` boolean on playback state. Checked in download button and recording button visibility conditions only.

---

## Capability Resolver Changes

`BYOCAICapabilityResolver` updated from flat `audioOverlayOnly` for YouTube to content-type-aware resolution:

```
YouTube source + youtubeVOD  -> VOD capability set (subtitles, pause_ask, companion, bilingual, cultural, vocabulary)
YouTube source + youtubeLive -> Live capability set (dubbing, live_subtitles, trivia, bilingual_live)
```

The resolver receives `MediaContentType` and returns the appropriate capability flags.

---

## YouTube API Quota Considerations

- **Classification**: Free when fetched during initial sync (part of `snippet`). 1 unit per on-demand check. Cached 24h.
- **Caption extraction**: Zero cost (`youtube-transcript-api` scrapes, does not use API)
- **Enrichment metadata**: Already cached from initial sync, no extra calls
- **Overall posture**: Moderate concern. Smart caching keeps quota usage minimal.

---

## Non-Goals

- Not building a YouTube browser or search within YouTube
- Not prioritizing microphone-dependent Hebrew learning features for YouTube
- Not changing how YouTube sources are added to BYOC
- Not enabling download or recording (YouTube ToS)
- Not matching YouTube content to TMDB

---

## Decision Log

| #   | Decision                                                                                 | Alternatives Considered                                     | Rationale                                                                      |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Hybrid content type (VOD + Live)                                                         | All VOD; all Live; user chooses                             | YouTube is inherently both -- `liveBroadcastContent` gives automatic detection |
| 2   | Approach: Capability Promotion with new MediaContentType cases                           | Map to existing .movie/.liveTV; dedicated YouTube player    | Clean separation, reuses both pipelines, no third player variant               |
| 3   | Tier 1: pause_ask, interactive_subtitles, bilingual_bridge, ai_companion, live_subtitles | All 19 at once; learning features first                     | Highest differentiation + broadest appeal                                      |
| 4   | No dubbing for YouTube VOD                                                               | Enable VOD dubbing                                          | Seek/pause/speed breaks real-time dubbing sync                                 |
| 5   | Caption sourcing via youtube-transcript-api                                              | YouTube Data API captions (quota-heavy); transcription only | Zero quota cost, gets manual + auto-generated captions                         |
| 6   | Suppress download + recording                                                            | Allow them                                                  | YouTube ToS compliance                                                         |
| 7   | Eager enrich 10 most recent, on-demand for rest                                          | All 50 on add; none until play                              | Balances backend load with ready-when-you-tap experience                       |
| 8   | Skip TMDB/character extraction                                                           | Try TMDB matching                                           | YouTube videos rarely map to TMDB. Saves complexity                            |
| 9   | 24h cache TTL for classification                                                         | Aggressive caching; no caching                              | Handles live-to-VOD transitions. Pull-to-refresh for override                  |

---

## Implementation Priority

### Phase 1 (Tier 1 Features)

1. Add `youtubeVOD` / `youtubeLive` to `MediaContentType`
2. Update `BYOCAICapabilityResolver` for YouTube
3. Add `youtube-transcript-api` to backend enrichment pipeline
4. Enable `interactive_subtitles` + `bilingual_bridge` for YouTube VOD
5. Enable `pause_ask` + `ai_companion` for YouTube VOD
6. Enable `live_subtitles` for YouTube Live
7. Update badge from orange headphones to blue sparkles
8. Add `isYouTubeSource` ToS guard (suppress download/recording)

### Phase 2 (Tier 2 Features)

9. Enable `vocabulary` for YouTube VOD
10. Enable `cultural_context` for YouTube VOD
11. Enable `live_dubbing` for YouTube Live
12. Enable `live_trivia` for YouTube Live
13. Add no-captions fallback (audio transcription)

### Phase 3 (Tier 3 -- Future)

14. Hebrew learning features for YouTube content
15. Scene search
16. Catch-up summaries
