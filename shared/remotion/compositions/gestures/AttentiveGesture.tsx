/**
 * Attentive Gesture Composition
 * Wizard in attentive idle state
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const AttentiveGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Gentle pulse glow
  const pulseOpacity = interpolate(frame, [0, 30, 60, 90, 120], [0.3, 0.5, 0.3, 0.5, 0.3]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="attentive" size={330} />

      {/* Gentle attentive glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)',
          opacity: pulseOpacity,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default AttentiveGesture;
