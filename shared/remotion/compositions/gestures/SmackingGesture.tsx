/**
 * Smacking Gesture Composition
 * Wizard smacking with impact effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const SmackingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Impact burst at smack moment
  const impactOpacity = interpolate(frame, [15, 20, 25], [0, 1, 0]);
  const impactScale = interpolate(frame, [15, 25], [0.5, 1.5]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="smacking" size={330} />

      {/* Impact burst */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '55%',
          transform: `translate(-50%, -50%) scale(${impactScale})`,
          opacity: impactOpacity,
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.3), transparent)',
            filter: 'blur(10px)',
          }}
        />
      </div>

      {/* Impact lines */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2;
        const lineOpacity = interpolate(frame, [15, 20, 25], [0, 1, 0]);
        const lineLength = interpolate(frame, [15, 25], [10, 30]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '45%',
              left: '55%',
              width: '4px',
              height: `${lineLength}px`,
              backgroundColor: '#ef4444',
              opacity: lineOpacity,
              transform: `translate(-50%, -50%) rotate(${angle}rad)`,
              transformOrigin: 'center',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export default SmackingGesture;
