import { PlanFeature, PlanTier } from "../types/subscription";

/**
 * Plan Feature Matrix
 *
 * Two-tier model: Free and Plus.
 * Bayit+ is a BYOC platform. Plex/IPTV/Live TV/Radio/Podcasts are baseline
 * for all users and NOT shown in the comparison table.
 *
 * Only differentiators between Free and Plus are listed here.
 */

export const PLAN_FEATURES: PlanFeature[] = [
  // ===== AI FEATURES (19 total, grouped into 4 categories) =====
  {
    id: "ai_features",
    category: "ai",
    translationKey: "plans.comparison.features.aiFeatures",
    availability: {
      [PlanTier.FREE]: "plans.comparison.values.fiftyCredits",
      [PlanTier.PLUS]: "plans.comparison.values.unlimited",
    },
  },

  // ===== PLATFORM =====
  {
    id: "widgets",
    category: "platform",
    translationKey: "plans.comparison.features.widgets",
    availability: {
      [PlanTier.FREE]: "1",
      [PlanTier.PLUS]: "plans.comparison.values.unlimited",
    },
  },
  {
    id: "family_profiles",
    category: "platform",
    translationKey: "plans.comparison.features.familyProfiles",
    availability: {
      [PlanTier.FREE]: "1",
      [PlanTier.PLUS]: "plans.comparison.values.unlimited",
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

/**
 * AI Feature Categories for grouped display on upgrade screens.
 * Each category contains a count and translation key.
 */
export const AI_FEATURE_CATEGORIES = [
  {
    id: "dubbing_subtitles",
    translationKey: "plans.plus.aiCategories.dubbingSubtitles",
    count: 8,
  },
  {
    id: "search_discovery",
    translationKey: "plans.plus.aiCategories.searchDiscovery",
    count: 3,
  },
  {
    id: "language_tools",
    translationKey: "plans.plus.aiCategories.languageTools",
    count: 4,
  },
  {
    id: "creative_interactive",
    translationKey: "plans.plus.aiCategories.creativeInteractive",
    count: 4,
  },
] as const;
