/**
 * Voice Status Indicator
 * Displays the current voice interaction state
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
    <View style={styles.container}>
      {/* Status Icon with Pulse */}
      <Animated.View
        style={[
          styles.iconContainer,
          { backgroundColor: `${config.color}20` },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.icon}>{config.icon}</Text>
      </Animated.View>

      {/* Status Text */}
      <View style={styles.textContainer}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: config.color, textAlign }]}>
            {getStatusText()}
          </Text>
          {renderProcessingDots()}
        </View>

        {/* Transcript Preview */}
        {transcript && state === 'listening' && (
          <Text
            style={[styles.transcript, { textAlign }]}
            numberOfLines={2}
          >
            {transcript}
          </Text>
        )}
      </View>

      {/* Recording Indicator */}
      {state === 'listening' && (
        <View style={styles.recordingIndicator}>
          <Animated.View
            style={[
              styles.recordingDot,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.5, 1],
                }),
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  iconContainer: {
    width: isTV ? 48 : 40,
    height: isTV ? 48 : 40,
    borderRadius: isTV ? 24 : 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: isTV ? 24 : 20,
  },
  textContainer: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
  },
  dots: {
    fontSize: isTV ? 18 : 16,
    fontWeight: '600',
    color: colors.warning,
  },
  transcript: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  recordingIndicator: {
    paddingRight: spacing.sm,
  },
  recordingDot: {
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
    borderRadius: isTV ? 6 : 5,
    backgroundColor: colors.error,
  },
});

export default VoiceStatusIndicator;
