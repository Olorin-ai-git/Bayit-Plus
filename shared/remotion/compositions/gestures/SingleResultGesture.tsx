/**
 * Single Result Gesture Composition
 * Wizard highlighting a single result with spotlight
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Single result gesture with focused spotlight
 * Duration: ~1 second (6 frames at 6fps = 60 frames at 60fps)
 */
export const SingleResultGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Spotlight beam focusing
  const spotlightOpacity = interpolate(frame, [0, 20], [0, 0.7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const spotlightScale = interpolate(frame, [0, 20, 40, 60], [1.5, 1, 1.1, 1]);

  // Result card materializing
  const cardOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cardScale = interpolate(frame, [15, 25, 35], [0.8, 1.1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shimmer effect on card
  const shimmerPosition = interpolate(frame, [20, 60], [-100, 200]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Spritesheet animation */}
      <SpritesheetPlayer spritesheet="single_result" size={330} />

      {/* Focused spotlight */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '65%',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
          opacity: spotlightOpacity,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background:
              'radial-gradient(ellipse at center, rgba(167, 139, 250, 0.6) 0%, rgba(196, 181, 253, 0.3) 50%, transparent 70%)',
            filter: 'blur(15px)',
            transform: `scale(${spotlightScale})`,
          }}
        />
      </div>

      {/* Result card placeholder */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '65%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '80px',
          opacity: cardOpacity,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(167, 139, 250, 0.2)',
            borderRadius: '8px',
            border: '2px solid rgba(167, 139, 250, 0.6)',
            boxShadow: '0 0 20px rgba(167, 139, 250, 0.4)',
            transform: `scale(${cardScale})`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Shimmer effect */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${shimmerPosition}%`,
              width: '30%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />
        </div>
      </div>

      {/* Star particles */}
      {[0, 1, 2, 3, 4].map((i) => {
        const delay = 20 + i * 5;
        const particleOpacity = interpolate(
          frame,
          [delay, delay + 10, delay + 20],
          [0, 1, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        const angle = (i * Math.PI * 2) / 5;
        const distance = 50;
        const particleX = 65 + Math.cos(angle) * distance;
        const particleY = 40 + Math.sin(angle) * distance;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${particleY}%`,
              left: `${particleX}%`,
              fontSize: '12px',
              color: '#a78bfa',
              opacity: particleOpacity,
              textShadow: '0 0 8px #a78bfa',
            }}
          >
            
          </div>
        );
      })}

      {/* Ambient purple glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.2) 0%, transparent 70%)',
          opacity: 0.6,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default SingleResultGesture;
