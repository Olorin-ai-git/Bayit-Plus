/**
 * Magical Reveal Gesture Composition
 * Wizard revealing something magical with dramatic effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';
import { RuneSwirl } from '../effects/RuneSwirl';

/**
 * Magical reveal gesture with rune swirl and portal effect
 * Duration: ~1 second (6 frames at 6fps = 60 frames at 60fps)
 */
export const MagicalRevealGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Portal materializing
  const portalOpacity = interpolate(frame, [10, 30], [0, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const portalScale = interpolate(frame, [10, 25, 40], [0.5, 1.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Portal rotation
  const portalRotation = interpolate(frame, [10, 60], [0, 180]);

  // Energy burst at reveal moment
  const burstOpacity = interpolate(frame, [25, 30, 35], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const burstScale = interpolate(frame, [25, 35], [0.5, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Runes appear
  const runesOpacity = interpolate(frame, [15, 25], [0, 1], {
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
      <SpritesheetPlayer spritesheet="magical_reveal" size={330} />

      {/* Magical portal */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '70%',
          transform: `translate(-50%, -50%) rotate(${portalRotation}deg) scale(${portalScale})`,
          opacity: portalOpacity,
          pointerEvents: 'none',
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '3px solid rgba(139, 92, 246, 0.8)',
            boxShadow:
              '0 0 20px rgba(139, 92, 246, 0.6), inset 0 0 20px rgba(139, 92, 246, 0.4)',
          }}
        />

        {/* Inner ring */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '2px solid rgba(168, 85, 247, 0.9)',
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.7)',
          }}
        />

        {/* Portal center glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196, 181, 253, 0.9), rgba(139, 92, 246, 0.5))',
            filter: 'blur(5px)',
          }}
        />
      </div>

      {/* Rune swirl effect */}
      <div style={{ opacity: runesOpacity }}>
        <RuneSwirl
          centerX={231} // 70% of 330px
          centerY={162} // 45% of 362px (approximate)
          color="#a855f7"
          radius={90}
          runeCount={6}
          duration={45}
        />
      </div>

      {/* Energy burst at reveal moment */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '70%',
          transform: `translate(-50%, -50%) scale(${burstScale})`,
          opacity: burstOpacity,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(139, 92, 246, 0.5), transparent)',
            filter: 'blur(10px)',
          }}
        />
      </div>

      {/* Sparkle particles */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const delay = 20 + i * 3;
        const particleOpacity = interpolate(
          frame,
          [delay, delay + 5, delay + 15],
          [0, 1, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        const angle = (i * Math.PI * 2) / 8;
        const distance = interpolate(frame - delay, [0, 15], [20, 60]);
        const particleX = 70 + (Math.cos(angle) * distance) / 3.3; // Convert to percentage
        const particleY = 45 + (Math.sin(angle) * distance) / 3.62; // Convert to percentage

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${particleY}%`,
              left: `${particleX}%`,
              width: '4px',
              height: '4px',
              backgroundColor: '#a855f7',
              borderRadius: '50%',
              opacity: particleOpacity,
              boxShadow: '0 0 10px #a855f7',
            }}
          />
        );
      })}

      {/* Ambient magical glow */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          opacity: 0.7,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default MagicalRevealGesture;
