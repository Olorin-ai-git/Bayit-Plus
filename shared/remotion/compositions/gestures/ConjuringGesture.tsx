/**
 * Conjuring Gesture Composition
 * Wizard casting a spell with purple particle effects
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';
import { ParticleEmitter } from '../effects/ParticleEmitter';

/**
 * Conjuring gesture with magical particle effects
 * Duration: ~4 seconds (24 frames at 6fps = 240 frames at 60fps)
 */
export const ConjuringGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Particle effects start after a few frames
  const particleOpacity = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glow intensity pulsates
  const glowIntensity = interpolate(
    frame,
    [0, 30, 60, 90, 120, 150, 180, 210, 240],
    [0.3, 0.8, 0.4, 0.9, 0.5, 0.8, 0.4, 0.7, 0.3]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Spritesheet animation */}
      <SpritesheetPlayer spritesheet="conjuring" size={330} />

      {/* Particle effects */}
      <div style={{ opacity: particleOpacity }}>
        <ParticleEmitter
          particleCount={30}
          emitterX={165}
          emitterY={280}
          color="#8b5cf6"
          radius={80}
          sizeRange={[2, 6]}
          duration={220}
        />
      </div>

      {/* Magical glow effect */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
          opacity: glowIntensity,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default ConjuringGesture;
