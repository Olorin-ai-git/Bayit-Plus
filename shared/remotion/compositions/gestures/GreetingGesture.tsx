/**
 * Greeting Gesture Composition
 * Wizard waving hello with sparkle effects
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Greeting gesture with welcoming sparkles
 * Duration: ~0.67 seconds (4 frames at 6fps = 40 frames at 60fps)
 */
export const GreetingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Sparkles appear near wizard's hand
  const sparkle1Opacity = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sparkle2Opacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sparkle3Opacity = interpolate(frame, [15, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Sparkles drift upward
  const sparkleY = interpolate(frame, [0, 40], [0, -30]);

  // Warm glow effect
  const glowOpacity = interpolate(frame, [0, 20, 40], [0, 0.6, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Spritesheet animation */}
      <SpritesheetPlayer spritesheet="greeting" size={330} />

      {/* Sparkle effects */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '60%',
          pointerEvents: 'none',
        }}
      >
        {/* Sparkle 1 */}
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            backgroundColor: '#fbbf24',
            borderRadius: '50%',
            opacity: sparkle1Opacity,
            transform: `translateY(${sparkleY}px)`,
            boxShadow: '0 0 15px #fbbf24, 0 0 30px #fbbf24',
          }}
        />

        {/* Sparkle 2 */}
        <div
          style={{
            position: 'absolute',
            left: '15px',
            top: '-10px',
            width: '8px',
            height: '8px',
            backgroundColor: '#fbbf24',
            borderRadius: '50%',
            opacity: sparkle2Opacity,
            transform: `translateY(${sparkleY * 1.2}px)`,
            boxShadow: '0 0 15px #fbbf24, 0 0 30px #fbbf24',
          }}
        />

        {/* Sparkle 3 */}
        <div
          style={{
            position: 'absolute',
            left: '-10px',
            top: '10px',
            width: '7px',
            height: '7px',
            backgroundColor: '#fbbf24',
            borderRadius: '50%',
            opacity: sparkle3Opacity,
            transform: `translateY(${sparkleY * 0.8}px)`,
            boxShadow: '0 0 15px #fbbf24, 0 0 30px #fbbf24',
          }}
        />
      </div>

      {/* Warm welcoming glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
          opacity: glowOpacity,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default GreetingGesture;
