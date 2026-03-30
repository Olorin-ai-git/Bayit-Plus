# B2B Zero Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close every gap between the Olorin B2B strategy brief and the actual implementation — fix show-stoppers, complete infrastructure, build viral mechanics, and deliver real "bring your own video" with orchestrated AI capabilities.

**Architecture:** The B2B API lives at `/api/v1/olorin/v1/` on the Bayit+ backend. Partners authenticate via `X-Olorin-API-Key` header. The plan adds: (1) generic metering for all capabilities, (2) vanity URL mounting for `api.olorin.ai`, (3) webhook event emission from all endpoints, (4) credit-based enforcement, (5) transcript-based character extraction for non-TMDB content, (6) orchestrated multi-capability ingest pipeline, (7) BYOC source connectors for B2B, (8) viral mechanics on the marketing portal.

**Tech Stack:** Python 3.11 / FastAPI / Beanie ODM / MongoDB Atlas (backend), TypeScript / React / Vite / Glass components (portal-main), Deepgram Nova-2 (STT), Claude (character extraction), ElevenLabs (TTS/dubbing)

---

## Phase A: Fix Show-Stoppers

These 4 tasks must be completed before any B2B demo or outreach. Each is a runtime crash or silent failure.

---

### Task A1: Fix metering — add generic `record_usage` method

**Files:**

- Modify: `backend/app/services/olorin/metering/usage.py`
- Modify: `backend/app/services/olorin/metering/service.py`
- Test: `backend/tests/unit/test_metering_usage.py`

**Context:** Four B2B endpoints (`b2b_pause_ask.py`, `b2b_subtitles.py`, `b2b_trivia.py`, `video_ingest.py`) call `metering_service.record_usage(partner_id, capability, metadata)`. This method does not exist on `MeteringService` — only capability-specific methods like `record_dubbing_usage` exist. Result: `AttributeError` at runtime on every Pause & Ask, subtitle, trivia, and video ingest call.

**Step 1: Write the failing test**

```python
# backend/tests/unit/test_metering_usage.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.olorin.metering.service import MeteringService

@pytest.mark.asyncio
async def test_record_usage_generic():
    svc = MeteringService()
    with patch("app.services.olorin.metering.usage.record_generic_usage", new_callable=AsyncMock) as mock:
        mock.return_value = None
        await svc.record_usage(
            partner_id="test-partner",
            capability="pause_ask",
            metadata={"content_id": "abc123"},
        )
        mock.assert_called_once_with("test-partner", "pause_ask", {"content_id": "abc123"})
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_metering_usage.py::test_record_usage_generic -v`
Expected: FAIL — `AttributeError: 'MeteringService' object has no attribute 'record_usage'`

**Step 3: Add `record_generic_usage` function to `usage.py`**

Add to `backend/app/services/olorin/metering/usage.py`:

```python
async def record_generic_usage(
    partner_id: str,
    capability: str,
    metadata: dict,
) -> UsageRecord:
    """Record usage for any capability via generic metadata."""
    period_start = _get_period_start()
    record = await UsageRecord.find_one(
        UsageRecord.partner_id == partner_id,
        UsageRecord.capability == capability,
        UsageRecord.period_start == period_start,
    )
    if not record:
        record = UsageRecord(
            partner_id=partner_id,
            capability=capability,
            period_start=period_start,
        )
    record.request_count += 1
    tokens = metadata.get("tokens_used", 0)
    if tokens:
        record.tokens_consumed += tokens
    audio = metadata.get("audio_seconds", 0.0)
    if audio:
        record.audio_seconds_processed += audio
    record.estimated_cost_usd += _estimate_generic_cost(capability, metadata)
    await record.save()
    return record


def _estimate_generic_cost(capability: str, metadata: dict) -> float:
    """Estimate cost based on capability type."""
    cost_map = {
        "pause_ask": 0.02,
        "video_ingest": 0.10,
        "subtitles": 0.05,
        "trivia": 0.03,
    }
    return cost_map.get(capability, 0.01)
```

**Step 4: Add `record_usage` method to `MeteringService` in `service.py`**

```python
async def record_usage(
    self,
    partner_id: str,
    capability: str,
    metadata: dict,
) -> UsageRecord:
    """Record usage for any capability (generic)."""
    return await usage.record_generic_usage(partner_id, capability, metadata)
```

**Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/test_metering_usage.py::test_record_usage_generic -v`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/app/services/olorin/metering/usage.py backend/app/services/olorin/metering/service.py backend/tests/unit/test_metering_usage.py
git commit -m "fix(b2b): add generic record_usage to MeteringService — fixes AttributeError on 4 endpoints"
```

---

### Task A2: Mount vanity router for `api.olorin.ai` paths

**Files:**

- Modify: `backend/app/api/router_registry.py`
- Test: manual — verify `/v1/partner/me` responds

**Context:** API docs reference `https://api.olorin.ai/v1/...` paths. The `vanity_router` is defined in `app/api/routes/olorin/__init__.py` but never mounted. Partners following docs get 404s.

**Step 1: Mount vanity_router in router_registry.py**

Find the olorin router registration block (~line 584) and add:

```python
# Olorin vanity routes (for api.olorin.ai — clean /v1/ paths)
from app.api.routes.olorin import vanity_router as olorin_vanity_router
app.include_router(olorin_vanity_router, tags=["olorin-vanity"])
```

This mounts the vanity router at `/v1/partner/...`, `/v1/videos/...`, etc. — matching what the API docs show.

**Step 2: Verify no route conflicts**

Run: `cd backend && python -c "from app.main import app; print([r.path for r in app.routes])" 2>&1 | grep '/v1/partner'`
Expected: Both `/api/v1/olorin/v1/partner/{path}` and `/v1/partner/{path}` should appear.

**Step 3: Update ApiDocsData.ts base URL comment**

In `portal-main/src/pages/ApiDocsData.ts`, verify `BASE_URL` is `https://api.olorin.ai`. This is already correct — now that we mounted the vanity router, the docs match reality.

**Step 4: Commit**

```bash
git add backend/app/api/router_registry.py
git commit -m "fix(b2b): mount vanity router — api.olorin.ai/v1/ paths now work"
```

---

### Task A3: Wire webhook events into all B2B endpoints

**Files:**

- Modify: `backend/app/api/routes/olorin/b2b_pause_ask.py`
- Modify: `backend/app/api/routes/olorin/b2b_subtitles.py`
- Modify: `backend/app/api/routes/olorin/b2b_trivia.py`
- Modify: `backend/app/api/routes/olorin/video_ingest.py`
- Test: `backend/tests/unit/test_b2b_webhooks.py`

**Context:** Webhook infrastructure is complete (HMAC signatures, retries, delivery tracking) but no B2B endpoint calls `send_webhook_event()`. Partners configure webhooks and receive zero events.

**Step 1: Write test**

```python
@pytest.mark.asyncio
async def test_pause_ask_fires_webhook(mock_partner_with_webhook):
    with patch("app.api.routes.olorin.b2b_pause_ask.send_webhook_event", new_callable=AsyncMock) as mock_webhook:
        # ... call pause_ask endpoint
        mock_webhook.assert_called_once()
        call_args = mock_webhook.call_args
        assert call_args[1]["event_type"] == "session.ended"
```

**Step 2: Add webhook calls to each endpoint**

In each file, import and call after successful completion:

```python
from app.api.routes.olorin.webhooks import send_webhook_event
```

**b2b_pause_ask.py** — after response is built:

```python
await send_webhook_event(partner, "session.ended", {
    "content_id": content_id,
    "character": character_name,
    "response_length": len(response_text),
}, background_tasks)
```

**b2b_subtitles.py** — in `_run_subtitle_generation` after success:

```python
await send_webhook_event(partner_doc, "translation.completed", {
    "content_id": content_id,
    "languages": languages,
    "tracks_ready": ready,
})
```

**b2b_trivia.py** — after facts are built:

```python
await send_webhook_event(partner, "session.ended", {
    "content_id": request.content_id,
    "facts_generated": len(facts),
    "capability": "trivia",
}, background_tasks)
```

**video_ingest.py** — in `_run_extraction` after success:

```python
partner_doc = await IntegrationPartner.find_one(IntegrationPartner.partner_id == partner_id)
if partner_doc:
    await send_webhook_event(partner_doc, "session.ended", {
        "content_id": content_id,
        "characters": len(characters),
        "capability": "video_ingest",
    })
```

And on failure paths, emit `error.occurred`.

**Step 3: Run tests, commit**

```bash
git commit -m "fix(b2b): wire webhook events into pause-ask, subtitles, trivia, video-ingest"
```

---

### Task A4: Add interaction credit enforcement

**Files:**

- Modify: `backend/app/services/olorin/metering/summary.py`
- Modify: `backend/app/api/routes/olorin/dependencies.py`
- Modify: `backend/app/models/integration_partner.py`
- Test: `backend/tests/unit/test_credit_enforcement.py`

**Context:** Pricing says "5,000 AI credits/month" for $399 tier. Backend only has `monthly_usage_limit_usd` — no credit counter. Partners can make unlimited requests.

**Step 1: Add `monthly_interaction_limit` to IntegrationPartner**

```python
# In IntegrationPartner model
monthly_interaction_limit: Optional[int] = Field(
    default=None,
    description="Monthly interaction cap (None = unlimited for enterprise)",
)
```

**Step 2: Add tier-to-limit mapping in partner service**

```python
_TIER_INTERACTION_LIMITS = {
    "free": 100,
    "standard": 5000,    # Starter $399
    "growth": 20000,     # Growth $1,199
    "enterprise": None,  # Unlimited
}
```

**Step 3: Add credit check in `verify_capability`**

In `dependencies.py`, after existing usage limit check, add:

```python
if partner.monthly_interaction_limit is not None:
    current_month_count = await _get_monthly_request_count(partner.partner_id, capability)
    if current_month_count >= partner.monthly_interaction_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Monthly interaction limit reached ({current_month_count}/{partner.monthly_interaction_limit}). Upgrade your plan.",
        )
```

**Step 4: Implement `_get_monthly_request_count` in summary.py**

```python
async def get_monthly_request_count(partner_id: str, capability: Optional[str] = None) -> int:
    """Count total requests for current billing month."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    query = {"partner_id": partner_id, "period_start": {"$gte": month_start}}
    if capability:
        query["capability"] = capability
    pipeline = [{"$match": query}, {"$group": {"_id": None, "total": {"$sum": "$request_count"}}}]
    result = await UsageRecord.aggregate(pipeline).to_list()
    return result[0]["total"] if result else 0
```

**Step 5: Test, commit**

```bash
git commit -m "feat(b2b): enforce monthly interaction limits per tier (5K starter, 20K growth)"
```

---

## Phase B: Infrastructure Polish

---

### Task B1: Add Growth and Enterprise tiers

**Files:**

- Modify: `backend/app/models/integration_partner.py` — add `"growth"` to `BillingTier`
- Modify: `backend/app/services/olorin/partner_service.py` — add growth tier defaults
- Modify: `portal-main/src/pages/PricingPageTiersExtra.tsx` — add Growth ($1,199) and Enterprise tiers
- Modify: `portal-main/src/i18n/locales/*.json` (all 10) — pricing copy for new tiers

**Steps:**

1. Update `BillingTier = Literal["free", "standard", "growth", "enterprise"]`
2. Add `CapabilityType` literal to include all 8 capabilities: `"realtime_dubbing", "semantic_search", "recap_agent", "cultural_context", "pause_ask", "video_ingest", "subtitles", "trivia"`
3. Add growth tier rate limit multiplier (10x base) in `_get_default_rate_limits`
4. Add `GrowthTier` component to pricing page: $1,199/mo, 20,000 interactions, priority processing
5. Add `EnterpriseTier` component: custom pricing, unlimited, SLA, dedicated support, CTA "CONTACT SALES"
6. Localize all new pricing copy across 10 locales
7. Commit: `feat(b2b): add Growth $1,199 and Enterprise tiers to pricing + backend`

---

### Task B2: Dashboard webhook management page

**Files:**

- Create: `portal-main/src/pages/dashboard/DashboardWebhooksPage.tsx`
- Modify: `portal-main/src/App.tsx` — add `/dashboard/webhooks` route

**Steps:**

1. Create page with: webhook URL input, event subscription checkboxes (all supported event types), test button, delivery history table (last 50 deliveries with status codes)
2. Uses `PUT /v1/webhooks/config` to save, `POST /v1/webhooks/test` to test, `GET /v1/webhooks/deliveries` to list history
3. Add navigation link in dashboard sidebar
4. Localize across 10 locales
5. Commit: `feat(b2b): add webhook management page to partner dashboard`

---

### Task B3: Persist rate limiter to MongoDB

**Files:**

- Modify: `backend/app/services/olorin/rate_limiter.py`
- Test: `backend/tests/unit/test_rate_limiter_persistence.py`

**Context:** `PartnerRateLimiter` uses in-process memory. Resets on deploy, doesn't work across Cloud Run replicas.

**Steps:**

1. Replace in-memory `SlidingWindowCounter` with MongoDB-backed counters using atomic `$inc` operations on a `rate_limit_counters` collection
2. Key: `{partner_id}:{capability}:{window}:{period_bucket}` — window buckets auto-expire via MongoDB TTL index
3. Fallback: if MongoDB is slow, degrade to in-memory (accept slight over-counting rather than blocking)
4. Test with concurrent requests
5. Commit: `fix(b2b): persist rate limiter to MongoDB — survives restarts and multi-instance`

---

## Phase C: API Docs & Marketing Portal

---

### Task C1: Add missing endpoints to API docs

**Files:**

- Modify: `portal-main/src/pages/ApiDocsData.ts`

**Context:** API docs are missing: partner management (register, profile, webhook config via partner routes), per-session recap endpoints, cultural context categories/popular, delivery history.

**Steps:**

1. Add `partner` endpoint group: `POST /partner/register`, `GET /partner/me`, `PUT /partner/me`, `POST /partner/me/api-key/regenerate`
2. Add missing recap endpoints: `GET /recap/sessions/{id}`, `DELETE /recap/sessions/{id}`
3. Add missing context endpoints: `GET /context/cultural/categories/{category}`, `GET /context/cultural/popular`
4. Add `GET /webhooks/deliveries` to webhooks group
5. Add example requests/responses for each new endpoint
6. Commit: `docs(b2b): add 9 missing endpoints to API reference`

---

### Task C2: Add undocumented capabilities to marketing features page

**Files:**

- Modify: `portal-main/src/pages/FeaturesPageData.ts`
- Modify: `portal-main/src/pages/FeaturesPage.tsx`
- Modify: `portal-main/src/i18n/locales/*.json` (all 10)

**Context:** Backend has search, cultural context, and recap capabilities exposed via B2B API. Features page doesn't mention them.

**Steps:**

1. Add to Movies/VOD tab: "Semantic Search" card (natural language search across video content with timestamp deep-links)
2. Add to Business/EDU tab: "Recap Agent" card (late-joiner catch-up summaries from live content), "Cultural Context" card (automatic cultural reference detection and explanation)
3. Create inline demo components for each (static, like existing demos)
4. Localize across 10 locales
5. Commit: `feat(portal): add Search, Recap, Cultural Context to features page`

---

## Phase D: Viral Mechanics

---

### Task D1: Clip share with "Powered by Olorin" watermark

**Files:**

- Create: `backend/app/api/routes/olorin/clip_share.py`
- Create: `portal-streaming/src/components/demo/ClipShareButton.tsx`
- Modify: `portal-streaming/src/components/demo/PauseAskPanel.tsx`
- Modify: `backend/app/api/router_registry.py`

**Context:** Strategy brief viral mechanic #1: "One-click download of 15s Pause & Ask interaction with 'Powered by Olorin' watermark."

**Steps:**

1. Backend: `POST /olorin/v1/clips/generate` — accepts `session_id`, `exchange_index`. Composites the character response video (animated lipsync) with a "Powered by Olorin | olorin.ai" watermark using ffmpeg drawtext filter. Returns a downloadable MP4 URL (stored in GCS, 24hr TTL).
2. Frontend: After each Pause & Ask exchange in the demo portal, show a share icon. On click, calls the clip endpoint, shows download link + copy-to-clipboard for the URL.
3. Watermark uses `SNAP_WATERMARK_TEXT` pattern from existing Family Snaps service (reuse ffmpeg approach from `star_story/media_processing_service.py`).
4. Rate limit: 10 clips/hour per user.
5. Localize button text across 10 locales.
6. Commit: `feat(viral): clip share with Powered by Olorin watermark`

---

### Task D2: "Try It on This Video" challenge

**Files:**

- Create: `portal-main/src/pages/ChallengePage.tsx`
- Create: `backend/app/api/routes/olorin/challenge.py`
- Modify: `portal-main/src/App.tsx` — add `/challenge` route

**Context:** Strategy brief viral mechanic #2: "Users nominate videos, top-voted gets added."

**Steps:**

1. Backend: `POST /olorin/v1/challenge/nominate` (rate-limited 3/day, requires email), `GET /olorin/v1/challenge/current` (returns top nominations with vote counts), `POST /olorin/v1/challenge/vote/{nomination_id}` (one vote per email per nomination). MongoDB collection `challenge_nominations`.
2. Frontend: Page showing current nominations ranked by votes, nomination form (paste YouTube URL + reason), vote buttons. Winner banner when a nomination is processed.
3. Weekly cron: top-voted nomination gets processed through the ingest pipeline, added to demo portal manifest.
4. Localize across 10 locales.
5. Commit: `feat(viral): Try It on This Video challenge page`

---

### Task D3: Free trivia generator tool

**Files:**

- Create: `portal-main/src/pages/FreeToolsTriviaPage.tsx`
- Create: `backend/app/api/routes/olorin/free_trivia.py`
- Modify: `portal-main/src/App.tsx` — add `/tools/trivia` route

**Context:** Strategy brief viral mechanic #3: "Paste YouTube URL, get shareable AI trivia quiz (zero cost top-of-funnel)."

**Steps:**

1. Backend: `POST /olorin/v1/tools/trivia` — accepts YouTube URL, extracts transcript via Deepgram, generates 5-question quiz via Claude, returns quiz JSON. Rate-limited 3/day per IP. No auth required. Reuses existing trivia generation logic from `b2b_trivia.py`.
2. Frontend: Single-page tool — paste URL input, loading state, rendered quiz with multiple-choice questions, score display, "Share Quiz" button (copies URL with quiz ID), "Powered by Olorin" footer with CTA to API docs.
3. Shareable quiz page: `/tools/trivia/{quiz_id}` renders the quiz for anyone.
4. Localize across 10 locales.
5. Commit: `feat(viral): free trivia generator tool — zero-friction top-of-funnel`

---

## Phase E: Non-TMDB Video Ingestion (Transcript-Based)

This is the core new capability. Currently, character extraction depends on TMDB cast data. This phase builds a parallel path that extracts speakers/characters from video transcripts.

---

### Task E1: Build transcript-based speaker extraction service

**Files:**

- Create: `backend/app/services/olorin/speaker_extraction.py`
- Test: `backend/tests/unit/test_speaker_extraction.py`

**Context:** For non-TMDB content (lectures, training, personal videos), "characters" are speakers identified from the transcript. Pipeline: transcribe → diarize → identify speakers → generate profiles.

**Steps:**

1. `SpeakerExtractionService` class with async method:

```python
async def extract_speakers_from_transcript(
    self,
    transcript: str,
    diarization: list[dict],  # [{"speaker": "SPEAKER_0", "start": 0.0, "end": 5.2, "text": "..."}]
    video_title: Optional[str] = None,
) -> list[ContentCharacter]:
```

2. Uses Claude to analyze the diarized transcript:
   - Identify speaker names from self-introductions ("I'm Dr. Chen", "Welcome, I'm Professor...")
   - Infer role/expertise from what they say
   - Generate personality description and speaking style
   - Create `suggested_questions` based on their content
   - Assign default voice IDs (male/female based on Claude's inference)

3. Claude prompt structure:

```
Analyze this transcript with {N} speakers. For each speaker:
- Real name (if mentioned) or descriptive label ("Host", "Guest Expert")
- Role/title (if mentioned)
- Expertise areas (inferred from content)
- Personality/speaking style description
- 3 suggested questions a viewer might ask this speaker
Return as JSON array.
```

4. Returns `list[ContentCharacter]` matching the existing model — same structure used by TMDB path.
5. Test with mock transcripts (lecture with self-introduction, panel discussion, unnamed presenter).
6. Commit: `feat(b2b): transcript-based speaker extraction — works without TMDB`

---

### Task E2: Build video transcription + diarization pipeline

**Files:**

- Create: `backend/app/services/olorin/video_transcriber.py`
- Test: `backend/tests/unit/test_video_transcriber.py`

**Context:** Before we can extract speakers, we need to transcribe the video and identify distinct speakers (diarization). Deepgram Nova-2 supports both transcription and diarization.

**Steps:**

1. `VideoTranscriber` class:

```python
async def transcribe_video(
    self,
    video_url: str,
) -> TranscriptionResult:
    """Transcribe video audio with speaker diarization."""
```

2. Flow:
   - Download audio from video URL (ffmpeg extract audio → temp file)
   - Send to Deepgram Nova-2 with `diarize=true`, `punctuate=true`, `paragraphs=true`
   - Parse response into `TranscriptionResult`:
     ```python
     @dataclass
     class TranscriptionResult:
         full_text: str
         segments: list[TranscriptSegment]  # with speaker labels
         speakers_count: int
         language: str
         duration_seconds: float
     ```

3. Handle edge cases: audio-only files, very long videos (chunk at 2hr boundaries), videos with no speech.
4. Reuse existing Deepgram integration from `app/services/voice/` if available, or use `deepgram-sdk` directly.
5. Commit: `feat(b2b): video transcription + diarization via Deepgram`

---

### Task E3: Build unified character extraction that tries TMDB first, falls back to transcript

**Files:**

- Create: `backend/app/services/olorin/unified_extractor.py`
- Test: `backend/tests/unit/test_unified_extractor.py`

**Steps:**

1. `UnifiedCharacterExtractor`:

```python
async def extract_characters(
    self,
    video_url: str,
    content: Content,
    video_title: Optional[str] = None,
) -> list[ContentCharacter]:
    """Extract characters — tries TMDB first, falls back to transcript analysis."""
```

2. Flow:
   - **Step 1**: Try to get title from oEmbed (YouTube/Vimeo) or from `video_title` param
   - **Step 2**: If title exists, search TMDB. If TMDB match found → use existing `character_extractor_service` (TMDB path)
   - **Step 3**: If no TMDB match → transcribe video via `VideoTranscriber` → extract speakers via `SpeakerExtractionService`
   - **Step 4**: Save transcript to Content document for downstream use (subtitles, trivia, search)

3. The transcript is stored on the Content document for reuse by other pipeline stages:

   ```python
   content.transcript = transcription_result.full_text
   content.transcript_segments = transcription_result.segments
   ```

4. Test all three paths: TMDB hit, TMDB miss → transcript, direct file with no oEmbed.
5. Commit: `feat(b2b): unified character extractor — TMDB first, transcript fallback`

---

## Phase F: Accept Any Video URL

---

### Task F1: Expand URL validation to accept any URL

**Files:**

- Modify: `backend/app/utils/video_url_utils.py`
- Test: `backend/tests/unit/test_video_url_utils.py`

**Steps:**

1. Change `validate_video_url` to accept ANY http/https URL, not just YouTube/Vimeo/Dailymotion:

```python
def validate_video_url(url: str) -> Tuple[bool, str]:
    if not url or not url.strip():
        return False, "URL is required"
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        return False, "URL must use http or https"
    if not parsed.hostname:
        return False, "Invalid URL"
    return True, ""
```

2. Keep `_OEMBED_HOSTS` for title extraction — oEmbed is a best-effort enrichment, not a gate.
3. Add `extract_video_title_fallback` for non-oEmbed URLs: try HTTP HEAD for title, or derive from URL path.
4. Update frontend `VIDEO_URL_PATTERN` in `SubmitUrlForm.tsx` to accept any https URL.
5. Test: YouTube URL, Vimeo URL, direct MP4 link, Plex URL, random HTTPS URL.
6. Commit: `feat(b2b): accept any video URL — remove platform restrictions`

---

### Task F2: Support direct video file upload for B2B API

**Files:**

- Create: `backend/app/api/routes/olorin/video_upload.py`
- Modify: `backend/app/api/routes/olorin/__init__.py`

**Steps:**

1. `POST /videos/upload` — accepts multipart file upload (video/mp4, video/webm, etc.)
2. Uploads to GCS bucket `olorin-b2b-uploads/{partner_id}/{uuid}.{ext}`, returns a GCS URL.
3. Partner then calls `POST /videos/ingest` with the GCS URL.
4. Max file size from config: `B2B_MAX_UPLOAD_MB` (default 500MB).
5. Rate limit: 5 uploads/hour per partner.
6. Commit: `feat(b2b): direct video file upload endpoint`

---

## Phase G: Orchestrated B2B Ingest Pipeline

This is the "submit once, get everything" capability.

---

### Task G1: Build pipeline orchestrator

**Files:**

- Create: `backend/app/services/olorin/ingest_orchestrator.py`
- Test: `backend/tests/unit/test_ingest_orchestrator.py`

**Steps:**

1. `IngestOrchestrator` class:

```python
async def process_video(
    self,
    content: Content,
    partner: IntegrationPartner,
    capabilities: list[str],  # ["all"] or ["characters", "subtitles", "trivia", ...]
    video_url: str,
) -> IngestJob:
```

2. Creates an `IngestJob` document (new model) tracking per-capability status:

```python
class IngestJob(Document):
    job_id: str
    partner_id: str
    content_id: str
    video_url: str
    capabilities: dict[str, str]  # {"characters": "pending", "subtitles": "processing", ...}
    transcript: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Settings:
        name = "ingest_jobs"
        indexes = ["job_id", "partner_id"]
```

3. Pipeline execution order (dependencies respected):

   ```
   transcribe (always first — other stages depend on transcript)
       ├── extract_characters (needs transcript for non-TMDB)
       ├── generate_subtitles (needs transcript)
       ├── generate_trivia (needs transcript)
       └── index_for_search (needs transcript)
   ```

4. Each stage:
   - Updates `capabilities[stage]` to `"processing"` → `"completed"` / `"failed"`
   - Fires webhook: `{stage}.completed` or `error.occurred`
   - Records metering via `record_usage`

5. "all" expands to: `["characters", "subtitles", "trivia", "search"]`
6. Commit: `feat(b2b): orchestrated ingest pipeline — single submission, all capabilities`

---

### Task G2: Update video ingest endpoint to support orchestrated mode

**Files:**

- Modify: `backend/app/api/routes/olorin/video_ingest.py`

**Steps:**

1. Expand `IngestRequest`:

```python
class IngestRequest(BaseModel):
    video_url: Optional[str] = Field(None, description="Video URL (any format)")
    content_id: Optional[str] = Field(None, description="Existing content ID")
    title: Optional[str] = Field(None, description="Video title hint")
    capabilities: list[str] = Field(
        default=["characters"],
        description="Capabilities to run: characters, subtitles, trivia, search, or all",
    )
```

2. If `video_url` is provided (no `content_id`): create a new Content document from the URL, then run orchestrated pipeline.
3. If `content_id` is provided: use existing content, run requested capabilities.
4. Return `IngestResponse` with per-capability status.
5. Add `GET /videos/{job_id}/status` that returns per-capability progress from `IngestJob`.
6. Commit: `feat(b2b): ingest endpoint accepts video_url + capabilities list`

---

### Task G3: Wire subtitles, trivia, and search into orchestrator

**Files:**

- Modify: `backend/app/services/olorin/ingest_orchestrator.py`

**Steps:**

1. Subtitles stage: reuses existing subtitle generation logic but uses the transcript we already have (no need to re-transcribe). Generates tracks for configured languages.
2. Trivia stage: reuses existing trivia generation from `b2b_trivia.py` logic but fed by transcript, not generic content metadata.
3. Search stage: calls `POST /search/index` logic to index the transcript with timestamps for semantic search.
4. Each stage runs concurrently after transcription completes (asyncio.gather).
5. Commit: `feat(b2b): orchestrator runs subtitles, trivia, search concurrently`

---

## Phase H: B2B BYOC — Connect Content Sources

---

### Task H1: Build B2B source connector API

**Files:**

- Create: `backend/app/api/routes/olorin/b2b_sources.py`
- Create: `backend/app/models/b2b_content_source.py`
- Modify: `backend/app/api/routes/olorin/__init__.py`

**Steps:**

1. New model `B2BContentSource`:

```python
class B2BContentSource(Document):
    partner_id: str
    source_type: str  # "youtube_channel", "playlist", "rss", "manual"
    source_url: str
    name: str
    auto_process: bool = True
    capabilities: list[str] = ["characters", "subtitles"]
    sync_interval_hours: int = 24
    last_synced_at: Optional[datetime] = None
    content_ids: list[str] = Field(default_factory=list)
    status: str = "active"  # active, paused, error

    class Settings:
        name = "b2b_content_sources"
        indexes = ["partner_id", "source_type"]
```

2. Endpoints:
   - `POST /sources` — register a content source (YouTube channel URL, RSS feed, etc.)
   - `GET /sources` — list partner's connected sources
   - `GET /sources/{source_id}` — source detail with content list
   - `DELETE /sources/{source_id}` — disconnect source
   - `POST /sources/{source_id}/sync` — trigger manual sync

3. Commit: `feat(b2b): content source connector API — register YouTube channels, RSS feeds`

---

### Task H2: Build YouTube channel auto-sync

**Files:**

- Create: `backend/app/services/olorin/source_sync.py`

**Steps:**

1. `SourceSyncService`:
   - For `youtube_channel`: use YouTube Data API v3 to list videos, create Content documents for new videos
   - For `playlist`: same but scoped to playlist
   - For `rss`: parse RSS feed for video enclosures

2. Each new video is auto-submitted to the orchestrated ingest pipeline with the source's configured capabilities.
3. Sync runs on schedule (Cloud Scheduler cron) or manual trigger.
4. Webhooks fire for each processed video: `source.video_processed`.
5. Commit: `feat(b2b): YouTube channel auto-sync — new uploads auto-processed`

---

### Task H3: Add sources to API docs and dashboard

**Files:**

- Modify: `portal-main/src/pages/ApiDocsData.ts` — add `sources` endpoint group
- Create: `portal-main/src/pages/dashboard/DashboardSourcesPage.tsx` — connected sources management

**Steps:**

1. API docs: document all 5 source endpoints with examples
2. Dashboard page: list connected sources, add source form (URL + capabilities checkboxes), sync button, content count per source
3. Add navigation link in dashboard
4. Localize across 10 locales
5. Commit: `feat(b2b): sources management in API docs + dashboard`

---

## Phase Summary

| Phase | Tasks | What It Delivers                                                     |
| ----- | ----- | -------------------------------------------------------------------- |
| A     | A1-A4 | All 4 show-stoppers fixed — B2B endpoints stop crashing              |
| B     | B1-B3 | Growth/Enterprise tiers, webhook dashboard, persistent rate limiting |
| C     | C1-C2 | Complete API docs, all capabilities on features page                 |
| D     | D1-D3 | 3 viral mechanics from strategy brief                                |
| E     | E1-E3 | Non-TMDB character extraction via transcript analysis                |
| F     | F1-F2 | Any video URL accepted + direct file upload                          |
| G     | G1-G3 | Orchestrated pipeline — submit once, get everything                  |
| H     | H1-H3 | B2B BYOC — connect content libraries, auto-process                   |

**Execution order:** A → B → C → E → F → G → H → D

Rationale: A fixes crashes (prerequisite for everything). B/C polish infrastructure. E/F build the new extraction capability. G orchestrates everything together. H builds on G (auto-submits to orchestrator). D (viral) is independent and lowest priority — can be parallelized.

**Estimated scope:** ~25 new/modified backend files, ~10 new/modified frontend files, 10 locale file updates per localized task.
