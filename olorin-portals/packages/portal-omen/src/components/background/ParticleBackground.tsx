import React from 'react';
import { Particle } from './Particle';
import { useParticles } from './useParticles';
import { ParticleBackgroundProps } from './types';

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  enabled = true
}) => {
  const particles = useParticles();

  if (!enabled) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
      role="presentation"
    >
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          x={particle.x}
          y={particle.y}
          size={particle.size}
          duration={particle.duration}
        />
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-omen-void/50 to-omen-void" />
    </div>
  );
};
