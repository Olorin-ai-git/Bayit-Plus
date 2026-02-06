/**
 * Desktop/TV Wizard View
 * Full wizard with sprite animations for desktop and TV voice interactions
 * Shows wizard character, effects overlay, Remotion renderer, error badge, audio ring
 */

import React from 'react';
import { View, Animated, Platform } from 'react-native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { VoiceState } from '../../stores/supportStore';
import { WizardEffects } from './WizardEffects';
import { WizardRenderer } from './WizardRenderer';
import { isTV } from '../../utils/platform';
import { logger } from '../../utils/logger';

const log = logger.scope('DesktopWizardView');

interface DesktopWizardViewProps {
  opacityAnim: Animated.Value;
  scaleAnim: Animated.Value;
  voiceState: VoiceState;
  audioLevel: number;
  voiceError: { type: string; message: string } | null;
  isRTL: boolean;
  wizardSize: number;
  children: React.ReactNode; // The wizard sprite/image content
}

export const DesktopWizardView: React.FC<DesktopWizardViewProps> = ({
  opacityAnim,
  scaleAnim,
  voiceState,
  audioLevel,
  voiceError,
  isRTL,
  wizardSize,
  children,
}) => {
  return (
    <Animated.View
      style={{
        position: 'fixed',
        [isRTL ? 'left' : 'right']: isTV ? 32 : 16,
        bottom: isTV ? 96 : 32,
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
        width: wizardSize + 24,
        height: wizardSize + 24,
        borderRadius: (wizardSize + 24) / 2,
        backgroundColor: 'rgba(13,13,26,0.95)',
        borderWidth: 2,
        borderColor: 'rgba(139,92,246,0.3)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } : {}),
      }}
    >
      {/* Voice state effects overlay */}
      <WizardEffects
        voiceState={voiceState}
        size={wizardSize}
        audioLevel={audioLevel}
      />

      {/* Wizard Sprite */}
      <View style={{ width: wizardSize, height: wizardSize }}>
        {children}
      </View>

      {/* Remotion Wizard Overlay */}
      <View
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: wizardSize,
          height: wizardSize,
          pointerEvents: 'none',
        }}
      >
        <WizardRenderer
          size={wizardSize}
          onComplete={() => {
            if (process.env.NODE_ENV === 'development') {
              log.debug('Remotion sequence completed');
            }
          }}
        />
      </View>

      {/* Voice Error Indicator */}
      {voiceError && (
        <View
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 32,
            height: 32,
            borderRadius: 16,
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
            size={isTV ? 'lg' : 'md'}
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
            borderRadius: (wizardSize + 32) / 2,
            borderWidth: 3,
            borderColor: `rgba(139,92,246,${Math.min(1, audioLevel * 2)})`,
          }}
        />
      )}
    </Animated.View>
  );
};

export default DesktopWizardView;
