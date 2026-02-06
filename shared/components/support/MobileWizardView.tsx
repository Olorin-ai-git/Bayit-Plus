/**
 * Mobile Wizard View
 * Compact hat-only circular FAB for mobile voice interactions
 * Shows wizard hat, error indicators, audio level ring, and processing indicator
 */

import React from 'react';
import { View, Image, Animated, Platform } from 'react-native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { VoiceState } from '../../stores/supportStore';

// Wizard hat images for mobile
const WIZARD_HAT = {
  mobile: require('../../assets/images/characters/hat/48x48.png'),
};

// Mobile hat dimensions
const MOBILE_HAT_SIZE = 64;
const MOBILE_HAT_IMAGE_SIZE = 48;

interface MobileWizardViewProps {
  opacityAnim: Animated.Value;
  scaleAnim: Animated.Value;
  voiceState: VoiceState;
  audioLevel: number;
  voiceError: { type: string; message: string } | null;
  isRTL: boolean;
  mobileBottom: number;
}

export const MobileWizardView: React.FC<MobileWizardViewProps> = ({
  opacityAnim,
  scaleAnim,
  voiceState,
  audioLevel,
  voiceError,
  isRTL,
  mobileBottom,
}) => {
  const mobileContainerSize = MOBILE_HAT_SIZE + 16; // 80px total

  return (
    <Animated.View
      style={{
        position: 'fixed',
        [isRTL ? 'left' : 'right']: 16,
        bottom: mobileBottom,
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
        width: mobileContainerSize,
        height: mobileContainerSize,
        borderRadius: mobileContainerSize / 2,
        backgroundColor: 'rgba(13,13,26,0.95)',
        borderWidth: 2,
        borderColor: 'rgba(139,92,246,0.5)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
        alignItems: 'center',
        justifyContent: 'center',
        ...(Platform.OS === 'web' ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } : {}),
      }}
    >
      {/* Wizard Hat Image */}
      <Image
        source={WIZARD_HAT.mobile}
        style={{ width: MOBILE_HAT_IMAGE_SIZE, height: MOBILE_HAT_IMAGE_SIZE }}
        resizeMode="contain"
      />

      {/* Voice Error Indicator */}
      {voiceError && (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor:
              voiceError.type === 'mic'
                ? 'rgba(245,158,11,0.9)'
                : voiceError.type === 'connection'
                ? 'rgba(59,130,246,0.9)'
                : 'rgba(239,68,68,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#fff',
          }}
        >
          <NativeIcon
            name={voiceError.type === 'mic' ? 'mic' : voiceError.type === 'connection' ? 'wifi' : 'alertTriangle'}
            size="sm"
            color="#ffffff"
          />
        </View>
      )}

      {/* Audio Level Ring Indicator */}
      {voiceState === 'listening' && audioLevel > 0.01 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: (mobileContainerSize + 8) / 2,
            borderWidth: 3,
            borderColor: `rgba(139,92,246,${Math.min(1, audioLevel * 2)})`,
          }}
        />
      )}

      {/* Processing indicator ring */}
      {voiceState === 'processing' && (
        <View
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: (mobileContainerSize + 6) / 2,
            borderWidth: 2,
            borderColor: 'rgba(251,191,36,0.6)',
            borderTopColor: 'transparent',
          }}
        />
      )}
    </Animated.View>
  );
};

/** Container size for layout calculations in parent */
export const MOBILE_CONTAINER_SIZE = MOBILE_HAT_SIZE + 16;

export default MobileWizardView;
