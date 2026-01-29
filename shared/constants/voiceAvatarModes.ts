/**
 * Voice Avatar Mode Configurations
 * Defines display sizes, behaviors, and settings for each avatar visibility mode
 */

import { AvatarMode } from '../types/voiceAvatar';

export interface AvatarModeConfig {
  /** Mode identifier */
  mode: AvatarMode;

  /** Display name (i18n key) */
  nameKey: string;

  /** Description (i18n key) */
  descriptionKey: string;

  /** Icon name */
  icon: string;

  /** Display dimensions per platform */
  dimensions: {
    web: { width: number; height: number };
    mobile: { width: number; height: number };
    tv: { width: number; height: number };
  };

  /** Whether avatar animations are shown */
  showAnimations: boolean;

  /** Whether waveform is shown */
  showWaveform: boolean;

  /** Whether transcript is shown */
  showTranscript: boolean;

  /** Whether to show full wizard character */
  showWizard: boolean;

  /** Auto-collapse timeout in ms (0 = no auto-collapse) */
  autoCollapseTimeout: number;
}

/**
 * Avatar mode configurations for all platforms
 */
export const AVATAR_MODE_CONFIGS: Record<AvatarMode, AvatarModeConfig> = {
  full: {
    mode: 'full',
    nameKey: 'voice.avatarMode.full.name',
    descriptionKey: 'voice.avatarMode.full.description',
    icon: 'wizard-full',
    dimensions: {
      web: { width: 320, height: 480 },
      mobile: { width: 240, height: 360 },
      tv: { width: 400, height: 600 },
    },
    showAnimations: true,
    showWaveform: true,
    showTranscript: true,
    showWizard: true,
    autoCollapseTimeout: 0, // No auto-collapse in full mode
  },

  compact: {
    mode: 'compact',
    nameKey: 'voice.avatarMode.compact.name',
    descriptionKey: 'voice.avatarMode.compact.description',
    icon: 'wizard-compact',
    dimensions: {
      web: { width: 160, height: 160 },
      mobile: { width: 160, height: 160 },
      tv: { width: 180, height: 180 },
    },
    showAnimations: true,
    showWaveform: false,
    showTranscript: false,
    showWizard: true,
    autoCollapseTimeout: 10000, // 10 seconds
  },

  minimal: {
    mode: 'minimal',
    nameKey: 'voice.avatarMode.minimal.name',
    descriptionKey: 'voice.avatarMode.minimal.description',
    icon: 'waveform',
    dimensions: {
      web: { width: 240, height: 80 },
      mobile: { width: 240, height: 80 },
      tv: { width: 0, height: 0 }, // Not shown on TV (too small for 10-foot UI)
    },
    showAnimations: false,
    showWaveform: true,
    showTranscript: false,
    showWizard: false,
    autoCollapseTimeout: 5000, // 5 seconds
  },

  icon_only: {
    mode: 'icon_only',
    nameKey: 'voice.avatarMode.iconOnly.name',
    descriptionKey: 'voice.avatarMode.iconOnly.description',
    icon: 'mic',
    dimensions: {
      web: { width: 64, height: 64 },
      mobile: { width: 64, height: 64 },
      tv: { width: 96, height: 96 },
    },
    showAnimations: false,
    showWaveform: false,
    showTranscript: false,
    showWizard: false,
    autoCollapseTimeout: 0, // Only FAB button shown
  },
};

/**
 * Default avatar mode
 */
export const DEFAULT_AVATAR_MODE: AvatarMode = 'full';

/**
 * Available avatar modes per platform
 */
export const PLATFORM_AVATAR_MODES: Record<string, AvatarMode[]> = {
  web: ['full', 'compact', 'minimal', 'icon_only'],
  ios: ['full', 'compact', 'minimal', 'icon_only'],
  android: ['full', 'compact', 'minimal', 'icon_only'],
  tvos: ['full', 'compact', 'icon_only'], // No minimal mode on TV (too small)
};

/**
 * Get avatar mode config for specific platform
 */
export function getAvatarModeConfig(
  mode: AvatarMode,
  platform: 'web' | 'mobile' | 'tv'
): AvatarModeConfig {
  return AVATAR_MODE_CONFIGS[mode];
}

/**
 * Get dimensions for avatar mode on specific platform
 */
export function getAvatarDimensions(
  mode: AvatarMode,
  platform: 'web' | 'mobile' | 'tv'
): { width: number; height: number } {
  return AVATAR_MODE_CONFIGS[mode].dimensions[platform];
}

/**
 * Check if avatar mode is available on platform
 */
export function isAvatarModeAvailable(
  mode: AvatarMode,
  platform: 'web' | 'ios' | 'android' | 'tvos'
): boolean {
  return PLATFORM_AVATAR_MODES[platform]?.includes(mode) ?? false;
}

export default AVATAR_MODE_CONFIGS;
