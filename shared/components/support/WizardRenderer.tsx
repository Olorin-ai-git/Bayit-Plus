/**
 * Wizard Renderer Component (Web)
 * Remotion overlay for Remotion-powered animation sequences.
 * Only renders when a Remotion sequence is actively playing.
 * Sprite-based animations are handled by WizardStateRenderer (rendered as children).
 *
 * Platform Support:
 * - Web: Remotion live rendering (@remotion/player)
 *
 * Note: Mobile/tvOS platforms use WizardRenderer.native.tsx and WizardRenderer.tvos.tsx
 */

import React from 'react';
import { useRemotionWizard } from '../../hooks/useRemotionWizard';
import { shouldUseRemotion } from '../../remotion/utils/platform-adapter';

/**
 * Lazy load web Remotion component
 */
let RemotionWizardWeb: any = null;

function getRemotionComponent(): any {
  if (!RemotionWizardWeb) {
    try {
      RemotionWizardWeb = require('../../../web/src/components/wizard/RemotionWizard').default;
    } catch (error) {
      // Remotion web component not available on this platform
      return null;
    }
  }
  return RemotionWizardWeb;
}

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
 * Renders Remotion animation sequences when active.
 * Returns null when no sequence is playing - WizardStateRenderer
 * handles all sprite-based animations in DesktopWizardView.
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

  const useRemotion = !forceFallback && remotionEnabled && shouldUseRemotion();

  // Only render when a Remotion sequence is actively playing
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
  }

  // No Remotion sequence active - render nothing.
  // WizardStateRenderer (rendered as children in DesktopWizardView) handles all
  // sprite-based animations. This overlay only renders when Remotion is active.
  return null;
};

export default WizardRenderer;
