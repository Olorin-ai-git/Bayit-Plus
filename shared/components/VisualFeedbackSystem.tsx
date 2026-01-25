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
import { View, Animated } from 'react-native';
import { ttsService } from '../services/ttsService';
import { GlassParticleLayer } from './ui/GlassParticleLayer';
import { colors } from '@olorin/design-tokens';

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
          color: colors.primary.DEFAULT,
          label: 'טוען...',
        };

      case 'processing':
        return {
          icon: 'processing',
          color: colors.primary.DEFAULT,
          label: 'מעבד...',
        };

      case 'success':
        return {
          icon: 'checkmark',
          color: colors.success.DEFAULT,
          label: 'בוצע!',
        };

      case 'error':
        return {
          icon: 'error',
          color: colors.error.DEFAULT,
          label: 'שגיאה',
        };

      case 'navigation':
        return {
          icon: 'navigation',
          color: colors.primary.DEFAULT,
          label: 'ניווט...',
        };

      default:
        return { icon: 'idle', color: colors.primary.DEFAULT, label: '' };
    }
  };

  const content = getFeedbackContent();

  return (
    <Animated.View
      className="absolute top-1/2 left-1/2 -ml-20 -mt-20 w-40 h-40 z-[9999]"
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <View className="flex-1 items-center justify-center rounded-2xl bg-[rgba(26,26,46,0.4)] border border-white/[0.03] overflow-hidden" style={{ backdropFilter: 'blur(12px)' } as any}>
        {/* Visual Feedback Layer */}
        {(state === 'loading' || state === 'processing') && (
          <GlassParticleLayer
            isActive={true}
            audioLevel={0.6}
            intensity="medium"
            className="absolute top-0 left-0 right-0 bottom-0 rounded-2xl"
          />
        )}

        {state === 'success' && (
          <View className="absolute top-0 left-0 right-0 bottom-0 rounded-2xl bg-green-500/10" />
        )}

        {state === 'error' && (
          <View className="absolute top-0 left-0 right-0 bottom-0 rounded-2xl bg-red-500/10" />
        )}

        {state === 'navigation' && (
          <View className="absolute top-0 left-0 right-0 bottom-0 rounded-2xl bg-purple-600/20" />
        )}

        {/* Audio-Visual Indicator */}
        <View className="relative w-15 h-15 items-center justify-center z-10">
          <View className="w-4 h-4 rounded-full" style={{ backgroundColor: content.color, boxShadow: '0 0 12px rgba(168, 85, 247, 0.5)' }} />
          <Animated.View
            className="absolute w-8 h-8 rounded-2xl opacity-60"
            style={[
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


export default VisualFeedbackSystem;
