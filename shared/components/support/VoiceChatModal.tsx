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
  StyleSheet,
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

  // Track previous state for crossfade
  const [prevState, setPrevState] = useState<VoiceState>(voiceState);
  const [currentState, setCurrentState] = useState<VoiceState>(voiceState);

  // Track sprite type for crossfade transitions between different spritesheets
  type SpriteType = 'speaking' | 'listening' | 'thinking' | 'gesture' | 'static';
  const getSpriteType = useCallback((vs: VoiceState, gs: GestureState | null): SpriteType => {
    if (gs && GESTURE_TO_SPRITESHEET[gs]) return 'gesture';
    if (gs) return 'static';
    if (vs === 'speaking') return 'speaking';
    if (vs === 'processing') return 'thinking';
    if (vs === 'listening') return 'listening';
    return 'static';
  }, []);

  const [prevSpriteType, setPrevSpriteType] = useState<SpriteType>(() => getSpriteType(voiceState, gestureState));
  const [currentSpriteType, setCurrentSpriteType] = useState<SpriteType>(() => getSpriteType(voiceState, gestureState));
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const wizardBreathing = useRef(new Animated.Value(1)).current;

  // Crossfade animations for wizard images
  const currentImageOpacity = useRef(new Animated.Value(1)).current;
  const prevImageOpacity = useRef(new Animated.Value(0)).current;

  // Crossfade for sprite type transitions
  const currentSpriteOpacity = useRef(new Animated.Value(1)).current;
  const prevSpriteOpacity = useRef(new Animated.Value(0)).current;

  // Handle state changes with crossfade
  useEffect(() => {
    if (voiceState !== currentState) {
      // Store current as previous
      setPrevState(currentState);

      // Reset opacities for crossfade
      prevImageOpacity.setValue(1);
      currentImageOpacity.setValue(0);

      // Update current state
      setCurrentState(voiceState);

      // Animate crossfade
      Animated.parallel([
        Animated.timing(currentImageOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(prevImageOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [voiceState, currentState]);

  // Handle sprite type changes with crossfade (for smooth transitions between spritesheets)
  useEffect(() => {
    const newSpriteType = getSpriteType(voiceState, gestureState);

    if (newSpriteType !== currentSpriteType && !isTransitioning) {
      setIsTransitioning(true);
      setPrevSpriteType(currentSpriteType);

      // Reset opacities for crossfade
      prevSpriteOpacity.setValue(1);
      currentSpriteOpacity.setValue(0);

      // Update current sprite type
      setCurrentSpriteType(newSpriteType);

      // Animate crossfade between sprite types
      Animated.parallel([
        Animated.timing(currentSpriteOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(prevSpriteOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsTransitioning(false);
      });
    }
  }, [voiceState, gestureState, currentSpriteType, isTransitioning, getSpriteType]);

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
      // Reset crossfade when opening
      currentImageOpacity.setValue(1);
      prevImageOpacity.setValue(0);

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

      // Start breathing animation
      startBreathingAnimation();
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

  // Wizard breathing animation (subtle scale pulse)
  const startBreathingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wizardBreathing, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(wizardBreathing, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Get display text
  const displayText = currentIntroText || lastResponse || currentTranscript;
  const hasText = Boolean(displayText);

  // Helper to render sprite based on type
  const renderSpriteForType = (spriteType: SpriteType, vs: VoiceState, gs: GestureState | null, playing: boolean) => {
    switch (spriteType) {
      case 'gesture':
        return gs && GESTURE_TO_SPRITESHEET[gs] ? (
          <WizardSprite
            spritesheet={GESTURE_TO_SPRITESHEET[gs]!}
            size={WIZARD_SIZE}
            playing={playing && isAnimatingGesture}
            onComplete={() => {
              setIsAnimatingGesture(false);
              clearGesture();
            }}
          />
        ) : null;
      case 'speaking':
        return (
          <WizardSprite
            spritesheet="speaking"
            size={WIZARD_SIZE}
            playing={playing}
            loop={true}
          />
        );
      case 'thinking':
        return (
          <WizardSprite
            spritesheet="thinking"
            size={WIZARD_SIZE}
            playing={playing}
            loop={true}
          />
        );
      case 'listening':
        return (
          <WizardSprite
            spritesheet="listening"
            size={WIZARD_SIZE}
            playing={playing}
            loop={true}
          />
        );
      case 'static':
      default:
        // Static images with crossfade
        if (gs && GESTURE_AVATARS[gs]) {
          return (
            <Image
              source={GESTURE_AVATARS[gs]}
              style={styles.wizardImage}
              resizeMode="contain"
            />
          );
        }
        return (
          <>
            {/* Previous state image (fading out) */}
            <Animated.Image
              source={WIZARD_AVATARS[prevState]}
              style={[
                styles.wizardImage,
                styles.wizardImageAbsolute,
                { opacity: prevImageOpacity },
              ]}
              resizeMode="contain"
            />
            {/* Current state image (fading in) */}
            <Animated.Image
              source={WIZARD_AVATARS[vs]}
              style={[
                styles.wizardImage,
                { opacity: currentImageOpacity },
              ]}
              resizeMode="contain"
            />
          </>
        );
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop - tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Fixed-size Panel */}
      <Animated.View
        style={[
          styles.panel,
          isRTL ? styles.panelRTL : styles.panelLTR,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            width: PANEL_WIDTH,
          },
        ]}
      >
        {/* Fixed-size Wizard Container with Crossfade */}
        <View style={styles.wizardContainer}>
          {/* Voice state effects overlay */}
          <WizardEffects
            voiceState={voiceState}
            size={WIZARD_SIZE}
            audioLevel={audioLevel}
          />

          <Animated.View
            style={[
              styles.wizardImageWrapper,
              { transform: [{ scale: wizardBreathing }] },
            ]}
          >
            {/* Crossfade between sprite types for smooth transitions */}
            {isTransitioning && (
              <Animated.View
                style={[
                  styles.spriteLayer,
                  { opacity: prevSpriteOpacity },
                ]}
              >
                {renderSpriteForType(prevSpriteType, prevState, null, false)}
              </Animated.View>
            )}
            <Animated.View
              style={[
                styles.spriteLayer,
                isTransitioning ? { opacity: currentSpriteOpacity } : undefined,
              ]}
            >
              {renderSpriteForType(currentSpriteType, voiceState, gestureState, true)}
            </Animated.View>
          </Animated.View>
        </View>

        {/* Name Badge */}
        <View style={styles.nameBadge}>
          <Text style={styles.nameText}>Olorin</Text>
          <Text style={styles.roleText}>{t('support.wizard.role', 'Your Guide')}</Text>
        </View>

        {/* Speech Text Display - Fixed height container */}
        <View style={[styles.speechBubbleContainer, !hasText && styles.speechBubbleHidden]}>
          <View style={styles.speechBubble}>
            <Text
              style={[
                styles.speechText,
                isRTL && styles.speechTextRTL,
              ]}
              numberOfLines={3}
            >
              {displayText || ' '}
            </Text>
          </View>
        </View>

        {/* State Indicator */}
        <View style={styles.stateIndicator}>
          <Text style={styles.stateText}>
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
            <View style={[
              styles.errorToast,
              voiceError.type === 'mic' && styles.errorToastMic,
              voiceError.type === 'connection' && styles.errorToastConnection,
            ]}>
              <Text style={styles.errorToastIcon}>
                {voiceError.type === 'mic' ? '🎤' : voiceError.type === 'connection' ? '📡' : '⚠️'}
              </Text>
              <Text style={styles.errorToastText} numberOfLines={2}>
                {voiceError.message}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Audio Level Indicator (debug) */}
        {voiceState === 'listening' && audioLevel > 0.01 && (
          <View style={styles.audioLevelDebug}>
            <View style={[styles.audioLevelBarDebug, { width: `${Math.min(100, audioLevel * 200)}%` }]} />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    bottom: isTV ? spacing.xl * 3 : spacing.xl * 2,
    backgroundColor: 'rgba(13, 13, 26, 0.95)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  panelLTR: {
    right: isTV ? spacing.xl * 2 : spacing.lg,
  },
  panelRTL: {
    left: isTV ? spacing.xl * 2 : spacing.lg,
  },
  wizardContainer: {
    width: WIZARD_SIZE,
    height: WIZARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wizardImageWrapper: {
    width: WIZARD_SIZE,
    height: WIZARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardImage: {
    width: WIZARD_SIZE,
    height: WIZARD_SIZE,
  },
  wizardImageAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  spriteLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBadge: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  nameText: {
    fontSize: isTV ? 20 : 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  roleText: {
    fontSize: isTV ? 12 : 10,
    color: colors.primary,
    fontWeight: '500',
  },
  speechBubbleContainer: {
    width: '100%',
    minHeight: SPEECH_BUBBLE_HEIGHT,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  speechBubbleHidden: {
    minHeight: 0,
    height: 0,
    marginTop: 0,
    overflow: 'hidden',
  },
  speechBubble: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  speechText: {
    fontSize: isTV ? 14 : 12,
    color: colors.text,
    textAlign: 'center',
    lineHeight: isTV ? 20 : 16,
  },
  speechTextRTL: {
    textAlign: 'right',
  },
  stateIndicator: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.sm,
  },
  stateText: {
    fontSize: isTV ? 11 : 9,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Error toast styles
  errorToast: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    width: '100%',
  },
  errorToastMic: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  errorToastConnection: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  errorToastIcon: {
    fontSize: isTV ? 18 : 14,
    marginRight: spacing.xs,
  },
  errorToastText: {
    flex: 1,
    fontSize: isTV ? 12 : 10,
    color: colors.text,
  },
  // Audio level debug indicator
  audioLevelDebug: {
    marginTop: spacing.xs,
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioLevelBarDebug: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

export default VoiceChatModal;
