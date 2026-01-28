/**
 * E2E Test Configuration
 * Detox configuration for end-to-end testing on Android emulator/devices
 * Supports multiple device types, API levels, and test scenarios
 */

export const E2E_CONFIG = {
  // Device configurations
  DEVICES: {
    PIXEL_5: {
      type: 'android.emu',
      device: { type: 'Pixel 5' },
      bootArgs: ['-no-boot-anim'],
    },
    PIXEL_6: {
      type: 'android.emu',
      device: { type: 'Pixel 6' },
      bootArgs: ['-no-boot-anim'],
    },
    PIXEL_6_PRO: {
      type: 'android.emu',
      device: { type: 'Pixel 6 Pro' },
      bootArgs: ['-no-boot-anim'],
    },
    PIXEL_7: {
      type: 'android.emu',
      device: { type: 'Pixel 7' },
      bootArgs: ['-no-boot-anim'],
    },
    SAMSUNG_S21: {
      type: 'android.emu',
      device: { type: 'Samsung Galaxy S21' },
      bootArgs: ['-no-boot-anim'],
    },
    SAMSUNG_S22: {
      type: 'android.emu',
      device: { type: 'Samsung Galaxy S22' },
      bootArgs: ['-no-boot-anim'],
    },
  },

  // API levels to test
  API_LEVELS: [24, 26, 28, 30, 31, 32, 33, 34, 35],

  // Screen sizes
  SCREEN_SIZES: {
    SMALL: { width: 360, height: 640 }, // 4.5"
    NORMAL: { width: 540, height: 960 }, // 6"
    LARGE: { width: 720, height: 1280 }, // 6.5"
    XLARGE: { width: 1080, height: 1920 }, // 7"
    FOLDABLE: { width: 840, height: 1752 }, // Samsung Galaxy Z Fold
  },

  // Test timeouts
  TIMEOUTS: {
    SYNC: 10000, // 10 seconds
    INTERACTION: 5000, // 5 seconds
    NAVIGATION: 3000, // 3 seconds
    ANIMATION: 1000, // 1 second
    NETWORK: 15000, // 15 seconds
  },

  // Network conditions
  NETWORK_CONDITIONS: {
    WIFI: { download: 50, upload: 50, latency: 10 },
    FAST_4G: { download: 15, upload: 8, latency: 50 },
    SLOW_4G: { download: 5, upload: 2, latency: 150 },
    EDGE: { download: 0.4, upload: 0.1, latency: 400 },
    OFFLINE: { download: 0, upload: 0, latency: 0 },
  },

  // Test categories
  TEST_CATEGORIES: {
    SMOKE: 'smoke', // Quick sanity tests (5-10 min)
    CORE: 'core', // Core feature tests (30-45 min)
    FULL: 'full', // Full regression suite (2-3 hours)
    SOAK: 'soak', // Extended soak tests (12+ hours)
  },

  // Screenshot settings
  SCREENSHOTS: {
    TAKE_ON_FAILURE: true,
    TAKE_EVERY_INTERACTION: false,
    COMPARE_BASELINES: true,
    OUTPUT_DIR: './artifacts/screenshots',
  },

  // Video recording
  RECORDING: {
    ENABLED: true,
    RECORD_FAILURES: true,
    RECORD_ALL: false,
    OUTPUT_DIR: './artifacts/videos',
  },

  // Performance thresholds
  PERFORMANCE: {
    STARTUP_TIME: 3000, // 3 seconds
    NAVIGATION_TIME: 300, // 300ms
    RENDER_TIME: 500, // 500ms
    SCROLL_FPS: 60, // 60 FPS
  },

  // Retry settings
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second between retries
    FLAKY_TESTS: [
      // Tests known to be flaky - retry more
      'test_network_timeout_handling',
      'test_video_streaming_quality_switch',
      'test_download_resume',
    ],
  },

  // Test data
  TEST_DATA: {
    VALID_LOGIN: { email: 'test@example.com', password: 'TestPassword123!' },
    INVALID_LOGIN: { email: 'invalid@example.com', password: 'wrong' },
    VALID_CONTENT_ID: 'content_123456',
    VALID_DOWNLOAD_URL: 'https://api.example.com/media/test_video.mp4',
  },

  // Detox configuration
  DETOX: {
    configurations: {
      'android.emu.debug': {
        type: 'android.emu',
        device: { type: 'Pixel 5' },
        app: 'android.debug',
      },
      'android.emu.release': {
        type: 'android.emu',
        device: { type: 'Pixel 5' },
        app: 'android.release',
      },
    },
    apps: {
      'android.debug': {
        type: 'android.apk',
        binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
        build:
          'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
      },
      'android.release': {
        type: 'android.apk',
        binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
        build:
          'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
      },
    },
    testRunner: 'jest',
  },
};

/**
 * Test scenario sets
 */
export const TEST_SCENARIOS = {
  AUTHENTICATION: {
    name: 'Authentication Flow',
    tests: [
      'test_login_valid_credentials',
      'test_login_invalid_credentials',
      'test_biometric_auth',
      'test_logout',
      'test_session_timeout',
      'test_token_refresh',
    ],
    estimatedTime: '15 min',
  },

  NAVIGATION: {
    name: 'Navigation & Screens',
    tests: [
      'test_bottom_tab_navigation',
      'test_all_39_screens_load',
      'test_back_button_behavior',
      'test_deep_linking',
      'test_navigation_stack',
    ],
    estimatedTime: '20 min',
  },

  VIDEO_PLAYBACK: {
    name: 'Video Playback',
    tests: [
      'test_play_hls_stream',
      'test_play_dash_stream',
      'test_quality_switching',
      'test_seek_functionality',
      'test_fullscreen_mode',
      'test_subtitles_display',
      'test_resume_playback',
    ],
    estimatedTime: '25 min',
  },

  DOWNLOADS: {
    name: 'Download Management',
    tests: [
      'test_start_download',
      'test_pause_resume_download',
      'test_cancel_download',
      'test_download_progress_tracking',
      'test_download_speed_calculation',
      'test_offline_playback',
      'test_storage_quota_check',
    ],
    estimatedTime: '20 min',
  },

  LIVE_FEATURES: {
    name: 'Live Features (WebSocket)',
    tests: [
      'test_watch_party_sync',
      'test_live_subtitles',
      'test_live_chat_messages',
      'test_real_time_notifications',
      'test_connection_recovery',
    ],
    estimatedTime: '20 min',
  },

  VOICE_FEATURES: {
    name: 'Voice Features',
    tests: [
      'test_voice_recognition_english',
      'test_voice_recognition_hebrew',
      'test_voice_recognition_spanish',
      'test_tts_playback',
      'test_voice_commands',
    ],
    estimatedTime: '15 min',
  },

  ACCESSIBILITY: {
    name: 'Accessibility (WCAG 2.1 AA)',
    tests: [
      'test_screen_reader_navigation',
      'test_color_contrast_ratios',
      'test_touch_target_sizes',
      'test_keyboard_navigation',
      'test_focus_visible',
    ],
    estimatedTime: '15 min',
  },

  PERFORMANCE: {
    name: 'Performance & Benchmarks',
    tests: [
      'test_startup_time',
      'test_navigation_latency',
      'test_screen_render_time',
      'test_memory_usage',
      'test_frame_rate_consistency',
      'test_network_timeout_handling',
    ],
    estimatedTime: '20 min',
  },

  INTERNATIONALIZATION: {
    name: 'i18n & RTL',
    tests: [
      'test_language_switching_english',
      'test_language_switching_hebrew',
      'test_rtl_layout_hebrew',
      'test_date_formatting_locales',
      'test_number_formatting_locales',
    ],
    estimatedTime: '12 min',
  },

  SECURITY: {
    name: 'Security & Encryption',
    tests: [
      'test_token_encryption',
      'test_biometric_token_storage',
      'test_session_security',
      'test_https_only',
      'test_secure_headers',
    ],
    estimatedTime: '12 min',
  },
};

/**
 * Get scenario test list
 */
export function getScenarioTests(scenarioName: string): string[] {
  return TEST_SCENARIOS[scenarioName as keyof typeof TEST_SCENARIOS]?.tests || [];
}

/**
 * Get total estimated time for all scenarios
 */
export function getTotalEstimatedTime(): string {
  const scenarios = Object.values(TEST_SCENARIOS);
  const minutes = scenarios.reduce((sum, s) => {
    const match = s.estimatedTime.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);
  return `${minutes} minutes (~${Math.ceil(minutes / 60)} hours)`;
}

export default E2E_CONFIG;
