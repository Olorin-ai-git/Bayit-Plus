/**
 * Mobile App Configuration
 * Extends shared config pattern with mobile-specific settings.
 * All environment-dependent values loaded from process.env.
 */

import { getApiBaseUrl } from "./apiConfig";

// Get app mode from environment or default to production
const APP_MODE: "development" | "production" =
  (process.env.APP_MODE as "development" | "production") || "production";

export const isProduction = APP_MODE === "production";

export const API_BASE_URL = getApiBaseUrl();

// Timeout values from env or dev defaults
const API_TIMEOUT_PROD = Number(process.env.BAYIT_API_TIMEOUT_MS) || (__DEV__ ? 5000 : (() => { throw new Error("[AppConfig] BAYIT_API_TIMEOUT_MS is required in production"); })());
const API_TIMEOUT_DEV = Number(process.env.BAYIT_API_TIMEOUT_DEV_MS) || 30000;

export const config = {
  mode: APP_MODE,
  isProduction,

  api: {
    enabled: true,
    failFast: isProduction,
    timeout: isProduction ? API_TIMEOUT_PROD : API_TIMEOUT_DEV,
  },

  features: {
    morningRitual: true,
    trendingTopics: true,
    interactiveSubtitles: true,
    watchParty: true,
    dualClock: true,
    aiChapters: true,
    hebronicsVoice: true,
    // Mobile-specific features
    pipWidgets: true,
    voiceCommands: true,
    wakeWord: true,
    proactiveAI: true,
    sharePlay: true,
    carPlay: true,
    homeScreenWidgets: true,
    siriShortcuts: true,
  },

  // Mobile-specific settings
  mobile: {
    maxConcurrentWidgets: 2,
    widgetEdgeSnapping: true,
    hapticFeedback: true,
    backgroundAudio: true,
    pictureInPicture: true,
  },

  // Voice settings
  voice: {
    enabled: true,
    // Wake word detection is disabled - requires WakeWordModule.swift implementation
    // with Picovoice SDK for "Hey Bayit" keyword spotting. See ios/BayitPlus/README.md.
    wakeWordEnabled: false,
    alwaysOnListening: false, // User-configurable
    languages: ["he", "en", "es"],
    defaultLanguage: "he",
  },
};

export default config;
