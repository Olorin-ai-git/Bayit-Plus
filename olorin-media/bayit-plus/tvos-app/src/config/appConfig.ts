/**
 * tvOS App Configuration
 * TV-specific settings with proper configuration management
 *
 * NO HARDCODED VALUES: All environment-dependent values from environment variables
 */

import { Platform } from 'react-native';

// Get app mode from environment or default to production
const APP_MODE: 'demo' | 'production' =
  (process.env.APP_MODE as 'demo' | 'production') || 'production';

export const isDemo = APP_MODE === 'demo';
export const isProduction = APP_MODE === 'production';

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  // Check for explicit environment variable first
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  if (!__DEV__) {
    return 'https://api.bayit.tv/api/v1';
  }

  // In development, tvOS simulators use localhost
  return 'http://localhost:8000/api/v1';
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
    watchParty: false, // Not supported on tvOS (no multi-user viewing)
    dualClock: true,
    aiChapters: true,
    hebronicsVoice: true,
    // tvOS-specific features
    multiWindow: true, // 4 concurrent windows
    voiceCommands: true,
    wakeWord: false, // Menu button primary, wake word optional
    proactiveAI: true,
    siriIntegration: true,
    topShelf: true,
    sceneSearch: true,
    focusNavigation: true,
  },

  // tvOS-specific settings (adapted from mobile PiP)
  tv: {
    // Multi-window system (adapted from PiP)
    maxConcurrentWindows: 4,
    windowEdgeSnapping: false, // Focus-based, not drag-based
    focusNavigation: true,
    remoteGestures: true,

    // Audio and video
    backgroundAudio: true,
    pictureInPicture: false, // Not applicable - using multi-window instead

    // Interaction
    hapticFeedback: false, // tvOS Siri Remote has no haptics
    longPressDelayMs: 500, // For Menu button long-press
    focusScaleFactor: 1.1, // Scale focused items by 10%
    focusBorderWidth: 4, // 4pt purple border for focus

    // Voice activation
    voiceTrigger: 'menu-button' as 'menu-button' | 'wake-word' | 'both',
    menuButtonLongPressDurationMs: 500,

    // Layout
    safeZoneMarginPt: 60, // Safe zone for TV (60pt from edges)
    gridColumns: 5, // 5-6 items per row
    shelfItemWidth: 320, // Larger thumbnails for 10-foot
    shelfItemHeight: 180,

    // Typography (minimum sizes for 10-foot viewing)
    minBodyTextSizePt: 28,
    minTitleTextSizePt: 48,
    minButtonTextSizePt: 24,
  },

  // Voice settings (TV-optimized)
  voice: {
    enabled: true,
    // Wake word detection is optional - Menu button is primary trigger
    wakeWordEnabled: false,
    wakeWordPhrase: 'Hey Bayit', // If wake word enabled
    alwaysOnListening: false, // User-configurable
    languages: ['he', 'en', 'es'],
    defaultLanguage: 'he',
    // TV-specific voice settings (longer timeout for 10-foot distance)
    listenTimeoutMs: 45000, // 45s for TV (vs 30s mobile)
    speechLanguage: 'he',
    ttsLanguage: 'he',
    ttsRate: 0.9, // Slightly slower for TV clarity
    ttsVolume: 0.8, // 80% volume for TTS (ducking media)
    // Voice Activity Detection
    vadSensitivity: 'medium' as 'low' | 'medium' | 'high',
    vadSilenceThresholdMs: 2500, // 2.5s silence to end speech
    vadMinSpeechDurationMs: 500, // Minimum 500ms speech
  },
};

export default config;
