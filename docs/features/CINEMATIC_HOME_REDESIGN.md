# Cinematic Home Redesign -- Live Preview Hero + Pause & Ask Showcase

## Overview

Redesign the tvOS cinematic homepage to demonstrate AI capabilities using real content. Replace static billboard cards with adaptive, live-preview hero cards that prove value through the user's own content (BYOC), live TV with AI dubbing, and an interactive Pause & Ask walkthrough.

## Problem

- Current cinematic home has a static "AI Showcase" card pointing to a feature catalog (TVDiscoverView)
- The killer feature (Pause & Ask -- interactive character conversations during playback) is fully working but undiscoverable
- Content library is thin; home must prove value through AI capabilities applied to live TV and user-brought content, not catalog size

## Target Users

- **New users**: need to immediately feel "this understands Israeli culture" and "my content becomes smarter here"
- **Returning users with BYOC**: need fast access to their content with AI enhancements surfaced

## Design

### 1. Adaptive Hero Card Assembly

The hero carousel assembles 3-5 cards based on user state (BYOC connected, watch history).

**Card types:**

| Card              | Video Source                                                                      | AI Overlay                                  | CTA                      | Shows When           |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------ | -------------------- |
| Live TV Proof     | Muted live stream                                                                 | Subtitle translation bar + "AI Dubbed" pill | "Watch Dubbed in [lang]" | Always               |
| BYOC Showcase     | Muted playback of recent Plex/YouTube item (first 30s)                            | Sparkles + "Pause & Ask ready" chip         | "Watch with AI"          | BYOC connected       |
| Pause & Ask Intro | GCS-hosted demo clip via Discover config (auto-pauses, shows conversation bubble) | Animated Q&A bubble at set timestamp        | "Try It Now"             | Always               |
| Continue Watching | Muted resume from last position                                                   | Progress bar + "AI-enhanced" pill           | "Resume"                 | Has watch history    |
| Culture           | Static image (Masada/Jerusalem/TelAviv)                                           | Category label                              | "Explore"                | Always, 1-2 shuffled |

**Assembly priority (max 5 cards):**

1. If BYOC connected: BYOC Showcase first
2. If watch history: Continue Watching (or first if no BYOC)
3. Live TV Proof (always, unless slot 1)
4. Pause & Ask Intro (always)
5. One culture card (shuffled)

No BYOC + no history: Live TV Proof leads, then Pause & Ask, then 2 culture cards.

### 2. Live Preview Video Architecture

**Core rule: one AVPlayer at a time.**

GlassHeroCarousel passes `isActive: Bool` to each card view.

| Event               | Action                                                         |
| ------------------- | -------------------------------------------------------------- |
| isActive = true     | Create AVPlayer, muted, play, loop via NotificationCenter      |
| isActive = false    | Pause, capture frame as static fallback, nil player after 1.5s |
| onDisappear         | Immediately nil player                                         |
| Video fails to load | Static poster/artwork fallback                                 |

**Source resolution:**

| Type              | Source                                                            |
| ----------------- | ----------------------------------------------------------------- |
| .liveTVProof      | Channel stream URL from LiveTVViewModel                           |
| .byocShowcase     | BYOC item playback URL from BYOCSourceManager                     |
| .pauseAskIntro    | GCS URL from DiscoverViewModel config, fallback to live TV stream |
| .continueWatching | Item playback URL, seek to resume position                        |
| .culture          | No video, static image                                            |

**Memory guard:** Check `os_proc_available_memory()`. If low, skip video for all cards, fall back to static images.

### 3. AI Overlays

Non-interactive visual layers between gradient and text content.

**Live TV Proof:**

- Translucent subtitle bar above gradient zone
- Language flag + "AI Dubbed" pill badge
- Text cycles every 4s from localization keys (3-4 sample lines)

**BYOC Showcase:**

- Top-right: sparkles icon + "Pause & Ask ready" glass chip
- Sparkles pulse animation (opacity 0.6-1.0, 2s cycle)

**Pause & Ask Intro:**

- At set timestamp, video auto-pauses momentarily
- Conversation bubble animates in (sample Q&A)
- After 3s, fades, video resumes
- Loops with video

**Continue Watching:**

- Progress bar + "AI-enhanced" glass pill

**Culture:**

- No overlay, static images only

All overlay text from `cinematic.overlay.*` localization keys.

### 4. Dock Changes

New entry: **Pause & Ask** inserted after Live TV.

Order: `Discover | Live TV | Pause & Ask | Listen | Zeh Ani | [conditional]`

- Icon: `text.bubble`
- HomeDockDestination: `.pauseAsk`
- Visual: sparkle-tinted border (`DesignTokens.Primary.p400`) at rest, not animated

**Navigation when tapped:**

- Has watch history: resume last-watched, trigger `startPauseAskInteraction()` immediately
- BYOC connected, no history: pick most recent BYOC item, start playback, trigger after 5s
- Neither: start first available live TV channel, trigger after 5s with coach mark

### 5. Pause & Ask Walkthrough

Uses the real feature pipeline (no custom walkthrough UI).

**Flow:**

1. Content starts playing (source from dock navigation logic above)
2. Coach mark: "Press [Play/Pause] to talk to a character" -- auto-dismiss 8s
3. User pauses (or auto-pause after 15s) -- triggers `startPauseAskInteraction()`
4. `loadCharacters(contentId:)` called, character selection appears (160pt circles)
5. User selects character -> input panel with pre-populated suggestion
6. `sendPauseAskMessage()` -> movie resumes during polishing -> pauses for character video response
7. Idle panel: Replay / Ask Another / Resume
8. Walkthrough mode adds "This works on any content" chip before Resume

## Decision Log

| #   | Decision                                  | Alternatives                  | Rationale                                      |
| --- | ----------------------------------------- | ----------------------------- | ---------------------------------------------- |
| 1   | Adaptive home by user state               | Static cards for all          | Different proof points needed                  |
| 2   | Live preview video in hero                | Static images, animated demos | Max visual impact; widget video pattern proven |
| 3   | One AVPlayer at a time                    | Multiple pre-buffered         | Apple TV memory constraints                    |
| 4   | Real pipeline for walkthrough             | Custom tutorial UI            | Feature IS the demo                            |
| 5   | Movie resumes during AI generation        | Stay paused                   | Existing design, avoids dead air               |
| 6   | Dock gains Pause & Ask after Live TV      | Replace Discover, hero only   | Persistent discoverable entry point            |
| 7   | Dock routes to content then triggers      | Standalone tutorial           | Must use real content                          |
| 8   | Static sparkle border on dock button      | Animated glow                 | Attention without distraction                  |
| 9   | Max 5 hero cards, personal first          | Fixed set, unlimited          | Personal content strongest hook                |
| 10  | Video fallbacks only, no Lottie           | Lottie for loading states     | Video-native preference                        |
| 11  | Memory guard via os_proc_available_memory | Always attempt video          | Prevents OOM on older hardware                 |
| 12  | All text from cinematic.overlay.\* keys   | Hardcoded strings             | 10-language localization requirement           |

## Files to Modify

- `TVCinematicHomeView.swift` -- new card types, adaptive builder, video lifecycle
- `TVCinematicHeroCardView` -- video player layer, AI overlay layer per type
- `TVHomeDock.swift` -- add `.pauseAsk` destination and button
- `GlassHeroCarousel.swift` -- pass `isActive` to content closure
- `CinematicHeroCard` model -- new types with associated data
- `HomeDockDestination` -- add `.pauseAsk` case
- `TVHomeView.swift` -- wire dock navigation for `.pauseAsk`
- Localization: add `cinematic.overlay.*` keys to all 10 language files

## Non-Goals

- No new AI backend capabilities
- No redesign of tab structure or sidebar
- No competing on content catalog size
