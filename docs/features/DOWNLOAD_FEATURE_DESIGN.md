# Bayit+ Download Feature — Full Platform Parity Design

**Date:** 2026-03-14
**Status:** Approved — ready for implementation
**Scope:** iOS, Android, Web, Backend

---

## 1. Overview

Full offline download and playback capability across all Bayit+ platforms. Users with `owner=true` can download video and audio content for offline playback within the Bayit+ app. All platforms share the same backend registry API while managing downloads locally on-device.

### Architecture: Client-First with Backend Registry

- Clients download files directly from stream/MP4 URLs
- Clients report status to backend (start, pause, resume, complete, delete)
- Backend stores metadata only — never serves files
- Offline playback is 100% local per device

---

## 2. Downloadable Content Types

| Content Type | Downloadable           | Format                          |
| ------------ | ---------------------- | ------------------------------- |
| movie        | Yes                    | HLS (iOS/Android), MP4 (Web)    |
| episode      | Yes                    | HLS (iOS/Android), MP4 (Web)    |
| podcast      | Yes                    | MP4/MP3 audio                   |
| audiobook    | Yes                    | MP4/MP3 audio                   |
| collection   | Yes (all items queued) | Per-item format above           |
| radio        | No                     | Live stream                     |
| live_tv      | No                     | Live stream                     |
| live         | No                     | Live stream                     |
| byoc         | No                     | External source, not controlled |

---

## 3. Backend API

### Existing Endpoints (modify)

| Method | Endpoint                        | Changes                                                           |
| ------ | ------------------------------- | ----------------------------------------------------------------- |
| GET    | `/downloads`                    | Add `owner=true` filter                                           |
| POST   | `/downloads`                    | Accept expanded content types: movie, episode, podcast, audiobook |
| DELETE | `/downloads/{download_id}`      | No changes (also serves as cancel)                                |
| GET    | `/downloads/check/{content_id}` | No changes                                                        |

### New Endpoints

| Method | Endpoint                          | Purpose                                        |
| ------ | --------------------------------- | ---------------------------------------------- |
| PATCH  | `/downloads/{download_id}/pause`  | Set status to `paused`                         |
| PATCH  | `/downloads/{download_id}/resume` | Set status to `downloading`                    |
| POST   | `/downloads/batch`                | Register multiple downloads (collection queue) |
| GET    | `/downloads/stats`                | Return total count, total size                 |

### Download Model Updates

Expand `content_type` enum: `movie`, `episode`, `podcast`, `audiobook` (replace or extend existing `vod` / `podcast_episode`).

---

## 4. Download Flow

### Initiation

```
User taps Download (content detail, collection, or player screen)
    -> Check owner=true (button hidden if not)
    -> Check network (WiFi required unless cellular toggle enabled)
    -> Check storage (warn if above 5 GB threshold, block if < 500 MB free)
    -> POST /downloads (or POST /downloads/batch for collections)
    -> Enter local download queue (max 3 concurrent)
```

### Execution (per platform)

```
iOS:   AVAssetDownloadURLSession (HLS -> .movpkg) or URLSession (MP4)
Android: OkHttp streaming (MP4 to filesDir/BayitDownloads/)
Web:   fetch() with ReadableStream -> IndexedDB as ArrayBuffer
```

### Completion

```
Download finishes
    -> Save file locally
    -> Update local state to completed
    -> PATCH /downloads/{id} status=completed
```

### Pause/Cancel

```
Pause:
    -> Suspend active download task
    -> PATCH /downloads/{id}/pause
    -> Show "Paused" in UI

Cancel:
    -> Abort download task
    -> Delete partial file from local storage
    -> DELETE /downloads/{id}
```

### Collection Flow

```
User taps "Download All" on collection
    -> POST /downloads/batch with all content IDs
    -> All items enter local queue
    -> Concurrency limit (3) handles pacing
    -> Each item follows individual flow above
```

---

## 5. Offline Playback

### Playback Priority

```
User taps Play
    -> Check local downloads for matching content_id
    -> If downloaded + completed: play from local file
    -> Else: stream from network URL
```

### Platform-Specific Playback

- **iOS**: AVPlayer with local .movpkg (HLS) or file:// MP4 path
- **Android**: ProgressiveMediaSource with file:// URI
- **Web**: Blob URL created from IndexedDB stored MP4 -> <video> element

### Offline App Launch

```
App launches
    -> Check network connectivity
    -> If offline: navigate directly to Downloads tab
    -> If online: normal app launch
```

### Visual Indicators

- Downloaded content: checkmark badge on content card
- Downloading: progress indicator on content card

---

## 6. Downloads Tab UI

### Visibility

Downloads tab shown in navigation **only when `owner=true`**.

### Empty State

- Message: "No downloads yet"
- CTA button: "Browse VOD" -> navigates to VOD/discover page
- Localized across all 10 languages

### Active Downloads Section

- Sorted by queue order
- Row: thumbnail, title, progress bar, percentage, pause/cancel buttons
- Tapping a downloading item: no action (not playable yet)

### Completed Downloads Section

- Sorted by most recently downloaded
- Row: thumbnail, title, file size, downloaded badge
- Tap: plays from local file
- Swipe left to delete (iOS/Android native gesture, web: swipe or delete icon button)

### Failed Downloads Section

- Row: thumbnail, title, error indicator, retry button
- Shown after 3 auto-retries exhausted

### Storage Bar

- Fixed position in Downloads tab
- Shows: "X.X GB used" with visual bar
- Amber warning state when above 5 GB
- Web: uses navigator.storage.estimate() for browser-aware limits

### Layout

| Platform | Component                                 |
| -------- | ----------------------------------------- |
| iOS      | List with swipe actions                   |
| Android  | LazyColumn with SwipeToDismiss            |
| Web      | Responsive grid with swipe or icon button |

---

## 7. Settings

### User-Facing (Preferences Screen)

| Setting                  | Options           | Default         |
| ------------------------ | ----------------- | --------------- |
| Download quality         | SD / HD / Full HD | HD              |
| Allow cellular downloads | On / Off          | Off (WiFi only) |

### Config-Driven (Not User-Facing)

| Config                           | Value              |
| -------------------------------- | ------------------ |
| Max concurrent downloads         | 3                  |
| Auto-retry limit                 | 3                  |
| Storage warning threshold        | 5 GB               |
| Auto-downgrade storage threshold | < 1 GB remaining   |
| Block download threshold         | < 500 MB remaining |

### Auto-Downgrade Logic

```
Before starting download:
    -> If < 1 GB device storage: downgrade FHD -> HD -> SD
    -> If < 500 MB: block download, show "Not enough storage"
```

### File Size Estimates (Shown Before Download)

| Quality | Video (per hour) | Audio (per hour) |
| ------- | ---------------- | ---------------- |
| SD      | ~500 MB          | ~30 MB           |
| HD      | ~1.5 GB          | ~60 MB           |
| FHD     | ~3 GB            | N/A              |

---

## 8. Web-Specific Implementation

### Storage

- IndexedDB database: `bayit-downloads-db`
- Object store `files`: binary data (ArrayBuffer), keyed by content_id
- Object store `metadata`: download state, progress, file size

### Download Engine

```
fetch(mp4Url, { signal: abortController.signal })
    -> Read response via ReadableStream for progress tracking
    -> Store completed ArrayBuffer in IndexedDB
    -> On playback: create blob URL -> <video> element
```

### Pause/Resume

- Pause: AbortController.abort() + store bytes downloaded
- Resume: Range header request from last byte position
- Cancel: abort + delete from IndexedDB

### Browser Limits

| Browser | Storage Limit                   |
| ------- | ------------------------------- |
| Chrome  | ~60% of disk                    |
| Firefox | ~50% of disk                    |
| Safari  | 1 GB default (prompts for more) |

- Use navigator.storage.estimate() for quota-aware warnings
- Safari: show specific warning suggesting Chrome for more downloads
- Incognito/private mode: disable downloads, show explanation

### Cellular Toggle

Not applicable on web — browsers don't reliably expose network type.

---

## 9. Error Handling

### Download Errors

| Scenario                     | Behavior                                                         |
| ---------------------------- | ---------------------------------------------------------------- |
| Network drops mid-download   | Pause, auto-retry on reconnect (counts toward 3 retries)         |
| App killed during download   | On next launch, detect incomplete, resume via Range header       |
| Disk full                    | Block download, show "Not enough storage", suggest deleting      |
| Stream URL expired           | Fetch fresh URL from content API, restart (not counted as retry) |
| Content removed from catalog | Mark "Content unavailable", keep file, show notice               |
| 403/401 from stream URL      | Surface auth error, do NOT auto-retry                            |

### Playback Edge Cases

| Scenario                        | Behavior                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| Corrupted downloaded file       | Detect on playback failure, delete file, fall back to streaming, offer re-download |
| Downloaded file exists + online | Still prefer local file (saves bandwidth, faster start)                            |
| Delete download while playing   | Finish current session, switch to streaming if still active                        |
| Tap partial download            | Show "Download in progress" toast                                                  |

### Owner Status Changes

| Scenario                  | Behavior                                     |
| ------------------------- | -------------------------------------------- |
| User loses owner status   | Hide Downloads tab, do NOT delete files      |
| User regains owner status | Tab reappears, all previous downloads intact |

### Web-Specific

| Scenario                 | Behavior                                         |
| ------------------------ | ------------------------------------------------ |
| Browser clears IndexedDB | Reconcile on load, mark missing files as deleted |
| Safari 1 GB quota hit    | Browser-specific warning with suggestion         |
| Incognito mode           | Disable downloads, show explanation              |

---

## 10. Platform Parity Work Summary

### iOS — Minor Gaps

- [x] Download engine
- [x] HLS offline playback
- [x] Local playback priority
- [x] Download progress UI
- [x] Swipe to delete
- [ ] Pause support (cancel exists)
- [ ] Owner-only Downloads tab visibility
- [ ] Empty state -> VOD navigation
- [ ] Offline -> auto-route to Downloads tab
- [ ] Quality setting in preferences
- [ ] Cellular toggle in preferences
- [ ] Storage warning (5 GB threshold)
- [ ] Collection batch download ("Download All")
- [ ] Auto-retry (3x) logic
- [ ] File size estimate display before download

### Android — Similar to iOS

- [x] Download engine
- [x] MP4 offline playback
- [x] Local playback priority
- [x] Download progress UI
- [ ] Pause support
- [ ] Swipe to delete (verify SwipeToDismiss)
- [ ] Owner-only Downloads tab visibility
- [ ] Empty state -> VOD navigation
- [ ] Offline -> auto-route to Downloads tab
- [ ] Quality setting in preferences
- [ ] Cellular toggle in preferences
- [ ] Storage warning (5 GB threshold)
- [ ] Collection batch download ("Download All")
- [ ] Auto-retry (3x) logic
- [ ] File size estimate display before download

### Web — Most Work

- [ ] Download engine (IndexedDB + fetch streaming)
- [ ] MP4 offline playback (blob URL -> video)
- [ ] Local playback priority (check IndexedDB first)
- [ ] Real download progress (currently server-tracked only)
- [ ] Pause/cancel (AbortController + Range resume)
- [ ] Swipe to delete or delete button
- [ ] Owner-only Downloads tab visibility
- [ ] Empty state -> VOD navigation
- [ ] Offline -> auto-route to Downloads tab
- [ ] Quality setting in preferences
- [ ] Storage warning (navigator.storage.estimate)
- [ ] Collection batch download
- [ ] Auto-retry (3x) logic
- [ ] File size estimate display

### Backend

- [ ] Expand content_type enum
- [ ] PATCH /downloads/{id}/pause endpoint
- [ ] PATCH /downloads/{id}/resume endpoint
- [ ] POST /downloads/batch endpoint
- [ ] GET /downloads/stats endpoint
- [ ] Owner filter on GET /downloads

---

## 11. Decision Log

| #   | Decision                                         | Alternatives Considered                   | Rationale                                                    |
| --- | ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| 1   | Downloadable: movie, episode, podcast, audiobook | Include BYOC, include radio recordings    | BYOC: legal/technical issues. Live: can't download by nature |
| 2   | Collections download all items as queue          | Individual only, user picks items         | "Download All" means all. Concurrency limit handles pacing   |
| 3   | Global quality setting + auto-downgrade          | Per-download picker, auto-only            | Simpler UX, auto-downgrade handles storage edge case         |
| 4   | WiFi-only default with cellular toggle           | Always allow, WiFi-only no override       | Standard pattern, protects users, respects power users       |
| 5   | No expiry, user deletes manually                 | 30-day, subscription-tied                 | Owner-only or free content — no reason to expire             |
| 6   | Fixed 5 GB storage warning                       | Configurable, no warning                  | Simple, prevents disk-full surprise                          |
| 7   | Auto-route to Downloads when offline             | Banner only, explicit toggle              | Prioritizes what user can actually use                       |
| 8   | 3 concurrent downloads                           | 1 sequential, unlimited                   | Balance speed vs device resources                            |
| 9   | Auto-retry 3x then manual                        | No retry, unlimited, notify immediately   | Handles transient failures, doesn't loop forever             |
| 10  | Client-first + backend registry                  | Backend-orchestrated, client + cloud sync | Builds on existing architecture, minimal backend changes     |
| 11  | Web uses MP4 only                                | HLS offline on web                        | HLS offline web is fragile. MP4 reliable across browsers     |
| 12  | Owner-only visibility                            | Show to all, subscription-gated           | Owner flag is access control. Non-owners see nothing         |
| 13  | Swipe-to-delete                                  | Long-press, dedicated button              | Native gesture iOS/Android. Web fallback to button           |
| 14  | Keep files when owner status lost                | Delete, lock files                        | User may regain status. Deleting is destructive              |
| 15  | Safari quota warning with browser suggestion     | Silently fail, block all web              | Transparent about limitation, actionable alternative         |
