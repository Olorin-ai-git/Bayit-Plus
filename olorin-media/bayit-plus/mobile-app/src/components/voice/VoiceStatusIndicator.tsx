/**
 * Voice Status Indicator Component
 *
 * Compact indicator showing voice recording state
 * Used in navigation bars, search bars, etc.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useVoiceState } from '../../hooks/useVoiceFeatures';
import { VoiceStage } from '../../services/voiceManager';

interface VoiceStatusIndicatorProps {
  onPress?: () => void;
  compact?: boolean;
  showLabel?: boolean;
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  onPress,
  compact = false,
  showLabel = true,
}) => {
  const { stage, isListening } = useVoiceState();
  const [pulseAnimation] = useState(new Animated.Value(0.7));

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isListening, pulseAnimation]);

  const getStageColor = () => {
    switch (stage) {
      case 'listening':
        return '#EF4444'; // Red
      case 'processing':
        return '#F59E0B'; // Amber
      case 'responding':
        return '#10B981'; // Green
      case 'error':
      case 'timeout':
        return '#DC2626'; // Dark red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStageLabel = () => {
    switch (stage) {
      case 'idle':
        return 'Ready';
      case 'wake-word':
        return 'Listening...';
      case 'listening':
        return 'Recording...';
      case 'processing':
        return 'Processing...';
      case 'responding':
        return 'Responding...';
      case 'error':
        return 'Error';
      case 'timeout':
        return 'Timeout';
      default:
        return 'Unknown';
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.compactContainer}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.compactDot,
            {
              backgroundColor: getStageColor(),
            },
          ]}
        />
        {showLabel && (
          <Text style={styles.compactLabel}>{getStageLabel()}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: getStageColor(),
            opacity: isListening ? pulseAnimation : 1,
          },
        ]}
      />
      {showLabel && (
        <Text style={styles.label}>{getStageLabel()}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
