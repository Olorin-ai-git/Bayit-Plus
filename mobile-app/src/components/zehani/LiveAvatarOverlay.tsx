/**
 * LiveAvatarOverlay - Floating avatar overlay during content playback.
 *
 * Small avatar that reacts to content in real-time, positioned at a
 * configurable corner. Supports dismiss gesture and animated entrance/exit.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OlorinIcon } from '@olorin/icons/native';
import api from '@bayit/shared-services/api';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const overlayLogger = logger.scope('LiveAvatarOverlay');

type OverlayPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

interface LiveAvatarOverlayProps {
  avatarId: string;
  visible: boolean;
  position: OverlayPosition;
  onDismiss: () => void;
}

const POSITION_STYLES: Record<OverlayPosition, { bottom?: number; top?: number; left?: number; right?: number }> = {
  'bottom-left': { bottom: 120, left: 16 },
  'bottom-right': { bottom: 120, right: 16 },
  'top-left': { top: 80, left: 16 },
  'top-right': { top: 80, right: 16 },
};

const EXPRESSION_POLL_MS = 3000;

export const LiveAvatarOverlay: React.FC<LiveAvatarOverlayProps> = ({
  avatarId,
  visible,
  position,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [expression, setExpression] = useState('neutral');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, gestureState) => {
        const swipedAway = Math.abs(gestureState.dx) > 60 || Math.abs(gestureState.dy) > 60;
        if (swipedAway) {
          overlayLogger.info('Avatar overlay dismissed by swipe');
          onDismiss();
        }
      },
    }),
  ).current;

  const pollExpression = useCallback(async () => {
    try {
      const data = await api.get(`/zeh-ani/avatar/${avatarId}/live-expression`) as {
        expression: string;
      };
      setExpression(data.expression);
    } catch (err: unknown) {
      overlayLogger.warn('Live expression poll failed', { avatarId, error: err });
    }
  }, [avatarId]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1, friction: 6, tension: 50, useNativeDriver: true,
      }).start();
      pollExpression();
      pollRef.current = setInterval(pollExpression, EXPRESSION_POLL_MS);
      overlayLogger.info('Live overlay shown', { avatarId, position });
    } else {
      Animated.timing(slideAnim, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start();
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [visible, avatarId, position, slideAnim, pollExpression]);

  if (!visible) return null;

  const posStyle = POSITION_STYLES[position];

  return (
    <Animated.View style={[styles.container, posStyle, {
      opacity: slideAnim,
      transform: [{ scale: slideAnim }],
    }]}
      {...panResponder.panHandlers}
      accessibilityLabel={t('zehAni.liveOverlay.avatarLabel')}
      accessibilityHint={t('zehAni.liveOverlay.swipeToDismiss')}
      accessibilityRole="image">
      <View style={styles.avatarBubble}>
        <OlorinIcon name={`face-${expression}`} size={36}
          color={Colors.Text.primary} />
      </View>
      <Pressable style={styles.dismissButton} onPress={onDismiss}
        accessibilityLabel={t('common.dismiss')}
        accessibilityHint={t('zehAni.liveOverlay.dismissHint')}
        accessibilityRole="button">
        <OlorinIcon name="close" size={12} color={Colors.Text.muted} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', alignItems: 'center' },
  avatarBubble: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.Glass.bgStrong,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.Primary.p700,
  },
  dismissButton: {
    position: 'absolute', top: -4, right: -4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.Glass.bgStrong,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.Glass.whiteLight,
  },
});
