/**
 * Voice Chat Panel
 * Compact floating wizard character for voice interactions with Olorin
 * Closes on: tap outside, saying "Go", or starting content playback
 * Uses LLM for real conversations, activated by "Jarvis" wake word
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore, VoiceState, GestureState } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { WizardSprite, SpritesheetType } from './WizardSprite';
import { WizardEffects } from './WizardEffects';
import { sfxService, WizardGesture } from '../../services/sfxService';

// Gestures that have associated sound effects
const GESTURE_SFX: Partial<Record<GestureState, WizardGesture>> = {
  conjuring: 'conjuring',
  clapping: 'clapping',
  cheering: 'cheering',
};

// Wizard avatar images for voice states
const WIZARD_AVATARS: Record<VoiceState, any> = {
  idle: require('../../assets/images/characters/wizard/idle/512x512.png'),
  listening: require('../../assets/images/characters/wizard/listening/256x256.png'),
  speaking: require('../../assets/images/characters/wizard/speaking/256x256.png'),
  processing: require('../../assets/images/characters/wizard/thinking/256x256.png'),
  error: require('../../assets/images/characters/wizard/idle/512x512.png'),
};

// Wizard avatar images for gesture states (expressive overlays)
const GESTURE_AVATARS: Record<GestureState, any> = {
  browsing: require('../../assets/images/characters/wizard/browsing/256x256.png'),
  cheering: require('../../assets/images/characters/wizard/cheering/256x256.png'),
  clapping: require('../../assets/images/characters/wizard/clapping/256x256.png'),
  conjuring: require('../../assets/images/characters/wizard/conjuring/256x256.png'),
  crying: require('../../assets/images/characters/wizard/crying/256x256.png'),
  shrugging: require('../../assets/images/characters/wizard/shrugging/256x256.png'),
  facepalm: require('../../assets/images/characters/wizard/facepalm/256x256.png'),
};

// Gestures that have spritesheet animations
const ANIMATED_GESTURES: Set<GestureState> = new Set([
  'clapping',
  'conjuring',
  'crying',
  'facepalm',
] as GestureState[]);

// Map gesture states to spritesheet types
const GESTURE_TO_SPRITESHEET: Partial<Record<GestureState, SpritesheetType>> = {
  clapping: 'clapping',
  conjuring: 'conjuring',
  crying: 'crying',
  facepalm: 'facepalm',
};

// Fixed dimensions for consistent modal size
const WIZARD_SIZE = isTV ? 180 : 160;
const PANEL_WIDTH = isTV ? 280 : 240;
const SPEECH_BUBBLE_HEIGHT = isTV ? 90 : 80;

interface VoiceChatModalProps {
  visible: boolean;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onInterrupt: () => void;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  visible,
  onClose,
  onStartListening,
  onStopListening,
  onInterrupt,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const {
    voiceState,
    currentIntroText,
    currentTranscript,
    lastResponse,
    gestureState,
    isAnimatingGesture,
    setIsAnimatingGesture,
    clearGesture,
    audioLevel,
    voiceError,
    clearVoiceError,
  } = useSupportStore();

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Play sound effects for gesture animations
  useEffect(() => {
    if (gestureState && isAnimatingGesture) {
      const sfxGesture = GESTURE_SFX[gestureState];
      if (sfxGesture) {
        // Play the gesture sound effect
        sfxService.play(sfxGesture).catch((error) => {
          console.warn(`[VoiceChat] Failed to play SFX for ${gestureState}:`, error);
        });
      }
    }

    // Stop SFX when gesture ends
    return () => {
      if (!isAnimatingGesture) {
        sfxService.stop();
      }
    };
  }, [gestureState, isAnimatingGesture]);

  // Preload common SFX on mount
  useEffect(() => {
    if (visible) {
      // Preload conjuring SFX as it's commonly used
      sfxService.preload('conjuring').catch(() => {
        // Ignore preload errors - will fetch on demand
      });
    }
  }, [visible]);

  // Animate panel in/out
  useEffect(() => {
    if (visible) {
      // Pop in animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Auto-dismiss voice error toast after 5 seconds
  useEffect(() => {
    if (voiceError) {
      const timer = setTimeout(() => {
        clearVoiceError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [voiceError, clearVoiceError]);

  // Get display text
  const displayText = currentIntroText || lastResponse || currentTranscript;
  const hasText = Boolean(displayText);

  // Render the appropriate wizard visual based on current state
  const renderWizard = () => {
    // Priority 1: Gesture with spritesheet animation
    if (gestureState && GESTURE_TO_SPRITESHEET[gestureState]) {
      return (
        <WizardSprite
          spritesheet={GESTURE_TO_SPRITESHEET[gestureState]!}
          size={WIZARD_SIZE}
          playing={isAnimatingGesture}
          onComplete={() => {
            setIsAnimatingGesture(false);
            clearGesture();
          }}
        />
      );
    }

    // Priority 2: Static gesture image
    if (gestureState && GESTURE_AVATARS[gestureState]) {
      return (
        <Image
          source={GESTURE_AVATARS[gestureState]}
          className="w-full h-full"
          style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}
          resizeMode="contain"
        />
      );
    }

    // Priority 3: Voice state spritesheets
    if (voiceState === 'speaking') {
      return (
        <WizardSprite
          spritesheet="speaking"
          size={WIZARD_SIZE}
          playing={true}
          loop={true}
        />
      );
    }

    if (voiceState === 'processing') {
      return (
        <WizardSprite
          spritesheet="thinking"
          size={WIZARD_SIZE}
          playing={true}
          loop={true}
        />
      );
    }

    if (voiceState === 'listening') {
      return (
        <WizardSprite
          spritesheet="listening"
          size={WIZARD_SIZE}
          playing={true}
          loop={true}
        />
      );
    }

    // Default: Static voice state image
    return (
      <Image
        source={WIZARD_AVATARS[voiceState]}
        className="w-full h-full"
        style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}
        resizeMode="contain"
      />
    );
  };

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: 'box-none',
      }}
    >
      {/* Backdrop - tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
          }}
        />
      </TouchableWithoutFeedback>

      {/* Minimal Circular Wizard */}
      <Animated.View
        style={{
          position: 'fixed',
          [isRTL ? 'left' : 'right']: isTV ? 32 : 16,
          bottom: isTV ? 96 : 32,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
          width: WIZARD_SIZE + 24,
          height: WIZARD_SIZE + 24,
          borderRadius: (WIZARD_SIZE + 24) / 2,
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
          ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          } : {}),
        }}
      >
        {/* Voice state effects overlay */}
        <WizardEffects
          voiceState={voiceState}
          size={WIZARD_SIZE}
          audioLevel={audioLevel}
        />

        {/* Wizard Sprite */}
        <View style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}>
          {renderWizard()}
        </View>

        {/* Voice Error Indicator (minimal) */}
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
            <Text style={{ fontSize: isTV ? 18 : 16 }}>
              {voiceError.type === 'mic' ? '🎤' : voiceError.type === 'connection' ? '📡' : '⚠️'}
            </Text>
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
              borderRadius: (WIZARD_SIZE + 32) / 2,
              borderWidth: 3,
              borderColor: `rgba(139,92,246,${Math.min(1, audioLevel * 2)})`,
            }}
          />
        )}
      </Animated.View>
    </View>
  );
};

export default VoiceChatModal;
