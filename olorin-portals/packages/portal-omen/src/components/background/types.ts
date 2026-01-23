export interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
}

export interface ParticleBackgroundProps {
  enabled?: boolean;
}
