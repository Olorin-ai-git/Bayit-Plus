import { PlanFeature, PlanTier } from '../types/subscription';

/**
 * Comprehensive Plan Feature Matrix
 *
 * Defines all features across 5 subscription tiers:
 * - Non-Registered: Browse only, no account required
 * - Registered Free: Free account with limited features
 * - Basic: Entry-level paid plan
 * - Premium: Mid-tier with live TV and AI features
 * - Family: Full-featured family plan
 *
 * Feature Value Types:
 * - boolean: true (included) / false (not included)
 * - string: specific value (e.g., "SD", "2 devices", "Limited")
 */

export const PLAN_FEATURES: PlanFeature[] = [
  // ===== CONTENT ACCESS =====
  {
    id: 'browse_content',
    category: 'content',
    translationKey: 'plans.comparison.features.browseContent',
    availability: {
      [PlanTier.NON_REGISTERED]: true,
      [PlanTier.REGISTERED_FREE]: true,
      [PlanTier.BASIC]: true,
      [PlanTier.PREMIUM]: true,
      [PlanTier.FAMILY]: true,
    },
  },
  {
    id: 'vod_access',
    category: 'content',
    translationKey: 'plans.comparison.features.vodAccess',
    availability: {
      [PlanTier.NON_REGISTERED]: false,
      [PlanTier.REGISTERED_FREE]: false,
      [PlanTier.BASIC]: true,
      [PlanTier.PREMIUM]: true,
      [PlanTier.FAMILY]: true,
    },
  },
  {
    id: 'live_channels',
    category: 'content',
    translationKey: 'plans.comparison.features.liveChannels',
    availability: {
      [PlanTier.NON_REGISTERED]: false,
      [PlanTier.REGISTERED_FREE]: false,
      [PlanTier.BASIC]: false,
      [PlanTier.PREMIUM]: true,
      [PlanTier.FAMILY]: true,
    },
  },
  {
    id: 'radio_podcasts',
    category: 'content',
    translationKey: 'plans.comparison.features.radioPodcasts',
    availability: {
      [PlanTier.NON_REGISTERED]: false,
      [PlanTier.REGISTERED_FREE]: 'Limited',
      [PlanTier.BASIC]: true,
      [PlanTier.PREMIUM]: true,
      [PlanTier.FAMILY]: true,
    },
  },

  // ===== QUALITY & PERFORMANCE =====
  {
    id: 'video_quality',
    category: 'quality',
    translationKey: 'plans.comparison.features.videoQuality',
    availability: {
      [PlanTier.NON_REGISTERED]: '-',
      [PlanTier.REGISTERED_FREE]: '-',
      [PlanTier.BASIC]: 'SD',
      [PlanTier.PREMIUM]: 'HD',
      [PlanTier.FAMILY]: '4K',
    },
  },

  // ===== DEVICES & STREAMING =====
  {
    id: 'simultaneous_devices',
    category: 'devices',
    translationKey: 'plans.comparison.features.simultaneousDevices',
    availability: {
      [PlanTier.NON_REGISTERED]: '-',
      [PlanTier.REGISTERED_FREE]: '1',
      [PlanTier.BASIC]: '1',
      [PlanTier.PREMIUM]: '2',
      [PlanTier.FAMILY]: '4',
    },
  },

  // ===== PREMIUM FEATURES =====
  {
    id: 'ai_assistant',
    category: 'features',
    translationKey: 'plans.comparison.features.aiAssistant',
    availability: {
      [PlanTier.NON_REGISTERED]: false,
      [PlanTier.REGISTERED_FREE]: false,
      [PlanTier.BASIC]: false,
      [PlanTier.PREMIUM]: true,
      [PlanTier.FAMILY]: true,
    },
  },
  {
    id: 'family_profiles',
    category: 'features',
    translationKey: 'plans.comparison.features.familyProfiles',
    availability: {
      [PlanTier.NON_REGISTERED]: false,
      [PlanTier.REGISTERED_FREE]: false,
      [PlanTier.BASIC]: false,
      [PlanTier.PREMIUM]: false,
      [PlanTier.FAMILY]: '5 profiles',
    },
  },
  {
    id: 'offline_downloads',
    category: 'features',
    translationKey: 'plans.comparison.features.offlineDownloads',
    availability: {
      [PlanTier.NON_REGISTERED]: false,
      [PlanTier.REGISTERED_FREE]: false,
      [PlanTier.BASIC]: false,
      [PlanTier.PREMIUM]: false,
      [PlanTier.FAMILY]: true,
    },
  },

  // ===== CUSTOMER SUPPORT =====
  {
    id: 'customer_support',
    category: 'support',
    translationKey: 'plans.comparison.features.customerSupport',
    availability: {
      [PlanTier.NON_REGISTERED]: 'Email',
      [PlanTier.REGISTERED_FREE]: 'Email',
      [PlanTier.BASIC]: 'Email + Chat',
      [PlanTier.PREMIUM]: 'Priority',
      [PlanTier.FAMILY]: 'Priority',
    },
  },
];
