/**
 * Settings Types
 * Cross-platform settings type definitions for Bayit+ feature parity.
 */

// ============ PLAYBACK SETTINGS ============

export type VideoQuality = 'auto' | '4k' | '1080p' | '720p' | '480p' | '360p';
export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export interface PlaybackSettings {
  videoQuality: VideoQuality;
  cellularQuality: VideoQuality;
  autoplay: boolean;
  autoplayNextEpisode: boolean;
  autoplayCountdownSeconds: number;
  pipEnabled: boolean;
  backgroundAudio: boolean;
  downloadQuality: VideoQuality;
  wifiOnlyDownloads: boolean;
  continueWatching: boolean;
  skipIntro: boolean;
  skipCredits: boolean;
  playbackSpeed: PlaybackSpeed;
  liveTvBufferSize: number;
  hardwareAcceleration: boolean;
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  videoQuality: 'auto',
  cellularQuality: 'auto',
  autoplay: true,
  autoplayNextEpisode: true,
  autoplayCountdownSeconds: 5,
  pipEnabled: true,
  backgroundAudio: false,
  downloadQuality: 'auto',
  wifiOnlyDownloads: true,
  continueWatching: true,
  skipIntro: false,
  skipCredits: false,
  playbackSpeed: 1,
  liveTvBufferSize: 30,
  hardwareAcceleration: true,
};

// ============ AUDIO SETTINGS ============

export type AudioQuality = 'auto' | 'high' | 'medium' | 'low';

export interface AudioSettings {
  preferredLanguage: string;
  audioQuality: AudioQuality;
  spatialAudio: boolean;
  volumeNormalization: boolean;
  preferDubbedAudio: boolean;
  dubbingLanguage: string;
  monoAudio: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  preferredLanguage: 'he',
  audioQuality: 'auto',
  spatialAudio: false,
  volumeNormalization: true,
  preferDubbedAudio: false,
  dubbingLanguage: 'en',
  monoAudio: false,
};

// ============ NOTIFICATION SETTINGS ============

export type EmailDigestFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

export interface NotificationSettings {
  pushEnabled: boolean;
  newContent: boolean;
  liveTvAlerts: boolean;
  recommendations: boolean;
  promotions: boolean;
  creditsAlerts: boolean;
  emailDigestEnabled: boolean;
  emailDigestFrequency: EmailDigestFrequency;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  newContent: true,
  liveTvAlerts: true,
  recommendations: true,
  promotions: false,
  creditsAlerts: true,
  emailDigestEnabled: false,
  emailDigestFrequency: 'weekly',
  weeklyDigest: false,
  marketingEmails: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// ============ PRIVACY SETTINGS ============

export interface PrivacySettings {
  analyticsEnabled: boolean;
  crashReportsEnabled: boolean;
  personalizationEnabled: boolean;
  watchHistoryEnabled: boolean;
  searchHistoryEnabled: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  analyticsEnabled: true,
  crashReportsEnabled: true,
  personalizationEnabled: true,
  watchHistoryEnabled: true,
  searchHistoryEnabled: true,
};

// ============ PARENTAL CONTROL SETTINGS ============

export type ContentRating = 'G' | 'PG' | 'PG13' | 'R' | 'TVMA';

export interface ParentalControlSettings {
  pinEnabled: boolean;
  maxContentRating: ContentRating;
  blockExplicitContent: boolean;
  restrictPurchases: boolean;
  restrictAIFeatures: boolean;
  dailyTimeLimitMinutes: number;
  blockedCategories: string[];
  blockedChannels: string[];
  restrictedHoursEnabled: boolean;
  restrictedHoursStart: string;
  restrictedHoursEnd: string;
}

export const DEFAULT_PARENTAL_SETTINGS: ParentalControlSettings = {
  pinEnabled: false,
  maxContentRating: 'TVMA',
  blockExplicitContent: false,
  restrictPurchases: false,
  restrictAIFeatures: false,
  dailyTimeLimitMinutes: 0,
  blockedCategories: [],
  blockedChannels: [],
  restrictedHoursEnabled: false,
  restrictedHoursStart: '22:00',
  restrictedHoursEnd: '06:00',
};

// ============ SECURITY SETTINGS ============

export interface SecuritySettings {
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: '2fa_app' | '2fa_sms' | null;
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'tvos' | 'web' | 'mobile_web';
  lastActive: string;
  ipAddress: string;
  isCurrent: boolean;
}

// ============ AI FEATURE SETTINGS ============

export type TriviaDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type DubbingVoice = 'natural' | 'enhanced' | 'classic';

export interface DubbingSettings {
  autoDubEnabled: boolean;
  voicePreference: DubbingVoice;
  originalAudioMix: number;
  costPerMinuteDisplay: boolean;
}

export interface TriviaGameSettings {
  enabled: boolean;
  autoShow: boolean;
  difficulty: TriviaDifficulty;
  categories: string[];
}

export interface AIFeatureSettings {
  betaCreditsBalance: number;
  dubbing: DubbingSettings;
  trivia: TriviaGameSettings;
  betaFeatureToggles: boolean;
  betaEnrolled: boolean;
}

export const DEFAULT_DUBBING_SETTINGS: DubbingSettings = {
  autoDubEnabled: false,
  voicePreference: 'natural',
  originalAudioMix: 0.3,
  costPerMinuteDisplay: true,
};

export const DEFAULT_TRIVIA_GAME_SETTINGS: TriviaGameSettings = {
  enabled: true,
  autoShow: false,
  difficulty: 'mixed',
  categories: [],
};

// ============ ACCESSIBILITY SETTINGS ============

export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilitySettings {
  largeText: boolean;
  boldText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  audioDescriptions: boolean;
  closedCaptions: boolean;
  monoAudio: boolean;
  voiceOverHints: boolean;
  touchTargetSize: 'standard' | 'large';
  focusIndicatorSize: 'standard' | 'large';
  colorBlindMode: ColorBlindMode;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  largeText: false,
  boldText: false,
  highContrast: false,
  reduceMotion: false,
  audioDescriptions: false,
  closedCaptions: false,
  monoAudio: false,
  voiceOverHints: true,
  touchTargetSize: 'standard',
  focusIndicatorSize: 'standard',
  colorBlindMode: 'none',
};

// ============ THEME SETTINGS ============

export type ThemeMode = 'dark' | 'light' | 'system';
export type StartupScreen = 'home' | 'live_tv' | 'radio' | 'library' | 'last_used';

export interface ThemeSettings {
  mode: ThemeMode;
  startupScreen: StartupScreen;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'dark',
  startupScreen: 'home',
};
