# Bayit+ Go-to-Market Analysis

**Date**: 2026-03-06
**Status**: Strategic Decision Pending

---

## Current State

Bayit+ has a fully built iOS and tvOS app with a strong AI feature set but **no licensable streaming content**. The app currently runs against a personal movie collection which cannot be distributed.

### What We Have

| Asset                             | Readiness  | Value                                                |
| --------------------------------- | ---------- | ---------------------------------------------------- |
| Live AI dubbing (10 languages)    | Production | Very High -- no competitor does this well for Hebrew |
| Real-time translation overlays    | Production | High -- interactive subtitle + tap-to-translate      |
| AI trivia / catchup summaries     | Production | Medium -- engagement feature                         |
| Vocabulary tracker                | Production | Medium -- language learning angle                    |
| 10-language localization          | Production | High -- ready for global markets                     |
| tvOS + iOS dual-platform          | Production | High -- rare dual-platform coverage                  |
| Live Israeli radio (10+ stations) | Production | High -- fully legal, no licensing needed             |
| Podcast aggregation               | Production | High -- public RSS feeds, no licensing needed        |
| SharePlay / Watch Party           | Production | Medium -- social differentiator                      |
| Onboarding personalization        | Production | Medium -- culture/interest/language preferences      |
| Profile system (household)        | Production | Medium -- multi-user support                         |

### What We Do NOT Have

- Licensed streaming content (movies, series, documentaries)
- Content distribution agreements
- SVOD catalog

---

## Critical Constraint

**Do NOT submit to the App Store with unlicensed personal content.**

- Apple will reject the app (content rights verification)
- Even if it passed review, DMCA takedowns would follow immediately
- Legal exposure for the developer

---

## Three Viable Paths

### Path A: BYOC (Bring Your Own Content) -- Fastest to Market

**Concept**: Position Bayit+ as an AI companion app that works with content users already have access to.

**How it works**:

- Users connect their own content sources (YouTube, IPTV playlists, Plex libraries)
- Bayit+ AI layer provides dubbing, translation, trivia on top of their content
- No content licensing required -- users supply their own media

**Revenue model**: Subscription for AI features
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Radio, podcasts, YouTube with basic subtitles, 5 AI credits/day |
| Plus | $4.99/mo | Unlimited AI dubbing, translation, vocabulary tracker |
| Family | $9.99/mo | 6 profiles, all AI features, SharePlay |

**Precedent**: Language Reactor (Chrome extension for Netflix subtitles) -- 2M+ users, subscription model, no content licensing.

**Risk**: Platform TOS issues (Netflix, Disney+ block overlays). Mitigate by starting with:

- YouTube (public API, legal embedding)
- IPTV (user's own M3U playlist URLs -- legal, it's their content)
- Plex (user's own media library)

**Timeline**: 2-3 weeks to strip private content and add BYOC flow.

### Path B: Licensed Free Content -- Lower Risk, Slower

**Concept**: Curate free and public domain content, then apply the AI layer on top.

**Content sources**:

- Internet Archive -- thousands of public domain films
- Israeli public broadcasters (Kan, Keshet) -- they want international reach
- Creative Commons documentaries and shorts
- YouTube channels (embed with creator permission)
- Podcast and radio (already working)

**Revenue model**: Freemium

- Free tier: all free content with basic features
- Paid tier: AI dubbing, translation, vocabulary tracking

**Timeline**: 1-2 months for content curation and licensing conversations.

### Path C: B2B SDK -- Highest Revenue, Longest Path

**Concept**: License the AI dubbing/translation engine to other streaming platforms.

**Target customers**:

- Israeli content platforms wanting to reach diaspora audiences
- Language learning platforms (Hebrew, Yiddish, Arabic)
- Jewish community organizations and schools
- International broadcasters entering the Israeli market

**Revenue model**: Per-API-call pricing or white-label licensing.

**Timeline**: 3-6 months to package SDK, create documentation, find first customer.

---

## Recommended Strategy: Path A + B Combined

### Phase 1: App Store Submission (Now -- 2 weeks)

1. **Remove all personal/unlicensed movies** from the app
2. **Keep**: Live Israeli radio (already working), podcasts, full AI feature set
3. **Add**: YouTube player integration (legal via iframe/API) with AI overlay
4. **Add**: IPTV support -- users paste their own M3U playlist URLs
5. **Submit** to App Store as "Bayit+ -- AI-Powered Israeli Media Companion"

**App Store positioning**: NOT a streaming service. An AI companion for media consumption with built-in Israeli radio and podcasts.

### Phase 2: Content Expansion (Month 2-3)

- Add Internet Archive public domain film catalog
- Approach Kan (Israeli public broadcaster) for free content licensing
- Add Plex integration for users' own media libraries
- Launch subscription tiers

### Phase 3: Growth (Month 4+)

- Subscription model for premium AI features
- Approach Israeli content distributors (yes.co.il, Cellcom TV)
- Explore B2B licensing conversations
- Hebrew language learning marketing angle

---

## Implementation: BYOC Content Connection Flow

The key new feature needed for Phase 1 is a "Connect Your Content" screen:

### User Flow

1. Home screen shows greeting + radio/podcast content
2. "Add Content" button in home or settings
3. User can:
   - **Paste a YouTube URL or channel** -- embedded player with AI overlay
   - **Add an IPTV M3U playlist** -- parse and display channels with AI features
   - **Browse free Israeli radio** -- already done
   - **Browse podcasts** -- already done

### Technical Requirements

- YouTube iframe/API player integration (WKWebView on tvOS)
- M3U playlist parser (already exists in BayitMedia for radio)
- Content source management (UserDefaults or backend per-profile)
- AI overlay adapter for external content sources

---

## Competitive Landscape

| Competitor       | Content                 | AI Features                            | Languages | Price    |
| ---------------- | ----------------------- | -------------------------------------- | --------- | -------- |
| Language Reactor | Netflix/YouTube overlay | Subtitles only                         | 20+       | $5.99/mo |
| Lingopie         | Licensed content        | Interactive subs                       | 8         | $12/mo   |
| FluentU          | Licensed clips          | Vocab tracking                         | 10        | $30/mo   |
| **Bayit+**       | BYOC + radio + podcasts | Dubbing + translation + trivia + vocab | 10        | $4.99/mo |

**Bayit+ differentiators**:

- Only app offering live AI dubbing (not just subtitles)
- Israeli/Jewish cultural focus (unique niche)
- tvOS support (competitors are web/mobile only)
- Radio and podcast integration (no extra cost)
- SharePlay for communal viewing

---

## Key Metrics to Track

| Metric                  | Target (Month 1) | Target (Month 3) |
| ----------------------- | ---------------- | ---------------- |
| App Store downloads     | 500              | 5,000            |
| DAU                     | 50               | 500              |
| AI feature usage/day    | 100 sessions     | 2,000 sessions   |
| Free-to-paid conversion | 3%               | 5%               |
| MRR                     | $250             | $5,000           |

---

## Decision Required

Choose the implementation path and timeline. The recommendation is **Path A+B combined**, starting with BYOC in Phase 1. This gets the app to market fastest with zero content licensing risk while the AI features -- the real value -- are fully showcased.
