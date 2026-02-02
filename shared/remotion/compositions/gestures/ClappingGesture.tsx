/**
 * Clapping Gesture Composition
 * Wizard clapping with applause effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const ClappingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Sound wave rings (visual representation of clapping)
  const wave1Opacity = interpolate(frame, [0, 10, 20], [0, 0.6, 0]);
  const wave1Scale = interpolate(frame, [0, 20], [0.8, 1.5]);

  const wave2Opacity = interpolate(frame, [15, 25, 35], [0, 0.6, 0]);
  const wave2Scale = interpolate(frame, [15, 35], [0.8, 1.5]);

  // Celebration sparkles
  const sparklesOpacity = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="clapping" size={330} />

      {/* Sound wave 1 */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${wave1Scale})`,
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '3px solid rgba(34, 197, 94, 0.6)',
          opacity: wave1Opacity,
        }}
      />

      {/* Sound wave 2 */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${wave2Scale})`,
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '3px solid rgba(34, 197, 94, 0.6)',
          opacity: wave2Opacity,
        }}
      />

      {/* Celebration sparkles */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const delay = 5 + i * 5;
        const opacity = interpolate(frame, [delay, delay + 5, delay + 15], [0, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = interpolate(frame - delay, [0, 15], [50, 35]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${y}%`,
              left: `${40 + i * 7}%`,
              fontSize: '14px',
              color: '#22c55e',
              opacity,
              textShadow: '0 0 10px #22c55e',
            }}
          >
            ✨
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export default ClappingGesture;
