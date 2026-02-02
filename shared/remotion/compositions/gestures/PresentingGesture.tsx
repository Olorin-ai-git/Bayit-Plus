/**
 * Presenting Gesture Composition
 * Wizard presenting results with spotlight effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Presenting gesture with spotlight emphasis
 * Duration: ~0.33 seconds (2 frames at 6fps = 20 frames at 60fps)
 */
export const PresentingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Spotlight beam effect
  const beamOpacity = interpolate(frame, [0, 10], [0, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamScale = interpolate(frame, [0, 10, 20], [0.8, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shimmer particles at presentation area
  const shimmerOpacity = interpolate(frame, [5, 15], [0, 1], {
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
      <SpritesheetPlayer spritesheet="presenting" size={330} />

      {/* Spotlight beam effect */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '70%',
          transform: 'translate(-50%, -50%)',
          width: '140px',
          height: '140px',
          opacity: beamOpacity,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background:
              'radial-gradient(ellipse at center, rgba(96, 165, 250, 0.5) 0%, rgba(147, 197, 253, 0.3) 40%, transparent 70%)',
            filter: 'blur(15px)',
            transform: `scale(${beamScale})`,
          }}
        />
      </div>

      {/* Shimmer particles */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '70%',
          opacity: shimmerOpacity,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const delay = i * 3;
          const particleOpacity = interpolate(
            frame - delay,
            [0, 5, 15],
            [0, 1, 0],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }
          );

          const particleY = interpolate(frame - delay, [0, 15], [0, -20]);

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${(i - 2) * 15}px`,
                top: '0',
                width: '4px',
                height: '4px',
                backgroundColor: '#60a5fa',
                borderRadius: '50%',
                opacity: particleOpacity,
                transform: `translateY(${particleY}px)`,
                boxShadow: '0 0 8px #60a5fa',
              }}
            />
          );
        })}
      </div>

      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          bottom: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.2) 0%, transparent 70%)',
          opacity: 0.5,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default PresentingGesture;
