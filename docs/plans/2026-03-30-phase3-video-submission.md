# Phase 3: Video Submission Page on Bayit+ Web App

**Date:** 2026-03-30
**Status:** Pending Approval
**Parent:** olorin-portals/docs/plans/2026-03-30-olorin-separation-of-concerns.md

## Goal

Add a video submission page to bayit.tv so authenticated users can paste a video URL, have characters extracted, and interact with them via Pause & Ask.

## Changes

### 1. Backend: Authenticated Submit Endpoint

**New file:** `backend/app/api/routes/consumer_submit_auth.py`

Three endpoints:

- `POST /consumer/submit-url` — authenticated, derives tier/priority from `user.olorin_tier`
- `GET /consumer/submissions` — list current user's submissions
- `GET /consumer/submissions/{job_id}` — status of a specific submission (scoped to user)

Auth: `get_current_active_user` dependency (RS256 Bearer token).

Tier-based behavior (reuses existing `priority_utils`):

- free: priority 10, queued (Cloud Scheduler processes)
- fan: priority 5, immediate background processing
- superfan: priority 3, immediate background processing

Per-user submission limits (config-driven):

- free: 3 lifetime
- fan: 10/month
- superfan: 50/month

**Model change:** Add `user_id: Optional[str] = None` to `ConsumerSubmission`. Not a DDL change — just a new optional field on MongoDB documents. Add to indexes list.

**Service change:** Add `submit_url_for_user()` and `get_user_submissions()` methods to `ConsumerSubmissionService`. Queries by `user_id` instead of `fingerprint`.

**Config:** Add `CONSUMER_SUBMIT_LIMIT_FREE`, `CONSUMER_SUBMIT_LIMIT_FAN`, `CONSUMER_SUBMIT_LIMIT_SUPERFAN` to Settings.

**Rate limits:** Add `consumer_submit` (3/minute) and `consumer_submissions_list` (30/minute).

**Router registry:** Register new router with tag `consumer`.

### 2. Shared: Submission API Service

**New file:** `shared/services/api/submissionServices.ts`

```typescript
export const submissionService = {
  submitUrl: (url: string) => api.post("/consumer/submit-url", { url }),
  listSubmissions: () => api.get("/consumer/submissions"),
  getStatus: (jobId: string) => api.get(`/consumer/submissions/${jobId}`),
};
```

No store needed — page-local state with polling via `setInterval`.

### 3. Web: SubmitVideoPage

**New file:** `web/src/pages/SubmitVideoPage.tsx`

Three states:

1. **Input** — GlassInput for URL + GlassButton submit. Validation: URL format, supported platforms (YouTube/Vimeo/Dailymotion).
2. **Processing** — GlassProgressBar + status text. Polls `GET /consumer/submissions/{jobId}` every 3s.
3. **Ready** — Shows video title, character count, character avatars (GlassAvatar). GlassButton "Start Conversation" links to existing Pause & Ask on `/watch/{contentId}`.

Below the form: list of past submissions (from `GET /consumer/submissions`), each showing title/status/date with link to interact if ready.

**Route:** Add to authenticated main routes in `App.tsx`: `<Route path="/submit" element={<SubmitVideoPage />} />`

### 4. Localization

Add `submit.*` keys to all 10 locale files in `web/src/i18n/locales/`.

Keys needed (~15):

- submit.title, submit.description
- submit.urlLabel, submit.urlPlaceholder, submit.urlError
- submit.submitButton, submit.submitting
- submit.processing, submit.extracting, submit.ready, submit.failed
- submit.characterCount, submit.startConversation
- submit.pastSubmissions, submit.noSubmissions

## What We Reuse

- `ConsumerSubmission` model (add user_id field)
- `ConsumerSubmissionService.run_extraction()` pipeline (title -> TMDB -> characters)
- `priority_utils.tier_to_priority()` and `should_process_immediately()`
- `get_current_active_user` auth dependency
- Glass components (GlassInput, GlassButton, GlassCard, GlassAvatar, GlassProgressBar, GlassPageHeader)
- `api` client (auto-attaches Bearer token)
- Existing Pause & Ask interaction at `/watch/{contentId}`

## What We Don't Touch

- Existing demo submit endpoint (`/demo/submit-url`) — stays for demo portal
- Existing BYOC page — different feature (external content sources, not URL submission)
- Backend `submission_processor.py` — already handles priority-based processing
- iOS/Android/tvOS apps — web-only for now

## File Count

- 3 new files (backend route, shared service, web page)
- 4 modified files (model, service, config, router_registry, App.tsx, rate_limiter)
- 10 modified locale files
