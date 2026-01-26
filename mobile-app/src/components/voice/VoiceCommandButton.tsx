/**
 * Voice Command Button
 * Floating action button for voice input using Glass UI components
 */

import React, { useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import { useDirection } from '@bayit/shared-hooks';
import { GlassFAB } from '@olorin/glass-ui';
import { colors } from '@olorin/design-tokens';
import VoiceWaveform from './VoiceWaveform';

interface VoiceCommandButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  isListening?: boolean;
  isDisabled?: boolean;
}

const LISTENING_COLOR = colors?.primary || '#a855f7';
const DISABLED_COLOR = colors?.textMuted || '#666666';
const DEFAULT_COLOR = colors?.primary600 || '#8a2be2';

const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onPress,
  onLongPress,
  isListening = false,
  isDisabled = false,
}) => {
  const { isRTL } = useDirection();
  const [pulseAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
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

  const Icon = isDisabled ? MicOff : Mic;
  const buttonColor = isListening ? LISTENING_COLOR : isDisabled ? DISABLED_COLOR : DEFAULT_COLOR;

  const handlePress = () => {
    if (!isDisabled && onPress) {
      onPress();
    }
  };

  return (
    <>
      {isListening && (
        <View style={styles.waveformContainer}>
          <VoiceWaveform isListening={true} barCount={7} color={buttonColor} />
        </View>
      )}

      <Animated.View
        style={[
          styles.buttonContainer,
          { [isRTL ? 'left' : 'right']: 20 },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <GlassFAB
          icon={<Icon size={28} color="#ffffff" strokeWidth={2} />}
          size="lg"
          variant="primary"
          onPress={handlePress}
          disabled={isDisabled}
          isRTL={isRTL}
          testID="voice-command-button"
          accessibilityLabel={
            isDisabled
              ? 'Voice command disabled'
              : isListening
              ? 'Voice command listening'
              : 'Voice command'
          }
          accessibilityHint="Double tap to activate voice search"
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled, busy: isListening }}
          style={[
            styles.fab,
            { backgroundColor: buttonColor },
          ]}
        />

        {isListening && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                backgroundColor: buttonColor,
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.3, 0.1],
                }),
              },
            ]}
          />
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  waveformContainer: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    zIndex: 9999,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glowEffect: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    top: -8,
    left: -8,
    zIndex: -1,
  },
});

export default VoiceCommandButton;
