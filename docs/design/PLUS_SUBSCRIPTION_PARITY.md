# Plus Subscription Parity — Full Platform Alignment

**Date:** 2026-03-11
**Status:** Design Complete, Ready for Implementation
**Scope:** Backend + Android + iOS + tvOS + Web + Shared Packages

---

## Problem Statement

The "Plus" subscription upgrade experience across all platforms advertises features that don't exist (DVR, offline downloads, VOD gating, 4K, multi-stream limits, audiobooks), uses inconsistent naming ("Premium" vs "Plus"), shows contradictory credit counts (50 vs 500), has wrong pricing ($7.99 vs $6.99 vs $49.99 vs $49.90 vs $69.90), and contains a backend bug that blocks Plus users from live dubbing via WebSocket.

## What Bayit+ Is

A BYOC (Bring Your Own Content) streaming platform that enhances live TV, radio, and podcasts with 19 AI features. Plex & IPTV integration is core platform functionality, not a subscription differentiator.

## The Two Tiers

| Feature                                             | Free                             | Plus      |
| --------------------------------------------------- | -------------------------------- | --------- |
| BYOC Platform (Live TV, Radio, Podcasts, Plex/IPTV) | Yes                              | Yes       |
| 19 AI Features                                      | 50 credits (one-time, no refill) | Unlimited |
| Widgets                                             | 1                                | Unlimited |
| Family Profiles                                     | 1                                | Unlimited |
| Priority Support                                    | No                               | Yes       |

**Pricing:** $6.99/month, $49.90/year. No free trial.

## The 19 AI Features (Grouped for UI)

**Dubbing & Subtitles (8):** Live Dubbing, Live Subtitles, Subtitle Nikud, Subtitle Shoresh, Subtitle Heblish, Subtitle Grammar Flip, Subtitle Slang Synthesis, Subtitle Engrew

**Search & Discovery (3):** LLM Search, Cultural Detect, Phrase Breakdown

**Language Tools (4):** Bilingual Session, Bilingual Translate, Chat Translation, Talk Back

**Creative & Interactive (4):** Avatar Mode, Proactive Voice, Star Story Episode, Zine Generation

## Features That Do NOT Exist (Remove All References)

- DVR / recordings / recording schedules / series recording rules
- Offline downloads
- VOD content access gating
- 4K / HD quality tiers
- Multi-stream limits (4 vs 1)
- Audiobook / Audible OAuth integration
- Chapter generation subscription gate
- "5 family profiles" hardcoded cap
- Legacy 3-tier model (basic/premium/family)
- Free trial (7-day trial references)
- Monthly credit refill system

---

## Phase 1: Backend (Canonical Source)

### 1a. Fix Active Bug

| File                                        | Change                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `app/services/dubbing/websocket_helpers.py` | `check_subscription_tier(user, ["premium", "family"])` -> `check_subscription_tier(user, ["plus"])` |

### 1b. Update Subscription Plan Config

**File:** `app/models/subscription.py`

Remove from `SUBSCRIPTION_PLANS`: `max_streams`, `quality`, `includes_live`, `includes_downloads`

Update `plus.price_yearly` to `49.90`

Add: `max_widgets` (free=1, plus=unlimited), `max_profiles` (free=1, plus=unlimited), `priority_support` (free=False, plus=True)

### 1c. Remove Dead Feature Gates

| File                                       | Action                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `app/api/routes/recordings.py`             | Delete entire file                                                 |
| `app/api/routes/recording_schedules.py`    | Delete entire file                                                 |
| `app/api/routes/series_recording_rules.py` | Delete entire file                                                 |
| `app/api/routes/audible_oauth_routes.py`   | Delete entire file                                                 |
| `app/api/routes/chapters.py`               | Remove subscription gate check                                     |
| `app/api/routes/epg.py`                    | Remove `get_current_premium_user` dependency on recording endpoint |
| `app/api/dependencies/verification.py`     | Remove `can_watch_vod` dependency                                  |
| `app/models/user.py`                       | Remove `get_concurrent_stream_limit()` method                      |

### 1d. Remove Credit Refill System

| File                                                   | Action             |
| ------------------------------------------------------ | ------------------ |
| `app/services/credit_refill.py` (or wherever it lives) | Delete entire file |
| `/internal/credit-refill` endpoint                     | Remove route       |
| `BetaCreditService.refill_monthly_credits()`           | Remove method      |

### 1e. Add New Gates

- Widget creation endpoint: check count, free users limited to 1
- Profile creation endpoint: check count, free users limited to 1

### 1f. Update Plans API Response

`GET /api/v1/subscriptions/plans` returns corrected feature matrix with grouped AI categories, correct pricing, no trial.

---

## Phase 2: Shared Packages

### 2a. `shared/data/planFeatures.ts`

Replace entire feature matrix with 4 differentiators only (AI, widgets, profiles, support). Remove content/streaming/quality categories.

### 2b. `shared/types/subscription.ts`

Strip `FeatureCategory` to `"ai" | "platform" | "support"`. Remove streaming/quality types.

### 2c. `shared/i18n/locales/` (all 10 languages)

- Remove: `plans.basic.*`, `plans.premium.*`, `plans.family.*`, `plans.free.notIncluded`
- Update: `plans.free.features` -> 50 AI credits (one-time), 1 widget, 1 profile
- Update: `plans.plus.features` -> Unlimited AI (19 features), unlimited widgets, unlimited profiles, priority support
- Update: `plans.plus.yearlyPrice` -> `"49.90"`
- Add: `plans.plus.aiCategories.*` -> 4 grouped categories with counts
- Remove: All `subscribe.startTrial`, `subscribe.noCharge`, trial-related keys
- Rename: All "Premium" -> "Plus" in values
- Remove: `profile.premiumPrice` (price comes from plans config)
- Remove: `subscribe.premiumShowcase`
- Fix: All "500 credits" -> remove (Plus is unlimited), all "50 credits/month" -> "50 AI credits"

### 2d. `shared/screens/SubscribeScreen.tsx`

Replace hardcoded `basic/premium/family` plan array with data from `planFeatures.ts` using `PlanTier.FREE`/`PlanTier.PLUS`.

### 2e. Support Docs

Update `shared/data/support/docs/en/getting-started/choosing-subscription.md` from 4-tier to 2-tier model.

---

## Phase 3: Android App

| File                                             | Change                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `feature-settings/.../SubscriptionScreen.kt`     | Replace 4 FeatureRows (Live TV, VOD, Radio, Downloads) with 4 differentiators |
| `feature-auth/.../PlusIntroSheet.kt`             | Replace 4 bullets with grouped AI categories + platform features              |
| `feature-home/.../PlusFeatureCard.kt`            | Ensure promo cards reference AI categories, not content ownership             |
| `feature-auth/.../SubscriptionGateScreen.kt`     | Add missing i18n keys (`subscription.gate.*`)                                 |
| `feature-player/.../DubbingPremiumGate.kt`       | "Premium" -> "Plus", remove "Premium or Beta 500"                             |
| `feature-discover/.../DiscoverFeatureCatalog.kt` | All 19 AI features credit-gated for free (not hard-blocked)                   |

---

## Phase 4: iOS / tvOS App

| File                                    | Change                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `SubscriptionView+PlanCards.swift`      | Replace 7 features with 4 differentiators using grouped categories |
| `TVPlusIntroOverlayView.swift`          | Replace 4 bullets, remove "50 free AI credits every month"         |
| `PlusFeatureCardView.swift`             | Ensure copy doesn't imply content ownership                        |
| `DubbingPremiumGateView.swift`          | "Premium" -> "Plus"                                                |
| `TVSubscriptionGateView+PlanCard.swift` | Remove hardcoded `"$%.2f"` price format, use i18n                  |
| iOS `en.json` (BayitLocalization)       | Same updates as shared i18n                                        |

---

## Phase 5: Web App

| File                                        | Change                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SubscribePage/EnhancedPlanCard.tsx`        | Rebuild with 4 differentiators from `planFeatures.ts`                                  |
| `SubscribePage/EnhancedComparisonTable.tsx` | Strip to 4 rows only                                                                   |
| `SubscribePage/PremiumFeaturesShowcase.tsx` | Replace with grouped AI category cards                                                 |
| `SubscriptionSection.tsx`                   | Correct plan display, "50 AI credits" for free (no "per month"), hide credits for Plus |
| `DubbingPremiumGate.tsx`                    | "Premium" -> "Plus", remove hardcoded fallback                                         |
| `PlusFeatureCard.tsx`                       | "Premium" -> "Plus"                                                                    |
| `api/payment.ts`                            | Remove legacy plan ID comments                                                         |

---

## Decision Log

| #   | Decision                         | Alternatives               | Rationale                                  |
| --- | -------------------------------- | -------------------------- | ------------------------------------------ |
| 1   | Backend is canonical source      | Shared TS matrix           | Backend enforces gates, clients must match |
| 2   | Remove non-existent features     | "Coming soon" labels       | Only advertise what's built                |
| 3   | 2-tier only (Free/Plus)          | Keep legacy 3-tier         | No backend support for basic/family        |
| 4   | Grouped AI categories on UI      | List all 19, minimal list  | Communicates breadth without overwhelming  |
| 5   | 50 credits one-time, no refill   | Monthly refill             | Simple try-before-you-buy model            |
| 6   | Plus = unlimited, no metering    | 500 credits/month          | Cleaner value prop                         |
| 7   | Remove credit refill system      | Keep for future            | Dead code, YAGNI                           |
| 8   | Delete recording routes entirely | Remove gates only          | DVR not a platform feature                 |
| 9   | Delete Audible OAuth entirely    | Keep behind gate           | Audiobooks not part of BYOC                |
| 10  | Fix WebSocket gate to "plus"     | Add alongside legacy names | Clean break from legacy tiers              |
| 11  | Plex/IPTV is baseline            | Show in comparison         | Core platform, not differentiator          |
| 12  | $6.99/mo, $49.90/yr, no trial    | Keep trial                 | User-confirmed                             |
| 13  | "Plus" naming everywhere         | Keep "Premium" in places   | Consistent branding                        |
