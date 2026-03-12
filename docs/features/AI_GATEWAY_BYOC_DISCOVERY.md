# AI Gateway: BYOC Discovery and Conversion Redesign

## Understanding Summary

- **What**: Redesign how BYOC is discovered and experienced so casual users understand and activate the AI layer on their own content
- **Why**: The app's core value (AI features on user content) is invisible on first impression -- users see free Israeli TV and cultural content without realizing the AI layer exists for their own content
- **Who**: Casual users who have a YouTube account but don't think of themselves as people who "integrate" things
- **Strategy**: YouTube as the gateway. Lead with "AI superpowers on your content," not "connect your accounts." Show the value before asking for action
- **Flow**: User sees AI working on Live TV -> contextual prompt -> simple OAuth connect -> immediately play their own video with AI active -> home feed now shows their content
- **Progressive reveal**: IPTV/Xtream/Plex surface only after user has connected YouTube and engaged with AI features
- **Framing**: Drop "BYOC" as user-facing language entirely. Lead with AI value, connection is the means

## Assumptions

- Google OAuth browser redirect can be configured for iOS/web (needs verification -- currently only device auth is implemented)
- First-video AI analysis can complete fast enough for an immediate playback moment
- The existing AI feature pipeline (dubbing, subtitles, etc.) works on YouTube content today
- YouTube is universally accessible enough to be the default gateway
- The free Israeli TV content already demonstrates the AI features well enough to serve as the "see it working" proof point

## Design

### 1. Home Screen: AI Gateway Card

A single glass card appears after the Live TV shelf row on the home screen, only when no YouTube source is connected.

**Content:**

- Headline: "AI superpowers on your content"
- Subtext: "The AI dubbing and subtitles you see on Live TV work on your YouTube videos too"
- Primary action: "Connect YouTube" button
- Secondary: "Learn more" link that scrolls to a brief feature list
- Dismissable but returns after 3 app sessions if not connected
- After 3 dismissals across separate sessions, offers "Don't show again" option
- Disappears permanently once any YouTube source is connected

**What it does NOT do:**

- No mention of "BYOC", "integrations", "sources", or any technical language
- No mention of IPTV/Xtream/Plex at this stage
- No multi-step wizard or modal -- the button initiates YouTube OAuth directly

### 2. YouTube Connection Flow

**iOS / Web:**

- Opens an in-app browser sheet (ASWebAuthenticationSession on iOS, popup on web) with Google OAuth consent screen
- User taps their Google account, approves YouTube read-only access
- Browser closes automatically, app receives tokens
- Total interaction: 2-3 taps, no codes to type, no URLs to visit
- Falls back to device auth flow if browser OAuth fails or isn't configured

**tvOS:**

- Device auth flow (current approach) -- correct UX for a remote-controlled device
- Wrapped in better framing: "On your phone, visit google.com/device" with the code displayed large

**Android:**

- Google Sign-In intent (native Android OAuth) -- single tap on their Google account
- Falls back to device auth if needed

**After successful auth (all platforms):**

1. Brief loading state: "Finding your videos..." (2-3 seconds while fetching recent videos)
2. Quick AI analysis indicator: "Preparing AI features..." (analyzing first video)
3. Auto-navigate to player with their most recent YouTube video
4. AI subtitles enabled by default on first playback
5. A small toast/overlay: "This is your YouTube video with Bayit+ AI. Tap the sparkles button to explore more features."

**If auth fails:**

- Inline error on the same card, retry button, no modal alerts
- Card stays visible, doesn't dismiss on failure

### 3. First AI Playback ("Aha Moment")

**Player state on first BYOC playback:**

- AI subtitles auto-enabled (safest default -- works on any video, any language)
- The glass AI features panel (existing GlassAIFeaturesPanel) slides in briefly from the side, showing all 7 available features with a subtle pulse on "AI Subtitles: Active"
- Panel auto-collapses after 4 seconds to not obstruct viewing
- Sparkles button remains visible in player controls

**One-time overlay (first BYOC play only):**

- A translucent banner across the bottom: "This is your YouTube video with Bayit+ AI. Tap the sparkles button to explore more features."
- Dismisses on tap or after 6 seconds
- Never shown again after first BYOC playback

**What we do NOT do:**

- Don't auto-enable dubbing (too jarring on first experience)
- Don't show a credit deduction prompt on first play -- subtitles should be the free/included taste
- Don't interrupt playback with modals or feature tours
- Don't force the user to choose a feature before playing

**After exiting the player:**

- Return to home screen, which now has a "Your YouTube" shelf row where the gateway card used to be
- Videos appear as a horizontal carousel, visually identical to Live TV content, with AI sparkles badges
- The gateway card is gone permanently

### 4. Progressive Reveal of Power-User Integrations

**Trigger condition:** User has a YouTube source connected AND has activated any AI feature on a BYOC video at least once.

**Where it appears:** A new card at the bottom of the "Your YouTube" shelf row on the home screen:

- Headline: "Have more content?"
- Subtext: "Connect Plex, IPTV, or other services for AI features on all your media"
- Action: "Explore" button -> opens the existing source list view
- Dismissable, does not return after dismissal

**Changes to the existing source list view:**

- Rename navigation title from "Connected Sources" to "Your Content Sources"
- YouTube appears first as "Connected" with a checkmark
- Plex, IPTV, Xtream appear below with brief one-line descriptions:
  - Plex: "Movies and TV shows from your Plex server"
  - IPTV: "Live channels from your IPTV provider"
  - Xtream: "VOD and live TV from Xtream services"
- Each integration keeps its existing auth flow

**Settings access:**

- The existing Settings > Connected Sources path remains for direct access
- Renamed to "Your Content Sources"
- Available regardless of progressive reveal state -- power users can always find it

### 5. Onboarding Adjustment

**Current state:** BYOC is step 5 of 7, sharing a card with "Catch-up," using the word "BYOC."

**Change:** Replace the combined "neverMiss" card:

- Same position (step 5 of 7)
- New headline: "AI on your content too"
- New subtext: "The AI features you just saw work on your YouTube videos, Plex library, and more. We'll show you how after you explore."
- Same visual style, no new UI components
- No action button -- don't try to connect during onboarding

**"Catch-up" feature** that was on the old combined card: moves to the AI dubbing card (step 2) as a secondary bullet.

### 6. Naming and Localization

"BYOC" disappears from all user-facing surfaces:

| Current                           | New                                  |
| --------------------------------- | ------------------------------------ |
| "BYOC" / "Bring Your Own Content" | Never shown to users                 |
| "Connected Sources" (nav title)   | "Your Content Sources"               |
| "Add IPTV" / "Add Plex" etc.      | "Connect Plex" / "Connect IPTV" etc. |
| Tab label "BYOC" (tvOS)           | "My Content"                         |
| Sidebar "BYOC" (web)              | "My Content"                         |
| Onboarding "BYOC" pill badge      | "Your Content"                       |

Internal code naming (BYOCSourceManager, BYOCContentItem, etc.) stays unchanged.

**New localization keys (all 10 languages):**

- `ai.gateway.title` -- "AI superpowers on your content"
- `ai.gateway.subtitle` -- "The AI dubbing and subtitles you see on Live TV work on your YouTube videos too"
- `ai.gateway.connectYouTube` -- "Connect YouTube"
- `ai.gateway.learnMore` -- "Learn more"
- `ai.gateway.firstPlay.hint` -- "This is your YouTube video with Bayit+ AI. Tap the sparkles button to explore more features."
- `ai.gateway.moreContent.title` -- "Have more content?"
- `ai.gateway.moreContent.subtitle` -- "Connect Plex, IPTV, or other services for AI features on all your media"
- `ai.gateway.moreContent.action` -- "Explore"
- `nav.myContent` -- "My Content"
- `byoc.yourContentSources` -- "Your Content Sources"

### 7. Platform-Specific Summary

**iOS (iPhone):**

- Home: Add AI Gateway Card after Live TV shelf (new AIGatewayCardView)
- Home: Extend BYOCShelfRow with empty/gateway/content states
- Home: Add "Have more content?" card after first AI use
- Player: One-time bottom banner on first BYOC play
- Settings: Rename "Connected Sources" -> "Your Content Sources"
- Onboarding: Reframe step 5 copy
- Auth: Add ASWebAuthenticationSession path for YouTube OAuth

**tvOS:**

- Replace TVBYOCBannerView with AI-framed messaging
- Rename BYOC tab -> "My Content"
- YouTube auth stays as device auth (correct for remote)
- Player: Same one-time overlay on first BYOC play

**Web:**

- Sidebar: Rename "BYOC" -> "My Content"
- Home page: Add AI Gateway Card (no home page presence today)
- YouTube auth: Browser popup OAuth
- Add Plex and YouTube to the web wizard (currently IPTV/Xtream only)

**Android:**

- Mirror iOS changes
- YouTube auth: Native Google Sign-In intent
- Home: Same gateway card and progressive reveal

**Backend:**

- No changes needed. All auth, token storage, and AI pipelines already exist.

## Decision Log

| #   | Decision                                              | Alternatives Considered                                  | Rationale                                                                               |
| --- | ----------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Solve awareness and conversion together               | Tackle separately                                        | They feed each other -- awareness without easy conversion is wasted                     |
| 2   | Design for casual user with YouTube account           | Power users, Jewish families                             | Largest addressable audience, lowest barrier. Power users find integrations regardless  |
| 3   | Lead with "AI superpowers on your content"            | "Connect your accounts", "Your content enhanced", "BYOC" | Communicates the payoff, not the mechanism                                              |
| 4   | YouTube as gateway, progressive reveal for others     | All integrations equal, Plex as hero                     | YouTube is universal. IPTV/Xtream/Plex are power-user territory                         |
| 5   | Platform-native OAuth where possible                  | Device auth everywhere                                   | Minimum cognitive load per platform. Device auth correct for tvOS only                  |
| 6   | Show AI on Live TV first, then prompt for YouTube     | Demo content, onboarding overhaul, passive discovery     | Real proof beats demos. Contextual prompt after experience beats interruption           |
| 7   | Contextual prompt after Live TV shelf, not top banner | Top banner, both, no prompt                              | User needs to see AI working before prompt has meaning. Banners feel like ads           |
| 8   | Auto-play first YouTube video with AI subtitles       | Show content list, let user choose, auto-enable dubbing  | Immediate value. Subtitles safest default -- dubbing too jarring, list is anticlimactic |
| 9   | Progressive reveal after first AI use on YouTube      | Always visible, settings only, during onboarding         | Earned discovery -- user has proven they understand the concept                         |
| 10  | Remove "BYOC" from all user-facing surfaces           | Keep BYOC branding, partial rename                       | "BYOC" is developer jargon meaningless to casual users                                  |
| 11  | Reframe onboarding step 5, don't overhaul             | Full redesign, add connect button in onboarding          | Low risk. Real conversion happens on home screen after Live TV experience               |
| 12  | AI subtitles as default first feature                 | Auto-enable dubbing, let user choose                     | Works on any language/video, non-intrusive, immediately visible                         |

## Open Questions

- Is Google OAuth redirect URI already registered for iOS/web, or only device auth?
- Which specific AI feature should auto-activate on first YouTube video? (Design assumes subtitles -- needs validation that subtitles work without credit deduction for free users)
- Should the contextual home prompt disappear permanently after connecting, or re-appear periodically for users who dismissed but never connected? (Design says: return after 3 sessions, permanent dismiss after 3 dismissals)
