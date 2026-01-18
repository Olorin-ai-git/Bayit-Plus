/**
 * Support System Configuration
 * Centralized configuration for the enterprise support system
 * All values are configurable via environment variables
 */

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string): string {
  // Try Vite env first (web apps)
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  // Try process.env (Node/build time)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  return fallback;
}

/**
 * Get numeric environment variable with fallback
 */
function getEnvVarNumber(key: string, fallback: number): number {
  const value = getEnvVar(key, String(fallback));
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Get boolean environment variable with fallback
 */
function getEnvVarBool(key: string, fallback: boolean): boolean {
  const value = getEnvVar(key, String(fallback));
  return value === 'true' || value === '1';
}

/**
 * Voice Assistant Configuration
 */
export interface VoiceAssistantConfig {
  /** Whether voice assistant is enabled */
  enabled: boolean;
  /** Whether wake word detection is enabled */
  wakeWordEnabled: boolean;
  /** Wake word phrase (currently "Computer" due to free tier) */
  wakeWord: string;
  /** Maximum recording duration in milliseconds */
  maxRecordingDuration: number;
  /** Silence timeout before auto-stop in milliseconds */
  silenceTimeout: number;
  /** Audio sample rate for recording */
  sampleRate: number;
  /** Whether to auto-start listening after TTS response */
  autoResumeListening: boolean;
  /** Cooldown between wake word detections in milliseconds */
  wakeWordCooldown: number;
  /** Whether to use streaming mode for ultra-low latency (~3-5s vs ~20s) */
  useStreamingMode: boolean;
  /** Whether to prewarm the streaming pipeline on app load */
  prewarmPipeline: boolean;
}

/**
 * Documentation Configuration
 */
export interface DocumentationConfig {
  /** Whether to cache documentation locally */
  cacheEnabled: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  /** Supported languages */
  supportedLanguages: string[];
  /** Default language */
  defaultLanguage: string;
  /** Base path for documentation files */
  basePath: string;
}

/**
 * Support Ticket Configuration
 */
export interface TicketConfig {
  /** Maximum subject length */
  maxSubjectLength: number;
  /** Maximum message length */
  maxMessageLength: number;
  /** Available categories */
  categories: string[];
  /** Available priorities */
  priorities: string[];
  /** Whether to auto-detect priority from content */
  autoPriorityDetection: boolean;
}

/**
 * Chat Configuration
 */
export interface ChatConfig {
  /** Maximum tokens for support chat responses */
  maxTokens: number;
  /** Maximum number of docs to include in context */
  maxDocsInContext: number;
  /** Escalation confidence threshold (0-1) */
  escalationThreshold: number;
  /** System prompt for support chat */
  systemPromptKey: string;
}

/**
 * UI Configuration
 */
export interface UIConfig {
  /** FAB size on mobile (pixels) */
  fabSizeMobile: number;
  /** FAB size on TV (pixels) */
  fabSizeTV: number;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Whether to show the FAB on all screens */
  showFabGlobally: boolean;
  /** Screens where FAB should be hidden */
  hideFabOnScreens: string[];
}

/**
 * Platform Support Configuration
 */
export interface PlatformConfig {
  /** Web support settings */
  web: {
    wakeWordSupported: boolean;
    sttSupported: boolean;
    ttsSupported: boolean;
  };
  /** iOS support settings */
  ios: {
    wakeWordSupported: boolean;
    sttSupported: boolean;
    ttsSupported: boolean;
  };
  /** Android support settings */
  android: {
    wakeWordSupported: boolean;
    sttSupported: boolean;
    ttsSupported: boolean;
  };
  /** tvOS support settings */
  tvOS: {
    wakeWordSupported: boolean;
    sttSupported: boolean;
    ttsSupported: boolean;
    useRemoteMic: boolean;
  };
  /** Android TV support settings */
  androidTV: {
    wakeWordSupported: boolean;
    sttSupported: boolean;
    ttsSupported: boolean;
    useRemoteMic: boolean;
  };
}

/**
 * Complete Support Configuration
 */
export interface SupportConfig {
  voiceAssistant: VoiceAssistantConfig;
  documentation: DocumentationConfig;
  ticket: TicketConfig;
  chat: ChatConfig;
  ui: UIConfig;
  platform: PlatformConfig;
}

/**
 * Support system configuration
 * Values are loaded from environment variables where appropriate
 */
export const supportConfig: SupportConfig = {
  voiceAssistant: {
    enabled: getEnvVarBool('VITE_SUPPORT_VOICE_ENABLED', true),
    wakeWordEnabled: getEnvVarBool('VITE_SUPPORT_WAKE_WORD_ENABLED', true),
    wakeWord: getEnvVar('VITE_SUPPORT_WAKE_WORD', 'Computer'), // Default to built-in
    maxRecordingDuration: getEnvVarNumber('VITE_SUPPORT_MAX_RECORDING_MS', 15000),
    silenceTimeout: getEnvVarNumber('VITE_SUPPORT_SILENCE_TIMEOUT_MS', 2000),
    sampleRate: getEnvVarNumber('VITE_SUPPORT_SAMPLE_RATE', 16000),
    autoResumeListening: getEnvVarBool('VITE_SUPPORT_AUTO_RESUME', false),
    wakeWordCooldown: getEnvVarNumber('VITE_SUPPORT_WAKE_WORD_COOLDOWN_MS', 2000),
    // Streaming mode for ultra-low latency voice interactions (~3-5s vs ~20s)
    useStreamingMode: getEnvVarBool('VITE_SUPPORT_STREAMING_MODE', true),
    prewarmPipeline: getEnvVarBool('VITE_SUPPORT_PREWARM_PIPELINE', true),
  },

  documentation: {
    cacheEnabled: getEnvVarBool('VITE_SUPPORT_DOC_CACHE_ENABLED', true),
    cacheTTL: getEnvVarNumber('VITE_SUPPORT_DOC_CACHE_TTL_MS', 3600000), // 1 hour
    supportedLanguages: ['en', 'he', 'es'],
    defaultLanguage: 'en',
    basePath: '/data/support/docs',
  },

  ticket: {
    maxSubjectLength: 200,
    maxMessageLength: 5000,
    categories: ['billing', 'technical', 'feature', 'general'],
    priorities: ['low', 'medium', 'high', 'urgent'],
    autoPriorityDetection: true,
  },

  chat: {
    maxTokens: getEnvVarNumber('VITE_SUPPORT_CHAT_MAX_TOKENS', 300),
    maxDocsInContext: getEnvVarNumber('VITE_SUPPORT_MAX_DOCS_CONTEXT', 3),
    escalationThreshold: 0.5,
    systemPromptKey: 'support.systemPrompt',
  },

  ui: {
    fabSizeMobile: 64,
    fabSizeTV: 80,
    animationDuration: 300,
    showFabGlobally: true,
    hideFabOnScreens: ['VideoPlayer', 'Login', 'Register', 'Onboarding'],
  },

  platform: {
    web: {
      wakeWordSupported: true,
      sttSupported: true,
      ttsSupported: true,
    },
    ios: {
      wakeWordSupported: true,
      sttSupported: true,
      ttsSupported: true,
    },
    android: {
      wakeWordSupported: true,
      sttSupported: true,
      ttsSupported: true,
    },
    tvOS: {
      wakeWordSupported: false, // Limited on tvOS
      sttSupported: false, // Voice via Siri Remote only
      ttsSupported: true,
      useRemoteMic: true,
    },
    androidTV: {
      wakeWordSupported: false, // Limited on Android TV
      sttSupported: false, // Voice via remote mic only
      ttsSupported: true,
      useRemoteMic: true,
    },
  },
};

/**
 * Get platform-specific configuration
 */
export function getPlatformConfig(): PlatformConfig['web'] | PlatformConfig['ios'] | PlatformConfig['android'] | PlatformConfig['tvOS'] | PlatformConfig['androidTV'] {
  // Determine platform
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent.toLowerCase();

    // Check for TV platforms first
    if (userAgent.includes('appletv')) {
      return supportConfig.platform.tvOS;
    }
    if (userAgent.includes('android tv') || userAgent.includes('googletv')) {
      return supportConfig.platform.androidTV;
    }
    // Mobile platforms
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return supportConfig.platform.ios;
    }
    if (userAgent.includes('android')) {
      return supportConfig.platform.android;
    }
  }

  // Default to web
  return supportConfig.platform.web;
}

/**
 * Check if voice support is available on current platform
 */
export function isVoiceSupportAvailable(): boolean {
  const platformConfig = getPlatformConfig();
  return (
    supportConfig.voiceAssistant.enabled &&
    platformConfig.sttSupported &&
    platformConfig.ttsSupported
  );
}

/**
 * Check if wake word is available on current platform
 */
export function isWakeWordAvailable(): boolean {
  const platformConfig = getPlatformConfig();
  return (
    supportConfig.voiceAssistant.enabled &&
    supportConfig.voiceAssistant.wakeWordEnabled &&
    platformConfig.wakeWordSupported
  );
}

export default supportConfig;
