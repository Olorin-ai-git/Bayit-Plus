# BYOC Plex AI Features — Design Spec

## Overview

Three interconnected changes to BYOC Plex in the Bayit+ iOS app:

1. Fix player routing — route BYOC Plex content to in-app PlayerView instead of Safari
2. Movie details AI info sheet — sparkles button opens Glass sheet listing all 7 VOD AI features with credit info
3. Player AI panel — GlassAIFeaturesPanel-style carousel for VOD features in the player
4. Credit confirmation flow — confirmation sheet before deduction, dedup via backend + local cache

## Part 1: Player Routing Fix

**Current flow:** BYOCDetailActions -> UIApplication.shared.open(streamURL) -> Safari

**New flow:** BYOCDetailActions -> coordinator.presentFullscreen(.player(content)) -> in-app PlayerView

**New component: BYOCContentAdapter** (in BayitBYOC package)

- Method: `func toPlayerContent(_ item: BYOCContentItem, enrichment: BYOCEnrichment?) -> PlayerContent`
- Maps: title, description, thumbnail, stream URL, duration, subtitle tracks (from enrichment), content type (.movie or .episode)
- Sets contentSource: .byoc flag for analytics/credit tracking

**Changes to BYOCDetailActions:**

- Remove UIApplication.shared.open() call
- Inject coordinator (same pattern as native MovieDetailActions)
- Play button calls coordinator.presentFullscreen(.player(adaptedContent))

## Part 2: AI Info Sheet in Movie Details

**Replace existing AI badges** in BYOCDetailActions with a single sparkles button.

**Sparkles Button:**

- Glass-styled circular button with `sparkles` SF Symbol
- Subtle pulse animation
- Tapping opens BYOCAIFeaturesSheet

**BYOCAIFeaturesSheet:**

- Glass modal sheet (.presentationDetents([.medium, .large]))
- Header: "AI Features" title + sparkles icon
- 7 rows, each:
  - Left: SF Symbol icon
  - Center: Feature name (localized) + one-line description (localized)
  - Right: "1 credit" pill badge
- Credits == 0 (free user): All rows dimmed + "Upgrade to unlock AI options" CTA -> subscription screen
- Plus users: Rows show "Included" label instead of "1 credit" pill

**Feature-to-icon mapping:**

| Feature               | SF Symbol                             |
| --------------------- | ------------------------------------- |
| Pause and Ask         | bubble.left.and.text.bubble.right     |
| Interactive Subtitles | captions.bubble.fill                  |
| Vocabulary            | character.book.closed                 |
| VOD Moments           | sparkles.rectangle.stack              |
| Cultural Context      | globe                                 |
| Bilingual Bridge      | rectangle.split.2x1                   |
| AI Companion          | person.crop.circle.badge.questionmark |

## Part 3: Player AI Panel for BYOC Content

**Adapt GlassAIFeaturesPanel** to support both Live TV and VOD feature sets via AIFeaturePanelConfig.

**AIFeaturePanelConfig enum:**

- .liveTV: existing 5 buttons
- .vod: 7 VOD buttons

**VOD carousel buttons:**

1. Pause and Ask -> toggles showPauseAskOverlay
2. Interactive Subtitles -> toggles subtitle mode
3. Vocabulary -> opens subtitle picker
4. VOD Moments -> toggles interactionVM activation
5. Cultural Context -> toggles culturalContextVM
6. Bilingual Bridge -> toggles splitModeEnabled
7. AI Companion -> toggles showAICompanion

**Visibility logic:**

- Plus user: Panel always visible, features activate immediately
- Free user with credits > 0: Panel visible, tap triggers confirmation sheet
- Free user with credits == 0: Panel hidden entirely

**Wiring:** PlayerView+AIControls.swift checks contentSource. If .byoc, pass .vod config to GlassAIFeaturesPanel.

## Part 4: Credit Confirmation and Deduplication

**AIFeatureCreditConfirmSheet:**

- Glass modal sheet (.presentationDetents([.height(280)]))
- Feature icon + name + one-line description
- Credit info: current balance, cost (1 credit), remaining after deduction
- Confirm (primary) / Cancel (secondary) buttons
- On confirm: deduction API -> CreditToastView -> activate feature

**Deduplication — Backend:**

- Extend POST /api/v1/beta/credits/deduct to accept feature_id and content_id
- Check user_id + content_id + feature_id existence
- If exists: return already_unlocked: true, no deduction
- If new: deduct, create usage record, return already_unlocked: false

**Deduplication — Local Cache (VODAIUsageCache):**

- In-memory Set<String> keyed by "{contentId}\_{featureId}"
- Populated on player load by querying backend
- Cache hit: skip confirmation, activate immediately
- Per-session cache, backend is source of truth

**Activation flow:**

1. User taps feature in carousel
2. Check local cache -> if unlocked, activate immediately
3. If not cached, check if Plus -> activate immediately
4. If free user -> show confirmation sheet
5. On confirm -> call deduct API -> backend dedup -> toast -> activate -> cache

## Decision Log

| #   | Decision                                    | Alternatives                   | Rationale                            |
| --- | ------------------------------------------- | ------------------------------ | ------------------------------------ |
| 1   | Use existing PlayerView for BYOC Plex       | Lighter player, WebView        | Full feature parity, no duplication  |
| 2   | Adapter pattern (BYOCContentAdapter)        | PlayerView BYOC-aware, wrapper | Keeps PlayerView unchanged           |
| 3   | Info sheet: icon + name + desc + "1 credit" | Minimal, rich with previews    | Good density without bloat           |
| 4   | Replace AI badges with sparkles button      | Keep badges + add button       | Cleaner, badges were non-interactive |
| 5   | All 7 VOD features equally, no grouping     | Only 3, or grouped             | All functional, equal presentation   |
| 6   | GlassAIFeaturesPanel made configurable      | Separate VOD panel             | Reuse existing Glass patterns        |
| 7   | Plus users skip confirmation                | Show "Included" confirmation   | Less friction for paying users       |
| 8   | Backend + local cache for dedup             | Backend only, local only       | Authoritative + low latency          |
| 9   | Confirmation shows post-deduction balance   | Simple alert                   | Transparency with credit-gated users |
| 10  | Upgrade goes to subscription screen         | Credits purchase, App Store    | Reuse existing infrastructure        |

## Files to Create

- BYOCContentAdapter.swift (BayitBYOC package)
- BYOCAIFeaturesSheet.swift (BayitPlusApp/Views/BYOC/)
- AIFeatureCreditConfirmSheet.swift (BayitPlusApp/Views/BYOC/)
- AIFeaturePanelConfig.swift (BayitPlusApp/Views/Player/)
- VODAIUsageCache.swift (BayitPlusApp/Repositories/)

## Files to Modify

- BYOCDetailActions.swift — replace badges with sparkles button, route to PlayerView
- GlassAIFeaturesPanel.swift — accept AIFeaturePanelConfig
- GlassAIFeaturesPanel+Controls.swift — add VOD feature buttons
- PlayerView+AIControls.swift — check contentSource, pass config
- BetaCreditsRepository.swift — add feature_id/content_id to deduction
- Backend: app/api/subscription.py or credits endpoint — dedup logic
