/**
 * TranslationPopover - Floating word translation popover
 *
 * Positioned near the tapped word in the subtitle track.
 * Shows original word, translation, and transliteration.
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { Colors } from '../../../theme/colors';
import logger from '@/utils/logger';

const log = logger.scope('TranslationPopover');

const POPOVER_WIDTH = 220;
const POPOVER_MARGIN = 16;
const ENTRY_DURATION_MS = 200;

interface PopoverPosition {
  x: number;
  y: number;
}

interface TranslationPopoverProps {
  visible: boolean;
  word: string;
  translation: string;
  transliteration: string;
  position: PopoverPosition;
  onClose: () => void;
}

const clampX = (x: number): number => {
  const screenWidth = Dimensions.get('window').width;
  const halfWidth = POPOVER_WIDTH / 2;
  return Math.max(
    POPOVER_MARGIN + halfWidth,
    Math.min(x, screenWidth - POPOVER_MARGIN - halfWidth),
  );
};

const clampY = (y: number): number => {
  const screenHeight = Dimensions.get('window').height;
  return Math.max(POPOVER_MARGIN, Math.min(y, screenHeight - 160));
};

export const TranslationPopover: React.FC<TranslationPopoverProps> = ({
  visible,
  word,
  translation,
  transliteration,
  position,
  onClose,
}) => {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    if (visible) {
      log.info('Translation popover shown', { word });
      opacity.value = withTiming(1, {
        duration: ENTRY_DURATION_MS,
        easing: Easing.out(Easing.ease),
      });
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.85, { duration: 150 });
    }
  }, [visible, word, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) {
    return null;
  }

  const clampedX = clampX(position.x);
  const clampedY = clampY(position.y);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel={t('common.dismissPopover')}
        accessibilityRole="button"
      />
      <Animated.View
        style={[
          styles.popover,
          {
            left: clampedX - POPOVER_WIDTH / 2,
            top: clampedY,
          },
          animatedStyle,
        ]}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${word}: ${translation}, ${transliteration}`}
      >
        <View style={styles.arrow} />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.originalWord}>{word}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel={t('common.close')}
              accessibilityRole="button"
              accessibilityHint={t('cultural.closeTranslation')}
            >
              <NativeIcon name="x" size="xs" color={Colors.Text.muted} />
            </Pressable>
          </View>
          <Text style={styles.transliteration}>{transliteration}</Text>
          <View style={styles.divider} />
          <Text style={styles.translation}>{translation}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    width: POPOVER_WIDTH,
    zIndex: 999,
  },
  arrow: {
    width: 12,
    height: 12,
    backgroundColor: Colors.Glass.bgStrong,
    transform: [{ rotate: '45deg' }],
    alignSelf: 'center',
    marginBottom: -6,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: Colors.Glass.border,
  },
  content: {
    backgroundColor: Colors.Glass.bgStrong,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: Colors.Glass.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originalWord: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  transliteration: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: Colors.Primary.p300,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.Glass.border,
    marginVertical: spacing.sm,
  },
  translation: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
