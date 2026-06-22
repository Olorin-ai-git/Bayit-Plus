/**
 * Success Gesture Composition
 * Wizard celebrating success with triumphant effects
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Success gesture with victory sparkles
 * Duration: ~0.75 seconds (6 frames at 8fps = 45 frames at 60fps)
 */
export const SuccessGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Success burst effect
  const burstOpacity = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const burstScale = interpolate(frame, [5, 25], [0.5, 1.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Star burst particles
  const starsOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Spritesheet animation */}
      <SpritesheetPlayer spritesheet="success" size={330} />

      {/* Success burst */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${burstScale})`,
          opacity: burstOpacity,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(34, 197, 94, 0.6), rgba(74, 222, 128, 0.3), transparent)',
            filter: 'blur(15px)',
          }}
        />
      </div>

      {/* Victory stars */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i * Math.PI * 2) / 8;
        const distance = interpolate(frame, [10, 45], [30, 80]);
        const starX = 50 + (Math.cos(angle) * distance) / 3.3;
        const starY = 50 + (Math.sin(angle) * distance) / 3.62;

        const starScale = interpolate(
          frame,
          [10 + i * 2, 20 + i * 2, 30 + i * 2],
          [0.5, 1.5, 1],
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
              top: `${starY}%`,
              left: `${starX}%`,
              fontSize: '20px',
              color: '#22c55e',
              opacity: starsOpacity,
              transform: `translate(-50%, -50%) scale(${starScale})`,
              textShadow: '0 0 15px #22c55e',
            }}
          >
            
          </div>
        );
      })}

      {/* Ambient success glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)',
          opacity: 0.7,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default SuccessGesture;
