/**
 * Confirmation Gesture Composition
 * Wizard nodding confirmation
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const ConfirmationGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Checkmark appears
  const checkOpacity = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const checkScale = interpolate(frame, [5, 10, 15], [0.5, 1.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="confirmation" size={330} />

      {/* Confirmation checkmark */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '60%',
          fontSize: '32px',
          color: '#22c55e',
          opacity: checkOpacity,
          transform: `translate(-50%, -50%) scale(${checkScale})`,
          textShadow: '0 0 15px #22c55e',
        }}
      >
        
      </div>
    </AbsoluteFill>
  );
};

export default ConfirmationGesture;
