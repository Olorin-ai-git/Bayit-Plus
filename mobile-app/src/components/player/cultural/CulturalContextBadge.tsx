/**
 * CulturalContextBadge - Inline badge indicating cultural context availability
 *
 * Small tappable badge with animated pulsing indicator when new context
 * is detected. Tapping opens the cultural explanation sheet.
 */

import React, { useEffect } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { Colors } from '../../../theme/colors';
import logger from '@/utils/logger';

const log = logger.scope('CulturalContextBadge');

const PULSE_DURATION_MS = 1200;
const PULSE_SCALE_MIN = 1.0;
const PULSE_SCALE_MAX = 1.15;
const PULSE_OPACITY_MIN = 0.6;
const PULSE_OPACITY_MAX = 1.0;

interface CulturalContextBadgeProps {
  hasContext: boolean;
  onPress: () => void;
}

export const CulturalContextBadge: React.FC<CulturalContextBadgeProps> = ({
  hasContext,
  onPress,
}) => {
  const { t } = useTranslation();
  const pulseScale = useSharedValue(PULSE_SCALE_MIN);
  const pulseOpacity = useSharedValue(PULSE_OPACITY_MAX);

  useEffect(() => {
    if (hasContext) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(PULSE_SCALE_MAX, {
            duration: PULSE_DURATION_MS / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(PULSE_SCALE_MIN, {
            duration: PULSE_DURATION_MS / 2,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(PULSE_OPACITY_MIN, {
            duration: PULSE_DURATION_MS / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(PULSE_OPACITY_MAX, {
            duration: PULSE_DURATION_MS / 2,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withTiming(PULSE_SCALE_MIN, { duration: 200 });
      pulseOpacity.value = withTiming(PULSE_OPACITY_MAX, { duration: 200 });
    }
  }, [hasContext, pulseScale, pulseOpacity]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePress = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    log.info('Cultural context badge pressed');
    onPress();
  };

  if (!hasContext) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={t('cultural.contextAvailable')}
      accessibilityHint={t('cultural.tapForCulturalContext')}
      accessibilityRole="button"
      style={styles.container}
    >
      <Animated.View style={[styles.badge, pulseAnimatedStyle]}>
        <View style={styles.dot} />
        <NativeIcon name="bookOpen" size="xs" color={Colors.Primary.p300} />
        <Text style={styles.label}>{t('cultural.context')}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: Colors.Glass.purpleLight,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.Glass.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.Primary.p400,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: Colors.Primary.p300,
  },
});
