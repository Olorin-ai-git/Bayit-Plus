/**
 * Mobile App Configuration
 * Extends shared config pattern with mobile-specific settings
 */

import { Platform } from "react-native";

// Get app mode from environment or default to production
const APP_MODE: "demo" | "production" =
  (process.env.APP_MODE as "demo" | "production") || "production";

export const isDemo = APP_MODE === "demo";
export const isProduction = APP_MODE === "production";

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return "https://api.bayit.tv/api/v1";
  }
  // In development:
  if (Platform.OS === "web") {
    return "http://localhost:8000/api/v1";
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000/api/v1"; // Android emulator localhost
  }
  return "http://localhost:8000/api/v1"; // iOS simulator
};

export const API_BASE_URL = getApiBaseUrl();

export const config = {
  mode: APP_MODE,
  isDemo,
  isProduction,

  api: {
    enabled: !isDemo,
    failFast: isProduction,
    timeout: isProduction ? 5000 : 30000,
  },

  mock: {
    enabled: isDemo,
    delay: isDemo ? 300 : 0,
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
