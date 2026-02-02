/**
 * Speaking Gesture Composition
 * Wizard speaking with sound wave effects
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const SpeakingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Sound waves emanating from mouth
  const wave1Opacity = interpolate(frame, [0, 10, 20, 30], [0, 0.6, 0, 0.6]);
  const wave1Scale = interpolate(frame, [0, 10, 20, 30], [0.8, 1.3, 0.8, 1.3]);

  const wave2Opacity = interpolate(frame, [5, 15, 25, 35], [0, 0.6, 0, 0.6]);
  const wave2Scale = interpolate(frame, [5, 15, 25, 35], [0.8, 1.3, 0.8, 1.3]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="speaking" size={330} />

      {/* Sound wave 1 */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '55%',
          transform: `translate(-50%, -50%) scale(${wave1Scale})`,
          width: '40px',
          height: '30px',
          border: '2px solid rgba(96, 165, 250, 0.6)',
          borderRadius: '50%',
          opacity: wave1Opacity,
        }}
      />

      {/* Sound wave 2 */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '55%',
          transform: `translate(-50%, -50%) scale(${wave2Scale})`,
          width: '40px',
          height: '30px',
          border: '2px solid rgba(96, 165, 250, 0.6)',
          borderRadius: '50%',
          opacity: wave2Opacity,
        }}
      />

      {/* Ambient voice glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.2) 0%, transparent 70%)',
          opacity: 0.5,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default SpeakingGesture;
