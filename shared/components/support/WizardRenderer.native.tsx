/**
 * Wizard Renderer Component (React Native)
 * Progressive enhancement wrapper for mobile (iOS/Android) platforms
 * Uses pre-rendered MP4s with fallback to spritesheet
 */

import React, { useCallback, useEffect } from 'react';
import { useRemotionWizard } from '../../hooks/useRemotionWizard';
import { useSupportStore } from '../../stores/supportStore';
import { shouldUseRemotion, getRenderingMode } from '../../remotion/utils/platform-adapter';

// Import mobile Remotion player
import RemotionWizardNative from '../../../mobile-app/src/components/wizard/RemotionWizard.native';

// Import existing WizardSprite for fallback
import WizardSprite from './WizardSprite.native';

export interface WizardRendererProps {
  /** Optional size override */
  size?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Optional inline styles */
  style?: object;
  /** Force fallback to spritesheet (for testing/debugging) */
  forceFallback?: boolean;
}

/**
 * Wizard Renderer Component (React Native)
 *
 * Intelligently selects between Remotion (pre-rendered MP4s) and WizardSprite
 * based on platform capabilities and user preferences.
 */
export const WizardRenderer: React.FC<WizardRendererProps> = ({
  size,
  onComplete,
  style,
  forceFallback = false,
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
      console.log('[WizardRenderer] Rendering mode:', {
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
      <RemotionWizardNative
        size={size}
        onComplete={onComplete}
        style={style}
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
      size={size || 160}
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
