/**
 * Reading Gesture Composition
 * Wizard reading with floating text particles
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const ReadingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  const letters = ['A', 'B', 'C', 'א', 'ב', 'ג'];

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="reading" size={330} />

      {/* Floating text particles */}
      {letters.map((letter, i) => {
        const delay = i * 6;
        const opacity = interpolate(
          frame,
          [delay, delay + 5, delay + 20, delay + 25],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'extend' }
        );
        const y = interpolate(frame - delay, [0, 25], [45, 30]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${y}%`,
              left: `${40 + i * 4}%`,
              fontSize: '14px',
              color: '#94a3b8',
              opacity,
              textShadow: '0 0 6px rgba(148, 163, 184, 0.5)',
            }}
          >
            {letter}
          </div>
        );
      })}

      {/* Reading focus glow */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%)',
          opacity: 0.5,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default ReadingGesture;
