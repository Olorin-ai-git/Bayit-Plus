/**
 * Thinking Gesture Composition
 * Wizard pondering with subtle thought bubble particles
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Thinking gesture with gentle floating particles
 * Duration: ~7 seconds (35 frames at 5fps = 420 frames at 60fps)
 */
export const ThinkingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Thought bubble particles (3 dots that appear sequentially)
  const dot1Opacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dot2Opacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dot3Opacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dots float upward
  const dot1Y = interpolate(frame, [20, 120], [0, -30]);
  const dot2Y = interpolate(frame, [40, 140], [0, -35]);
  const dot3Y = interpolate(frame, [60, 160], [0, -40]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Spritesheet animation */}
      <SpritesheetPlayer spritesheet="thinking" size={330} />

      {/* Thought bubble dots */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '60%',
          pointerEvents: 'none',
        }}
      >
        {/* Dot 1 */}
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#94a3b8',
            opacity: dot1Opacity,
            transform: `translateY(${dot1Y}px)`,
            filter: 'blur(0.5px)',
            boxShadow: '0 0 10px rgba(148, 163, 184, 0.5)',
          }}
        />

        {/* Dot 2 */}
        <div
          style={{
            position: 'absolute',
            left: '15px',
            top: '-10px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#94a3b8',
            opacity: dot2Opacity,
            transform: `translateY(${dot2Y}px)`,
            filter: 'blur(0.5px)',
            boxShadow: '0 0 12px rgba(148, 163, 184, 0.5)',
          }}
        />

        {/* Dot 3 */}
        <div
          style={{
            position: 'absolute',
            left: '30px',
            top: '-25px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#94a3b8',
            opacity: dot3Opacity,
            transform: `translateY(${dot3Y}px)`,
            filter: 'blur(0.5px)',
            boxShadow: '0 0 14px rgba(148, 163, 184, 0.5)',
          }}
        />
      </div>

      {/* Subtle ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%)',
          opacity: 0.5,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default ThinkingGesture;
