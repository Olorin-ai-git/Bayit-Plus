import { PlanFeature, PlanTier } from "../types/subscription";

/**
 * Plan Feature Matrix
 *
 * Two-tier model: Free and Plus.
 * Bayit+ is an AI enhancement layer over Plex/IPTV.
 * Plus unlocks AI features (dubbing, subtitles, search, catch-up).
 *
 * Feature Value Types:
 * - boolean: true (included) / false (not included)
 * - string: specific value (translation key for display)
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
      [PlanTier.FREE]: false,
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
