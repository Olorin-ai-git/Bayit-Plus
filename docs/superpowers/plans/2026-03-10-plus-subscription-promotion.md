# Plus Subscription Promotion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the Plus subscription ($6.99/mo, $49.99/yr) across all 5 Bayit+ platforms by injecting contextual upsell touchpoints into existing surfaces.

**Architecture:** Touchpoint injection - add promotion components at natural points in the user journey (home, player, registration, settings) without new screens. Three new shared components (CreditsBadge, PlusFeatureCard, PlusIntroSheet) plus fixes to broken wiring. All data from existing backend APIs.

**Tech Stack:** SwiftUI (iOS/tvOS), Jetpack Compose (Android), React Native Web (web), existing Glass design system, `@bayit/shared-i18n` for localization.

**Design doc:** `/Users/olorin/.claude/plans/plus-subscription-promotion.md`

---

## Chunk 1: Phase 1 - Fix Broken Wiring

### Task 1: Wire web SubscriptionSection upgrade button

**Files:**

- Modify: `web/src/components/settings/SubscriptionSection.tsx`

- [ ] **Step 1: Add useNavigate import**

In `web/src/components/settings/SubscriptionSection.tsx`, add `useNavigate` import from `react-router-dom` and initialize the hook:

```tsx
// Add to imports (line 6 area)
import { useNavigate } from "react-router-dom";

// Add inside SubscriptionSection function body (after line 30)
const navigate = useNavigate();
```

- [ ] **Step 2: Wire upgrade button onPress**

Replace the empty `onPress={() => {}}` on the upgrade `GlassButton` (line 76):

```tsx
onPress={() => navigate('/subscribe')}
```

- [ ] **Step 3: Wire billing history button onPress**

Replace the empty `onPress={() => {}}` on the billing `GlassButton` (line 86):

```tsx
onPress={() => navigate('/settings/billing')}
```

- [ ] **Step 4: Verify manually**

Run: `cd web && npm start`
Navigate to Settings > Subscription section. Click "Upgrade Plan" - should navigate to `/subscribe`. Click "Billing History" - should navigate to `/settings/billing`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/settings/SubscriptionSection.tsx
git commit -m "fix(web): wire subscription section upgrade and billing buttons"
```

---

### Task 2: Wire iOS DubbingPremiumGateView to subscription

**Files:**

- Modify: `ios-app/BayitPlusApp/Views/Player/DubbingPremiumGateView.swift`

- [ ] **Step 1: Add NavigationCoordinator environment**

Add to the struct properties (after line 11):

```swift
@Environment(NavigationCoordinator.self) private var coordinator
```

- [ ] **Step 2: Replace dismiss() with navigation in upgrade button**

Replace the upgrade button action (lines 83-86):

```swift
) {
    coordinator.navigate(to: .subscription)
    onDismiss()
}
```

- [ ] **Step 3: Localize hardcoded feature strings**

Replace the hardcoded English strings in `featuresView` (lines 52-55) with localized keys:

```swift
featureRow(icon: "captions.bubble.fill", text: localization.t("player.dubbing.feature.realtime"))
featureRow(icon: "waveform", text: localization.t("player.dubbing.feature.voices"))
featureRow(icon: "bolt.fill", text: localization.t("player.dubbing.feature.lowLatency"))
featureRow(icon: "speaker.wave.2.fill", text: localization.t("player.dubbing.feature.highQuality"))
```

- [ ] **Step 4: Add i18n keys to iOS locale files**

Add to `ios-app/Packages/BayitLocalization/Sources/Resources/en.json` inside the `"player"` block:

```json
"dubbing": {
  "feature": {
    "realtime": "Real-time dubbing in multiple languages",
    "voices": "Professional voice selection",
    "lowLatency": "Low-latency audio streaming",
    "highQuality": "High-quality audio"
  }
}
```

Add equivalent translations to all 9 other locale files (`he.json`, `es.json`, `fr.json`, `ja.json`, `zh.json`, `hi.json`, `bn.json`, `ta.json`, `it.json`).

- [ ] **Step 5: Build to verify**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
```

Expected: BUILD SUCCEEDED

- [ ] **Step 6: Commit**

```bash
git add ios-app/BayitPlusApp/Views/Player/DubbingPremiumGateView.swift
git add ios-app/Packages/BayitLocalization/Sources/Resources/*.json
git commit -m "fix(ios): wire dubbing gate to subscription and localize feature strings"
```

---

### Task 3: Simplify web subscription types to Free/Plus

**Files:**

- Modify: `shared/types/subscription.ts`
- Modify: `shared/data/planFeatures.ts`

- [ ] **Step 1: Replace PlanTier enum with Free/Plus model**

Rewrite `shared/types/subscription.ts`:

```typescript
/**
 * Subscription Plan Types
 *
 * Two-tier model matching backend: Free and Plus.
 * Plus is the AI enhancement tier for Plex/IPTV content.
 */

export enum PlanTier {
  FREE = "free",
  PLUS = "plus",
}

export type FeatureCategory = "content" | "ai" | "streaming" | "support";

export type FeatureValue = boolean | string;

export interface PlanFeatureAvailability {
  [PlanTier.FREE]: FeatureValue;
  [PlanTier.PLUS]: FeatureValue;
}

export interface PlanFeature {
  id: string;
  category: FeatureCategory;
  translationKey: string;
  availability: PlanFeatureAvailability;
}

export interface PlanConfig {
  id: PlanTier;
  price: string;
  popular?: boolean;
}

export interface SubscriptionMetadata {
  planId: string;
  billingPeriod: "monthly" | "yearly";
  startDate: string;
  endDate?: string;
  status: "active" | "cancelled" | "expired" | "trial";
}
```

- [ ] **Step 2: Replace plan features matrix with Free/Plus features**

Rewrite `shared/data/planFeatures.ts` to match the real product:

```typescript
import { PlanFeature, PlanTier } from "../types/subscription";

/**
 * Plan Feature Matrix - Free vs Plus
 *
 * Bayit+ is an AI enhancement layer over Plex/IPTV content.
 * Free tier: live channels, radio, podcasts, 50 AI credits/month.
 * Plus tier: unlimited AI features, multi-device, priority support.
 */

export const PLAN_FEATURES: PlanFeature[] = [
  // ===== CONTENT ACCESS =====
  {
    id: "live_channels",
    category: "content",
    translationKey: "plans.comparison.features.liveChannels",
    availability: {
      [PlanTier.FREE]: true,
      [PlanTier.PLUS]: true,
    },
  },
  {
    id: "radio_podcasts",
    category: "content",
    translationKey: "plans.comparison.features.radioPodcasts",
    availability: {
      [PlanTier.FREE]: true,
      [PlanTier.PLUS]: true,
    },
  },
  {
    id: "audiobooks",
    category: "content",
    translationKey: "plans.comparison.features.audiobooks",
    availability: {
      [PlanTier.FREE]: true,
      [PlanTier.PLUS]: true,
    },
  },
  {
    id: "byoc_plex_iptv",
    category: "content",
    translationKey: "plans.comparison.features.byocPlexIptv",
    availability: {
      [PlanTier.FREE]: true,
      [PlanTier.PLUS]: true,
    },
  },

  // ===== AI FEATURES =====
  {
    id: "ai_credits",
    category: "ai",
    translationKey: "plans.comparison.features.aiCredits",
    availability: {
      [PlanTier.FREE]: "plans.comparison.values.fiftyCredits",
      [PlanTier.PLUS]: "plans.comparison.values.fiveHundredCredits",
    },
  },
  {
    id: "ai_dubbing",
    category: "ai",
    translationKey: "plans.comparison.features.aiDubbing",
    availability: {
      [PlanTier.FREE]: "plans.comparison.values.creditBased",
      [PlanTier.PLUS]: true,
    },
  },
  {
    id: "ai_subtitles",
    category: "ai",
    translationKey: "plans.comparison.features.aiSubtitles",
    availability: {
      [PlanTier.FREE]: "plans.comparison.values.creditBased",
      [PlanTier.PLUS]: true,
    },
  },
  {
    id: "ai_search",
    category: "ai",
    translationKey: "plans.comparison.features.aiSearch",
    availability: {
      [PlanTier.FREE]: "plans.comparison.values.creditBased",
      [PlanTier.PLUS]: true,
    },
  },
  {
    id: "ai_catchup",
    category: "ai",
    translationKey: "plans.comparison.features.aiCatchup",
    availability: {
      [PlanTier.FREE]: false,
      [PlanTier.PLUS]: true,
    },
  },
  {
    id: "ai_talkback",
    category: "ai",
    translationKey: "plans.comparison.features.aiTalkback",
    availability: {
      [PlanTier.FREE]: "plans.comparison.values.creditBased",
      [PlanTier.PLUS]: true,
    },
  },

  // ===== STREAMING =====
  {
    id: "simultaneous_devices",
    category: "streaming",
    translationKey: "plans.comparison.features.simultaneousDevices",
    availability: {
      [PlanTier.FREE]: "1",
      [PlanTier.PLUS]: "4",
    },
  },

  // ===== SUPPORT =====
  {
    id: "customer_support",
    category: "support",
    translationKey: "plans.comparison.features.customerSupport",
    availability: {
      [PlanTier.FREE]: "plans.comparison.values.emailSupport",
      [PlanTier.PLUS]: "plans.comparison.values.prioritySupport",
    },
  },
];
```

- [ ] **Step 3: Find and fix all imports of removed PlanTier values**

Search for references to the removed enum values across the web codebase:

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus
grep -rn "PlanTier\.\(NON_REGISTERED\|REGISTERED_FREE\|BASIC\|PREMIUM\|FAMILY\)" web/ shared/ --include="*.ts" --include="*.tsx"
```

Update each file to use `PlanTier.FREE` or `PlanTier.PLUS` as appropriate. Key files expected:

- `web/src/pages/SubscribePage/components/EnhancedComparisonTable.tsx` - update `PLAN_TIERS` array and `getTierPrice`
- `web/src/pages/SubscribePage/components/PlanFeatureRow.tsx` - update tier references
- `web/src/pages/SubscribePage/components/EnhancedPlanCard.tsx` - update tier references
- `web/src/utils/security/validationSchemas.ts` - update plan validation if present

- [ ] **Step 4: Update EnhancedComparisonTable for 2-tier model**

Rewrite `PLAN_TIERS` and `getTierPrice` in `web/src/pages/SubscribePage/components/EnhancedComparisonTable.tsx`:

```tsx
const PLAN_TIERS: PlanTier[] = [PlanTier.FREE, PlanTier.PLUS];

const CATEGORY_ORDER: FeatureCategory[] = [
  "content",
  "ai",
  "streaming",
  "support",
];
```

Remove the `getTierPrice` function entirely - prices come from the backend/StoreKit, not hardcoded values. Remove the `premiumBadge` logic (was for the old PREMIUM tier). Update `isPremium` checks to `isPlus = tier === PlanTier.PLUS`.

- [ ] **Step 5: Update SubscribePage plansConfig**

In `web/src/pages/SubscribePage/index.tsx`, update `plansConfig` (line 17-20):

```tsx
const plansConfig = [
  { id: PlanTier.FREE, popular: false },
  { id: PlanTier.PLUS, popular: true },
];
```

Remove the hardcoded `price` field - prices should come from the backend or be displayed via i18n keys. Import `PlanTier` from the shared types.

- [ ] **Step 6: Add missing i18n keys for new feature matrix**

Add to `packages/ui/bayit-i18n/locales/en.json` under the `plans.comparison` namespace:

```json
"plans": {
  "comparison": {
    "features": {
      "liveChannels": "Live TV Channels",
      "radioPodcasts": "Radio & Podcasts",
      "audiobooks": "Audiobooks",
      "byocPlexIptv": "Plex & IPTV Integration",
      "aiCredits": "AI Credits",
      "aiDubbing": "AI Dubbing",
      "aiSubtitles": "Smart Subtitles",
      "aiSearch": "AI Scene Search",
      "aiCatchup": "AI Catch-Up",
      "aiTalkback": "Talk-Back to Characters"
    },
    "values": {
      "fiftyCredits": "50/month",
      "fiveHundredCredits": "500/month",
      "creditBased": "Credit-based",
      "emailSupport": "Email",
      "prioritySupport": "Priority"
    },
    "categories": {
      "content": "Content Access",
      "ai": "AI Features",
      "streaming": "Streaming",
      "support": "Support"
    }
  }
}
```

Add equivalent translations to all 9 other locale files.

- [ ] **Step 7: Build and verify**

```bash
cd web && npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add shared/types/subscription.ts shared/data/planFeatures.ts
git add web/src/pages/SubscribePage/
git add packages/ui/bayit-i18n/locales/*.json
git commit -m "refactor(web): simplify subscription types from 5-tier to Free/Plus model"
```

---

## Chunk 2: Phase 2 - Credit Visibility

### Task 4: Add i18n keys for credit badge and toast

**Files:**

- Modify: `packages/ui/bayit-i18n/locales/en.json` (+ 9 other locales)
- Modify: `ios-app/Packages/BayitLocalization/Sources/Resources/en.json` (+ 9 other locales)

- [ ] **Step 1: Add web/Android i18n keys**

Add to `packages/ui/bayit-i18n/locales/en.json` under a new `"plus"` namespace:

```json
"plus": {
  "badge": {
    "creditsRemaining": "{{count}} credits remaining",
    "unlimited": "Unlimited AI",
    "subscribedLabel": "Plus Member",
    "getUnlimited": "Get unlimited with Plus",
    "upgradeNow": "Upgrade Now",
    "creditLow": "Credits running low"
  },
  "toast": {
    "creditUsed": "Credit used",
    "remaining": "{{count}} remaining",
    "getUnlimited": "Get unlimited with Plus"
  },
  "feature": {
    "dubbing": "Watch in English with AI Dubbing",
    "subtitles": "Smart Subtitles with grammar & slang",
    "search": "Find scenes with AI Search",
    "catchup": "AI Catch-Up: never miss a moment",
    "talkback": "Talk back to your favorite characters",
    "learnMore": "Learn More"
  },
  "intro": {
    "title": "Welcome to Bayit+",
    "subtitle": "Enhance your content with AI",
    "bullet1": "AI dubbing in multiple languages",
    "bullet2": "Smart subtitles with grammar tools",
    "bullet3": "AI-powered scene search",
    "bullet4": "50 free AI credits every month",
    "seePlans": "See Plans",
    "maybeLater": "Maybe Later"
  }
}
```

Add equivalent translations to all 9 other web/Android locale files.

- [ ] **Step 2: Add iOS i18n keys**

Add the same keys to `ios-app/Packages/BayitLocalization/Sources/Resources/en.json` under a `"plus"` namespace. Use the same key structure but without interpolation templates (iOS uses `String(format:)` instead of `{{count}}`):

```json
"plus": {
  "badge": {
    "creditsRemaining": "%d credits remaining",
    "unlimited": "Unlimited AI",
    "subscribedLabel": "Plus Member",
    "getUnlimited": "Get unlimited with Plus",
    "upgradeNow": "Upgrade Now",
    "creditLow": "Credits running low"
  },
  "toast": {
    "creditUsed": "Credit used",
    "remaining": "%d remaining",
    "getUnlimited": "Get unlimited with Plus"
  },
  "feature": {
    "dubbing": "Watch in English with AI Dubbing",
    "subtitles": "Smart Subtitles with grammar & slang",
    "search": "Find scenes with AI Search",
    "catchup": "AI Catch-Up: never miss a moment",
    "talkback": "Talk back to your favorite characters",
    "learnMore": "Learn More"
  },
  "intro": {
    "title": "Welcome to Bayit+",
    "subtitle": "Enhance your content with AI",
    "bullet1": "AI dubbing in multiple languages",
    "bullet2": "Smart subtitles with grammar tools",
    "bullet3": "AI-powered scene search",
    "bullet4": "50 free AI credits every month",
    "seePlans": "See Plans",
    "maybeLater": "Maybe Later"
  }
}
```

Add equivalent translations to all 9 other iOS locale files.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/bayit-i18n/locales/*.json
git add ios-app/Packages/BayitLocalization/Sources/Resources/*.json
git commit -m "feat(i18n): add Plus promotion keys across all 10 locales"
```

---

### Task 5: Build CreditsBadge - Web

**Files:**

- Create: `web/src/components/subscription/CreditsBadge.tsx`
- Modify: `web/src/pages/HomePage.tsx` (inject badge)

- [ ] **Step 1: Create CreditsBadge component**

Create `web/src/components/subscription/CreditsBadge.tsx`:

```tsx
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassBadge } from "@bayit/shared/ui";
import { Crown, Sparkles, Zap } from "lucide-react";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import logger from "@/utils/logger";

interface CreditBalance {
  remaining_credits: number;
  total_credits: number;
  used_credits: number;
  is_low: boolean;
  is_critical: boolean;
}

type CreditStatus = "healthy" | "warning" | "depleted";

function getCreditStatus(balance: CreditBalance): CreditStatus {
  if (balance.remaining_credits <= 0) return "depleted";
  if (balance.is_low || balance.is_critical) return "warning";
  return "healthy";
}

const STATUS_COLORS: Record<CreditStatus, string> = {
  healthy: colors.success.DEFAULT,
  warning: colors.warning.DEFAULT,
  depleted: colors.error.DEFAULT,
};

export function CreditsBadge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [balance, setBalance] = useState<CreditBalance | null>(null);

  const isPlus = user?.subscription_tier === "plus";

  useEffect(() => {
    if (!isAuthenticated) return;
    loadBalance();
  }, [isAuthenticated]);

  const loadBalance = async () => {
    try {
      const data = await api.get("/beta/credits/balance");
      setBalance(data as unknown as CreditBalance);
    } catch (error) {
      logger.error("Failed to load credit balance", "CreditsBadge", error);
    }
  };

  if (!isAuthenticated || !balance) return null;

  const status = getCreditStatus(balance);
  const statusColor = STATUS_COLORS[status];
  const progress =
    balance.total_credits > 0
      ? balance.remaining_credits / balance.total_credits
      : 0;

  if (isPlus) {
    return (
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <Crown size={18} color={colors.warning.DEFAULT} />
          <Text style={styles.plusLabel}>
            {t("plus.badge.subscribedLabel")}
          </Text>
          <Text style={styles.unlimitedText}>{t("plus.badge.unlimited")}</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <Pressable onPress={() => navigate("/subscribe")}>
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <Sparkles size={18} color={statusColor} />
          <View style={styles.creditInfo}>
            <Text style={styles.creditCount}>
              {t("plus.badge.creditsRemaining", {
                count: balance.remaining_credits,
              })}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: statusColor },
                ]}
              />
            </View>
          </View>
          {status !== "healthy" && (
            <View style={styles.upgradeCta}>
              <Zap size={14} color={colors.primary.DEFAULT} />
              <Text style={styles.upgradeText}>
                {t("plus.badge.upgradeNow")}
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  plusLabel: {
    color: colors.warning.DEFAULT,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  unlimitedText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: "auto",
  },
  creditInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  creditCount: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  upgradeCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderRadius: 12,
  },
  upgradeText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: Inject CreditsBadge into HomePage**

In `web/src/pages/HomePage.tsx`, add the import and place the badge after the culture clocks section:

```tsx
// Add import
import { CreditsBadge } from "@/components/subscription/CreditsBadge";

// Add after the culture clocks View (after the ShabbatModeBanner/ShabbatEveSection area)
<CreditsBadge />;
```

- [ ] **Step 3: Build and verify**

```bash
cd web && npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/subscription/CreditsBadge.tsx web/src/pages/HomePage.tsx
git commit -m "feat(web): add CreditsBadge to home page"
```

---

### Task 6: Build CreditsBadge - iOS

**Files:**

- Create: `ios-app/BayitPlusApp/Views/Subscription/CreditsBadgeView.swift`
- Modify: `ios-app/BayitPlusApp/Views/Home/HomeView+Sections.swift` (inject badge)

- [ ] **Step 1: Create CreditsBadgeView**

Create `ios-app/BayitPlusApp/Views/Subscription/CreditsBadgeView.swift`:

```swift
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Compact credit balance widget for home screen.
/// Shows remaining AI credits with progress ring. Taps navigate to subscription.
struct CreditsBadgeView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let remainingCredits: Int
    let totalCredits: Int
    let isPlus: Bool

    private var progress: Double {
        guard totalCredits > 0 else { return 0 }
        return Double(remainingCredits) / Double(totalCredits)
    }

    private var status: CreditStatus {
        if remainingCredits <= 0 { return .depleted }
        if Double(remainingCredits) / Double(max(totalCredits, 1)) < 0.2 { return .warning }
        return .healthy
    }

    var body: some View {
        Button {
            if !isPlus {
                coordinator.navigate(to: .subscription)
            }
        } label: {
            content
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var content: some View {
        if isPlus {
            plusBadge
        } else {
            creditBadge
        }
    }

    private var plusBadge: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "crown.fill")
                .font(.system(size: 18))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(localization.t("plus.badge.subscribedLabel"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Warning.default)

            Spacer()

            Text(localization.t("plus.badge.unlimited"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
    }

    private var creditBadge: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "sparkles")
                .font(.system(size: 18))
                .foregroundStyle(status.color)

            VStack(alignment: .leading, spacing: 4) {
                Text(String(format: localization.t("plus.badge.creditsRemaining"), remainingCredits))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 4)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(status.color)
                            .frame(width: geo.size.width * progress, height: 4)
                    }
                }
                .frame(height: 4)
            }

            if status != .healthy {
                upgradePill
            }
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
    }

    private var upgradePill: some View {
        HStack(spacing: 4) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 12))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("plus.badge.upgradeNow"))
                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(DesignTokens.Primary.p400.opacity(0.15))
        .cornerRadius(12)
    }
}

// MARK: - Credit Status

private enum CreditStatus {
    case healthy, warning, depleted

    var color: Color {
        switch self {
        case .healthy: DesignTokens.Success.default
        case .warning: DesignTokens.Warning.default
        case .depleted: DesignTokens.ErrorColor.default
        }
    }
}
```

- [ ] **Step 2: Add CreditsBadgeView to HomeView+Sections**

In `ios-app/BayitPlusApp/Views/Home/HomeView+Sections.swift`, add the CreditsBadge after the Shabbat sections. This requires reading credit balance from the ViewModel. First check if `HomeViewModel` already exposes credit data — if not, add a `creditBalance` published property that calls `BetaCreditsClient.fetchBalance()`.

Add to the home sections (after shabbat banner area):

```swift
if let credits = viewModel.creditBalance {
    CreditsBadgeView(
        remainingCredits: credits.remaining,
        totalCredits: credits.total,
        isPlus: viewModel.isPlus
    )
    .padding(.horizontal, DesignTokens.Spacing.md)
}
```

- [ ] **Step 3: Build to verify**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add ios-app/BayitPlusApp/Views/Subscription/CreditsBadgeView.swift
git add ios-app/BayitPlusApp/Views/Home/HomeView+Sections.swift
git commit -m "feat(ios): add CreditsBadge to home screen"
```

---

### Task 7: Build CreditsBadge - tvOS

**Files:**

- Create: `ios-app/BayitPlusTVApp/Views/Subscription/TVCreditsBadgeView.swift`
- Modify: `ios-app/BayitPlusTVApp/Views/TVHomeView.swift` (inject badge)

- [ ] **Step 1: Create TVCreditsBadgeView**

Same structure as iOS CreditsBadgeView but adapted for tvOS focus navigation:

- Use `TVNavigationCoordinator` instead of `NavigationCoordinator`
- Navigate via `coordinator.fullscreenRoute = .subscription` (tvOS pattern)
- Use larger font sizes (`DesignTokens.FontSize.md` minimum for 10-foot UI)
- Wrap in `.focusable()` for Siri Remote navigation
- Minimum touch target 66pt (Apple TV HIG)

- [ ] **Step 2: Inject into TVHomeView**

Add after the greeting section in the `LazyVStack`.

- [ ] **Step 3: Build and commit**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlusTV -destination 'platform=tvOS Simulator,name=Apple TV 4K (3rd generation)' build 2>&1 | tail -5
git add ios-app/BayitPlusTVApp/Views/Subscription/TVCreditsBadgeView.swift ios-app/BayitPlusTVApp/Views/TVHomeView.swift
git commit -m "feat(tvos): add CreditsBadge to home screen"
```

---

### Task 8: Build CreditsBadge - Android

**Files:**

- Create: `android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/CreditsBadge.kt`
- Modify: `android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/HomeContent.kt` (inject badge)

- [ ] **Step 1: Create CreditsBadge composable**

Create `android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/CreditsBadge.kt`:

```kotlin
package tv.bayit.plus.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import tv.bayit.plus.designsystem.DesignTokens
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun CreditsBadge(
    remainingCredits: Int,
    totalCredits: Int,
    isPlus: Boolean,
    onNavigateToSubscribe: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val progress = if (totalCredits > 0) remainingCredits.toFloat() / totalCredits else 0f
    val status = when {
        remainingCredits <= 0 -> CreditStatus.DEPLETED
        progress < 0.2f -> CreditStatus.WARNING
        else -> CreditStatus.HEALTHY
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.md)
            .clip(RoundedCornerShape(DesignTokens.Radius.md))
            .glassMorphism(DesignTokens.Radius.md)
            .clickable(enabled = !isPlus) { onNavigateToSubscribe() }
            .padding(DesignTokens.Spacing.md),
    ) {
        if (isPlus) {
            PlusMemberRow()
        } else {
            CreditBalanceRow(
                remainingCredits = remainingCredits,
                progress = progress,
                status = status,
            )
        }
    }
}

@Composable
private fun PlusMemberRow() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Icon(
            imageVector = Icons.Default.AutoAwesome,
            contentDescription = null,
            tint = DesignTokens.Colors.gold,
        )
        Text(
            text = bayitString("plus.badge.subscribedLabel"),
            style = DesignTokens.Typography.labelMedium,
            color = DesignTokens.Colors.gold,
        )
        Spacer(Modifier.weight(1f))
        Text(
            text = bayitString("plus.badge.unlimited"),
            style = DesignTokens.Typography.bodySmall,
            color = DesignTokens.Colors.Text.muted,
        )
    }
}

@Composable
private fun CreditBalanceRow(
    remainingCredits: Int,
    progress: Float,
    status: CreditStatus,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Icon(
            imageVector = Icons.Default.AutoAwesome,
            contentDescription = null,
            tint = status.color,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = bayitString("plus.badge.creditsRemaining")
                    .replace("{{count}}", remainingCredits.toString()),
                style = DesignTokens.Typography.labelMedium,
                color = DesignTokens.Colors.Text.primary,
            )
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(DesignTokens.Spacing.xs)
                    .clip(RoundedCornerShape(2.dp)),
                color = status.color,
                trackColor = DesignTokens.Colors.Glass.bg,
            )
        }
        if (status != CreditStatus.HEALTHY) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .background(
                        DesignTokens.Colors.Primary.base.copy(alpha = 0.15f),
                        RoundedCornerShape(12.dp),
                    )
                    .padding(horizontal = DesignTokens.Spacing.sm, vertical = DesignTokens.Spacing.xs),
            ) {
                Icon(
                    imageVector = Icons.Default.Bolt,
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.base,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    text = bayitString("plus.badge.upgradeNow"),
                    style = DesignTokens.Typography.labelSmall,
                    color = DesignTokens.Colors.Primary.base,
                )
            }
        }
    }
}

private enum class CreditStatus {
    HEALTHY, WARNING, DEPLETED;

    val color @Composable get() = when (this) {
        HEALTHY -> DesignTokens.Colors.Semantic.success
        WARNING -> DesignTokens.Colors.Semantic.warning
        DEPLETED -> DesignTokens.Colors.Semantic.error
    }
}
```

- [ ] **Step 2: Inject into HomeContent LazyColumn**

In `android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/HomeContent.kt`, add a `CreditsBadge` item after the shabbat banner item:

```kotlin
item(key = "credits_badge") {
    CreditsBadge(
        remainingCredits = uiState.creditBalance?.remaining ?: 0,
        totalCredits = uiState.creditBalance?.total ?: 0,
        isPlus = uiState.isPlus,
        onNavigateToSubscribe = onNavigateToSubscribe,
    )
}
```

This requires the `HomeViewModel` to expose credit balance data. Add a `creditBalance` field to `HomeUiState.Success` and fetch it from `BetaCreditsRepository` during `loadHome()`.

- [ ] **Step 3: Build and commit**

```bash
cd android-app && ./gradlew :feature:feature-home:compileDebugKotlin 2>&1 | tail -5
git add android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/CreditsBadge.kt
git add android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/HomeContent.kt
git commit -m "feat(android): add CreditsBadge to home screen"
```

---

### Task 9: Build CreditsBadge - Android TV

**Files:**

- Create: `android-app/feature/feature-tv/src/main/java/tv/bayit/plus/feature/tv/home/TVCreditsBadge.kt`

- [ ] **Step 1: Create TV-adapted CreditsBadge**

Same data model as phone CreditsBadge but using `androidx.tv.material3` components, `TVDesignTokens`, and Siri Remote focus support. Show "Subscribe at bayit.tv" message instead of navigate action.

- [ ] **Step 2: Inject into TV home screen and commit**

```bash
git add android-app/feature/feature-tv/
git commit -m "feat(android-tv): add CreditsBadge to TV home screen"
```

---

### Task 10: Add credit deduction toast - Web

**Files:**

- Modify: Web AI feature invocation points (dubbing, search, subtitles hooks/services)

- [ ] **Step 1: Create useCreditToast hook**

Create `web/src/hooks/useCreditToast.ts`:

```typescript
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@olorin/glass-ui";

export function useCreditToast() {
  const { t } = useTranslation();
  const { showInfo, showWarning } = useNotifications();

  const showCreditDeduction = useCallback(
    (remainingCredits: number) => {
      const message = t("plus.toast.creditUsed");
      const remaining = t("plus.toast.remaining", { count: remainingCredits });

      if (remainingCredits <= 10 && remainingCredits > 0) {
        showWarning(
          `${message} - ${remaining}. ${t("plus.toast.getUnlimited")}`,
        );
      } else if (remainingCredits > 0) {
        showInfo(`${message} - ${remaining}`);
      }
    },
    [t, showInfo, showWarning],
  );

  return { showCreditDeduction };
}
```

- [ ] **Step 2: Integrate into AI feature service calls**

Find the web service functions that call `POST /features/deduct-credit` and wire `showCreditDeduction` after successful deduction. The response includes `remaining_credits`.

- [ ] **Step 3: Build and commit**

```bash
cd web && npm run build 2>&1 | tail -5
git add web/src/hooks/useCreditToast.ts
git commit -m "feat(web): add credit deduction toast notifications"
```

---

### Task 11: Add credit deduction feedback - iOS

**Files:**

- Create: `ios-app/BayitPlusApp/Views/Subscription/CreditToastView.swift`

- [ ] **Step 1: Create CreditToastView**

A `GlassAlert`-based inline banner shown briefly after credit deduction:

```swift
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct CreditToastView: View {
    let remainingCredits: Int
    let isLow: Bool

    @Environment(LocalizationManager.self) private var localization
    @State private var isVisible = true

    var body: some View {
        if isVisible {
            GlassAlert(
                type: isLow ? .warning : .info,
                title: localization.t("plus.toast.creditUsed"),
                message: String(format: localization.t("plus.toast.remaining"), remainingCredits)
            )
            .transition(.move(edge: .top).combined(with: .opacity))
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    withAnimation { isVisible = false }
                }
            }
        }
    }
}
```

- [ ] **Step 2: Wire into feature deduction flows**

After any `BetaCreditsClient` deduction call returns, present the `CreditToastView` as an overlay.

- [ ] **Step 3: Build and commit**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
git add ios-app/BayitPlusApp/Views/Subscription/CreditToastView.swift
git commit -m "feat(ios): add credit deduction toast overlay"
```

---

### Task 12: Add credit deduction feedback - Android

**Files:**

- Modify: Android AI feature ViewModels that call credit deduction

- [ ] **Step 1: Add credit feedback state to relevant ViewModels**

Since Android has no global snackbar, add a `creditFeedback: CreditFeedbackState?` field to ViewModels that invoke AI features. The UI composable observes this and shows an inline `GlassAlert`-style banner that auto-dismisses after 3 seconds.

```kotlin
data class CreditFeedbackState(
    val remaining: Int,
    val isLow: Boolean,
)
```

- [ ] **Step 2: Build and commit**

```bash
cd android-app && ./gradlew compileDebugKotlin 2>&1 | tail -5
git commit -m "feat(android): add credit deduction feedback banners"
```

---

## Chunk 3: Phase 3 - Contextual Feature Cards

### Task 13: Build PlusFeatureCard - Web

**Files:**

- Create: `web/src/components/subscription/PlusFeatureCard.tsx`

- [ ] **Step 1: Create PlusFeatureCard component**

```tsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { Crown, ArrowRight } from "lucide-react";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { useAuthStore } from "@/stores/authStore";

export type PlusFeature =
  | "dubbing"
  | "subtitles"
  | "search"
  | "catchup"
  | "talkback";

interface PlusFeatureCardProps {
  feature: PlusFeature;
}

export function PlusFeatureCard({ feature }: PlusFeatureCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (user?.subscription_tier === "plus") return null;

  return (
    <Pressable onPress={() => navigate("/subscribe")}>
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <Crown size={16} color={colors.warning.DEFAULT} />
          <Text style={styles.featureText} numberOfLines={1}>
            {t(`plus.feature.${feature}`)}
          </Text>
          <View style={styles.learnMore}>
            <Text style={styles.learnMoreText}>
              {t("plus.feature.learnMore")}
            </Text>
            <ArrowRight size={12} color={colors.primary.DEFAULT} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  learnMoreText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Place cards in HomePage content rows**

In `web/src/pages/HomePage.tsx`, add contextual cards next to relevant content sections. Place at most 1 per viewport:

```tsx
// After Live TV carousel
<PlusFeatureCard feature="dubbing" />;

// After first content category (if present)
{
  /* Only show if dubbing card was scrolled past */
}
<PlusFeatureCard feature="search" />;
```

- [ ] **Step 3: Build and commit**

```bash
cd web && npm run build 2>&1 | tail -5
git add web/src/components/subscription/PlusFeatureCard.tsx web/src/pages/HomePage.tsx
git commit -m "feat(web): add contextual PlusFeatureCard to home page"
```

---

### Task 14: Build PlusFeatureCard - iOS

**Files:**

- Create: `ios-app/BayitPlusApp/Views/Subscription/PlusFeatureCardView.swift`
- Modify: `ios-app/BayitPlusApp/Views/Home/HomeView+Sections.swift`

- [ ] **Step 1: Create PlusFeatureCardView**

```swift
import BayitDesignSystem
import BayitLocalization
import SwiftUI

enum PlusFeature: String, CaseIterable {
    case dubbing, subtitles, search, catchup, talkback
}

struct PlusFeatureCardView: View {
    let feature: PlusFeature

    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Button {
            coordinator.navigate(to: .subscription)
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "crown.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(DesignTokens.Warning.default)

                Text(localization.t("plus.feature.\(feature.rawValue)"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Spacer()

                HStack(spacing: 4) {
                    Text(localization.t("plus.feature.learnMore"))
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard(radius: DesignTokens.Radius.md, padding: 0)
        }
        .buttonStyle(.plain)
    }
}
```

- [ ] **Step 2: Add to HomeView+Sections after Live TV row**

```swift
// After LiveTVRow, only for free users
if !viewModel.isPlus {
    PlusFeatureCardView(feature: .dubbing)
        .padding(.horizontal, DesignTokens.Spacing.md)
}
```

- [ ] **Step 3: Build and commit**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
git add ios-app/BayitPlusApp/Views/Subscription/PlusFeatureCardView.swift ios-app/BayitPlusApp/Views/Home/HomeView+Sections.swift
git commit -m "feat(ios): add contextual PlusFeatureCard to home screen"
```

---

### Task 15: Build PlusFeatureCard - tvOS

**Files:**

- Create: `ios-app/BayitPlusTVApp/Views/Subscription/TVPlusFeatureCardView.swift`
- Modify: `ios-app/BayitPlusTVApp/Views/TVHomeView.swift`

- [ ] **Step 1: Create TV-adapted PlusFeatureCardView**

Same structure as iOS but with `.focusable()`, larger fonts, and TV navigation coordinator. On select, show subscription info directing to bayit.tv.

- [ ] **Step 2: Inject into TVHomeView and commit**

```bash
git add ios-app/BayitPlusTVApp/Views/Subscription/ ios-app/BayitPlusTVApp/Views/TVHomeView.swift
git commit -m "feat(tvos): add contextual PlusFeatureCard to home screen"
```

---

### Task 16: Build PlusFeatureCard - Android

**Files:**

- Create: `android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/PlusFeatureCard.kt`
- Modify: `android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/HomeContent.kt`

- [ ] **Step 1: Create PlusFeatureCard composable**

```kotlin
package tv.bayit.plus.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import tv.bayit.plus.designsystem.DesignTokens
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.i18n.bayitString

enum class PlusFeature { DUBBING, SUBTITLES, SEARCH, CATCHUP, TALKBACK }

@Composable
fun PlusFeatureCard(
    feature: PlusFeature,
    onNavigateToSubscribe: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val featureKey = feature.name.lowercase()

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.md)
            .clip(RoundedCornerShape(DesignTokens.Radius.md))
            .glassMorphism(DesignTokens.Radius.md)
            .clickable { onNavigateToSubscribe() }
            .padding(DesignTokens.Spacing.md),
    ) {
        Icon(
            imageVector = Icons.Default.WorkspacePremium,
            contentDescription = null,
            tint = DesignTokens.Colors.gold,
        )
        Text(
            text = bayitString("plus.feature.$featureKey"),
            style = DesignTokens.Typography.labelMedium,
            color = DesignTokens.Colors.Text.primary,
            modifier = Modifier.weight(1f),
            maxLines = 1,
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = bayitString("plus.feature.learnMore"),
                style = DesignTokens.Typography.labelSmall,
                color = DesignTokens.Colors.Primary.base,
            )
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.base,
                modifier = Modifier.size(14.dp),
            )
        }
    }
}
```

- [ ] **Step 2: Add to HomeContent after Live TV row**

```kotlin
if (!uiState.isPlus) {
    item(key = "plus_feature_dubbing") {
        PlusFeatureCard(
            feature = PlusFeature.DUBBING,
            onNavigateToSubscribe = onNavigateToSubscribe,
        )
    }
}
```

- [ ] **Step 3: Build and commit**

```bash
cd android-app && ./gradlew :feature:feature-home:compileDebugKotlin 2>&1 | tail -5
git add android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/PlusFeatureCard.kt
git add android-app/feature/feature-home/src/main/java/tv/bayit/plus/feature/home/HomeContent.kt
git commit -m "feat(android): add contextual PlusFeatureCard to home screen"
```

---

## Chunk 4: Phase 4 - Post-Registration Introduction

### Task 17: Build PlusIntroSheet - Web

**Files:**

- Create: `web/src/components/subscription/PlusIntroModal.tsx`
- Modify: `web/src/pages/RegisterPage.tsx` (trigger after registration)

- [ ] **Step 1: Create PlusIntroModal**

```tsx
import { View, Text, StyleSheet } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassModal, GlassButton } from "@bayit/shared/ui";
import { Sparkles, Mic, Subtitles, Search, Coins } from "lucide-react";
import { colors, spacing, fontSize } from "@olorin/design-tokens";

interface PlusIntroModalProps {
  isVisible: boolean;
  onDismiss: () => void;
}

const INTRO_SEEN_KEY = "bayit_plus_intro_seen";

export function hasSeenPlusIntro(): boolean {
  return localStorage.getItem(INTRO_SEEN_KEY) === "true";
}

export function markPlusIntroSeen(): void {
  localStorage.setItem(INTRO_SEEN_KEY, "true");
}

const FEATURE_ICONS = [Mic, Subtitles, Search, Coins] as const;
const FEATURE_KEYS = ["bullet1", "bullet2", "bullet3", "bullet4"] as const;

export function PlusIntroModal({ isVisible, onDismiss }: PlusIntroModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSeePlans = () => {
    markPlusIntroSeen();
    onDismiss();
    navigate("/subscribe");
  };

  const handleMaybeLater = () => {
    markPlusIntroSeen();
    onDismiss();
  };

  return (
    <GlassModal visible={isVisible} onClose={handleMaybeLater} size="medium">
      <View style={styles.content}>
        <Sparkles size={48} color={colors.primary.DEFAULT} />

        <Text style={styles.title}>{t("plus.intro.title")}</Text>
        <Text style={styles.subtitle}>{t("plus.intro.subtitle")}</Text>

        <View style={styles.features}>
          {FEATURE_KEYS.map((key, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <View key={key} style={styles.featureRow}>
                <Icon size={20} color={colors.primary.DEFAULT} />
                <Text style={styles.featureText}>{t(`plus.intro.${key}`)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <GlassButton variant="primary" onPress={handleSeePlans}>
            <Text style={styles.primaryText}>{t("plus.intro.seePlans")}</Text>
          </GlassButton>
          <GlassButton variant="ghost" onPress={handleMaybeLater}>
            <Text style={styles.ghostText}>{t("plus.intro.maybeLater")}</Text>
          </GlassButton>
        </View>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  features: {
    width: "100%",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: "500",
  },
  actions: {
    width: "100%",
    gap: spacing.sm,
  },
  primaryText: {
    color: colors.text,
    fontWeight: "700",
  },
  ghostText: {
    color: colors.textMuted,
  },
});
```

- [ ] **Step 2: Trigger after registration in RegisterPage**

In `web/src/pages/RegisterPage.tsx`, after successful registration and before `navigate('/')`:

```tsx
import {
  PlusIntroModal,
  hasSeenPlusIntro,
  markPlusIntroSeen,
} from "@/components/subscription/PlusIntroModal";

// Add state
const [showPlusIntro, setShowPlusIntro] = useState(false);

// In success handler, instead of immediate navigate:
if (!hasSeenPlusIntro()) {
  setShowPlusIntro(true);
} else {
  navigate("/", { replace: true });
}

// In render, add:
<PlusIntroModal
  isVisible={showPlusIntro}
  onDismiss={() => {
    setShowPlusIntro(false);
    navigate("/", { replace: true });
  }}
/>;
```

- [ ] **Step 3: Build and commit**

```bash
cd web && npm run build 2>&1 | tail -5
git add web/src/components/subscription/PlusIntroModal.tsx web/src/pages/RegisterPage.tsx
git commit -m "feat(web): add Plus intro modal after registration"
```

---

### Task 18: Build PlusIntroSheet - iOS

**Files:**

- Create: `ios-app/BayitPlusApp/Views/Subscription/PlusIntroSheetView.swift`
- Modify: `ios-app/BayitPlusApp/Views/Auth/AuthFlowView.swift` (trigger after registration)

- [ ] **Step 1: Create PlusIntroSheetView**

```swift
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct PlusIntroSheetView: View {
    let onSeePlans: () -> Void
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization

    private let features: [(icon: String, key: String)] = [
        ("mic.fill", "bullet1"),
        ("captions.bubble.fill", "bullet2"),
        ("magnifyingglass", "bullet3"),
        ("bitcoinsign.circle.fill", "bullet4"),
    ]

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("plus.intro.title"))
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("plus.intro.subtitle"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                ForEach(features, id: \.key) { feature in
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: feature.icon)
                            .font(.system(size: 20))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .frame(width: 28)
                        Text(localization.t("plus.intro.\(feature.key)"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
            }
            .padding(.vertical, DesignTokens.Spacing.lg)

            VStack(spacing: DesignTokens.Spacing.sm) {
                GlassButton(
                    localization.t("plus.intro.seePlans"),
                    variant: .primary,
                    size: .large,
                    icon: Image(systemName: "crown.fill")
                ) {
                    onSeePlans()
                }

                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("plus.intro.maybeLater"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .padding(DesignTokens.Spacing.xl)
    }

    // MARK: - Seen Flag

    private static let seenKey = "bayit_plus_intro_seen"

    static var hasBeenSeen: Bool {
        UserDefaults.standard.bool(forKey: seenKey)
    }

    static func markAsSeen() {
        UserDefaults.standard.set(true, forKey: seenKey)
    }
}
```

- [ ] **Step 2: Wire into post-registration flow**

In `AuthFlowView.swift`, after profile selection completes and before dismissing auth:

```swift
.sheet(isPresented: $showPlusIntro) {
    PlusIntroSheetView(
        onSeePlans: {
            PlusIntroSheetView.markAsSeen()
            showPlusIntro = false
            coordinator.navigate(to: .subscription)
        },
        onDismiss: {
            PlusIntroSheetView.markAsSeen()
            showPlusIntro = false
        }
    )
    .presentationDetents([.medium, .large])
    .presentationBackground(.ultraThinMaterial)
}
```

Check `!PlusIntroSheetView.hasBeenSeen` before setting `showPlusIntro = true`.

- [ ] **Step 3: Build and commit**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
git add ios-app/BayitPlusApp/Views/Subscription/PlusIntroSheetView.swift ios-app/BayitPlusApp/Views/Auth/AuthFlowView.swift
git commit -m "feat(ios): add Plus intro sheet after registration"
```

---

### Task 19: Build PlusIntroSheet - tvOS

**Files:**

- Create: `ios-app/BayitPlusTVApp/Views/Subscription/TVPlusIntroOverlayView.swift`
- Modify: `ios-app/BayitPlusTVApp/App/TVContentView.swift` (trigger after first auth)

- [ ] **Step 1: Create TVPlusIntroOverlayView**

Full-screen ZStack overlay (no sheets on tvOS). Same content as iOS but with TV-sized typography and focus-navigable buttons. "See Plans" button shows the subscription redirect message.

- [ ] **Step 2: Wire into TVContentView and commit**

Present as a ZStack overlay when `showingAuth` transitions from true to false and `!TVPlusIntroOverlayView.hasBeenSeen`.

```bash
git add ios-app/BayitPlusTVApp/Views/Subscription/ ios-app/BayitPlusTVApp/App/TVContentView.swift
git commit -m "feat(tvos): add Plus intro overlay after registration"
```

---

### Task 20: Build PlusIntroSheet - Android

**Files:**

- Create: `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/subscription/PlusIntroSheet.kt`
- Modify: `android-app/app/src/main/java/tv/bayit/plus/navigation/AuthNavGraph.kt`

- [ ] **Step 1: Create PlusIntroSheet composable**

```kotlin
package tv.bayit.plus.feature.auth.subscription

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.DesignTokens
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.i18n.bayitString

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlusIntroSheet(
    onSeePlans: () -> Unit,
    onDismiss: () -> Unit,
) {
    GlassModal(onDismissRequest = onDismiss) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier.padding(DesignTokens.Spacing.xl),
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.base,
                modifier = Modifier.size(48.dp),
            )

            Text(
                text = bayitString("plus.intro.title"),
                style = DesignTokens.Typography.headlineMedium,
                color = DesignTokens.Colors.Text.primary,
            )

            Text(
                text = bayitString("plus.intro.subtitle"),
                style = DesignTokens.Typography.bodyMedium,
                color = DesignTokens.Colors.Text.muted,
            )

            val features = listOf(
                Icons.Default.Mic to "bullet1",
                Icons.Default.ClosedCaption to "bullet2",
                Icons.Default.Search to "bullet3",
                Icons.Default.MonetizationOn to "bullet4",
            )

            Column(
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                modifier = Modifier.padding(vertical = DesignTokens.Spacing.lg),
            ) {
                features.forEach { (icon, key) ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = DesignTokens.Colors.Primary.base,
                        )
                        Text(
                            text = bayitString("plus.intro.$key"),
                            style = DesignTokens.Typography.bodyMedium,
                            color = DesignTokens.Colors.Text.primary,
                        )
                    }
                }
            }

            GlassButton(
                text = bayitString("plus.intro.seePlans"),
                onClick = onSeePlans,
                isPrimary = true,
                modifier = Modifier.fillMaxWidth(),
            )

            TextButton(onClick = onDismiss) {
                Text(
                    text = bayitString("plus.intro.maybeLater"),
                    color = DesignTokens.Colors.Text.muted,
                )
            }
        }
    }
}
```

- [ ] **Step 2: Wire into AuthNavGraph after profile selection**

In `AuthNavGraph.kt`, after `ProfileSelection` navigates to `Home`, check DataStore for `plus_intro_seen` flag. If not seen, show `PlusIntroSheet` before completing navigation.

- [ ] **Step 3: Build and commit**

```bash
cd android-app && ./gradlew :feature:feature-auth:compileDebugKotlin 2>&1 | tail -5
git add android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/subscription/PlusIntroSheet.kt
git add android-app/app/src/main/java/tv/bayit/plus/navigation/AuthNavGraph.kt
git commit -m "feat(android): add Plus intro sheet after registration"
```

---

## Chunk 5: Phase 5 - Settings Enhancement

### Task 21: Enhance web settings subscription row

**Files:**

- Modify: `web/src/components/settings/SubscriptionSection.tsx`

- [ ] **Step 1: Add credit balance display to SubscriptionSection**

Fetch credit balance alongside subscription data. Add a credit display row between plan/status and the action buttons:

```tsx
// Add to state
const [credits, setCredits] = useState<{
  remaining: number;
  total: number;
} | null>(null);

// Add to loadSubscription
const creditsData = await api.get("/beta/credits/balance");
setCredits(
  creditsData as unknown as {
    remaining_credits: number;
    total_credits: number;
  },
);

// Add SettingRow after status row
<SettingRow
  type="value"
  icon={Sparkles}
  label={t("plus.badge.creditsRemaining", {
    count: credits?.remaining_credits ?? 0,
  })}
  value={`${credits?.remaining_credits ?? 0} / ${credits?.total_credits ?? 0}`}
  isRTL={isRTL}
/>;
```

- [ ] **Step 2: Add colored upgrade badge for free users**

If the user is on the free plan, show a `GlassBadge` or styled indicator next to the plan name to draw attention to upgrading.

- [ ] **Step 3: Build and commit**

```bash
cd web && npm run build 2>&1 | tail -5
git add web/src/components/settings/SubscriptionSection.tsx
git commit -m "feat(web): enhance settings subscription section with credits display"
```

---

### Task 22: Enhance iOS settings subscription row

**Files:**

- Modify: `ios-app/BayitPlusApp/Views/Settings/SubscriptionView.swift`

- [ ] **Step 1: Add credit balance to SubscriptionView**

In the settings SubscriptionView, add a credit balance section for free users between the plan info and the purchase card. Use `BetaCreditsClient.fetchBalance()` to get the data.

- [ ] **Step 2: Build and commit**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlus -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
git add ios-app/BayitPlusApp/Views/Settings/SubscriptionView.swift
git commit -m "feat(ios): enhance settings subscription view with credits display"
```

---

### Task 23: Enhance Android settings subscription screen

**Files:**

- Modify: `android-app/feature/feature-settings/src/main/java/tv/bayit/plus/feature/settings/subscription/SubscriptionScreen.kt`
- Modify: `android-app/feature/feature-settings/src/main/java/tv/bayit/plus/feature/settings/subscription/SubscriptionViewModel.kt`

- [ ] **Step 1: Add credit balance to SubscriptionViewModel**

Inject `BetaCreditsRepository` and fetch balance during `loadSubscription()`. Add `creditBalance: CreditBalance?` to `SubscriptionUiState.Success`.

- [ ] **Step 2: Show credit balance in SubscriptionScreen**

Add a `GlassCard` credit display row between the plan info and the upgrade button. Show progress bar with status colors matching the CreditsBadge component.

- [ ] **Step 3: Build and commit**

```bash
cd android-app && ./gradlew :feature:feature-settings:compileDebugKotlin 2>&1 | tail -5
git add android-app/feature/feature-settings/src/main/java/tv/bayit/plus/feature/settings/subscription/
git commit -m "feat(android): enhance settings subscription screen with credits display"
```

---

### Task 24: Enhance tvOS settings subscription view

**Files:**

- Modify: `ios-app/BayitPlusTVApp/Views/Settings/TVSubscriptionView.swift`

- [ ] **Step 1: Add credit balance display**

Same pattern as iOS - fetch balance from BetaCreditsClient, show in a GlassCard section within the subscription settings view.

- [ ] **Step 2: Build and commit**

```bash
cd ios-app && xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlusTV -destination 'platform=tvOS Simulator,name=Apple TV 4K (3rd generation)' build 2>&1 | tail -5
git add ios-app/BayitPlusTVApp/Views/Settings/TVSubscriptionView.swift
git commit -m "feat(tvos): enhance settings subscription view with credits display"
```

---

## Summary

| Phase             | Tasks | Platforms | Key Deliverables                                  |
| ----------------- | ----- | --------- | ------------------------------------------------- |
| 1 - Fix Wiring    | 1-3   | Web, iOS  | Wire broken buttons, simplify 5-tier to Free/Plus |
| 2 - Credits       | 4-12  | All 5     | CreditsBadge on home, credit deduction toast      |
| 3 - Feature Cards | 13-16 | All 5     | Contextual PlusFeatureCard in content rows        |
| 4 - Intro Sheet   | 17-20 | All 5     | PlusIntroSheet after registration                 |
| 5 - Settings      | 21-24 | All 5     | Credit balance in settings subscription row       |

**Total: 24 tasks, ~50 commits**
