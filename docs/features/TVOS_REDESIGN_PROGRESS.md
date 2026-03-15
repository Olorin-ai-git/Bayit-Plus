# tvOS UI Redesign — Progress Report

**Date:** 2026-03-15
**Branch:** main
**Design Source:** Figma Make + JPG reference images at `/Users/olorin/Documents/Projects/olorin/`

---

## Methodology

### Design-to-Code Pipeline

1. **Figma Make** generates a multi-layer SwiftUI specification from the design image, decomposing the screen into layers with exact colors, spacing, typography, and animation parameters.

2. **Asset extraction** — where the design contains rich artwork (holographic avatars, card thumbnails), we crop regions from the design JPG using ImageMagick, apply transparency masks (elliptical feathered gradients for circular elements), and add them to the tvOS asset catalog (`BayitPlusTVApp/Assets.xcassets/`).

3. **Remote assets** — where the iOS app already serves thumbnails via API (e.g., Discover feature demo thumbnails from `DiscoverConfigResponse`), we reuse the same `AsyncImage`/`CachedAsyncImage` URLs rather than extracting static images.

4. **Code updates** — we modify the existing tvOS SwiftUI views in-place, preserving navigation, focus handling, repository integrations, and localization. No architecture changes unless the design requires a fundamentally different layout (e.g., Widgets gallery → dashboard grid).

5. **Iterative screenshot loop** — after each code change: build → install on tvOS simulator (Apple TV 4K 3rd gen, `9751674D-E696-47F1-B565-BD4C7D43E415`) → navigate to the screen → take screenshot → compare with design image → fix discrepancies → repeat until pixel-perfect match.

6. **Focus styling** — all interactive elements use `.tvCardStyle()` from `BayitDesignSystem` for consistent purple border ring, glow shadow, and spring-animated scale on focus. Custom empty `ButtonStyle` implementations that suppress focus feedback are forbidden.

7. **Localization** — all user-visible strings go through `localization.t()` with keys in `bayit-i18n/locales/en.json`. Title case and wording are matched to the design exactly.

### Build & Test Commands

```bash
# Generate Xcode project (required after adding/removing files)
cd olorin-media/bayit-plus/ios-app && xcodegen generate

# Build tvOS app
xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlusTVApp \
  -destination 'platform=tvOS Simulator,id=9751674D-E696-47F1-B565-BD4C7D43E415' \
  -derivedDataPath /tmp/bayit-tv-derived build

# Install and launch
xcrun simctl install 9751674D-E696-47F1-B565-BD4C7D43E415 \
  /tmp/bayit-tv-derived/Build/Products/Debug-appletvsimulator/BayitPlusTV.app
xcrun simctl launch 9751674D-E696-47F1-B565-BD4C7D43E415 tv.bayit.plus

# Screenshot
xcrun simctl io 9751674D-E696-47F1-B565-BD4C7D43E415 screenshot /tmp/screenshot.png
```

---

## Completed Screens

### 1. Zeh Ani Hub

**Design:** `2026-03-14-tvos-zehani-redesign.png`
**Commits:** 2

**Changes:**

- Replaced SF Symbol placeholder avatar with holographic wireframe image asset cropped from design, processed with elliptical feathered transparency mask via ImageMagick
- Replaced all 3 card thumbnails (Magic Mirror, Highlight Reels, Movie Interactions) with cropped design assets added to tvOS asset catalog
- Removed status bar overlay (avatar + time) and select button per design
- Updated progress indicator to purple gradient bar
- Fixed title capitalization: "Your Interactive Identity"
- Unified focus styling with `.tvCardStyle()`

**Files modified:**

- `TVZehAniHubView.swift` — removed status bar layer
- `TVZehAniHubView+Hero.swift` — avatar image asset, enlarged to 400x400
- `TVZehAniHubView+CardArt.swift` — image assets replace procedural thumbnails (130 lines removed)
- `TVZehAniHubView+Carousel.swift` — `.tvCardStyle()` focus
- `TVZehAniHubView+Navigation.swift` — removed select button, purple gradient progress
- `en.json` — title case subtitle

**Assets added:**

- `zehani-avatar.imageset/` (elliptical transparency)
- `zehani-magic-mirror.imageset/`
- `zehani-highlight-reels.imageset/`
- `zehani-movie-interactions.imageset/`

---

### 2. Discover Tab

**Design:** `2026-03-14-10-01-02-tvos-discover-redesign.png`
**Commits:** 1

**Changes:**

- Changed feature list from vertical `LazyVStack` to 2-column `LazyVGrid`
- Cards now show remote demo thumbnails from `DiscoverConfigResponse` (same URLs iOS uses) with SF Symbol fallback
- Centered hero header with title and subtitle
- Availability badges positioned top-right on cards
- Removed per-category section headers (tabs already indicate category)
- Fixed Watch Demo: added `TVDemoVideoPlayerView` (AVPlayer-based full-screen player) and wired `fullScreenCover` on `TVDiscoverView` to present video when `pendingDemoVideoURL` is set (was broken — just dismissed the detail view)
- All cards use `.tvCardStyle()` for consistent focus

**Files modified:**

- `TVDiscoverView.swift` — centered header, video player fullScreenCover
- `TVDiscoverCategorySection.swift` — LazyVGrid, removed category header
- `TVDiscoverFeatureCard.swift` — remote thumbnails, `.tvCardStyle()`

**Files added:**

- `TVDemoVideoPlayerView.swift` — full-screen AVPlayer with `.onExitCommand` dismiss

---

### 3. Help & Support

**Design:** `2026-03-14-10-02-03-tvos-help-redesign.png`
**Commits:** 3

**Changes:**

- Extracted Help from Profile page into standalone top-level tab (`TVTab.help`)
- Used new Figma Make `HelpSupportView` with animated floating question mark, 3 feature cards (Chat with AI, Video Tutorials, Contact Support), Quick Tips panel, Common Questions accordion
- Scaled all UI elements for tvOS 10-foot viewing (title 72pt, cards 32pt bold, panels 32pt headers, rows 26pt, icons 80x80)
- Fixed card layout: all 3 feature cards in single `HStack` row (was 1 full-width + 2 side-by-side)
- Removed status bar icons (Apple TV, wifi, headphones)
- Removed footer version label
- Converted `Color(hex: String)` to `Color(hex: Int)` for BayitDesignSystem compatibility
- Removed `DragGesture` (unavailable on tvOS)
- All buttons use `.tvCardStyle()` for focus

**Files modified:**

- `TVNavigationCoordinator.swift` — added `TVTab.help` case
- `TVMainTabView.swift` — added Help tab, removed Profile tab (moved to overlay)
- `TVMainTabView+Buttons.swift` — added `profileButton` (capsule pill in top-right overlay)

**Files added:**

- `TVHelpSupportView.swift` — full Figma Make implementation adapted for tvOS

---

### 4. Search

**Design:** `2026-03-14-tvos-search-redesign.png`
**Commits:** 1

**Changes:**

- Updated section titles to match design: "Trending Searches" → "Trending Now", "Popular Searches" → "Popular"
- Verified existing implementation already matches: trending hero landscape cards (featured wider first card), recent searches chips, popular portrait poster grid, category filter pills, autocomplete suggestions
- The tvOS `.searchable()` keyboard dominates initially but content loads correctly below

**Files modified:**

- `en.json` — section title updates

**Note:** The search screen was already 90% matching. The `TVSearchTrendingRow` and `TVSearchPopularRow` components were already implemented with the correct layout. The main visual gap is the system keyboard overlay which is a tvOS platform constraint.

---

### 5. Widgets Dashboard

**Design:** `2026-03-14-tvos-widgets-redesign.png`
**Commits:** 1 (amended)

**Changes:**

- Complete redesign from poster-gallery (grouped by content type) to 3x2 purpose-built dashboard grid
- 6 specialized widget cards with unique internal layouts:
  - **Live TV Channels:** 2-row layout — feed thumbnails with title overlays + channel logo row
  - **Radio Stations:** scrollable station logos with "Now Playing..." subtitle
  - **Podcast Player:** 90px album art + title/artist text
  - **Weather:** 60pt temperature + 56pt sun icon + location text
  - **Clock:** 64pt rounded time display + day name, live 1-second timer
  - **Now Playing Mini-Player:** album art + song info + playback control icons (rewind/pause/forward)
- Dashboard grid vertically centered with 20px gaps, 60px horizontal padding
- Card shell: 28px padding, minHeight 260, 20pt corner radius, 1.5px border at 12% white, 6% white glass fill
- All interactive channel/station buttons use `.tvCardStyle()`

**Files modified:**

- `TVWidgetsView.swift` — complete rewrite
- `en.json` — added 8 locale keys for widget card titles and states

---

### 6. Systemic Focus Fix

**Commits:** 1

**Changes:**

- Replaced all custom empty `ButtonStyle` implementations (`TVZehAniCardButtonStyle`, `TVDiscoverCardButtonStyle`) with `.tvCardStyle()` from BayitDesignSystem
- `.tvCardStyle()` provides: purple border ring on focus, glow shadow, spring-animated 1.05x scale, disabled default tvOS white highlight
- Applied consistently across Zeh Ani cards, Discover cards, Help buttons

---

### 7. Profile → Overlay

**Commits:** (included in Help & Support commits)

**Changes:**

- Moved Profile from tab bar to top-right avatar button (capsule pill matching widgets/language button style)
- Profile opens as `fullScreenCover` with `.onExitCommand` dismiss
- Freed tab bar slot for Help & Support (tvOS has practical limit of ~10 visible tabs)

---

## Remaining Screens — By Priority

### Tier 1: Major Redesign Required

| Priority | Screen        | Design Image                                      | Current State                                  | Gap                                                                                                                                                      |
| -------- | ------------- | ------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Profile**   | `2026-03-14-tvos-profile-redesign.png`            | Simple vertical list with avatar + stats cards | Design shows 3-column dashboard: avatar+stats left, My Content 2x2 grid center (Favorites, Recordings, Playlists, History), Social+Settings panels right |
| 2        | **Home**      | `2026-03-14-10-00-01-tvos-home-redesign.png`      | Standard hero + shelves                        | Design shows Hebrew RTL layout, large hero banner with movie poster, radio station row with logos, AI powers promotional card                            |
| 3        | **Community** | `2026-03-14-10-01-03-tvos-community-redesign.png` | Unknown current state                          | Design shows city-based news: Jerusalem hero panorama image, article carousel with category badges (General, IDF-Ceremony), Tel Aviv section below       |

### Tier 2: Moderate Changes

| Priority | Screen                 | Design Image                                               | Current State         | Gap                                                                                                                                                                                       |
| -------- | ---------------------- | ---------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4        | **Settings**           | `2026-03-14-10-02-00-tvos-settings-redesign.png`           | Unknown               | Design shows sidebar (Account, Preferences, Playback, Security, Social, Help) + detail panel with glass rows and toggle switches                                                          |
| 5        | **Security**           | `2026-03-14-10-03-00-tvos-security-redesign.png`           | Unknown               | Design shows sidebar (Account Security, Connected Accounts, Devices, Privacy) + detail with Change Password, 2FA (enabled badge), Connected Devices, Linked Accounts (Email/Google/Apple) |
| 6        | **Connected Accounts** | `2026-03-14-10-03-01-tvos-connected-accounts-redesign.png` | Unknown               | Design shows card-per-provider (Google expanded with description, Apple, Facebook) with "Not Connected" status + "Connect" buttons                                                        |
| 7        | **BYOC**               | `2026-03-14-10-01-01-tvos-byoc-redesign.png`               | Source list view      | Design shows 2x2 grid of source cards (YouTube, IPTV, Xstream Codes, Plex) with icons + descriptions + "+ ADD" buttons, plus "Already connected" section below                            |
| 8        | **Dock**               | `2026-03-14-tvos-dock-redesign.png`                        | Horizontal glass dock | Design shows floating pill dock with 5 circular icons (Widgets, Voice, Now Playing, Audio EQ, Close) with labels                                                                          |

### Tier 3: Minor Visual Tweaks

| Priority | Screen                   | Design Image                                        | Current State                 | Gap                                                                                                                                                  |
| -------- | ------------------------ | --------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9        | **Sign In**              | `2026-03-14-10-00-00-tvos-signin-redesign.png`      | Split panel layout exists     | Glass panel styling refinement, both panels need visible rounded borders with purple accent                                                          |
| 10       | **Live TV**              | `2026-03-14-10-00-02-tvos-livetv-redesign.png`      | Channel grid exists           | Channel card styling with live feed thumbnails, LIVE badge, now-playing bar at bottom                                                                |
| 11       | **VOD**                  | `2026-03-14-10-00-03-tvos-vod-redesign.png`         | Category tabs + shelves exist | Filter tabs (All Content, Movies, Series, Collections, Actors), featured collection card with poster + description, actor spotlight                  |
| 12       | **Listen**               | `2026-03-14-10-01-00-tvos-listen-redesign.png`      | Radio + podcasts exist        | "Recently Played" section, category pills row, "Discover Podcasts" grid with "+ Add Podcast" and "Browse All" buttons                                |
| 13       | **Household**            | `2026-03-14-10-02-01-tvos-household-redesign.png`   | Unknown                       | Profile circles in horizontal row (1 filled + 4 empty dashed placeholders), "Add Profile" purple gradient button                                     |
| 14       | **Preferences/Language** | `2026-03-14-10-02-02-tvos-preferences-redesign.png` | Language settings exist       | Sidebar (Language, Playback Settings, Notifications, Audio & Subtitles, Accessibility) + language list with checkmarks, focused row purple highlight |

---

## Design Images Location

All 19 design reference images are at the project root:

```
/Users/olorin/Documents/Projects/olorin/
├── 2026-03-14-10-00-00-tvos-signin-redesign.png
├── 2026-03-14-10-00-01-tvos-home-redesign.png
├── 2026-03-14-10-00-02-tvos-livetv-redesign.png
├── 2026-03-14-10-00-03-tvos-vod-redesign.png
├── 2026-03-14-10-01-00-tvos-listen-redesign.png
├── 2026-03-14-10-01-01-tvos-byoc-redesign.png
├── 2026-03-14-10-01-02-tvos-discover-redesign.png
├── 2026-03-14-10-01-03-tvos-community-redesign.png
├── 2026-03-14-10-02-00-tvos-settings-redesign.png
├── 2026-03-14-10-02-01-tvos-household-redesign.png
├── 2026-03-14-10-02-02-tvos-preferences-redesign.png
├── 2026-03-14-10-02-03-tvos-help-redesign.png
├── 2026-03-14-10-03-00-tvos-security-redesign.png
├── 2026-03-14-10-03-01-tvos-connected-accounts-redesign.png
├── 2026-03-14-tvos-dock-redesign.png
├── 2026-03-14-tvos-profile-redesign.png
├── 2026-03-14-tvos-search-redesign.png
├── 2026-03-14-tvos-widgets-redesign.png
└── 2026-03-14-tvos-zehani-redesign.png
```

---

## Key Lessons Learned

1. **Always iterate until pixel-perfect** — "close enough" is not acceptable. Every screen must be screenshot-compared with the design and refined until they match exactly.

2. **Use `.tvCardStyle()` for ALL focusable elements** — custom empty `ButtonStyle` implementations that suppress tvOS focus ring without providing replacement feedback create a broken UX. The shared `.tvCardStyle()` provides consistent purple border + glow + scale.

3. **Scale everything for 10-foot UI** — Figma Make generates iPhone-scale code (13pt body, 17pt titles). tvOS needs 1.5-2x: body 22-26pt, titles 32-36pt, hero text 60-72pt, icons 48-80pt, padding 24-32pt.

4. **Use remote assets over static crops where possible** — the iOS app's API-driven thumbnails (e.g., `DiscoverConfigResponse.demoThumbnailUrl`) are maintained and updated; static image crops from design JPGs are frozen in time.

5. **Image transparency requires processing** — cropped design assets have visible rectangular backgrounds. Use ImageMagick elliptical feathered masks (`magick ... -draw "ellipse ..." -blur 0x50 ... -compose DstIn -composite`) to blend edges seamlessly.

6. **tvOS tab bar has a practical limit of ~10 tabs** — adding more pushes the last tabs off-screen with no overflow mechanism. Move lower-priority screens to overlays (e.g., Profile as top-right avatar button opening fullScreenCover).

7. **`CachedAsyncImage` API differs from SwiftUI `AsyncImage`** — takes `url:` + `placeholder:` closure, no `content:` phase handler. The loaded image renders automatically.

8. **tvOS `.searchable()` keyboard dominates** — the native search keyboard takes up most of the screen. Content (trending, popular) loads below it and is visible on scroll. This is a platform constraint, not a bug.
