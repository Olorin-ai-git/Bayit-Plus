/**
 * useVoiceAvatarMode Hook
 * Manages avatar visibility mode and provides mode-specific configuration
 */

import { useMemo } from 'react';
import { useSupportStore } from '../stores/supportStore';
import { AvatarMode } from '../types/voiceAvatar';
import {
  getAvatarModeConfig,
  getAvatarDimensions,
  isAvatarModeAvailable,
  DEFAULT_AVATAR_MODE,
} from '../constants/voiceAvatarModes';

export interface UseVoiceAvatarModeReturn {
  /** Current avatar mode */
  avatarMode: AvatarMode;

  /** Set avatar mode */
  setAvatarMode: (mode: AvatarMode) => void;

  /** Mode configuration */
  config: ReturnType<typeof getAvatarModeConfig>;

  /** Dimensions for current platform */
  dimensions: { width: number; height: number };

  /** Check if mode is available on current platform */
  isAvailable: (mode: AvatarMode) => boolean;

  /** Whether to show animations */
  showAnimations: boolean;

  /** Whether to show waveform */
  showWaveform: boolean;

  /** Whether to show transcript */
  showTranscript: boolean;

  /** Whether to show wizard character */
  showWizard: boolean;

  /** Auto-collapse timeout (ms) */
  autoCollapseTimeout: number;
}

/**
 * Hook for managing avatar visibility mode
 * @param platform - Current platform (web, mobile, tv)
 */
export function useVoiceAvatarMode(
  platform: 'web' | 'mobile' | 'tv' = 'web'
): UseVoiceAvatarModeReturn {
  const avatarMode = useSupportStore((state) => state.avatarVisibilityMode);
  const setAvatarMode = useSupportStore((state) => state.setAvatarVisibilityMode);

  // Get configuration for current mode
  const config = useMemo(() => {
    return getAvatarModeConfig(avatarMode, platform);
  }, [avatarMode, platform]);

  // Get dimensions for current platform
  const dimensions = useMemo(() => {
    return getAvatarDimensions(avatarMode, platform);
  }, [avatarMode, platform]);

  // Create availability checker
  const isAvailable = useMemo(() => {
    return (mode: AvatarMode) => {
      const platformMap: Record<typeof platform, 'web' | 'ios' | 'android' | 'tvos'> = {
        web: 'web',
        mobile: 'ios', // Use iOS as default for mobile
        tv: 'tvos',
      };
      return isAvatarModeAvailable(mode, platformMap[platform]);
    };
  }, [platform]);

  return {
    avatarMode,
    setAvatarMode,
    config,
    dimensions,
    isAvailable,
    showAnimations: config.showAnimations,
    showWaveform: config.showWaveform,
    showTranscript: config.showTranscript,
    showWizard: config.showWizard,
    autoCollapseTimeout: config.autoCollapseTimeout,
  };
}

export default useVoiceAvatarMode;
