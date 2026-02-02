/**
 * Puffs Out Gesture Composition
 * Wizard disappearing with smoke/magic effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const PuffsOutGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Smoke particles expanding as wizard disappears
  const smokeOpacity = interpolate(frame, [0, 20, 60, 100], [0, 0.8, 0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const smokeScale = interpolate(frame, [0, 50, 100], [0.8, 1.8, 2.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Disappearance sparkles
  const sparklesOpacity = interpolate(frame, [10, 30, 60], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="puffs_out" size={330} />

      {/* Smoke cloud */}
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${smokeScale})`,
          opacity: smokeOpacity,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(203, 213, 225, 0.7), rgba(148, 163, 184, 0.4), transparent)',
            filter: 'blur(25px)',
          }}
        />
      </div>

      {/* Disappearance sparkles */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const delay = i * 3;
        const angle = (i * Math.PI * 2) / 8;
        const distance = interpolate(frame - delay, [0, 40], [30, 70]);
        const x = 50 + (Math.cos(angle) * distance) / 3.3;
        const y = 60 + (Math.sin(angle) * distance) / 3.62;

        const particleOpacity = interpolate(
          frame,
          [delay, delay + 10, delay + 30],
          [0, 1, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${y}%`,
              left: `${x}%`,
              width: '4px',
              height: '4px',
              backgroundColor: '#a855f7',
              borderRadius: '50%',
              opacity: particleOpacity * sparklesOpacity,
              boxShadow: '0 0 8px #a855f7',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export default PuffsOutGesture;
