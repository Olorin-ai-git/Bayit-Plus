import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';
import type { AudioLevel } from '@bayit/shared-utils/vadDetector';

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
    <View className="w-full h-[100px] bg-black/80 relative overflow-hidden mt-0 pt-0">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Status text overlay */}
      <View className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {hasError && (
          <View className="flex-row items-center bg-black/60 px-4 py-2 rounded-[20px] gap-2">
            <View className="w-2 h-2 rounded-full bg-red-500" />
            <Text className="text-white text-xs font-semibold">{t('common.error', 'Error')}</Text>
          </View>
        )}
        {isResponding && !hasError && (
          <View className="flex-row items-center bg-black/60 px-4 py-2 rounded-[20px] gap-2">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-white text-xs font-semibold">{t('voice.speaking', 'Speaking')}</Text>
          </View>
        )}
        {isProcessing && !isResponding && !hasError && (
          <View className="flex-row items-center bg-black/60 px-4 py-2 rounded-[20px] gap-2">
            <View className="w-2 h-2 rounded-full bg-amber-400" />
            <Text className="text-white text-xs font-semibold">{t('voice.processing', 'Processing')}</Text>
          </View>
        )}
        {isListening && !isProcessing && !isResponding && !hasError && (
          <View className="flex-row items-center bg-black/60 px-4 py-2 rounded-[20px] gap-2">
            <View className="w-2 h-2 rounded-full bg-purple-500" />
            <Text className="text-white text-xs font-semibold">{t('voice.listening', 'Listening...')}</Text>
          </View>
        )}
        {!isListening && !isProcessing && !isResponding && !hasError && (
          <View className="flex-row items-center bg-black/60 px-4 py-2 rounded-[20px] gap-2">
            <View className="w-2 h-2 rounded-full bg-indigo-500" />
            <Text className="text-white text-xs font-semibold">{t('voice.ready', 'Ready')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default SoundwaveParticles;
