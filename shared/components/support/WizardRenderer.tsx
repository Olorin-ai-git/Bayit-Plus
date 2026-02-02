/**
 * Wizard Renderer Component (Web)
 * Progressive enhancement wrapper for web platform
 * Provides backward compatibility with existing WizardSprite system
 *
 * Platform Support:
 * - Web: Remotion live rendering (@remotion/player) with fallback to spritesheet
 *
 * Note: Mobile/tvOS platforms use WizardRenderer.native.tsx and WizardRenderer.tvos.tsx
 */

import React, { useEffect } from 'react';
import { useRemotionWizard } from '../../hooks/useRemotionWizard';
import { useSupportStore } from '../../stores/supportStore';
import { shouldUseRemotion, getRenderingMode } from '../../remotion/utils/platform-adapter';

/**
 * Lazy load web Remotion component
 */
let RemotionWizardWeb: any = null;

function getRemotionComponent(): any {
  if (!RemotionWizardWeb) {
    try {
      RemotionWizardWeb = require('../../../web/src/components/wizard/RemotionWizard').default;
    } catch (error) {
      console.warn('[WizardRenderer] Failed to load web Remotion component:', error);
      return null;
    }
  }
  return RemotionWizardWeb;
}

/**
 * Import existing WizardSprite for fallback
 */
const WizardSprite = require('./WizardSprite.web').default;

export interface WizardRendererProps {
  /** Optional size override (platform-specific defaults) */
  size?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Optional CSS class (web only) */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties | object;
  /** Force fallback to spritesheet (for testing/debugging) */
  forceFallback?: boolean;
}

/**
 * Wizard Renderer Component
 *
 * Intelligently selects the best wizard animation renderer based on:
 * 1. Platform capabilities (web vs mobile vs tvOS)
 * 2. Remotion feature detection (browser support, hardware)
 * 3. User preferences (remotionEnabled setting)
 * 4. Fallback to existing spritesheet system if needed
 *
 * Features:
 * - Progressive enhancement (use best available renderer)
 * - Automatic platform detection
 * - Zero breaking changes (maintains WizardSprite API)
 * - Graceful degradation on unsupported platforms
 *
 * @example
 * ```tsx
 * import { WizardRenderer } from './shared/components/support/WizardRenderer';
 *
 * function VoiceChatModal() {
 *   return (
 *     <WizardRenderer
 *       size={160}
 *       onComplete={() => console.log('Animation done')}
 *     />
 *   );
 * }
 * ```
 */
export const WizardRenderer: React.FC<WizardRendererProps> = ({
  size,
  onComplete,
  className,
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[WizardRenderer] Rendering mode:', {
        useRemotion,
        renderingMode,
        remotionEnabled,
        remotionIsPlaying,
        currentSequence,
        gestureState,
        voiceState,
      });
    }
  }, [useRemotion, renderingMode, remotionEnabled, remotionIsPlaying, currentSequence, gestureState, voiceState]);

  // Render Remotion player if enabled and sequence is playing
  if (useRemotion && remotionIsPlaying && currentSequence) {
    const RemotionComponent = getRemotionComponent();

    if (RemotionComponent) {
      return (
        <RemotionComponent
          size={size}
          onComplete={onComplete}
          className={className}
          style={style}
        />
      );
    }

    // If Remotion component failed to load, fall through to WizardSprite
  }

  // Fallback to existing WizardSprite system
  // This maintains backward compatibility and handles:
  // - Platforms without Remotion support
  // - Users who disabled Remotion
  // - Error states
  // - Single-gesture animations (not multi-gesture sequences)

  // Determine spritesheet to display
  // Priority: gestureState > voiceState > default idle
  const spritesheet = gestureState || mapVoiceStateToGesture(voiceState);

  if (!spritesheet) {
    return null; // No animation to show
  }

  return (
    <WizardSprite
      spritesheet={spritesheet}
      size={size || 160} // Default 160px for backward compatibility
      playing={isAnimatingGesture || voiceState !== 'idle'}
      style={style}
      className={className}
    />
  );
};

/**
 * Map voice state to appropriate gesture for fallback
 * Maintains existing behavior when not using Remotion sequences
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
      return null; // Don't show wizard when idle
  }
}

export default WizardRenderer;
