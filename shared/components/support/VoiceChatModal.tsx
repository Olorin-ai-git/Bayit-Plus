/**
 * Voice Chat Panel
 * Compact floating wizard character for voice interactions with Olorin
 * Closes on: tap outside, saying "Go", or starting content playback
 * Uses LLM for real conversations, activated by "Jarvis" wake word
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Pressable, Animated, useWindowDimensions } from 'react-native';
import { useSupportStore, VoiceState, GestureState } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { sfxService, WizardGesture } from '../../services/sfxService';
import { useDirection } from '../../hooks/useDirection';
import { useTextChunking } from '../../hooks/useTextChunking';
import { useVoiceDialogueEffects } from '../../hooks/useVoiceDialogueEffects';
import { WizardStateRenderer } from './WizardStateRenderer';
import { MobileWizardView, MOBILE_CONTAINER_SIZE } from './MobileWizardView';
import { DesktopWizardView } from './DesktopWizardView';
import { SpeechBubble } from './SpeechBubble';
import { UserSpeechBubble } from './UserSpeechBubble';

const MOBILE_BREAKPOINT = 768;
const WIZARD_SIZE = isTV ? 180 : 160;
const MOBILE_BOTTOM = 80;

// Gestures that have associated sound effects
const GESTURE_SFX: Partial<Record<GestureState, WizardGesture>> = {
  conjuring: 'conjuring',
  clapping: 'clapping',
  cheering: 'cheering',
};

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
}) => {
  const { isRTL } = useDirection();
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < MOBILE_BREAKPOINT && !isTV;
  const {
    voiceState, currentIntroText, currentTranscript, lastResponse,
    streamingResponse, isStreamingText,
    gestureState, isAnimatingGesture, setIsAnimatingGesture, clearGesture,
    audioLevel, voiceError, clearVoiceError, currentDialogue, setCurrentDialogue, setGestureState,
  } = useSupportStore();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const userBubbleAnim = useRef(new Animated.Value(0)).current;

  const [showBubble, setShowBubble] = useState(false);
  const [showUserBubble, setShowUserBubble] = useState(false);
  const [isAppearing, setIsAppearing] = useState(false);
  const [isDisappearing, setIsDisappearing] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  // Priority: streamingResponse (real-time LLM text) > dialogue > intro > lastResponse > transcript
  const fullDisplayText = streamingResponse || currentDialogue?.text || currentIntroText || lastResponse || currentTranscript;
  const { displayText, textChunks, currentChunkIndex } = useTextChunking({
    text: fullDisplayText, isMobile, voiceState,
  });

  // Dialogue and gesture management
  useVoiceDialogueEffects({
    voiceState, lastResponse, hasAppeared, setCurrentDialogue, setGestureState,
    onIntroComplete: () => setIsIntroComplete(true),
  });

  // SFX for gesture animations
  useEffect(() => {
    if (gestureState && isAnimatingGesture) {
      const sfx = GESTURE_SFX[gestureState];
      if (sfx) sfxService.play(sfx).catch(() => {});
    }
    return () => { if (!isAnimatingGesture) sfxService.stop(); };
  }, [gestureState, isAnimatingGesture]);

  useEffect(() => { if (visible) sfxService.preload('conjuring').catch(() => {}); }, [visible]);

  // Panel show/hide animation
  useEffect(() => {
    if (visible) {
      setIsAppearing(false);
      setHasAppeared(true);
      setIsDisappearing(false);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      setIsDisappearing(true);
      setIsAppearing(false);
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => { setIsDisappearing(false); setHasAppeared(false); });
      }, 800);
    }
  }, [visible]);

  // Auto-dismiss voice error
  useEffect(() => {
    if (voiceError) { const t = setTimeout(clearVoiceError, 5000); return () => clearTimeout(t); }
  }, [voiceError, clearVoiceError]);

  // Speech bubble animation - show when there's response text to display
  // Triggers on: speaking state, streaming text, or new lastResponse from intent actions
  useEffect(() => {
    const activeStates: VoiceState[] = ['speaking', 'processing', 'listening'];
    const shouldShow = displayText && (activeStates.includes(voiceState) || isStreamingText);
    if (shouldShow) {
      setShowBubble(true);
      Animated.spring(bubbleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    } else if (!displayText || voiceState === 'idle') {
      Animated.timing(bubbleAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowBubble(false));
    }
  }, [displayText, voiceState, isStreamingText, bubbleAnim]);

  // User speech bubble animation - show during listening AND processing (so user sees their words)
  useEffect(() => {
    const showBubbleStates: VoiceState[] = ['listening', 'processing'];
    if (currentTranscript && showBubbleStates.includes(voiceState)) {
      setShowUserBubble(true);
      Animated.spring(userBubbleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    } else {
      Animated.timing(userBubbleAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowUserBubble(false));
    }
  }, [currentTranscript, voiceState, userBubbleAnim]);

  if (!visible) return null;

  const effectiveGesture = currentDialogue?.gesture || gestureState;
  const bubbleRightOffset = isMobile ? MOBILE_CONTAINER_SIZE + 24 : isTV ? WIZARD_SIZE + 56 : WIZARD_SIZE + 32;
  const speechBubbleBottom = isMobile
    ? MOBILE_BOTTOM + (MOBILE_CONTAINER_SIZE / 2) - 20
    : isTV ? 96 + (WIZARD_SIZE / 2) - 20 : 32 + (WIZARD_SIZE / 2) - 16;
  const userBubbleBottom = isMobile
    ? MOBILE_BOTTOM + MOBILE_CONTAINER_SIZE + 16
    : isTV ? 96 + WIZARD_SIZE + 16 : 32 + WIZARD_SIZE + 16;

  return (
    <View style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, pointerEvents: 'box-none' }}>
      <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent' }} />

      <Pressable onPress={onClose}>
        {isMobile ? (
          <MobileWizardView
            opacityAnim={opacityAnim} scaleAnim={scaleAnim} voiceState={voiceState}
            audioLevel={audioLevel} voiceError={voiceError} isRTL={isRTL} mobileBottom={MOBILE_BOTTOM}
          />
        ) : (
          <DesktopWizardView
            opacityAnim={opacityAnim} scaleAnim={scaleAnim} voiceState={voiceState}
            audioLevel={audioLevel} voiceError={voiceError} isRTL={isRTL} wizardSize={WIZARD_SIZE}
          >
            <WizardStateRenderer
              voiceState={voiceState} gestureState={gestureState} effectiveGesture={effectiveGesture}
              isAnimatingGesture={isAnimatingGesture} isAppearing={isAppearing} isDisappearing={isDisappearing}
              hasAppeared={hasAppeared} isIntroComplete={isIntroComplete} audioLevel={audioLevel}
              wizardSize={WIZARD_SIZE}
              onAppearComplete={() => { setIsAppearing(false); setHasAppeared(true); }}
              onGestureComplete={() => { setIsAnimatingGesture(false); clearGesture(); }}
            />
          </DesktopWizardView>
        )}
      </Pressable>

      {showUserBubble && !!currentTranscript && (
        <UserSpeechBubble
          transcript={currentTranscript} userBubbleAnim={userBubbleAnim}
          isRTL={isRTL} isMobile={isMobile} bottomOffset={userBubbleBottom} rightOffset={bubbleRightOffset}
        />
      )}

      {showBubble && !!displayText && (
        <SpeechBubble
          displayText={displayText} bubbleAnim={bubbleAnim}
          isRTL={isRTL} isMobile={isMobile} bottomOffset={speechBubbleBottom} rightOffset={bubbleRightOffset}
          textChunks={textChunks} currentChunkIndex={currentChunkIndex}
        />
      )}
    </View>
  );
};

export default VoiceChatModal;
