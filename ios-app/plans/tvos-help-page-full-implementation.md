# tvOS Help Page — Full Implementation Design

**Date:** 2026-03-15
**Status:** Approved — Ready for Implementation

---

## Understanding Summary

- **What:** Fully functional tvOS Help & Support page with FAQ, Tips, AI Chat, and Video Tutorials
- **Why:** Help page is completely empty/non-functional today
- **Who:** tvOS Bayit+ users navigating via Siri Remote
- **Constraints:** FAQItem stays text-only, VideoTutorial is a new separate model, schema-locked (new collection acceptable), no YouTube, no CMS
- **Non-goals:** Extending FAQItem, YouTube integration, remote thumbnail hosting

---

## Assumptions

1. New MongoDB collection `video_tutorials` is acceptable (new schema, not modifying existing)
2. Existing voice support WebSocket client is available in iOS codebase
3. Nano Banana Pro generates one thumbnail per tutorial (16:9, 2K)
4. Placeholder MP4 URLs point to a public sample video until real videos are produced
5. FAQ/Tip seeding via backend Python seed script (Poetry)
6. Seeded content: 5 tutorials, 6 FAQ items, 3 tips

---

## Decision Log

| Decision                          | Alternatives Considered | Rationale                                     |
| --------------------------------- | ----------------------- | --------------------------------------------- |
| VideoTutorial is a separate model | Extend FAQItem          | FAQItem stays text-only per requirement       |
| Thumbnails bundled in xcassets    | GCS-hosted remote URLs  | Design-time assets, no GCS upload step needed |
| Placeholder MP4 URLs              | Wait for real videos    | System fully functional now, swap URLs later  |
| Voice-primary chat                | Text-only, QR companion | Existing voice infra + natural tvOS UX        |
| Approach A (backend model)        | Fully bundled JSON      | Remote content management for videos/metadata |
| FAQ seeded via script             | CMS, manual entry       | Fastest path, Poetry-managed                  |

---

## Implementation Plan

### Phase 1 — Nano Banana Pro: Generate Thumbnails

Generate 5 tutorial thumbnails (2K, dark cinematic, Bayit+ purple/navy aesthetic):

| Asset Name                 | Prompt                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `tutorial-getting-started` | Dark cinematic Apple TV remote floating over a glowing Bayit+ interface, deep navy background, purple ambient glow, ultra-clean   |
| `tutorial-live-tv`         | Cinematic Israeli cityscape on a large screen in a dark living room, glowing TV light, purple-blue gradient, premium feel         |
| `tutorial-zeh-ani`         | Glowing AI assistant orb with Hebrew text particles floating around it, deep space background, purple and gold tones              |
| `tutorial-profile`         | Abstract glowing user profile card with avatar circle, floating in deep navy space, soft purple highlights                        |
| `tutorial-byoc`            | Multiple streaming service icons orbiting a central glowing hub, dark background, interconnected light beams, purple-blue palette |

Save to: `BayitPlusTVApp/Assets.xcassets/` as individual imagesets.

---

### Phase 2 — Backend

#### 2a. New Beanie Model: `VideoTutorial`

```python
class VideoTutorial(Document):
    title: str
    description: str
    video_url: str
    thumbnail_asset_name: str  # xcassets key
    duration_seconds: int
    order: int
    language: str
    is_published: bool = True

    class Settings:
        name = "video_tutorials"
```

#### 2b. New Endpoint

```
GET /api/v1/support/tutorials?language=<lang>
→ VideoTutorialListResponse { items: [VideoTutorial], total: int }
```

#### 2c. Seed Script

Seed the following into MongoDB:

**Tips (3):**

1. "Get the most out of Live TV" — Use the guide button while watching to see what's on next
2. "Ask Zeh-Ani anything" — Tap the AI button and ask about shows, get recommendations, or get help navigating
3. "Set up family profiles" — Create separate profiles for each family member with their own preferences and watch history

**FAQs (6):**

1. "How do I add a content source?" — Go to Settings → Content Sources → tap Add Source. Supports IPTV, Xtream, Plex, and YouTube
2. "What's included in Bayit+ Premium?" — Live TV, VOD, Radio, Podcasts, Zeh-Ani AI, unlimited profiles, and priority support
3. "How do I set parental controls?" — Go to Profile → Settings → Content Restrictions and set a PIN
4. "Why isn't my stream loading?" — Check your internet connection. Try switching video quality in Settings → Playback
5. "How do I switch profiles?" — Press the Menu button on the home screen and select Switch Profile
6. "What languages are supported?" — Hebrew, English, French, Spanish, Russian, Arabic, and more via Settings → Language

**Tutorials (5):**

```python
[
    VideoTutorial(title="Getting Started", description="A quick tour of everything Bayit+ has to offer",
                  video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                  thumbnail_asset_name="tutorial-getting-started", duration_seconds=150, order=1, language="en"),
    VideoTutorial(title="Watching Live TV", description="Browse channels, use the guide, and set reminders",
                  video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                  thumbnail_asset_name="tutorial-live-tv", duration_seconds=255, order=2, language="en"),
    VideoTutorial(title="Using Zeh-Ani AI", description="Get recommendations, ask questions, and explore content with AI",
                  video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                  thumbnail_asset_name="tutorial-zeh-ani", duration_seconds=180, order=3, language="en"),
    VideoTutorial(title="Setting Up Your Profile", description="Customize your avatar, preferences, and family profiles",
                  video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                  thumbnail_asset_name="tutorial-profile", duration_seconds=200, order=4, language="en"),
    VideoTutorial(title="BYOC & Content Sources", description="Connect IPTV, Xtream, Plex, and YouTube sources",
                  video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
                  thumbnail_asset_name="tutorial-byoc", duration_seconds=240, order=5, language="en"),
]
```

---

### Phase 3 — iOS Models + Repository

#### 3a. New Swift Model (add to `SettingsModels.swift`)

```swift
struct VideoTutorial: Decodable, Sendable, Identifiable {
    let id: String
    let title: String
    let description: String
    let videoUrl: String
    let thumbnailAssetName: String
    let durationSeconds: Int
    let order: Int
}

struct VideoTutorialListResponse: Decodable, Sendable {
    let items: [VideoTutorial]
    let total: Int?
}
```

#### 3b. SettingsRepository

Add to protocol and `APISettingsRepository`:

```swift
func fetchTutorials(language: String) async throws -> VideoTutorialListResponse
```

Implementation: `GET /api/v1/support/tutorials` with `language` query param.

#### 3c. HelpViewModel

Add `private(set) var tutorials: [VideoTutorial] = []`.
Load in parallel with FAQs using `async let`.

---

### Phase 4 — tvOS UI: Tutorials Sheet

Replace `TutorialsSheet` (current accordion list) with Discover-style card grid:

- **Layout:** Horizontal `LazyHStack` of cards, each 16:9 aspect ratio
- **Card:** `Image(tutorial.thumbnailAssetName)` + duration badge (bottom-right overlay) + title + description below
- **Focus:** `tvCardStyle()` scale + glow matching Discover page
- **Tap:** Sets `@State var playingTutorial: VideoTutorial?`
- **Player:** `.fullScreenCover(item: $playingTutorial)` → `AVPlayerView(url:)` wrapping `AVPlayerViewController` via `UIViewControllerRepresentable`
- **Dismiss:** `onExitCommand { playingTutorial = nil }` (Menu button)
- **Duration formatting:** `1:30` from `durationSeconds`

---

### Phase 5 — tvOS UI: Chat with AI Sheet

New `TVHelpChatView` full-screen sheet:

**Layout:**

- Top: `TVProfileSheetHeader` (title: "Chat with AI", dismiss button)
- Middle: `ScrollView` of `ChatMessage` bubbles (assistant left, user right)
- Bottom: input bar — `[🎤 Hold to Speak]` + `[⌨️ Type]` buttons

**State model:**

```swift
struct ChatMessage: Identifiable {
    let id: UUID
    let role: ChatRole   // .user | .assistant
    let text: String
    var isStreaming: Bool
}
```

**Voice path:** Hold-to-speak button → `AVAudioSession` → existing `VoiceSupportWebSocketClient` → WS `/api/v1/support/voice` → TTS audio played + transcript added to messages

**Text path:** "Type" button → tvOS system keyboard → `POST /api/v1/support/chat/stream` SSE → response streamed token-by-token into last message's `text`

**HelpSupportView wiring:** `onChatWithAI` closure → `showingChat = true` → `.fullScreenCover(isPresented: $showingChat) { TVHelpChatView(...) }`

---

### Phase 6 — Localization

Add to all 10 locale files under `settings.help`:

- `"chatTitle"` — "Chat with AI"
- `"holdToSpeak"` — "Hold to Speak"
- `"typeMessage"` — "Type a message"
- `"tutorialsEmpty"` — shown if tutorials list is empty

---

## File Touch List

**Backend:**

- `app/models/video_tutorial.py` — new Beanie document
- `app/schemas/support.py` — add `VideoTutorialSchema`, `VideoTutorialListResponse`
- `app/api/routes/support.py` — add `GET /tutorials` endpoint
- `scripts/seed_help_content.py` — new seed script

**iOS:**

- `BayitPlusApp/Models/SettingsModels.swift` — add `VideoTutorial`, `VideoTutorialListResponse`
- `BayitPlusApp/Repositories/SettingsRepository.swift` — add `fetchTutorials`
- `BayitPlusApp/Repositories/SettingsRepository+Support.swift` — implement `fetchTutorials`
- `BayitPlusApp/ViewModels/HelpViewModel.swift` — add tutorials loading

**tvOS:**

- `BayitPlusTVApp/Views/Settings/TVHelpSupportView.swift` — replace TutorialsSheet, add TVHelpChatView
- `BayitPlusTVApp/Assets.xcassets/` — 5 new tutorial thumbnail imagesets

**Localization:**

- `packages/ui/bayit-i18n/locales/*.json` — 4 new keys × 10 languages
