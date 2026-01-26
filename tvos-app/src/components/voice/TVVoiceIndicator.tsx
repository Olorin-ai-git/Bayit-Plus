/**
 * TV Voice Indicator Component
 * Animated listening indicator with focus ring for tvOS
 * Shows microphone icon with pulsing effect during active listening
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { useVoiceStore } from '../../stores/voiceStore';
import { useTranslation } from 'react-i18next';

interface TVVoiceIndicatorProps {
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const TVVoiceIndicator: React.FC<TVVoiceIndicatorProps> = ({
  onPress,
  size = 'medium',
  showLabel = true,
}) => {
  const { t } = useTranslation();
  const { isListening, isProcessing } = useVoiceStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isFocused, setIsFocused] = React.useState(false);

  // Pulse animation while listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const sizeStyles = {
    small: {
      width: 60,
      height: 60,
      iconSize: 28,
      fontSize: 16,
    },
    medium: {
      width: 80,
      height: 80,
      iconSize: 40,
      fontSize: 20,
    },
    large: {
      width: 120,
      height: 120,
      iconSize: 56,
      fontSize: 24,
    },
  };

  const current = sizeStyles[size];

  const bgColor = isListening ? '#A855F7' : isProcessing ? '#7C3AED' : '#6B21A8';
  const borderColor = isFocused ? '#A855F7' : isListening ? '#A855F7' : '#6B21A8';
  const scale = isFocused ? 1.1 : 1;

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      accessible
      accessibilityLabel={t('voice.listening', 'Voice listening')}
      accessibilityHint={isListening ? t('voice.listening_hint', 'Microphone is active') : undefined}
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: current.width,
            height: current.height,
            backgroundColor: bgColor,
            borderColor,
            borderWidth: 4,
            borderRadius: current.width / 2,
            transform: [{ scale: isFocused ? scale : pulseAnim }],
          },
        ]}
      >
        <Text style={{ fontSize: current.iconSize }}>🎙️</Text>
      </Animated.View>

      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: current.fontSize,
              color: isListening ? '#A855F7' : '#FFFFFF',
            },
          ]}
        >
          {isListening ? t('voice.listening', 'Listening') : t('voice.ready', 'Ready')}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default TVVoiceIndicator;
