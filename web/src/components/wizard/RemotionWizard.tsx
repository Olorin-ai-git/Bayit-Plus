/**
 * Remotion Wizard Component (Web)
 * Live rendering of multi-gesture wizard animations using @remotion/player
 * Platform: Web (React)
 */

import React, { useCallback, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { useRemotionWizard } from '../../../../shared/hooks/useRemotionWizard';
import { AnimationSequence, getSequenceDefinition } from '../../../../shared/remotion/utils/sequencing';
import { REMOTION_CONFIG } from '../../../../shared/remotion/config/remotion.config';

// Import all sequence components
import { ProcessAndPresentSequence } from '../../../../shared/remotion/compositions/sequences/ProcessAndPresent';
import { SummonWizardSequence } from '../../../../shared/remotion/compositions/sequences/SummonWizard';
import { DismissWizardSequence } from '../../../../shared/remotion/compositions/sequences/DismissWizard';
import { MagicalRevealSequence } from '../../../../shared/remotion/compositions/sequences/MagicalReveal';
import { ErrorShakeSequence } from '../../../../shared/remotion/compositions/sequences/ErrorShake';
import { SuccessSequence } from '../../../../shared/remotion/compositions/sequences/Success';
import { AcknowledgeNewSequence } from '../../../../shared/remotion/compositions/sequences/AcknowledgeNew';

/**
 * Map sequence IDs to their React components
 */
const SEQUENCE_COMPONENTS: Record<AnimationSequence, React.ComponentType> = {
  process_command: ProcessAndPresentSequence,
  summon_wizard: SummonWizardSequence,
  dismiss_wizard: DismissWizardSequence,
  magical_reveal: MagicalRevealSequence,
  error_shake: ErrorShakeSequence,
  success: SuccessSequence,
  acknowledge_new: AcknowledgeNewSequence,
};

export interface RemotionWizardProps {
  /** Optional size override (default: 330px from config) */
  size?: number;
  /** Callback when animation sequence completes */
  onComplete?: () => void;
  /** Optional CSS class for container */
  className?: string;
  /** Optional inline styles for container */
  style?: React.CSSProperties;
}

/**
 * Remotion Wizard Component for Web
 *
 * Renders wizard animations using Remotion Player for live, high-quality playback.
 * Automatically syncs with global wizard state via useRemotionWizard hook.
 *
 * Features:
 * - Live rendering at 60fps
 * - Smooth particle effects
 * - Multi-gesture sequences with transitions
 * - Playback speed control
 * - Effects intensity control
 *
 * @example
 * ```tsx
 * import { RemotionWizard } from './components/wizard/RemotionWizard';
 *
 * function VoiceModal() {
 *   const handleComplete = () => {
 *     console.log('Animation complete');
 *   };
 *
 *   return <RemotionWizard onComplete={handleComplete} />;
 * }
 * ```
 */
export const RemotionWizard: React.FC<RemotionWizardProps> = ({
  size = REMOTION_CONFIG.width,
  onComplete,
  className,
  style,
}) => {
  const playerRef = React.useRef<PlayerRef>(null);
  const {
    currentSequence,
    isPlaying,
    playbackSpeed,
    effectsIntensity,
  } = useRemotionWizard();

  // Handle animation completion
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Note: Playback speed is controlled via the playbackRate prop on the Player component
  // The PlayerRef does not have a setPlaybackRate method

  // If no sequence is playing, render nothing
  if (!isPlaying || !currentSequence) {
    return null;
  }

  // Get sequence definition and component
  const sequenceDef = getSequenceDefinition(currentSequence);
  const SequenceComponent = SEQUENCE_COMPONENTS[currentSequence];

  if (!SequenceComponent) {
    console.warn(`No component found for sequence: ${currentSequence}`);
    return null;
  }

  // Calculate dimensions maintaining aspect ratio
  const aspectRatio = REMOTION_CONFIG.width / REMOTION_CONFIG.height;
  const width = size;
  const height = Math.round(size / aspectRatio);

  return (
    <div
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        ...style,
      }}
    >
      <Player
        ref={playerRef}
        component={SequenceComponent}
        durationInFrames={sequenceDef.totalFrames}
        fps={REMOTION_CONFIG.fps}
        compositionWidth={REMOTION_CONFIG.width}
        compositionHeight={REMOTION_CONFIG.height}
        controls={false}
        loop={false}
        autoPlay
        style={{
          width: '100%',
          height: '100%',
          opacity: effectsIntensity, // Control overall intensity via opacity
        }}
        playbackRate={playbackSpeed}
        inputProps={{
          effectsIntensity, // Pass intensity to composition
        }}
        renderLoading={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            }}
          >
            {/* Loading placeholder - could show last frame or spinner */}
          </div>
        )}
        errorFallback={({ error }) => (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '14px',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            Animation error: {error.message}
          </div>
        )}
        onEnded={handleComplete}
      />
    </div>
  );
};

export default RemotionWizard;
