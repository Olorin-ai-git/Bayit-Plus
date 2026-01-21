/**
 * Voice Command Button
 * Floating button for voice input with animated states
 */

import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import { useDirection } from '@bayit/shared-hooks';
import VoiceWaveform from './VoiceWaveform';

interface VoiceCommandButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  isListening?: boolean;
  isDisabled?: boolean;
}

const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onPress,
  onLongPress,
  isListening = false,
  isDisabled = false,
}) => {
  const { isRTL } = useDirection();
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation when listening
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
  const buttonColor = isListening ? '#a855f7' : isDisabled ? '#666666' : '#8a2be2';

  return (
    <>
      {/* Waveform overlay when listening */}
      {isListening && (
        <View style={styles.waveformOverlay}>
          <VoiceWaveform isListening={true} barCount={7} color={buttonColor} />
        </View>
      )}

      {/* Voice button */}
      <Animated.View
        style={[
          styles.container,
          { [isRTL ? 'left' : 'right']: 20 },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonColor }]}
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.8}
          disabled={isDisabled}
        >
          <Icon size={28} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>

        {/* Glow effect when listening */}
        {isListening && (
          <Animated.View
            style={[
              styles.glow,
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
  container: {
    position: 'absolute',
    bottom: 100,
    zIndex: 9999,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    top: -8,
    left: -8,
    zIndex: -1,
  },
  waveformOverlay: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
});

export default VoiceCommandButton;
