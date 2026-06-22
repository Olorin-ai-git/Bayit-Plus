/**
 * Farewell Gesture Composition
 * Wizard waving goodbye
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const FarewellGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade sparkles
  const sparklesOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="farewell" size={330} />

      {/* Goodbye sparkles */}
      {[0, 1, 2, 3].map((i) => {
        const delay = 10 + i * 5;
        const opacity = interpolate(frame, [delay, delay + 5, delay + 15], [0, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = interpolate(frame - delay, [0, 15], [40, 25]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${y}%`,
              left: `${55 + i * 5}%`,
              fontSize: '16px',
              color: '#fbbf24',
              opacity,
              textShadow: '0 0 10px #fbbf24',
            }}
          >
            
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export default FarewellGesture;
