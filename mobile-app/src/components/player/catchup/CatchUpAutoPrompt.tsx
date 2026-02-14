/**
 * CatchUpAutoPrompt - Auto-shown prompt for late-joining viewers
 *
 * Displayed when detecting user joined more than 5 minutes late.
 * Asks if they want an AI-generated catch-up summary.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { GlassView } from '@bayit/shared';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../../theme/colors';
import logger from '@/utils/logger';

const log = logger.scope('CatchUpAutoPrompt');
const ENTRY_DURATION_MS = 400;
const LATE_JOIN_THRESHOLD_MINUTES = 5;

interface CatchUpAutoPromptProps {
  missedMinutes: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export const CatchUpAutoPrompt: React.FC<CatchUpAutoPromptProps> = ({
  missedMinutes, onAccept, onDismiss,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(60);

  useEffect(() => {
    if (missedMinutes >= LATE_JOIN_THRESHOLD_MINUTES) {
      log.info('Catch-up prompt shown', { missedMinutes });
      opacity.value = withTiming(1, { duration: ENTRY_DURATION_MS, easing: Easing.out(Easing.ease) });
      translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
    }
  }, [missedMinutes, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (missedMinutes < LATE_JOIN_THRESHOLD_MINUTES) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <GlassView style={styles.container}>
        <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
          <View style={styles.iconContainer}>
            <NativeIcon name="fastForward" size="md" color={Colors.Primary.p300} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { textAlign }]} accessible accessibilityRole="header">
              {t('catchUp.joinedLate')}
            </Text>
            <Text style={[styles.subtitle, { textAlign }]} accessible accessibilityRole="text"
              accessibilityLabel={t('catchUp.missedMinutesPrompt', { minutes: missedMinutes })}>
              {t('catchUp.missedMinutesPrompt', { minutes: missedMinutes })}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <GlassButton variant="primary" onPress={() => { log.info('Catch-up accepted'); onAccept(); }}
            style={styles.acceptButton} accessibilityLabel={t('catchUp.showSummary')}
            accessibilityHint={t('catchUp.showSummaryHint')} accessibilityRole="button">
            <Text style={styles.acceptText}>{t('catchUp.showSummary')}</Text>
          </GlassButton>
          <GlassButton variant="ghost" onPress={() => { log.info('Catch-up dismissed'); onDismiss(); }}
            style={styles.dismissButton} accessibilityLabel={t('catchUp.noThanks')} accessibilityRole="button">
            <Text style={styles.dismissText}>{t('catchUp.noThanks')}</Text>
          </GlassButton>
        </View>
      </GlassView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: spacing.xl, left: spacing.md, right: spacing.md, zIndex: 100 },
  container: { padding: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: Colors.Glass.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerRowRTL: { flexDirection: 'row-reverse' },
  iconContainer: { width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: Colors.Glass.purpleLight, justifyContent: 'center', alignItems: 'center' },
  textContainer: { flex: 1 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xxs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  acceptButton: { flex: 1, minHeight: 44, paddingVertical: spacing.sm },
  acceptText: { fontSize: fontSize.sm, fontWeight: '600', color: Colors.white, textAlign: 'center' },
  dismissButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  dismissText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary },
});
