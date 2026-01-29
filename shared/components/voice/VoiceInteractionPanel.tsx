/**
 * Voice Interaction Panel
 * Unified panel for all voice interactions with Olorin wizard avatar
 * Supports 4 avatar modes: FULL, COMPACT, MINIMAL, ICON_ONLY
 *
 * Modes:
 * - FULL: Full-screen wizard with animations (320x480 web / 240x360 mobile)
 * - COMPACT: Floating circular panel (160x160 wizard in 240px panel)
 * - MINIMAL: Waveform bar only (240x80)
 * - ICON_ONLY: Hidden (only FAB button visible)
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { useSupportStore } from '../../stores/supportStore';
import { useVoiceAvatarMode } from '../../hooks/useVoiceAvatarMode';
import { isTV } from '../../utils/platform';
import MinimalMode from './MinimalMode';
import CompactMode from './CompactMode';
import FullMode from './FullMode';

interface VoiceInteractionPanelProps {
  visible: boolean;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onInterrupt: () => void;
}

export const VoiceInteractionPanel: React.FC<VoiceInteractionPanelProps> = ({
  visible,
  onClose,
  onStartListening,
  onStopListening,
  onInterrupt,
}) => {
  const platform = Platform.OS === 'web' ? 'web' : isTV ? 'tv' : 'mobile';
  const {
    avatarMode,
    dimensions,
    showAnimations,
    showWaveform,
    showTranscript,
    showWizard,
    autoCollapseTimeout,
  } = useVoiceAvatarMode(platform);

  const {
    voiceState,
    currentTranscript,
    lastResponse,
    gestureState,
    isAnimatingGesture,
    audioLevel,
  } = useSupportStore();

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Auto-collapse timer
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animate in/out based on mode
  useEffect(() => {
    if (visible && avatarMode !== 'icon_only') {
      // Show panel
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

      // Start auto-collapse timer if configured
      if (autoCollapseTimeout > 0 && voiceState === 'idle') {
        collapseTimerRef.current = setTimeout(() => {
          onClose();
        }, autoCollapseTimeout);
      }
    } else {
      // Hide panel
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

    // Clear timer on unmount or visibility change
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, [visible, avatarMode, voiceState, autoCollapseTimeout, scaleAnim, opacityAnim, onClose]);

  // Don't render if icon_only mode or not visible
  if (avatarMode === 'icon_only' || !visible) {
    return null;
  }

  // Render based on mode
  if (avatarMode === 'minimal') {
    return (
      <MinimalMode
        visible={visible}
        voiceState={voiceState}
        audioLevel={audioLevel}
        onClose={onClose}
        scaleAnim={scaleAnim}
        opacityAnim={opacityAnim}
      />
    );
  }

  if (avatarMode === 'compact') {
    return (
      <CompactMode
        visible={visible}
        voiceState={voiceState}
        gestureState={gestureState}
        isAnimatingGesture={isAnimatingGesture}
        showAnimations={showAnimations}
        onClose={onClose}
        scaleAnim={scaleAnim}
        opacityAnim={opacityAnim}
        dimensions={dimensions}
      />
    );
  }

  // FULL mode - full-screen wizard
  return (
    <FullMode
      visible={visible}
      voiceState={voiceState}
      gestureState={gestureState}
      isAnimatingGesture={isAnimatingGesture}
      currentTranscript={currentTranscript}
      lastResponse={lastResponse}
      audioLevel={audioLevel}
      showAnimations={showAnimations}
      showTranscript={showTranscript}
      onClose={onClose}
      scaleAnim={scaleAnim}
      opacityAnim={opacityAnim}
      dimensions={dimensions}
    />
  );
};

export default VoiceInteractionPanel;
