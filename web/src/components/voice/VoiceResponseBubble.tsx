/**
 * VoiceResponseBubble
 * Displays the wizard's spoken response as a floating bubble at the bottom
 * of the screen. Shows user transcript and wizard response text.
 * Auto-hides after TTS completes.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, glass } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useTranslation } from 'react-i18next';
import logger from '@/utils/logger';

const bubbleLogger = logger.scope('VoiceResponseBubble');

interface VoiceResponseBubbleProps {
  transcript: string;
  responseText: string;
  isVisible: boolean;
  isRTL?: boolean;
  onDismiss?: () => void;
  autoDismissDelay?: number;
}

export function VoiceResponseBubble({
  transcript,
  responseText,
  isVisible,
  isRTL = false,
  onDismiss,
  autoDismissDelay = 3000,
}: VoiceResponseBubbleProps) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [showBubble, setShowBubble] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearDismissTimer();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowBubble(false);
      onDismiss?.();
    });
  }, [fadeAnim, slideAnim, onDismiss, clearDismissTimer]);

  useEffect(() => {
    if (isVisible && responseText) {
      setShowBubble(true);
      clearDismissTimer();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isVisible && showBubble) {
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, autoDismissDelay);
    }

    return () => clearDismissTimer();
  }, [isVisible, responseText, showBubble, autoDismissDelay, fadeAnim, slideAnim, dismiss, clearDismissTimer]);

  if (!showBubble || !responseText) {
    return null;
  }

  const textAlign = isRTL ? 'right' : 'left';
  const dismissPosition = isRTL ? { left: 8 } : { right: 8 };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bubble}>
        <TouchableOpacity
          style={[styles.dismissButton, dismissPosition]}
          onPress={dismiss}
          accessibilityLabel={t('voice.dismissResponse')}
          accessibilityHint={t('voice.dismissResponseHint')}
          accessibilityRole="button"
        >
          <NativeIcon name="x" size="sm" color={colors.textMuted} />
        </TouchableOpacity>

        {transcript ? (
          <Text
            style={[styles.transcriptText, { textAlign }]}
            numberOfLines={2}
          >
            {transcript}
          </Text>
        ) : null}

        <Text
          style={[styles.responseText, { textAlign }]}
          numberOfLines={4}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          accessibilityLabel={`${t('voice.wizardResponse')}: ${responseText}`}
        >
          {responseText}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  bubble: {
    maxWidth: 480,
    width: '100%',
    backgroundColor: glass.bgStrong,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: glass.borderLight,
    // React Native Web: backdropFilter is a web-only CSS property
    // @ts-ignore
    backdropFilter: 'blur(20px)',
    // @ts-ignore
    WebkitBackdropFilter: 'blur(20px)',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    padding: 4,
    zIndex: 1,
  },
  transcriptText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  responseText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});

export default VoiceResponseBubble;
