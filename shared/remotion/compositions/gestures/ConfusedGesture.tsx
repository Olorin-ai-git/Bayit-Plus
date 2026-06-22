/**
 * Confused Gesture Composition
 * Wizard looking confused with swirling dizzy effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Confused gesture with dizzy swirls
 * Duration: ~0.6 seconds (3 frames at 5fps = 36 frames at 60fps)
 */
export const ConfusedGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Dizzy swirls rotation
  const swirlRotation = interpolate(frame, [0, 36], [0, 720]); // Two full rotations

  // Swirl opacity pulses
  const swirlOpacity = interpolate(
    frame,
    [0, 9, 18, 27, 36],
    [0, 0.7, 0.4, 0.7, 0.3]
  );

  // Stars appear around wizard's head
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
      <SpritesheetPlayer spritesheet="confused" size={330} />

      {/* Dizzy swirls */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${swirlRotation}deg)`,
          opacity: swirlOpacity,
          pointerEvents: 'none',
        }}
      >
        {/* Swirl 1 */}
        <div
          style={{
            position: 'absolute',
            width: '60px',
            height: '60px',
            border: '3px solid #f59e0b',
            borderRadius: '50%',
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />

        {/* Swirl 2 (offset) */}
        <div
          style={{
            position: 'absolute',
            width: '40px',
            height: '40px',
            top: '10px',
            left: '10px',
            border: '3px solid #f59e0b',
            borderRadius: '50%',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            opacity: 0.7,
          }}
        />
      </div>

      {/* Confusion stars */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          opacity: starsOpacity,
        }}
      >
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * Math.PI) / 2;
          const distance = 45;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;

          const starScale = interpolate(
            frame,
            [10 + i * 3, 20 + i * 3, 30 + i * 3],
            [0.5, 1.2, 0.8],
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
                left: `${x}px`,
                top: `${y}px`,
                fontSize: '16px',
                color: '#f59e0b',
                transform: `translate(-50%, -50%) scale(${starScale})`,
                textShadow: '0 0 8px #f59e0b',
              }}
            >
              ★
            </div>
          );
        })}
      </div>

      {/* Amber confused glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
          opacity: 0.5,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default ConfusedGesture;
