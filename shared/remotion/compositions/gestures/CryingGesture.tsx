/**
 * Crying Gesture Composition
 * Wizard crying with tear drops
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const CryingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="crying" size={330} />

      {/* Tears falling */}
      {[0, 1, 2, 3, 4].map((i) => {
        const delay = i * 10;
        const tearOpacity = interpolate(frame, [delay, delay + 5, delay + 40], [0, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const tearY = interpolate(frame - delay, [0, 40], [35, 65]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${tearY}%`,
              left: `${48 + i * 2}%`,
              width: '8px',
              height: '12px',
              backgroundColor: '#60a5fa',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              opacity: tearOpacity,
              boxShadow: '0 0 8px rgba(96, 165, 250, 0.6)',
            }}
          />
        );
      })}

      {/* Sad blue glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)',
          opacity: 0.6,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default CryingGesture;
