/**
 * Shrugging Gesture Composition
 * Wizard shrugging with "I don't know" effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Shrugging gesture with question marks
 * Duration: ~0.5 seconds (3 frames at 6fps = 30 frames at 60fps)
 */
export const ShruggingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Question marks appear above wizard
  const questionMark1Opacity = interpolate(frame, [5, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const questionMark2Opacity = interpolate(frame, [10, 17], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Question marks float upward
  const questionMarkY1 = interpolate(frame, [5, 30], [0, -25]);
  const questionMarkY2 = interpolate(frame, [10, 30], [0, -20]);

  // Slight rotation
  const questionMarkRotation1 = interpolate(frame, [5, 30], [0, 15]);
  const questionMarkRotation2 = interpolate(frame, [10, 30], [0, -12]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Spritesheet animation */}
      <SpritesheetPlayer spritesheet="shrugging" size={330} />

      {/* Question marks */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          pointerEvents: 'none',
        }}
      >
        {/* Question mark 1 */}
        <div
          style={{
            position: 'absolute',
            left: '-20px',
            fontSize: '32px',
            color: '#94a3b8',
            opacity: questionMark1Opacity,
            transform: `translateY(${questionMarkY1}px) rotate(${questionMarkRotation1}deg)`,
            textShadow: '0 0 10px rgba(148, 163, 184, 0.5)',
            fontWeight: 'bold',
          }}
        >
          ?
        </div>

        {/* Question mark 2 */}
        <div
          style={{
            position: 'absolute',
            left: '20px',
            top: '-10px',
            fontSize: '28px',
            color: '#94a3b8',
            opacity: questionMark2Opacity,
            transform: `translateY(${questionMarkY2}px) rotate(${questionMarkRotation2}deg)`,
            textShadow: '0 0 10px rgba(148, 163, 184, 0.5)',
            fontWeight: 'bold',
          }}
        >
          ?
        </div>
      </div>

      {/* Subtle grey ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%)',
          opacity: 0.5,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default ShruggingGesture;
