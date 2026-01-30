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
} from 'react-native';
import { colors } from '@olorin/design-tokens';
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
        return colors.error.DEFAULT; // Red
      case 'processing':
        return colors.warning.DEFAULT; // Amber
      case 'responding':
        return colors.success.DEFAULT; // Green
      case 'error':
      case 'timeout':
        return colors.error[600]; // Dark red
      default:
        return colors.textMuted; // Gray
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
        className="flex-row items-center gap-1.5 px-2 py-1"
        activeOpacity={0.7}
      >
        <View
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: getStageColor(),
          }}
        />
        {showLabel && (
          <Text
            className="text-xs text-slate-400"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {getStageLabel()}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-2"
      activeOpacity={0.7}
    >
      <Animated.View
        className="w-3 h-3 rounded-full"
        style={{
          backgroundColor: getStageColor(),
          opacity: isListening ? pulseAnimation : 1,
        }}
      />
      {showLabel && (
        <Text
          className="text-xs text-slate-200 font-medium"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {getStageLabel()}
        </Text>
      )}
    </TouchableOpacity>
  );
};
