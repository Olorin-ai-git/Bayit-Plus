/**
 * Cheering Gesture Composition
 * Wizard cheering with confetti
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const CheeringGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Confetti particles
  const confettiColors = ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'];

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="cheering" size={330} />

      {/* Confetti */}
      {Array.from({ length: 15 }).map((_, i) => {
        const delay = i * 2;
        const opacity = interpolate(frame, [delay, delay + 5, delay + 30], [0, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = interpolate(frame - delay, [0, 30], [20, 90]);
        const x = 30 + (i % 5) * 10 + Math.sin((frame - delay) * 0.1) * 5;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${y}%`,
              left: `${x}%`,
              width: '6px',
              height: '10px',
              backgroundColor: confettiColors[i % confettiColors.length],
              opacity,
              transform: `rotate(${(frame - delay) * 15}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export default CheeringGesture;
