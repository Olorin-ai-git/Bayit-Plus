/**
 * Wizard Renderer Component (tvOS)
 * Progressive enhancement wrapper for tvOS (Apple TV) platform
 * Uses pre-rendered MP4s optimized for TV with fallback to spritesheet
 */

import React, { useCallback, useEffect } from 'react';
import { useRemotionWizard } from '../../hooks/useRemotionWizard';
import { useSupportStore } from '../../stores/supportStore';
import { shouldUseRemotion, getRenderingMode } from '../../remotion/utils/platform-adapter';

// Import tvOS Remotion player
import RemotionWizardTvOS from '../../../tvos-app/src/components/wizard/RemotionWizard.tvos';

// Import existing WizardSprite for fallback
import WizardSprite from './WizardSprite.native';

export interface WizardRendererProps {
  /** Optional size override (default: 180 for tvOS) */
  size?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Optional inline styles */
  style?: object;
  /** Force fallback to spritesheet (for testing/debugging) */
  forceFallback?: boolean;
  /** Whether wizard is focusable (for focus navigation) */
  focusable?: boolean;
}

/**
 * Wizard Renderer Component (tvOS)
 *
 * Intelligently selects between Remotion (pre-rendered MP4s) and WizardSprite
 * based on platform capabilities and user preferences.
 * Optimized for 10-foot UI and TV viewing.
 */
export const WizardRenderer: React.FC<WizardRendererProps> = ({
  size = 180, // Larger default for TV
  onComplete,
  style,
  forceFallback = false,
  focusable = false,
}) => {
  const {
    isPlaying: remotionIsPlaying,
    currentSequence,
    isEnabled: remotionEnabled,
  } = useRemotionWizard();

  const {
    gestureState,
    voiceState,
    isAnimatingGesture,
  } = useSupportStore();

  // Determine if we should use Remotion
  const useRemotion = !forceFallback && remotionEnabled && shouldUseRemotion();
  const renderingMode = getRenderingMode();

  // Log rendering decision (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || __DEV__) {
      console.log('[WizardRenderer tvOS] Rendering mode:', {
        useRemotion,
        renderingMode,
        remotionEnabled,
        remotionIsPlaying,
        currentSequence,
      });
    }
  }, [useRemotion, renderingMode, remotionEnabled, remotionIsPlaying, currentSequence]);

  // Render Remotion player if enabled and sequence is playing
  if (useRemotion && remotionIsPlaying && currentSequence) {
    return (
      <RemotionWizardTvOS
        size={size}
        onComplete={onComplete}
        style={style}
        focusable={focusable}
      />
    );
  }

  // Fallback to existing WizardSprite system
  const spritesheet = gestureState || mapVoiceStateToGesture(voiceState);

  if (!spritesheet) {
    return null;
  }

  return (
    <WizardSprite
      spritesheet={spritesheet}
      size={size}
      playing={isAnimatingGesture || voiceState !== 'idle'}
      style={style}
    />
  );
};

/**
 * Map voice state to appropriate gesture for fallback
 */
function mapVoiceStateToGesture(voiceState: string): string | null {
  switch (voiceState) {
    case 'listening':
      return 'attentive';
    case 'processing':
      return 'thinking';
    case 'speaking':
      return 'presenting';
    case 'error':
      return 'confused';
    case 'idle':
    default:
      return null;
  }
}

export default WizardRenderer;
