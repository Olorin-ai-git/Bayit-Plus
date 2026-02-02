/**
 * ParticleEmitter - Remotion Effect Component
 * Generates animated particle effects for wizard animations
 */

import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface Particle {
  id: number;
  angle: number;
  velocity: number;
  size: number;
  delay: number;
}

interface ParticleEmitterProps {
  /** Number of particles to emit */
  particleCount?: number;
  /** X position of emitter center */
  emitterX?: number;
  /** Y position of emitter center */
  emitterY?: number;
  /** Particle color (CSS color) */
  color?: string;
  /** Emission radius */
  radius?: number;
  /** Particle size range */
  sizeRange?: [number, number];
  /** Emission duration in frames */
  duration?: number;
}

/**
 * Generate particle configuration
 */
function generateParticles(count: number, sizeRange: [number, number]): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      angle: (Math.PI * 2 * i) / count + Math.random() * 0.3, // Distribute evenly with randomness
      velocity: 0.5 + Math.random() * 1.5, // Random velocity
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      delay: Math.random() * 10, // Stagger particle emission
    });
  }

  return particles;
}

/**
 * ParticleEmitter component
 * Renders animated particles emanating from a center point
 */
export const ParticleEmitter: React.FC<ParticleEmitterProps> = ({
  particleCount = 30,
  emitterX = 165,
  emitterY = 280,
  color = '#8b5cf6',
  radius = 100,
  sizeRange = [2, 6],
  duration = 60,
}) => {
  const frame = useCurrentFrame();

  // Generate particles on first render
  const particles = React.useMemo(
    () => generateParticles(particleCount, sizeRange),
    [particleCount, sizeRange]
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {particles.map((particle) => {
        // Calculate particle position with spring animation
        const progress = spring({
          frame: frame - particle.delay,
          fps: 60,
          config: {
            damping: 20,
            mass: 0.5,
            stiffness: 80,
          },
        });

        // Particle travels outward from emitter
        const distance = progress * radius * particle.velocity;
        const x = emitterX + Math.cos(particle.angle) * distance;
        const y = emitterY + Math.sin(particle.angle) * distance;

        // Fade out particle over time
        const opacity = interpolate(
          frame - particle.delay,
          [0, duration * 0.3, duration],
          [0, 1, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        // Scale particle over time
        const scale = interpolate(
          frame - particle.delay,
          [0, duration * 0.5, duration],
          [0.5, 1, 0.3],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        return (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              borderRadius: '50%',
              backgroundColor: color,
              opacity,
              transform: `translate(-50%, -50%) scale(${scale})`,
              filter: 'blur(1px)',
              boxShadow: `0 0 ${particle.size * 2}px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
};

export default ParticleEmitter;
