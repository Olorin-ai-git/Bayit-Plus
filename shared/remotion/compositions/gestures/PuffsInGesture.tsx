/**
 * Puffs In Gesture Composition
 * Wizard appearing with smoke/magic effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const PuffsInGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Smoke particles expanding
  const smokeOpacity = interpolate(frame, [0, 30, 60, 100], [0, 0.8, 0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const smokeScale = interpolate(frame, [0, 50, 100], [0.5, 1.5, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Magical sparkles appearing
  const sparklesOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="puffs_in" size={330} />

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
            background: 'radial-gradient(circle, rgba(203, 213, 225, 0.6), rgba(148, 163, 184, 0.3), transparent)',
            filter: 'blur(20px)',
          }}
        />
      </div>

      {/* Appearance sparkles */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * Math.PI * 2) / 6;
        const distance = 40;
        const x = 50 + Math.cos(angle) * (distance / 3.3);
        const y = 60 + Math.sin(angle) * (distance / 3.62);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${y}%`,
              left: `${x}%`,
              width: '6px',
              height: '6px',
              backgroundColor: '#a855f7',
              borderRadius: '50%',
              opacity: sparklesOpacity,
              boxShadow: '0 0 10px #a855f7',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export default PuffsInGesture;
