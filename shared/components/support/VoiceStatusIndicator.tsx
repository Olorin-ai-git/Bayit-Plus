/**
 * Voice Status Indicator
 * Displays the current voice interaction state
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';
import { VoiceState } from '../../stores/supportStore';

interface VoiceStatusIndicatorProps {
  state: VoiceState;
  transcript?: string;
  className?: string;
}

const stateConfig: Record<VoiceState, { color: string; icon: string; pulseEnabled: boolean }> = {
  idle: { color: colors.textSecondary, icon: '🎤', pulseEnabled: false },
  listening: { color: colors.success, icon: '🎤', pulseEnabled: true },
  processing: { color: colors.warning, icon: '⚙️', pulseEnabled: true },
  speaking: { color: colors.primary, icon: '🔊', pulseEnabled: true },
  error: { color: colors.error, icon: '⚠️', pulseEnabled: false },
};

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  state,
  transcript,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  const config = stateConfig[state];

  useEffect(() => {
    if (config.pulseEnabled) {
      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [config.pulseEnabled, pulseAnim]);

  useEffect(() => {
    if (state === 'processing') {
      // Dot animation for processing
      const dots = Animated.loop(
        Animated.timing(dotAnim, {
          toValue: 3,
          duration: 1500,
          useNativeDriver: false,
        })
      );
      dots.start();

      return () => dots.stop();
    } else {
      dotAnim.setValue(0);
    }
  }, [state, dotAnim]);

  const getStatusText = () => {
    switch (state) {
      case 'idle':
        return t('support.voice.status.idle', 'Tap to speak');
      case 'listening':
        return t('support.voice.status.listening', 'Listening...');
      case 'processing':
        return t('support.voice.status.processing', 'Processing');
      case 'speaking':
        return t('support.voice.status.speaking', 'Speaking...');
      case 'error':
        return t('support.voice.status.error', 'Error occurred');
      default:
        return '';
    }
  };

  const renderProcessingDots = () => {
    if (state !== 'processing') return null;

    return (
      <Animated.Text
        style={[
          styles.dots,
          {
            opacity: dotAnim.interpolate({
              inputRange: [0, 1, 2, 3],
              outputRange: [0.3, 0.6, 0.9, 1],
            }),
          },
        ]}
      >
        {dotAnim.interpolate({
          inputRange: [0, 1, 2, 3],
          outputRange: ['.', '..', '...', '...'],
        })}
      </Animated.Text>
    );
  };

  return (
    <View className="flex-row items-center p-3 md:p-4 bg-black/30 rounded-2xl gap-3 md:gap-4">
      {/* Status Icon with Pulse */}
      <Animated.View
        className={`${isTV ? 'w-12 h-12 rounded-[24px]' : 'w-10 h-10 rounded-[20px]'} justify-center items-center`}
        style={{
          backgroundColor: `${config.color}20`,
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Text className={`${isTV ? 'text-2xl' : 'text-xl'}`}>{config.icon}</Text>
      </Animated.View>

      {/* Status Text */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className={`${isTV ? 'text-lg' : 'text-base'} font-semibold`} style={{ color: config.color, textAlign }}>
            {getStatusText()}
          </Text>
          {renderProcessingDots()}
        </View>

        {/* Transcript Preview */}
        {transcript && state === 'listening' && (
          <Text
            className={`${isTV ? 'text-sm' : 'text-xs'} text-gray-400 mt-1 italic`}
            style={{ textAlign }}
            numberOfLines={2}
          >
            {transcript}
          </Text>
        )}
      </View>

      {/* Recording Indicator */}
      {state === 'listening' && (
        <View className="pr-2">
          <Animated.View
            className={`${isTV ? 'w-3 h-3 rounded-[6px]' : 'w-2.5 h-2.5 rounded-[5px]'} bg-red-500`}
            style={{
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.5, 1],
              }),
            }}
          />
        </View>
      )}
    </View>
  );
};

export default VoiceStatusIndicator;
