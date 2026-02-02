/**
 * Listening Gesture Composition
 * Wizard listening with audio wave visualization
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const ListeningGesture: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="listening" size={330} />

      {/* Audio wave bars */}
      {[0, 1, 2, 3, 4].map((i) => {
        const barHeight = interpolate(
          frame,
          [i * 5, i * 5 + 15, i * 5 + 30],
          [20, 40, 20],
          { extrapolateLeft: 'clamp', extrapolateRight: 'extend' }
        );

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '30%',
              left: `${55 + i * 4}%`,
              width: '3px',
              height: `${barHeight}px`,
              backgroundColor: '#10b981',
              borderRadius: '2px',
              opacity: 0.7,
              boxShadow: '0 0 6px #10b981',
            }}
          />
        );
      })}

      {/* Listening glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '60%',
          transform: 'translate(-50%, -50%)',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          opacity: 0.6,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default ListeningGesture;
