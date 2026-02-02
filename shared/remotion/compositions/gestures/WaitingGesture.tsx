/**
 * Waiting Gesture Composition
 * Wizard waiting patiently
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const WaitingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  const pulseOpacity = interpolate(frame, [0, 30, 60, 90], [0.3, 0.6, 0.3, 0.6]);

  // Gentle floating dots
  const dotY = interpolate(frame, [0, 60], [0, -15], {
    extrapolateRight: 'extend',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="waiting" size={330} />

      {/* Floating patience dots */}
      {[0, 1, 2].map((i) => {
        const delay = i * 20;
        const opacity = interpolate(
          frame,
          [delay, delay + 10, delay + 40, delay + 50],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'extend' }
        );

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${40 + dotY + i * 8}%`,
              left: `${48 + i * 3}%`,
              width: '6px',
              height: '6px',
              backgroundColor: '#94a3b8',
              borderRadius: '50%',
              opacity: opacity * pulseOpacity,
              boxShadow: '0 0 8px rgba(148, 163, 184, 0.5)',
            }}
          />
        );
      })}

      {/* Calm waiting glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(148, 163, 184, 0.1) 0%, transparent 70%)',
          opacity: pulseOpacity,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default WaitingGesture;
