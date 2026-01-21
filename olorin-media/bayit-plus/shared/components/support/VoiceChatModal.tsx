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
import { colors, spacing, borderRadius } from '../../theme';
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
      // Use static image for listening - spritesheet has inconsistent frames
      return (
        <Image
          source={WIZARD_AVATARS.listening}
          className="w-full h-full"
          style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}
          resizeMode="contain"
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
    <View className="absolute top-0 left-0 right-0 bottom-0 z-[9999]">
      {/* Backdrop - tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-transparent" />
      </TouchableWithoutFeedback>

      {/* Fixed-size Panel */}
      <Animated.View
        className={`absolute ${isRTL ? 'left-4' : 'right-4'} bg-[rgba(13,13,26,0.95)] rounded-2xl p-4 items-center border border-primary/30 shadow-primary/30 ${isTV ? 'bottom-24 right-8' : 'bottom-8'}`}
        style={{
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
          width: PANEL_WIDTH,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
          ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          } : {}),
        }}
      >
        {/* Fixed-size Wizard Container */}
        <View className="items-center justify-center overflow-hidden" style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}>
          {/* Voice state effects overlay */}
          <WizardEffects
            voiceState={voiceState}
            size={WIZARD_SIZE}
            audioLevel={audioLevel}
          />

          <View className="items-center justify-center" style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}>
            {renderWizard()}
          </View>
        </View>

        {/* Name Badge */}
        <View className="items-center mt-2">
          <Text className={`text-white font-bold ${isTV ? 'text-xl' : 'text-lg'}`}>Olorin</Text>
          <Text className={`text-primary font-medium ${isTV ? 'text-xs' : 'text-[10px]'}`}>{t('support.wizard.role', 'Your Guide')}</Text>
        </View>

        {/* Speech Text Display - Fixed height container */}
        <View className={`w-full justify-center ${!hasText ? 'min-h-0 h-0 mt-0 overflow-hidden' : 'mt-3'}`} style={{ minHeight: hasText ? SPEECH_BUBBLE_HEIGHT : 0 }}>
          <View className="bg-primary/15 rounded-lg p-3 w-full border border-primary/20">
            <Text
              className={`text-white text-center ${isTV ? 'text-sm leading-5' : 'text-xs leading-4'} ${isRTL ? 'text-right' : ''}`}
              numberOfLines={3}
            >
              {displayText || ' '}
            </Text>
          </View>
        </View>

        {/* State Indicator */}
        <View className="mt-2 px-3 py-1 bg-primary/10 rounded-sm">
          <Text className={`text-primary font-semibold uppercase tracking-wider ${isTV ? 'text-[11px]' : 'text-[9px]'}`}>
            {voiceState === 'speaking' && currentIntroText
              ? t('support.wizard.introducing', 'Introducing...')
              : voiceState === 'listening'
              ? t('support.wizard.listening', 'Listening...')
              : voiceState === 'processing'
              ? t('support.wizard.thinking', 'Thinking...')
              : voiceState === 'speaking'
              ? t('support.wizard.speaking', 'Speaking...')
              : voiceState === 'error'
              ? t('support.wizard.error', 'Error occurred')
              : t('support.wizard.ready', 'Ready to help')}
          </Text>
        </View>

        {/* Voice Error Toast */}
        {voiceError && (
          <TouchableWithoutFeedback onPress={clearVoiceError}>
            <View className={`mt-2 flex-row items-center p-2 rounded-md border w-full ${
              voiceError.type === 'mic'
                ? 'bg-[rgba(245,158,11,0.2)] border-[rgba(245,158,11,0.4)]'
                : voiceError.type === 'connection'
                ? 'bg-[rgba(59,130,246,0.2)] border-[rgba(59,130,246,0.4)]'
                : 'bg-[rgba(239,68,68,0.2)] border-[rgba(239,68,68,0.4)]'
            }`}>
              <Text className={`${isTV ? 'text-lg' : 'text-sm'} mr-1`}>
                {voiceError.type === 'mic' ? '🎤' : voiceError.type === 'connection' ? '📡' : '⚠️'}
              </Text>
              <Text className={`flex-1 text-white ${isTV ? 'text-xs' : 'text-[10px]'}`} numberOfLines={2}>
                {voiceError.message}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Audio Level Indicator (debug) */}
        {voiceState === 'listening' && audioLevel > 0.01 && (
          <View className="mt-1 w-full h-1 bg-white/10 rounded-sm overflow-hidden">
            <View className="h-full bg-primary rounded-sm" style={{ width: `${Math.min(100, audioLevel * 200)}%` }} />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default VoiceChatModal;
