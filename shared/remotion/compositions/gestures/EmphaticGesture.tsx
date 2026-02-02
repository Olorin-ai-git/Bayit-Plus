/**
 * Emphatic Gesture Composition
 * Wizard emphasizing a point with energy
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const EmphaticGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Energy burst on emphasis
  const burstOpacity = interpolate(frame, [8, 12, 16], [0, 1, 0]);
  const burstScale = interpolate(frame, [8, 16], [0.5, 1.5]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="emphatic" size={330} />

      {/* Emphasis burst */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '55%',
          transform: `translate(-50%, -50%) scale(${burstScale})`,
          opacity: burstOpacity,
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.8), rgba(245, 158, 11, 0.3), transparent)',
            filter: 'blur(10px)',
          }}
        />
      </div>

      {/* Exclamation marks */}
      {[0, 1].map((i) => {
        const delay = 8 + i * 4;
        const opacity = interpolate(frame, [delay, delay + 3, delay + 8], [0, 1, 0]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '25%',
              left: `${52 + i * 8}%`,
              fontSize: '24px',
              color: '#f59e0b',
              opacity,
              textShadow: '0 0 10px #f59e0b',
              fontWeight: 'bold',
            }}
          >
            !
          </div>
        );
      })}

      {/* Amber emphasis glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
          opacity: 0.6,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default EmphaticGesture;
