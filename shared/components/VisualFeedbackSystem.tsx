/**
 * Visual Feedback System
 * Non-textual visual and audio feedback for all application states
 *
 * Replaces text labels with organic visual + audio cues:
 * - Loading: Particle thinking animation + audio tone
 * - Error: Red particles + error sound + voice message
 * - Success: Green particles + success chime + voice confirmation
 * - Navigation: Screen transition with glass flow + voice
 * - Processing: Blue particles flowing + processing tone
 *
 * All feedback combines:
 * 1. Visual (particle animation, color changes)
 * 2. Audio (tone cues, success/error sounds)
 * 3. Voice (TTS confirmation in Hebrew)
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ttsService } from '../services/ttsService';
import { GlassParticleLayer } from './ui/GlassParticleLayer';
import { colors } from '@bayit/shared/theme';

export type FeedbackState = 'idle' | 'loading' | 'processing' | 'success' | 'error' | 'navigation';

interface VisualFeedbackSystemProps {
  state: FeedbackState;
  message?: string; // Optional voice message
  autoHideDuration?: number; // Auto-hide after this time (0 = no auto-hide)
  onHide?: () => void;
}

interface AudioCue {
  tone: 'processing' | 'success' | 'error' | 'chime' | 'notification';
  duration: number; // milliseconds
}

export const VisualFeedbackSystem: React.FC<VisualFeedbackSystemProps> = ({
  state,
  message,
  autoHideDuration = 0,
  onHide,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation on mount/state change
  useEffect(() => {
    if (state === 'idle') {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    // Scale in animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Play feedback cue
    playFeedbackCue(state);

    // Speak message if provided
    if (message) {
      ttsService.speak(message, 'high');
    }

    // Auto-hide if duration specified
    if (autoHideDuration > 0) {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      autoHideTimeoutRef.current = setTimeout(() => {
        hideWithAnimation();
      }, autoHideDuration);
    }

    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, [state, message, autoHideDuration]);

  const hideWithAnimation = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      onHide?.();
    });
  };

  const playFeedbackCue = async (feedbackState: FeedbackState) => {
    // These would be actual audio tone files in production
    switch (feedbackState) {
      case 'loading':
      case 'processing':
        // Play thinking/processing tone
        // In production: play audio file with processing tone
        console.log('[Feedback] Playing processing tone');
        break;

      case 'success':
        // Play success chime
        console.log('[Feedback] Playing success chime');
        break;

      case 'error':
        // Play error sound
        console.log('[Feedback] Playing error sound');
        break;

      case 'navigation':
        // Play transition sound
        console.log('[Feedback] Playing transition sound');
        break;

      default:
        break;
    }
  };

  if (!isVisible) {
    return null;
  }

  const getFeedbackContent = () => {
    switch (state) {
      case 'loading':
        return {
          icon: 'thinking',
          color: colors.primary,
          label: 'טוען...',
        };

      case 'processing':
        return {
          icon: 'processing',
          color: colors.primary,
          label: 'מעבד...',
        };

      case 'success':
        return {
          icon: 'checkmark',
          color: colors.success,
          label: 'בוצע!',
        };

      case 'error':
        return {
          icon: 'error',
          color: colors.error,
          label: 'שגיאה',
        };

      case 'navigation':
        return {
          icon: 'navigation',
          color: colors.primary,
          label: 'ניווט...',
        };

      default:
        return { icon: 'idle', color: colors.primary, label: '' };
    }
  };

  const content = getFeedbackContent();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Visual Feedback Layer */}
        {(state === 'loading' || state === 'processing') && (
          <GlassParticleLayer
            isActive={true}
            audioLevel={0.6}
            intensity="medium"
            style={styles.feedbackLayer}
          />
        )}

        {state === 'success' && (
          <View style={[styles.feedbackLayer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]} />
        )}

        {state === 'error' && (
          <View style={[styles.feedbackLayer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} />
        )}

        {state === 'navigation' && (
          <View style={[styles.feedbackLayer, { backgroundColor: 'rgba(107, 33, 168, 0.2)' }]} />
        )}

        {/* Audio-Visual Indicator */}
        <View style={styles.indicator}>
          <View style={[styles.dot, { backgroundColor: content.color }]} />
          <Animated.View
            style={[
              styles.pulse,
              { backgroundColor: content.color },
              getAnimationStyle(state),
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * Get animation style based on feedback state
 */
function getAnimationStyle(state: FeedbackState): any {
  switch (state) {
    case 'loading':
    case 'processing':
      return {
        animation: 'pulse-loading 1.5s ease-in-out infinite',
      };

    case 'success':
      return {
        animation: 'pulse-success 0.6s ease-out',
      };

    case 'error':
      return {
        animation: 'pulse-error 0.4s ease-out',
      };

    default:
      return {};
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -80,
    marginTop: -80,
    width: 160,
    height: 160,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    backdropFilter: 'blur(12px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
  },
  feedbackLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  indicator: {
    position: 'relative',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    boxShadow: '0 0 12px rgba(168, 85, 247, 0.5)',
  },
  pulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0.6,
  },
});

export default VisualFeedbackSystem;
