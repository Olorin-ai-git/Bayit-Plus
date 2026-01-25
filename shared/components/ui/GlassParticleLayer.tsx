/**
 * Glass Particle Layer Component
 * Flowing particle system synced with TTS audio for organic visual feedback
 *
 * Design:
 * - Extends existing GlassView (maintains glassmorphic consistency)
 * - ~300-500 particles in flowing wave patterns
 * - Purple gradient (rgba(168, 85, 247, ...)) matching SoundwaveVisualizer
 * - Audio-reactive: particles respond to TTS audio levels
 * - Particle connections for mesh effect
 * - 60fps performance on TV hardware
 *
 * States:
 * - Idle: Static particle field
 * - TTS Speaking: Particles flow and react to audio
 * - Listening (alternate): Can replace SoundwaveVisualizer
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@olorin/design-tokens';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  connections: number[];
}

interface GlassParticleLayerProps {
  isActive?: boolean; // TTS is speaking
  audioLevel?: number; // 0-1 from audio analyzer
  intensity?: 'low' | 'medium' | 'high';
  style?: any;
  noBorder?: boolean;
}

const PARTICLE_COUNT = 300;
const MAX_DISTANCE = 100; // Max distance for particle connections
const PARTICLES_PER_CONNECTION = 5; // Max connections per particle
const WAVE_SPEED = 0.02;
const AUDIO_SENSITIVITY = 2;

// Canvas rendering colors (extracted from theme constants)
const CANVAS_COLORS = {
  background: 'rgba(10, 10, 30, 0.95)',
  particleCore: (opacity: number) => `rgba(168, 85, 247, ${opacity})`,
  particleGlowStart: (opacity: number) => `rgba(168, 85, 247, ${opacity * 0.8})`,
  particleGlowEnd: 'rgba(168, 85, 247, 0)',
  connection: (opacity: number) => `rgba(168, 85, 247, ${opacity})`,
};

export const GlassParticleLayer = React.forwardRef<View, GlassParticleLayerProps>(
  ({ isActive = false, audioLevel = 0, intensity = 'medium', style, noBorder = true }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const timeRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);

    // Initialize particles on mount
    useEffect(() => {
      particlesRef.current = generateParticleField(PARTICLE_COUNT);
    }, []);

    // Animate particles
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const animate = () => {
        // Clear canvas with slight transparency for motion blur effect
        ctx.fillStyle = CANVAS_COLORS.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        updateParticles(particlesRef.current, audioLevel, canvas.width, canvas.height);
        drawParticles(ctx, particlesRef.current, canvas.width, canvas.height);

        // Draw particle connections
        drawConnections(ctx, particlesRef.current);

        timeRef.current += WAVE_SPEED;
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Render once if not active
        ctx.fillStyle = CANVAS_COLORS.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawParticles(ctx, particlesRef.current, canvas.width, canvas.height);
      }

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isActive, audioLevel]);

    // Set canvas size on mount
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }, []);

    const intensityStyle = {
      low: styles.intensityLow,
      medium: styles.intensityMedium,
      high: styles.intensityHigh,
    }[intensity];

    const borderStyle = !noBorder ? styles.borderVisible : styles.borderSubtle;

    return (
      <View
        ref={ref}
        style={[styles.container, intensityStyle, borderStyle, style]}
      >
        {/* Glass background */}
        <View style={styles.glassBackground} />

        {/* Particle canvas */}
        <canvas ref={canvasRef} style={styles.canvas} />
      </View>
    );
  }
);

GlassParticleLayer.displayName = 'GlassParticleLayer';

// Styles using StyleSheet.create() - React Native Web compatible
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    backgroundColor: colors.glassPurple,
  },

  // Intensity variants
  intensityLow: {
    backgroundColor: colors.glassLight,
  },
  intensityMedium: {
    backgroundColor: colors.glassMedium,
  },
  intensityHigh: {
    backgroundColor: colors.glassStrong,
  },

  // Border variants
  borderVisible: {
    borderWidth: 1,
    borderColor: colors.glassBorderWhite,
  },
  borderSubtle: {
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },

  // Glass background overlay
  glassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.glassLight,
    pointerEvents: 'none',
  },

  // Canvas element
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
});

/**
 * Generate initial particle field
 * Distributed in wave formations across canvas
 */
function generateParticleField(count: number): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    // Distribute particles in wave-like patterns
    const angle = (i / count) * Math.PI * 2;
    const radius = 50 + Math.random() * 150;
    const x = 0.5 + Math.cos(angle) * radius;
    const y = 0.5 + Math.sin(angle) * radius;

    particles.push({
      id: i,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.01,
      vy: (Math.random() - 0.5) * 0.01,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.3,
      connections: [],
    });
  }

  return particles;
}

/**
 * Update particle positions and properties
 */
function updateParticles(
  particles: Particle[],
  audioLevel: number,
  width: number,
  height: number
): void {
  const time = Date.now() / 1000;

  particles.forEach((particle) => {
    // Perlin-like noise using sine waves for organic motion
    const noisex = Math.sin(time * 0.5 + particle.x * 10) * 0.01;
    const noisey = Math.cos(time * 0.3 + particle.y * 10) * 0.01;

    // Apply audio-responsive acceleration
    const audioInfluence = audioLevel * AUDIO_SENSITIVITY;
    particle.vx += noisex + (Math.random() - 0.5) * audioInfluence * 0.001;
    particle.vy += noisey + (Math.random() - 0.5) * audioInfluence * 0.001;

    // Damping for stability
    particle.vx *= 0.98;
    particle.vy *= 0.98;

    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Wrap around edges
    if (particle.x < 0) particle.x = 1;
    if (particle.x > 1) particle.x = 0;
    if (particle.y < 0) particle.y = 1;
    if (particle.y > 1) particle.y = 0;

    // Audio-responsive opacity
    particle.opacity = Math.min(0.9, 0.3 + audioLevel * 0.6);

    // Clear connections (will be recalculated)
    particle.connections = [];
  });

  // Calculate particle connections
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length && particles[i].connections.length < PARTICLES_PER_CONNECTION; j++) {
      const dx = particles[j].x - particles[i].x;
      const dy = particles[j].y - particles[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MAX_DISTANCE / 1000) { // Normalized distance
        particles[i].connections.push(j);
      }
    }
  }
}

/**
 * Draw particles on canvas
 */
function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  width: number,
  height: number
): void {
  particles.forEach((particle) => {
    const x = particle.x * width;
    const y = particle.y * height;

    // Draw particle glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 3);
    gradient.addColorStop(0, CANVAS_COLORS.particleGlowStart(particle.opacity));
    gradient.addColorStop(1, CANVAS_COLORS.particleGlowEnd);

    ctx.fillStyle = gradient;
    ctx.fillRect(x - particle.size * 3, y - particle.size * 3, particle.size * 6, particle.size * 6);

    // Draw particle core
    ctx.fillStyle = CANVAS_COLORS.particleCore(particle.opacity);
    ctx.beginPath();
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Draw connections between nearby particles
 */
function drawConnections(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  particles.forEach((particle) => {
    particle.connections.forEach((connectedIndex) => {
      const connected = particles[connectedIndex];
      if (!connected) return;

      const dx = connected.x - particle.x;
      const dy = connected.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const opacity = Math.max(0, 1 - distance * 5) * particle.opacity * 0.5;

      ctx.strokeStyle = CANVAS_COLORS.connection(opacity);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(particle.x * ctx.canvas.width, particle.y * ctx.canvas.height);
      ctx.lineTo(connected.x * ctx.canvas.width, connected.y * ctx.canvas.height);
      ctx.stroke();
    });
  });
}

export default GlassParticleLayer;
