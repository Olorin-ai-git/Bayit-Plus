import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import type { AudioLevel } from '@bayit/shared-utils/vadDetector';
import logger from '@/utils/logger';

interface SoundwaveParticlesProps {
  isListening?: boolean;
  isProcessing?: boolean;
  audioLevel?: AudioLevel | { average: number; peak: number };
  hasError?: boolean;
  isResponding?: boolean;
  responseText?: string;
}

const SoundwaveParticles: React.FC<SoundwaveParticlesProps> = ({
  isListening = false,
  isProcessing = false,
  audioLevel,
  hasError = false,
  isResponding = false,
  responseText = '',
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Debug: Log props
  // useEffect(() => {
  //   console.log('[SoundwaveParticles] Received props:', {
  //     isListening,
  //     isProcessing,
  //     hasError,
  //     isResponding,
  //     audioLevel,
  //     responseText: responseText?.substring(0, 50),
  //   });
  // }, [isListening, isProcessing, hasError, isResponding, audioLevel, responseText]);

  // Determine current state
  const getState = () => {
    if (hasError) return 'error';
    if (isResponding) return 'responding';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    return 'idle';
  };

  // Determine color based on state
  const getColor = () => {
    const state = getState();
    // console.log('[SoundwaveParticles] getColor - state:', state, '{ hasError:', hasError, ', isResponding:', isResponding, ', isProcessing:', isProcessing, ', isListening:', isListening, '}');
    if (state === 'error') return '#ef4444'; // Red for error
    if (state === 'responding') return '#10b981'; // Green for response
    if (state === 'processing') return '#fbbf24'; // Yellow for processing
    if (state === 'listening') return '#a855f7'; // Blue for listening
    return '#6366f1'; // Indigo default
  };

  // Calculate amplitude based on state and audio/response data
  const calculateAmplitude = () => {
    const state = getState();

    if (state === 'listening') {
      // Listening: correlate with audio level
      return (audioLevel?.average || 0) * 20 + 5;
    }

    if (state === 'responding') {
      // Responding: correlate with response text length
      // Longer responses = higher waves
      const textLength = responseText?.length || 0;
      const amplitude = Math.min(textLength / 50, 25) + 5; // Cap at 25
      return amplitude;
    }

    if (state === 'processing') {
      // Processing: steady medium amplitude
      return 12;
    }

    if (state === 'error') {
      // Error: small, static waves
      return 5;
    }

    return 3;
  };

  // Extract audio level
  const level = calculateAmplitude();

  // Draw soundwave visualization
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform lines
    const color = getColor();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Number of waves
    const waveCount = 4;
    const waveHeight = level; // Already calculated from amplitude

    for (let w = 0; w < waveCount; w++) {
      ctx.beginPath();
      const offset = w * (width / waveCount);

      for (let x = 0; x < width; x++) {
        const frequency = 0.02;
        const amplitude = waveHeight / (w + 1); // Higher waves are smaller
        const y =
          centerY +
          Math.sin((x + timeRef.current * 3 + offset) * frequency) * amplitude;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    // Draw center line
    ctx.strokeStyle = `${color}40`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Update animation
    timeRef.current += 1;
    animationRef.current = requestAnimationFrame(drawWaveform);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Start animation
    drawWaveform();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, isProcessing, level, hasError, isResponding, responseText]);

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Status text overlay */}
      <View style={styles.statusOverlay}>
        {hasError && (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, styles.statusDotError]} />
            <Text style={styles.statusText}>{t('common.error', 'Error')}</Text>
          </View>
        )}
        {isResponding && !hasError && (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, styles.statusDotResponding]} />
            <Text style={styles.statusText}>{t('voice.speaking', 'Speaking')}</Text>
          </View>
        )}
        {isProcessing && !isResponding && !hasError && (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, styles.statusDotProcessing]} />
            <Text style={styles.statusText}>{t('voice.processing', 'Processing')}</Text>
          </View>
        )}
        {isListening && !isProcessing && !isResponding && !hasError && (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, styles.statusDotListening]} />
            <Text style={styles.statusText}>{t('voice.listening', 'Listening...')}</Text>
          </View>
        )}
        {!isListening && !isProcessing && !isResponding && !hasError && (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, styles.statusDotIdle]} />
            <Text style={styles.statusText}>{t('voice.ready', 'Ready')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(10, 10, 20, 0.8)',
    position: 'relative' as any,
    overflow: 'hidden' as any,
    // Ensure content isn't clipped at the top edge of viewport
    marginTop: 0,
    paddingTop: 0,
  },
  statusOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex' as any,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as any,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotResponding: {
    backgroundColor: '#10b981', // Green
  },
  statusDotProcessing: {
    backgroundColor: '#fbbf24', // Yellow
  },
  statusDotListening: {
    backgroundColor: '#a855f7', // Blue
  },
  statusDotError: {
    backgroundColor: '#ef4444', // Red
  },
  statusDotIdle: {
    backgroundColor: '#6366f1', // Indigo
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as any,
  },
});

export default SoundwaveParticles;
