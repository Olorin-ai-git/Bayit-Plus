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
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore, VoiceState, GestureState } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { WizardSprite, SpritesheetType } from './WizardSprite';
import { WizardRenderer } from './WizardRenderer';
import { WizardEffects } from './WizardEffects';
import { sfxService, WizardGesture } from '../../services/sfxService';
import { NativeIcon } from '@olorin/shared-icons/native';
import {
  WIZARD_AVATARS,
  GESTURE_AVATARS,
  ANIMATED_GESTURES,
  GESTURE_TO_SPRITESHEET,
} from '../../constants/wizardAvatars';
import { useAvatarDialogue } from '../../hooks/useAvatarDialogue';
import { useVoiceFlowOrchestrator } from '../../hooks/useVoiceFlowOrchestrator';

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

// Gestures that have associated sound effects
const GESTURE_SFX: Partial<Record<GestureState, WizardGesture>> = {
  conjuring: 'conjuring',
  clapping: 'clapping',
  cheering: 'cheering',
};

// Fixed dimensions for consistent modal size
const WIZARD_SIZE = isTV ? 180 : 160;
const PANEL_WIDTH = isTV ? 280 : 240;
const SPEECH_BUBBLE_HEIGHT = isTV ? 90 : 80;

// Wizard hat images for mobile (same as VoiceAvatarFAB)
const WIZARD_HAT = {
  mobile: require('../../assets/images/characters/hat/48x48.png'),
  tv: require('../../assets/images/characters/hat/64x64.png'),
};

// Mobile hat size (smaller circular FAB)
const MOBILE_HAT_SIZE = 64;
const MOBILE_HAT_IMAGE_SIZE = 48;

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
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < MOBILE_BREAKPOINT && !isTV;
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
    currentDialogue,
    setCurrentDialogue,
    setGestureState,
  } = useSupportStore();

  // Avatar dialogue hook for gesture selection
  const {
    getWakeDialogue,
    getProcessingDialogue,
    getPresentingDialogue,
    getNothingFoundDialogue,
    getErrorDialogue,
    getGreetingDialogue,
    getInterruptionDialogue,
    getDismissalDialogue: getDismissalDialogueFunc,
  } = useAvatarDialogue({
    onGestureChange: (gesture) => {
      // Sync gesture to store when dialogue system changes it
      setGestureState(gesture as GestureState);
    },
  });

  // Voice flow orchestrator - automatically triggers Remotion sequences
  useVoiceFlowOrchestrator({
    enabled: true,
    onSequenceStart: (sequenceId) => {
      // Log sequence start (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log('[VoiceChatModal] Remotion sequence started:', sequenceId);
      }
    },
    onSequenceComplete: (sequenceId) => {
      // Log sequence completion (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log('[VoiceChatModal] Remotion sequence completed:', sequenceId);
      }
    },
  });

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  // Track if we should show the speech bubble
  const [showBubble, setShowBubble] = useState(false);

  // Track if we should show the user's speech bubble (when they're speaking)
  const [showUserBubble, setShowUserBubble] = useState(false);
  const userBubbleAnim = useRef(new Animated.Value(0)).current;

  // Text chunking for mobile - split long text into sequential bubbles
  const [textChunks, setTextChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track wizard appearance/disappearance animations
  const [isAppearing, setIsAppearing] = useState(false);
  const [isDisappearing, setIsDisappearing] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  // Track previous voice state for transition detection
  const prevVoiceStateRef = useRef<VoiceState>(voiceState);

  // Play sound effects for gesture animations (non-critical - silent fail)
  useEffect(() => {
    if (gestureState && isAnimatingGesture) {
      const sfxGesture = GESTURE_SFX[gestureState];
      if (sfxGesture) {
        // Play the gesture sound effect - fire and forget, SFX is non-critical
        sfxService.play(sfxGesture).catch(() => {
          // Silently ignore SFX failures - the service logs internally
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

  // Set appropriate dialogue and gesture based on voice state transitions
  useEffect(() => {
    const prevState = prevVoiceStateRef.current;
    prevVoiceStateRef.current = voiceState;

    // Skip if state didn't change
    if (prevState === voiceState) return;

    // Select appropriate dialogue based on voice state transition
    switch (voiceState) {
      case 'listening':
        // Starting to listen - show wake/attentive dialogue
        if (prevState === 'idle') {
          const dialogue = getWakeDialogue();
          setCurrentDialogue(dialogue);
          if (dialogue.gesture) {
            setGestureState(dialogue.gesture as GestureState);
          }
        }
        break;

      case 'processing':
        // Processing user input - show thinking dialogue
        {
          const dialogue = getProcessingDialogue(true);
          setCurrentDialogue(dialogue);
          if (dialogue.gesture) {
            setGestureState(dialogue.gesture as GestureState);
          }
        }
        break;

      case 'speaking':
        // Speaking response - wizard should be speaking (use speaking animation)
        // No specific dialogue needed, the speaking animation will play
        break;

      case 'error':
        // Error state - show confused/error dialogue
        {
          const dialogue = getErrorDialogue();
          setCurrentDialogue(dialogue);
          if (dialogue.gesture) {
            setGestureState(dialogue.gesture as GestureState);
          }
        }
        break;

      case 'idle':
        // Returned to idle - mark intro complete and clear dialogue
        if (prevState === 'speaking' && hasAppeared) {
          setIsIntroComplete(true);
        }
        setTimeout(() => {
          setCurrentDialogue(null);
        }, 1000);
        break;
    }
  }, [
    voiceState,
    currentDialogue,
    hasAppeared,
    setCurrentDialogue,
    setGestureState,
    getWakeDialogue,
    getProcessingDialogue,
    getPresentingDialogue,
    getErrorDialogue,
  ]);

  // Update dialogue text when lastResponse changes during speaking
  useEffect(() => {
    if (voiceState === 'speaking' && lastResponse) {
      // Create dialogue with the response text
      // Pattern matching for specific response types (errors, nothing found)
      const lowerResponse = lastResponse.toLowerCase();

      if (lowerResponse.includes('sorry') || lowerResponse.includes('couldn\'t find') || lowerResponse.includes('no results')) {
        const dialogue = getNothingFoundDialogue();
        setCurrentDialogue({ ...dialogue, text: lastResponse });
        setGestureState('shrugging');
      } else if (lowerResponse.includes('error') || lowerResponse.includes('went wrong')) {
        const dialogue = getErrorDialogue();
        setCurrentDialogue({ ...dialogue, text: lastResponse });
        setGestureState('confused');
      } else {
        // Default: just set the text, let speaking animation play
        setCurrentDialogue({ text: lastResponse });
      }
    }
  }, [lastResponse, voiceState, setCurrentDialogue, setGestureState, getNothingFoundDialogue, getErrorDialogue]);

  // Animate panel in/out with appearing/disappearing animations
  useEffect(() => {
    if (visible) {
      // Start appearing animation
      setIsAppearing(true);
      setHasAppeared(false);
      setIsDisappearing(false);

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
      // Start disappearing animation
      setIsDisappearing(true);
      setIsAppearing(false);

      // Wait for puffs_out animation to complete before hiding
      setTimeout(() => {
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
        ]).start(() => {
          setIsDisappearing(false);
          setHasAppeared(false);
        });
      }, 800); // Duration for puffs_out animation (5 frames at 6fps = ~833ms)
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

  // Get display text - prioritize dialogue text, then intro, then response, then transcript
  const fullDisplayText = currentDialogue?.text || currentIntroText || lastResponse || currentTranscript;
  const hasText = Boolean(fullDisplayText);

  // Mobile text chunk size (characters that fit comfortably in bubble)
  const MOBILE_CHUNK_SIZE = 80;
  const CHUNK_DELAY_MS = 3000;

  // Split text into chunks for mobile display
  const splitTextIntoChunks = useCallback((text: string): string[] => {
    if (!text || !isMobile) return [text];

    // If text fits in one bubble, no need to split
    if (text.length <= MOBILE_CHUNK_SIZE) return [text];

    const chunks: string[] = [];
    const words = text.split(' ');
    let currentChunk = '';

    for (const word of words) {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      if (testChunk.length <= MOBILE_CHUNK_SIZE) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    return chunks.length > 0 ? chunks : [text];
  }, [isMobile]);

  // Update text chunks when display text changes
  useEffect(() => {
    if (fullDisplayText && isMobile) {
      const chunks = splitTextIntoChunks(fullDisplayText);
      setTextChunks(chunks);
      setCurrentChunkIndex(0);

      // Clear any existing timer
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }

      // If multiple chunks, cycle through them with delay
      if (chunks.length > 1 && voiceState === 'speaking') {
        chunkTimerRef.current = setInterval(() => {
          setCurrentChunkIndex(prev => {
            const nextIndex = prev + 1;
            // Stop cycling when we reach the last chunk
            if (nextIndex >= chunks.length) {
              if (chunkTimerRef.current) {
                clearInterval(chunkTimerRef.current);
                chunkTimerRef.current = null;
              }
              return prev;
            }
            return nextIndex;
          });
        }, CHUNK_DELAY_MS);
      }
    } else {
      setTextChunks([]);
      setCurrentChunkIndex(0);
    }

    return () => {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
    };
  }, [fullDisplayText, isMobile, voiceState, splitTextIntoChunks]);

  // Get current display text (chunked for mobile, full for desktop/TV)
  const displayText = isMobile && textChunks.length > 0
    ? textChunks[currentChunkIndex]
    : fullDisplayText;

  // Animate speech bubble when text changes
  useEffect(() => {
    if (displayText && voiceState === 'speaking') {
      setShowBubble(true);
      Animated.spring(bubbleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else if (!displayText || voiceState === 'idle') {
      Animated.timing(bubbleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowBubble(false));
    }
  }, [displayText, voiceState, bubbleAnim]);

  // Animate user speech bubble when transcript changes during listening
  useEffect(() => {
    if (currentTranscript && voiceState === 'listening') {
      setShowUserBubble(true);
      Animated.spring(userBubbleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else if (!currentTranscript || voiceState !== 'listening') {
      Animated.timing(userBubbleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowUserBubble(false));
    }
  }, [currentTranscript, voiceState, userBubbleAnim]);

  // Get effective gesture from currentDialogue or gestureState
  const effectiveGesture = currentDialogue?.gesture || gestureState;

  // Render the appropriate wizard visual based on current state
  const renderWizard = () => {
    // Priority 0: Appearing animation (puffs_in) when wizard first shows
    if (isAppearing && !hasAppeared) {
      return (
        <WizardSprite
          spritesheet="puffs_in"
          size={WIZARD_SIZE}
          playing={true}
          loop={false}
          onComplete={() => {
            setIsAppearing(false);
            setHasAppeared(true);
          }}
        />
      );
    }

    // Priority 0b: Disappearing animation (puffs_out) when wizard is dismissed
    if (isDisappearing) {
      return (
        <WizardSprite
          spritesheet="puffs_out"
          size={WIZARD_SIZE}
          playing={true}
          loop={false}
        />
      );
    }

    // Priority 1: Waiting mode (after intro complete, show waiting until user actively speaks)
    if (isIntroComplete && voiceState === 'idle') {
      return (
        <WizardSprite
          spritesheet="listening"
          size={WIZARD_SIZE}
          playing={true}
          loop={true}
        />
      );
    }

    // Priority 2: Waiting mode even during listening if intro complete and no audio input
    if (isIntroComplete && voiceState === 'listening' && audioLevel < 0.02) {
      return (
        <WizardSprite
          spritesheet="listening"
          size={WIZARD_SIZE}
          playing={true}
          loop={true}
        />
      );
    }

    // Priority 3: Listening animation when user is ACTIVELY speaking
    if (voiceState === 'listening' && audioLevel >= 0.02) {
      return (
        <WizardSprite
          spritesheet="listening"
          size={WIZARD_SIZE}
          playing={true}
          loop={true}
        />
      );
    }

    // Priority 4: Processing/thinking animation
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

    // Priority 5: Speaking animation
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

    // Priority 6: Gesture from dialogue or store with spritesheet animation
    const gestureToUse = effectiveGesture as GestureState | null;
    const spritesheetName = gestureToUse ? GESTURE_TO_SPRITESHEET[gestureToUse] : undefined;

    // Only render WizardSprite if we have a valid spritesheet name
    if (spritesheetName) {
      return (
        <WizardSprite
          spritesheet={spritesheetName}
          size={WIZARD_SIZE}
          playing={isAnimatingGesture}
          onComplete={() => {
            setIsAnimatingGesture(false);
            clearGesture();
          }}
        />
      );
    }

    // Priority 7: Static gesture image from dialogue or store
    if (gestureToUse && GESTURE_AVATARS[gestureToUse]) {
      return (
        <Image
          source={GESTURE_AVATARS[gestureToUse]}
          className="w-full h-full"
          style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}
          resizeMode="contain"
        />
      );
    }

    // Priority 8: Default listening if voiceState is listening (fallback)
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

  // Mobile-specific sizes for compact hat view
  const mobileContainerSize = MOBILE_HAT_SIZE + 16; // 80px total
  const mobileBottom = 80; // Above bottom nav

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

      {isMobile ? (
        /* Mobile: Compact hat-only circular FAB with speech bubble */
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

          {/* Voice Error Indicator (mobile - smaller) */}
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

          {/* Audio Level Ring Indicator (mobile) */}
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

          {/* Processing indicator ring (mobile) */}
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
      ) : (
        /* TV/Desktop: Full wizard with sprite animations */
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
            size={WIZARD_SIZE}
            audioLevel={audioLevel}
          />

          {/* Wizard Sprite */}
          <View style={{ width: WIZARD_SIZE, height: WIZARD_SIZE }}>
            {renderWizard()}
          </View>

          {/* Remotion Wizard Overlay - renders on top when sequences are playing */}
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: WIZARD_SIZE,
              height: WIZARD_SIZE,
              pointerEvents: 'none',
            }}
          >
            <WizardRenderer
              size={WIZARD_SIZE}
              onComplete={() => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[VoiceChatModal] Remotion sequence completed');
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
                borderRadius: (WIZARD_SIZE + 32) / 2,
                borderWidth: 3,
                borderColor: `rgba(139,92,246,${Math.min(1, audioLevel * 2)})`,
              }}
            />
          )}
        </Animated.View>
      )}

      {/* User Speech Bubble - shows what the user is saying */}
      {showUserBubble && currentTranscript && (
        <Animated.View
          style={{
            position: 'fixed',
            [isRTL ? 'left' : 'right']: isMobile
              ? mobileContainerSize + 24
              : isTV
              ? WIZARD_SIZE + 56
              : WIZARD_SIZE + 32,
            bottom: isMobile
              ? mobileBottom + mobileContainerSize + 16
              : isTV
              ? 96 + WIZARD_SIZE + 16
              : 32 + WIZARD_SIZE + 16,
            maxWidth: isMobile ? 200 : isTV ? 320 : 240,
            minWidth: isMobile ? 80 : isTV ? 120 : 100,
            opacity: userBubbleAnim,
            transform: [
              { scale: userBubbleAnim },
              {
                translateX: userBubbleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isRTL ? -20 : 20, 0],
                }),
              },
            ],
            backgroundColor: 'rgba(59,130,246,0.15)',
            borderRadius: isMobile ? 16 : 24,
            borderWidth: 2,
            borderColor: 'rgba(59,130,246,0.5)',
            paddingHorizontal: isMobile ? spacing.sm : spacing.md,
            paddingVertical: isMobile ? spacing.xs : spacing.sm,
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
            ...(Platform.OS === 'web' ? {
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } : {}),
          }}
        >
          {/* User bubble tail/pointer pointing down to hat */}
          <View
            style={{
              position: 'absolute',
              [isRTL ? 'left' : 'right']: 20,
              bottom: -10,
              width: 0,
              height: 0,
              borderLeftWidth: 8,
              borderRightWidth: 8,
              borderTopWidth: 10,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: 'rgba(59,130,246,0.5)',
            }}
          />
          {/* Microphone icon to indicate user input */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.xs }}>
            <NativeIcon
              name="mic"
              size="sm"
              color="rgba(59,130,246,0.8)"
            />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: isMobile ? 12 : isTV ? 15 : 13,
                lineHeight: isMobile ? 16 : isTV ? 20 : 18,
                textAlign: isRTL ? 'right' : 'left',
                fontWeight: '400',
                fontStyle: 'italic',
                flex: 1,
              }}
              numberOfLines={isMobile ? 2 : 3}
            >
              {currentTranscript}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Speech Bubble - displays spoken text near wizard/hat */}
      {showBubble && displayText && (
        <Animated.View
          style={{
            position: 'fixed',
            [isRTL ? 'left' : 'right']: isMobile
              ? mobileContainerSize + 24
              : isTV
              ? WIZARD_SIZE + 56
              : WIZARD_SIZE + 32,
            bottom: isMobile
              ? mobileBottom + (mobileContainerSize / 2) - 20
              : isTV
              ? 96 + (WIZARD_SIZE / 2) - 20
              : 32 + (WIZARD_SIZE / 2) - 16,
            maxWidth: isMobile ? 200 : isTV ? 320 : 240,
            minWidth: isMobile ? 80 : isTV ? 120 : 100,
            opacity: bubbleAnim,
            transform: [
              { scale: bubbleAnim },
              {
                translateX: bubbleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isRTL ? -20 : 20, 0],
                }),
              },
            ],
            backgroundColor: 'rgba(13,13,26,0.95)',
            borderRadius: isMobile ? 16 : 24,
            borderWidth: 2,
            borderColor: 'rgba(139,92,246,0.4)',
            paddingHorizontal: isMobile ? spacing.sm : spacing.md,
            paddingVertical: isMobile ? spacing.xs : spacing.sm,
            shadowColor: '#8b5cf6',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
            ...(Platform.OS === 'web' ? {
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } : {}),
          }}
        >
          {/* Speech bubble tail/pointer */}
          <View
            style={{
              position: 'absolute',
              [isRTL ? 'left' : 'right']: -10,
              top: '50%',
              marginTop: -8,
              width: 0,
              height: 0,
              borderTopWidth: 8,
              borderBottomWidth: 8,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 10,
              [isRTL ? 'borderRightColor' : 'borderLeftColor']: 'rgba(139,92,246,0.4)',
            }}
          />
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: isMobile ? 13 : isTV ? 16 : 14,
              lineHeight: isMobile ? 18 : isTV ? 22 : 20,
              textAlign: isRTL ? 'right' : 'left',
              fontWeight: '500',
            }}
            numberOfLines={isMobile ? 4 : 4}
          >
            {displayText}
          </Text>

          {/* Chunk pagination indicator for mobile */}
          {isMobile && textChunks.length > 1 && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: spacing.xs,
                gap: 4,
              }}
            >
              {textChunks.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: index === currentChunkIndex
                      ? 'rgba(139,92,246,0.9)'
                      : 'rgba(139,92,246,0.3)',
                  }}
                />
              ))}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

export default VoiceChatModal;
