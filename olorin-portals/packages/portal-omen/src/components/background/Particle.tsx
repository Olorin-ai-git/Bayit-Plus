import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ParticleProps {
  x: number;
  y: number;
  size: number;
  duration: number;
}

export const Particle: React.FC<ParticleProps> = ({ x, y, size, duration }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute rounded-full bg-omen-neon-cyan transform-gpu"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
      }}
      animate={prefersReducedMotion ? {} : {
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        repeat: prefersReducedMotion ? 0 : Infinity,
        repeatType: 'loop',
      }}
      aria-hidden="true"
    />
  );
};
