import { useEffect, useState } from 'react';
import { Particle } from './types';
import { ANIMATION_CONFIG } from '../../config/animation.config';
import { useResponsive } from '../../hooks/useResponsive';

export const useParticles = (): Particle[] => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    const count = isMobile
      ? ANIMATION_CONFIG.particles.mobile
      : isTablet
      ? ANIMATION_CONFIG.particles.tablet
      : ANIMATION_CONFIG.particles.desktop;

    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 3 + 2,
    }));

    setParticles(newParticles);
  }, [isMobile, isTablet]);

  return particles;
};
