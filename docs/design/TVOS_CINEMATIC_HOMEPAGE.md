# tvOS Cinematic Homepage Design

**Status:** Approved
**Date:** 2026-03-16
**Scope:** tvOS app homepage redesign -- new "Cinematic" mode as default, existing Netflix-style layout preserved as optional "Classic" mode via settings.

---

## Problem Statement

Bayit+ is not a content library competing on volume. It is:

1. **An AI-powered viewing platform** -- 19 AI features layered on top of content users bring in via BYOC (Plex, YouTube)
2. **An Israeli cultural hub** -- curated feeds for What's Hot in Israel, Jerusalem, Tel Aviv, and Local Businesses

The current Netflix-style homepage (18+ scrollable content rows) misrepresents the product. Most content is BYOC, there are no third-party content licenses, and the dense layout dilutes both value pillars.

## Design: Cinematic Launcher

A single non-scrollable screen with three horizontal bands:

```
+--------------------------------------------------+
|  Tab Bar (~8%)                                    |
+--------------------------------------------------+
|                                                   |
|                                                   |
|            Hero Carousel (~75%)                   |
|         (full-bleed, edge-to-edge)                |
|                                                   |
|                                                   |
+--------------------------------------------------+
|  Dock Row (~17%)                                  |
|  [Discover] [Live TV] [Listen] [Continue] [Plex]  |
+--------------------------------------------------+
```

- No vertical scrolling -- everything fits on one screen
- Left sidebar (widgets) slides in on left-swipe, overlays content (unchanged from current)
- Focus engine: Tab bar (up) -> Hero (default) -> Dock (down)

---

## Hero Carousel

Full-bleed background image or looping video clip with overlay metadata.

### Card Types

**AI Showcase Card (always first in rotation):**

- Background: Back to the Future cinematic still or looping trailer clip
- Overlay (bottom-left, RTL-aware): title, subtitle ("Experience 19 AI features"), two glass buttons ("Watch Now" / "See Features")
- Subtle animated sparkle or AI badge to distinguish from culture cards

**Culture Cards (4 fixed + dynamic):**

- Background: editorial image from culture feed
- Overlay: category label (e.g., "What's Hot in Israel"), headline, one glass button ("Explore")
- Each city/category gets its own card

### Fixed Culture Categories (always present)

1. What's Hot in Israel
2. Jerusalem
3. Tel Aviv
4. Local Businesses (Near Me)

### Rotation Behavior

- AI Showcase card is always first
- Remaining cards (4 fixed culture + any dynamic) appear in randomized order, re-randomized on each homepage visit
- Auto-advances every 8 seconds
- Siri Remote swipe left/right for manual browse
- Page indicators: small dots/dashes at bottom edge of hero area
- Pauses auto-rotation on user interaction, resumes after 15 seconds of inactivity

### Focus Behavior

- When hero is focused, current card's CTAs are focusable
- Swipe left/right changes cards
- Press down moves focus to dock

---

## Dock Row

Glass capsule anchored at bottom of screen, matching existing Bayit+ quick dock visual language (circular icon buttons with labels, frosted glass container, purple ring on focus).

### Buttons

| Position | Button            | Icon          | Condition                          |
| -------- | ----------------- | ------------- | ---------------------------------- |
| 1        | Discover          | `sparkles`    | Always                             |
| 2        | Live TV           | `play.tv`     | Always                             |
| 3        | Listen            | `headphones`  | Always                             |
| 4        | Continue Watching | `play.circle` | Only if in-progress content exists |
| 5        | My Plex           | Plex logo     | Only if connected                  |
| 6        | My YouTube        | YouTube logo  | Only if connected                  |

3 fixed + 0-3 dynamic. Maximum 6 buttons.

### Focus Behavior

- Unfocused: semi-transparent glass, standard size
- Focused: brighter glass, slight scale-up, label fully opaque, purple ring highlight
- Press navigates to the corresponding tab/section
- Dock auto-centers with wider spacing when fewer buttons are visible

---

## Settings Toggle

- Located in tvOS Settings/Profile screen
- "Homepage Style": "Cinematic" (default) / "Classic"
- Stored in DataStore preferences
- Switching takes effect immediately (no restart)
- "Classic" renders the current 18+ section Netflix-style homepage unchanged
- Same `TVHomeView` checks the preference and branches to the appropriate layout

---

## Edge Cases

**New user (no BYOC, no watch history):**

- Hero: AI showcase + 4 fixed culture cards (minimum 5 cards always)
- Dock: 3 buttons only (Discover, Live TV, Listen), centered with generous spacing

**User connects Plex mid-session:**

- Dock dynamically adds "My Plex" button without restart
- Dock rebalances spacing with animation

**Shabbat mode:**

- Shabbat banner overlays the top of the hero (below tab bar) as a thin persistent strip
- Adapted from existing `TVShabbatBannerView` for cinematic layout

**Sidebar interaction:**

- Left swipe opens sidebar overlay exactly as today
- Hero and dock dim/blur behind it
- No changes needed

---

## Decision Log

| #   | Decision                                            | Alternatives Considered                  | Rationale                                                               |
| --- | --------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Minimalist cinematic homepage (new default)         | Keep Netflix-style only                  | Bayit+ is not a content library; AI layer + culture hub are the product |
| 2   | Classic Netflix-style kept as optional via settings | Remove entirely                          | Existing users may prefer it; no reason to delete working code          |
| 3   | Full-screen hero carousel (~75% of screen)          | Split canvas, hidden dock                | Maximum cinematic impact, simple focus navigation, premium feel         |
| 4   | Auto-rotation (8s) with swipe override              | User-driven only, fixed tabs             | Standard tvOS pattern, natural with Siri Remote                         |
| 5   | 1 AI showcase + 4 fixed culture + dynamic cards     | 2 cards only, fixed count                | Both pillars are equal; culture categories must always be present       |
| 6   | Randomized order after AI card                      | Fixed sequence                           | Keeps homepage fresh on each visit                                      |
| 7   | Glass capsule dock with circular buttons            | Content rows, hidden drawer, widget dock | Matches existing Bayit+ tvOS design language (quick dock overlay)       |
| 8   | 3 fixed + 0-3 dynamic dock buttons                  | Fixed 4, all dynamic                     | Discover/Live TV/Listen always relevant; BYOC sources conditional       |
| 9   | Sidebar with widgets stays unchanged                | Move widgets to homepage                 | Separation of concerns; sidebar handles ambient info                    |
| 10  | Shabbat banner as thin overlay strip on hero        | Dedicated section, skip entirely         | No sections in cinematic mode; overlay preserves visibility             |

---

## Non-Functional Requirements

- **Performance:** Hero images/video must load within 2 seconds; dock renders instantly from local state
- **Accessibility:** All dock buttons and hero CTAs must be reachable via standard tvOS focus engine
- **Reliability:** If culture backend fails, hero shows AI showcase card only (graceful degradation)
- **Maintenance:** Current Netflix-style homepage code remains untouched; cinematic mode is additive
