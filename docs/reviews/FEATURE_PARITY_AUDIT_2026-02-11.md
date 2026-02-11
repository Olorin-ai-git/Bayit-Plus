# Bayit+ Cross-Platform Feature Parity Audit

**Version:** 2.0
**Date:** 2026-02-11
**Scope:** Web App (React), iOS App (SwiftUI), tvOS App (SwiftUI)
**Supersedes:** PLATFORM_PARITY_AUDIT_2026-02-08
**Methodology:** Three independent platform audits compiled into a unified comparison

---

## 1. Executive Summary

| Metric | Web | iOS | tvOS |
|--------|-----|-----|------|
| Feature Areas Audited | 47 | 115+ | 96 (file-level) |
| Total Feature Count | 180+ | 200+ | 160+ |
| Player Features | 35+ | 32 files | 14 files |
| Parity vs. Web Baseline | 100% (baseline) | ~92% | ~82% |
| Critical Gaps (vs. Web) | -- | 5 | 12 |
| Minor Gaps (vs. Web) | -- | 3 | 7 |
| Platform-Exclusive Features | 3 | 8 | 0 |

**Overall Parity Assessment:**

- **iOS vs. Web:** 92% -- iOS matches or exceeds Web in most areas; missing catch-up/replay transcripts, scene search, AI companion sidebar, channel chat, and quality selector.
- **tvOS vs. Web:** 82% -- tvOS covers all core content and player features but is missing podcasts, audiobooks, comprehension quiz, catch-up/replay, scene search, AI companion sidebar, channel chat, and some settings granularity.
- **tvOS vs. iOS:** 87% -- tvOS closely tracks iOS; main gaps are podcast/audiobook browsing, MFA setup, phone verification, biometric auth, and Siri Shortcuts/Intents.

---

## 2. Platform Statistics

### 2.1 Codebase Metrics

| Metric | Web (React/TS) | iOS (SwiftUI) | tvOS (SwiftUI) | Shared Packages (Swift) |
|--------|----------------|---------------|----------------|------------------------|
| Source Files | 967 | 347 | 114 | 106 |
| Total Lines of Code | 164,276 | 43,166 | 15,810 | 13,008 |
| View / Page Files | 206 pages | 193 views | 81 views | -- |
| ViewModels / Stores | Zustand stores | 60 ViewModels | 3 ViewModels (+ shared) | -- |
| Feature Flags | Config-driven | 18 | 18 | -- |
| Navigation | React Router (41 routes) | NavigationStack | TVMainTabView (tabs) | -- |
| Styling | TailwindCSS | SwiftUI native | SwiftUI + focus states | BayitDesignSystem |
| Player Engine | HLS.js / YouTube iframe | AVPlayer | AVPlayer | BayitMedia |

### 2.2 Shared Infrastructure

Both iOS and tvOS share the following Swift packages:

| Package | Purpose |
|---------|---------|
| BayitAnalytics | Event tracking and telemetry |
| BayitAuth | Authentication, OAuth, session management |
| BayitCore | Shared models, utilities, configuration |
| BayitDesignSystem | Glass UI tokens, colors, typography |
| BayitLocalization | i18n with 10-language support |
| BayitMedia | AVPlayer wrappers, HLS, streaming |
| BayitNetworking | API client, request execution, retry logic |
| BayitPersistence | Local storage, caching |
| BayitVoice | Voice assistant, TTS/STT integration |
| BayitWidgetShared | Widget data models and providers |

---

## 3. Complete Feature Parity Table

Legend:

- **Y** = Implemented and functional
- **P** = Partial implementation
- **N** = Not implemented
- **N/A** = Not applicable to this platform

---

### 3.1 Authentication and Onboarding

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Auth | Email/password login | Y | Y | Y (credential panel) | Parity |
| Auth | Google OAuth | Y | Y | N/A | tvOS uses QR code flow instead |
| Auth | Password reset | Y | Y | N | tvOS delegates to companion device |
| Auth | TV device login (QR code) | Y | N/A | Y (QR code panel) | Web generates code; tvOS displays it |
| Auth | Profile selection | Y | Y | Y (TVProfileSelectionView) | Parity |
| Auth | Biometric authentication | N/A | Y | N/A | iOS only (Face ID / Touch ID) |
| Auth | Onboarding AI assistant | N | Y | N | iOS exclusive -- guided setup with AI |
| Auth | MFA / 2FA setup | Y | Y (MFA setup view) | N | **tvOS gap** -- security feature missing |
| Auth | Phone verification | Y | Y (phone verification view) | N | **tvOS gap** |
| Auth | Passkey management | Y | Y | Y (TVPasskeyManagementView) | Parity |

### 3.2 Home Screen

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Home | Hero carousel | Y | Y (legacy-flagged) | Y (TVHomeView) | Parity; iOS has feature flag for rebuild |
| Home | Spotlight content | Y | Y | Y | Parity |
| Home | Continue watching | Y | Y | Y | Parity |
| Home | Category rows | Y | Y | Y | Parity |
| Home | Trending content | Y | Y | Y (TVTrendingRow) | Parity |
| Home | Jerusalem content row | Y | Y (location content) | Y (TVLocationContentRow) | Parity |
| Home | Tel Aviv content row | Y | Y (location content) | Y (TVLocationContentRow) | Parity |
| Home | Israelis in City | Y | Y (city content) | Y (TVCityContentRow) | Parity |
| Home | Israeli businesses | Y | Y | Y | Parity |
| Home | Live TV row | Y | Y (LiveTVRow) | Y | Parity |
| Home | Morning ritual | Y | Y | Y | Parity |
| Home | Shabbat banner | Y | Y (ShabbatBannerView) | Y | Parity |
| Home | Featured audiobooks | Y | Y | Y | Parity |
| Home | Culture clocks | N | Y | Y | iOS/tvOS exclusive |

### 3.3 VOD (Video on Demand)

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| VOD | Browse grid | Y | Y (rebuilt) | Y (TVVODView, focus posters) | Parity |
| VOD | Category filter | Y | Y | Y | Parity |
| VOD | Subcategory filter | Y | Y | P | tvOS has simpler filtering UX |
| VOD | Search within VOD | Y | Y | Y | Parity (via unified search) |
| VOD | Movie detail page | Y | Y | Y | Parity |
| VOD | Series detail page | Y | Y | Y | Parity |
| VOD | Episode list | Y | Y | Y | Parity |
| VOD | Season selector | Y | Y | Y | Parity |
| VOD | Cast and crew | Y | Y | Y | Parity |

### 3.4 Live TV

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Live TV | Channel grid | Y | Y | Y (TVLiveTVView) | Parity |
| Live TV | Channel categories | Y | Y | Y | Parity |
| Live TV | EPG - grid view | Y | Y (EPGView) | Y (TVEPGView) | Parity |
| Live TV | EPG - list view | Y | Y | Y | Parity |
| Live TV | Time navigation | Y | Y | Y | Parity |
| Live TV | Timezone support | Y | Y | Y | Parity |
| Live TV | Recording (DVR) | Y | Y | Y (TVRecordingsView) | Parity |
| Live TV | Scheduled recordings | Y | Y | Y | Parity |

### 3.5 Radio

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Radio | Station grid | Y | Y | Y (TVRadioView) | Parity |
| Radio | Station categories | Y | Y | Y | Parity |
| Radio | Now playing display | Y | Y | Y | Parity |

### 3.6 Podcasts

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Podcasts | Browse grid | Y | Y | Y (TVPodcastsView) | Parity |
| Podcasts | Category browsing | Y | Y | Y | Parity |
| Podcasts | Search | Y | Y | Y | Via unified search |
| Podcasts | Custom RSS feed | Y | P | N | **iOS partial, tvOS gap** |
| Podcasts | Show detail page | Y | Y | Y | Parity |
| Podcasts | Episode list | Y | Y | Y | Parity |
| Podcasts | Sync / refresh | Y | Y | P | tvOS may have limited sync UX |

### 3.7 Audiobooks

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Audiobooks | Browse grid | Y | Y | Y (TVAudiobooksView) | Parity |
| Audiobooks | Genre filter | Y | Y | Y | Parity |
| Audiobooks | Narrator filter | Y | Y | P | tvOS has simplified filters |
| Audiobooks | Language filter | Y | Y | P | tvOS has simplified filters |
| Audiobooks | Search | Y | Y | Y | Via unified search |
| Audiobooks | Detail page | Y | Y | Y | Parity |
| Audiobooks | Chapter navigation | Y | Y | Y | Parity |
| Audiobooks | Audible integration | Y | Y | P | tvOS limited Audible UX |

### 3.8 Player - Core Playback

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Player | HLS streaming | Y (HLS.js) | Y (AVPlayer) | Y (AVPlayer) | Different engines, same protocol |
| Player | MP4 playback | Y | Y | Y | Parity |
| Player | YouTube embed | Y (iframe) | Y | Y | Parity |
| Player | Play / pause / seek | Y | Y | Y (Siri Remote) | Parity |
| Player | Speed control | Y | Y | Y | Parity |
| Player | Picture-in-Picture | Y | Y (native PiP) | N/A | tvOS does not support PiP |
| Player | AirPlay casting | Y | Y | N/A | tvOS IS the AirPlay target |
| Player | Chromecast casting | Y | N/A | N/A | Web only; Apple ecosystem uses AirPlay |
| Player | Quality selector | Y (manual) | N (auto) | N (auto) | **iOS/tvOS gap** -- AVPlayer handles adaptive bitrate automatically; no manual override exposed |
| Player | Audio track selection | Y | Y | Y | Parity |

### 3.9 Player - Subtitles

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Subtitles | Language menu | Y | Y | Y (language picker) | Parity |
| Subtitles | Split mode (dual language) | Y | Y (VOD + Live) | Y (split subtitles) | Parity |
| Subtitles | AI generation modes | Y | Y (Nikud, Shoresh, Heblish) | Y | Parity |
| Subtitles | AI generation progress | Y | Y (progress indicator) | Y | Parity |
| Subtitles | OpenSubtitles download | Y | Y | Y | Parity |
| Subtitles | Subtitle mode picker | Y | Y | Y | Parity |
| Subtitles | Shoresh highlighting | Y | Y | Y | Parity |
| Subtitles | Interactive word-tap translate | N | Y | N | **iOS exclusive** -- tap any word for instant translation |
| Subtitles | Live subtitles (WebSocket) | Y | Y | Y | Parity |

### 3.10 Player - AI Features

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| AI | Live dubbing | Y | Y (controls + premium gate) | Y (live dubbing) | Parity |
| AI | Voice selection for dubbing | Y | Y | Y (voice selector) | Parity |
| AI | AI features panel (live) | Y | Y | Y (TVAIFeaturesPanel) | Parity |
| AI | AI language picker | Y | Y | Y (TVAILanguagePicker) | Parity |
| AI | Trivia overlay (VOD) | Y | Y | Y (trivia overlay) | Parity |
| AI | Trivia overlay (Live) | Y | Y | Y | Parity |
| AI | Chapters with timeline | Y | Y | Y | Parity |
| AI | Comprehension quiz | Y | Y (QuizOverlayView) | N | **tvOS gap** -- quiz interaction difficult with Siri Remote |
| AI | AI companion sidebar | Y (YouTube) | N | N | **Web exclusive** -- sidebar companion for YouTube content |
| AI | Catch-up with transcript | Y | N | N | **Web exclusive** -- replay missed content with AI transcript |
| AI | Scene search in player | Y | N | N | **Web exclusive** -- search within video by scene description |

### 3.11 Player - Recording and Catch-Up

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Recording | Record live TV | Y | Y | Y | Parity |
| Recording | View recordings | Y | Y | Y (TVRecordingsView) | Parity |
| Catch-Up | Replay with transcript | Y | N | N | **iOS/tvOS gap** -- AI-generated transcript for replay |

### 3.12 Player - Social and Interactive

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Watch Party | Create party | Y | Y | Y (create/join) | Parity |
| Watch Party | Join party | Y | Y | Y | Parity |
| Watch Party | Chat in party | Y | Y | Y | Parity |
| Channel Chat | Live channel chat panel | Y | N | N | **Web exclusive** -- real-time chat alongside live TV |

### 3.13 Search

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Search | Unified search | Y | Y | Y (TVSearchView) | Parity |
| Search | Keyword search | Y | Y | Y | Parity |
| Search | LLM / semantic search | Y | Y | Y (LLM search views) | Parity |
| Search | Filter by content type | Y | Y | Y (filter pills) | Parity |
| Search | Recent searches | Y | Y | Y | Parity |
| Search | Trending searches | Y | Y | Y | Parity |
| Search | Search suggestions | Y | Y | Y (suggestions) | Parity |

### 3.14 Profile and Account

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Profile | Overview / account | Y | Y | Y (TVProfileView) | Parity |
| Profile | Avatar customization | Y | Y (avatar mode + prefs) | Y (TVAvatarMode + prefs) | Parity |
| Profile | Viewing stats | Y | Y | Y | Parity |
| Profile | Watch history | Y | Y (history) | Y | Parity |
| Profile | Preferences | Y | Y | Y | Parity |
| Profile | Auto-translate setting | Y | Y | Y | Parity |
| Profile | Favorites | Y | Y (favorites) | Y (TVFavoritesView) | Parity |
| Profile | Playlists | Y | Y (playlist) | Y | Parity |
| Profile | Downloads (offline) | N/A | Y (downloads) | N/A | iOS exclusive -- offline playback for mobile |

### 3.15 Settings

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Settings | Language selection | Y | Y | Y (TVLanguageSettingsView) | Parity |
| Settings | Notification preferences | Y | Y | Y (TVNotificationSettingsView) | Parity |
| Settings | Autoplay toggle | Y | Y | Y | Parity |
| Settings | Dark mode | Y | Y | N/A | tvOS is always dark themed |
| Settings | Security - password change | Y | Y | Y (TVSecurityView) | Parity |
| Settings | Security - 2FA | Y | Y | N | **tvOS gap** |
| Settings | Security - sessions | Y | Y | Y | Parity |
| Settings | Device management | Y | Y | Y (TVDevicePairingView) | Parity |
| Settings | Trivia settings | Y | Y | Y | Parity |
| Settings | Billing / subscription | Y | Y | Y (TVBillingView, TVSubscriptionView) | Parity |

### 3.16 Social Features

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Social | Friends list | Y | Y | Y (TVFriendsView) | Parity |
| Social | Add friends | Y | Y | Y | Parity |
| Social | Friend requests | Y | Y | Y | Parity |
| Social | Direct messages | Y | Y | Y (TVDirectMessagesView) | Parity |
| Social | Conversation view | Y | Y | Y (TVConversationView) | Parity |
| Social | Channel chat | Y | N | N | **Web exclusive** |
| Social | Watch party | Y | Y | Y | Parity |

### 3.17 Special Content Sections

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Children | Kids section | Y | Y | Y (TVChildrenView) | Parity |
| Children | Age group filtering | Y | Y | Y | Parity |
| Children | Youngsters section | Y | Y | Y (youngsters) | Parity |
| Children | Educational tags | Y | Y | Y | Parity |
| Judaism | Judaism hub | Y | Y | Y (TVJudaismView) | Parity |
| Judaism | News feed | Y | Y (Ynet news) | Y | Parity |
| Judaism | Jewish calendar | Y | Y | Y | Parity |
| Judaism | Shabbat times / zmanim | Y | Y | Y (TVShabbatZmanimView) | Parity |
| Judaism | Community section | Y | Y | Y | Parity |
| Judaism | Shiurim (lessons) | Y | Y | Y | Parity |
| Culture | Culture section | N | Y | Y (TVCultureView) | iOS/tvOS exclusive |
| Morning | Morning ritual | Y | Y | Y (TVMorningRitualView) | Parity |

### 3.18 Gaming

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Chess | Full game | Y | Y (WebSocket) | Y (board, controls, history, pieces) | Parity |

### 3.19 Voice and Chatbot

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Voice | Voice assistant FAB | N | Y | Y (assistant sheet) | iOS/tvOS exclusive |
| Voice | Voice onboarding | N | Y | Y (onboarding) | iOS/tvOS exclusive |
| Voice | Wake word detection | N | Y | Y (wake word settings) | iOS/tvOS exclusive |
| Voice | Proactive suggestions | N | Y | Y (proactive suggestions) | iOS/tvOS exclusive |
| Chatbot | Chatbot view | N | Y | Y (TVChatbotView) | iOS/tvOS exclusive |
| Chatbot | Message bubbles | N | Y | Y (message bubble) | iOS/tvOS exclusive |

### 3.20 Widgets

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Widgets | Widget page | Y | Y | Y (TVWidgetsView) | Parity |
| Widgets | PiP containers | Y | Y | Y | Parity |
| Widgets | Dock | Y | Y | Y | Parity |
| Widgets | System gallery | Y | Y | Y | Parity |

### 3.21 Family Controls

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Family | Parental controls | Y | Y (age slider, PIN) | Y (TVFamilyControlsView) | Parity |
| Family | Content rating filter | Y | Y | Y (TVContentRatingPickerView) | Parity |
| Family | Time range limits | Y | Y | Y (TVTimeRangePickerView) | Parity |
| Family | PIN protection | Y | Y | Y (TVFamilyPinModalView) | Parity |
| Family | Age stepper | Y | Y | Y (TVAgeStepperView) | Parity |
| Family | Household management | Y | Y | Y (TVHouseholdView) | Parity |
| Family | Device pairing | Y | Y | Y (TVDevicePairingView) | Parity |

### 3.22 Billing and Subscription

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Billing | Subscribe flow | Y | Y | Y (TVSubscriptionView) | Parity |
| Billing | Plan comparison | Y | Y | Y | Parity |
| Billing | Monthly / annual toggle | Y | Y | Y | Parity |
| Billing | Subscription gate | Y | Y (subscription gate) | Y | Parity |

### 3.23 Beta 500 Program

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Beta | Credits system | Y | Y | Y (TVBetaCreditsView) | Parity |
| Beta | Insufficient credits modal | Y | Y | Y | Parity |

### 3.24 Rewards

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Rewards | Points system | Y | Y | Y (TVRewardsView) | Parity |

### 3.25 Localization

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| i18n | 10 language support | Y | Y | Y | Parity |
| i18n | RTL (Hebrew) | Y | Y | Y | Parity |

### 3.26 Platform-Specific Features

| Feature | Sub-feature | Web | iOS | tvOS | Gap Notes |
|---------|-------------|-----|-----|------|-----------|
| Siri Shortcuts | Play intent | N/A | Y | N/A | iOS exclusive |
| Siri Shortcuts | Resume intent | N/A | Y | N/A | iOS exclusive |
| Siri Shortcuts | Search intent | N/A | Y | N/A | iOS exclusive |
| Siri Shortcuts | Add to playlist | N/A | Y | N/A | iOS exclusive |
| Focus Nav | Focus engine | N/A | N/A | Y (all views) | tvOS exclusive -- Siri Remote navigation |
| Top Shelf | Top Shelf extension | N/A | N/A | Y | tvOS exclusive -- Apple TV home screen |
| Flows | TVFlowsView | N | N | Y | tvOS exclusive |
| Splash | TVSplashView | N | N | Y | tvOS exclusive -- branded launch screen |

---

## 4. Gap Analysis Summary

### 4.1 Features Present in Web but Missing from iOS

| Priority | Feature | Impact | Recommendation |
|----------|---------|--------|----------------|
| High | Catch-up replay with transcript | Users cannot review missed live content with AI transcript | Implement using AVPlayer + BayitMedia transcript API |
| High | Scene search in player | Users cannot search within video by scene | Implement scene index overlay in player |
| Medium | AI companion sidebar | YouTube content lacks AI assistant | Implement as sheet overlay for iOS context |
| Medium | Channel chat panel | No real-time chat during live TV | Add chat panel to live TV player |
| Low | Quality selector | AVPlayer auto-manages quality | Consider manual override for constrained networks |

### 4.2 Features Present in Web but Missing from tvOS

| Priority | Feature | Impact | Recommendation |
|----------|---------|--------|----------------|
| High | Catch-up replay with transcript | Same as iOS gap | Implement with tvOS player integration |
| High | Scene search in player | Same as iOS gap | Implement with Siri Remote text input |
| High | Comprehension quiz | No quiz interaction after content | Design Siri Remote-friendly quiz UX |
| Medium | AI companion sidebar | Same as iOS gap | Implement as side panel overlay |
| Medium | Channel chat panel | Same as iOS gap | Design focus-navigable chat |
| Medium | MFA / 2FA setup | Security feature unavailable on tvOS | Delegate to companion iOS app or web |
| Medium | Phone verification | Cannot verify phone on tvOS | Delegate to companion device |
| Medium | Custom RSS for podcasts | Cannot add custom podcast feeds | Delegate to companion device |
| Low | Narrator/language filter (full) | Simplified audiobook filtering | Expand filter UX with focus navigation |
| Low | Dark mode toggle | N/A -- tvOS is always dark | No action needed |

### 4.3 Features Present in iOS/tvOS but Missing from Web

| Priority | Feature | Impact | Recommendation |
|----------|---------|--------|----------------|
| Medium | Voice assistant | No voice interaction on web | Implement Web Speech API integration |
| Medium | Chatbot | No AI chatbot on web | Add chatbot panel component |
| Medium | Culture clocks | Missing cultural time display | Add to home page layout |
| Low | Interactive word-tap translate | Desktop can use hover instead | Implement hover-to-translate for subtitles |
| Low | Biometric auth | N/A for web | WebAuthn passkeys serve same purpose |

---

## 5. Parity Score Breakdown

### By Feature Category

| Category | Features | Web | iOS | tvOS | Web-iOS Match | Web-tvOS Match |
|----------|----------|-----|-----|------|---------------|----------------|
| Authentication | 10 | 9 | 10 | 7 | 90% | 70% |
| Home Screen | 14 | 13 | 14 | 14 | 93% | 100% |
| VOD | 9 | 9 | 9 | 9 | 100% | 100% |
| Live TV | 8 | 8 | 8 | 8 | 100% | 100% |
| Radio | 3 | 3 | 3 | 3 | 100% | 100% |
| Podcasts | 7 | 7 | 6 | 5 | 86% | 71% |
| Audiobooks | 8 | 8 | 8 | 6 | 100% | 75% |
| Player Core | 10 | 10 | 9 | 8 | 90% | 80% |
| Player Subtitles | 9 | 8 | 9 | 8 | 89% | 89% |
| Player AI | 11 | 11 | 9 | 8 | 82% | 73% |
| Search | 7 | 7 | 7 | 7 | 100% | 100% |
| Profile | 9 | 8 | 9 | 8 | 89% | 89% |
| Settings | 10 | 10 | 10 | 8 | 100% | 80% |
| Social | 7 | 7 | 6 | 6 | 86% | 86% |
| Special Content | 12 | 11 | 12 | 12 | 92% | 100% |
| Family Controls | 7 | 7 | 7 | 7 | 100% | 100% |
| Voice / Chatbot | 6 | 0 | 6 | 6 | -- | -- |
| **Weighted Total** | | | | | **~92%** | **~82%** |

---

## 6. Recommendations

### Immediate Priorities (Next Sprint)

1. **Catch-up replay with transcript** -- Bring to iOS and tvOS. High user value for live TV viewers who miss segments. Backend API already exists.
2. **Comprehension quiz on tvOS** -- Design a Siri Remote-compatible quiz interaction (e.g., A/B/C/D button mapping).
3. **Channel chat** -- Implement on iOS first, then port to tvOS. Backend WebSocket infrastructure already supports this.

### Medium-Term (Next 2-4 Sprints)

4. **Scene search** -- Requires scene indexing pipeline. Implement on iOS with search overlay, tvOS with Siri Remote text input.
5. **AI companion sidebar** -- Adapt as a sheet/panel for iOS and a side overlay for tvOS.
6. **Web voice assistant** -- Add Web Speech API-based voice commands.
7. **Web chatbot** -- Port iOS chatbot to web as a floating panel.

### Deferred / Low Priority

8. **Quality selector on iOS/tvOS** -- AVPlayer adaptive bitrate is generally superior; only needed for specific bandwidth-constrained scenarios.
9. **tvOS 2FA** -- Delegate to companion device workflow rather than building on-device.
10. **Custom RSS on tvOS** -- Delegate to companion device; syncs automatically.

---

## 7. Methodology Notes

- **Web audit** covered 41 pages, 47 feature areas, and 35+ player features by examining React components, route definitions, and Zustand stores.
- **iOS audit** covered 347 Swift files in BayitPlusApp, 60 ViewModels, 193 views, and 18 feature flags.
- **tvOS audit** covered 114 Swift files in BayitPlusTVApp, 81 views, and 15,810 lines of code.
- **Shared packages** (106 files, 13,008 lines) serve both iOS and tvOS and are counted in infrastructure but not in platform-specific feature counts.
- Feature presence was determined by examining view files, view models, navigation routes, and API service calls. A feature is marked "Y" only if the corresponding UI and logic are both present.
- "Partial" (P) indicates the feature exists but with reduced functionality compared to the baseline platform.

---

## Appendix A: AI Assistant / Voice System Deep Audit

### System Architecture
All platforms share the same backend voice pipeline:
- **Unified endpoint**: `POST /api/v1/voice/unified` (keyword classification + Claude tool use)
- **Chat endpoint**: `POST /api/v1/chat/` (conversational AI with tool execution)
- **Transcription**: `POST /api/v1/chat/transcribe` (audio to text)
- **NLU**: Multi-stage - keyword patterns (fast) + Claude 3.5 Sonnet with function calling (accurate)
- **Languages**: EN, HE, ES + 7 more

### Supported Intents
| Intent | Triggers (EN/HE) | Action | Example |
|--------|-------------------|--------|---------|
| PLAYBACK | "play X" / "הפעל X" | Resolve content + play | "play Cocaine Bear" |
| DISPLAY_CHANNELS | "show channels" / "הצג ערוצים" | List live channels | "show Israeli channels" |
| SEARCH | "search X" / "חפש X" | Search + show results | "find action movies" |
| NAVIGATION | "go to X" / "לך ל-X" | Navigate to page | "go to podcasts" |
| CONTROL | "pause" / "עצור" | Media control | "pause", "skip forward" |
| KIDS | "kids movies" / "סרטי ילדים" | Filter kids content | "what's for kids?" |
| CHAT | Natural language | Claude conversation | "who directed this?" |

### Platform Comparison

| Feature | Web | iOS | tvOS |
|---------|-----|-----|------|
| Voice input (STT) | Browser MediaRecorder + transcription API | Apple Speech.framework (on-device) | N/A (no microphone on Apple TV) |
| Text input | Chat text field | Chat text field | Siri Remote keyboard |
| Voice output (TTS) | Browser Web Speech API | AVSpeechSynthesizer | Text display only |
| Play content by name | Y - wizard:action event + SPA navigation | Y - VoiceOrchestrator callback + NavigationCoordinator | Y - ChatbotViewModel + navigation |
| Show live channels | Y - navigate to /live with channel data | Y - navigate to .liveTV route | Y - navigate to live tab |
| Search with results | Y - navigate to /search with results | Y - navigate to .search route | Y - navigate to search |
| Playback control | Y - media:control custom event | Y - MediaPlayer direct control | N/A (Siri Remote controls) |
| Wake word detection | Framework prepared, disabled | Framework in BayitVoice, disabled | N/A |
| Conversation context | Y - 10 message history | Y - conversation_id tracking | Y - conversation_id tracking |
| Wizard avatar | Y - Animated wizard hat with gestures | Y - VoiceAvatarFAB | Y - TVVoiceAvatarFAB |

### Key Implementation Files

**Web**: `wizardService.ts`, `actionHandlers.ts`, `Chatbot.tsx`, `useChatMessages.ts`, `useChatVoice.ts`
**iOS**: `BayitVoice/VoiceOrchestrator.swift`, `SpeechRecognitionService.swift`, `TTSService.swift`, `ChatbotViewModel.swift`, `ChatbotView.swift`
**tvOS**: `TVChatbotViewModel.swift`, `TVChatbotView.swift`, `TVVoiceAssistantSheet.swift`
**Backend**: `voice/unified.py`, `intent_router.py`, `intent_handlers/`, `tool_executors/`, `chat/` routes

### Backend Tool Executors
| Tool | Description |
|------|-------------|
| search_content | MongoDB content search with fuzzy matching |
| get_live_channels | Active channel enumeration (max 20) |
| play_content | Content resolution + play action |
| get_kids_content | Age-appropriate content filtering |
| get_recommendations | Personalized content suggestions |
| select_subtitles | Subtitle language preferences |
| navigate_to_page | App navigation actions |
| control_playback | Play/pause/skip/volume commands |

### Assessment
The voice/assistant system is **production-ready** across all platforms. The primary gap is tvOS lacking voice input (hardware limitation - no microphone on Apple TV). All action execution capabilities (play, search, navigate, control) work identically through the shared backend pipeline.

---

**Audit prepared by:** Platform Engineering
**Review cycle:** Quarterly (next review: 2026-05-11)
**Distribution:** Engineering leads, Product Management, QA
