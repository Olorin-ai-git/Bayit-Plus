/**
 * ShabbatBanner
 *
 * Countdown banner showing time until Shabbat starts/ends
 * with candle lighting and havdalah times in warm golden styling.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { useShabbatMode } from '@bayit/shared-hooks';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('ShabbatBanner');

const SHABBAT_GOLD = '#D4A843';
const SHABBAT_GOLD_LIGHT = '#F5E6C8';
const SHABBAT_GOLD_BG = 'rgba(212, 168, 67, 0.12)';
const SHABBAT_GOLD_BORDER = 'rgba(212, 168, 67, 0.3)';

interface ShabbatBannerProps {
  onPress?: () => void;
}

export const ShabbatBanner: React.FC<ShabbatBannerProps> = ({ onPress }) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const {
    isShabbat,
    isErevShabbat,
    shabbatTimes,
    countdown,
    countdownLabel,
    parasha,
    loading,
  } = useShabbatMode();

  if (loading || (!isShabbat && !isErevShabbat)) {
    return null;
  }

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? {
        onPress,
        activeOpacity: 0.8,
        accessibilityLabel: t('shabbat.bannerLabel'),
        accessibilityHint: t('shabbat.bannerHint'),
        accessibilityRole: 'button' as const,
      }
    : {
        accessibilityLabel: t('shabbat.bannerLabel'),
        accessibilityRole: 'text' as const,
      };

  return (
    <Wrapper style={styles.container} {...wrapperProps}>
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <NativeIcon name="candle" size="md" color={SHABBAT_GOLD} />
        <Text style={styles.headerText}>
          {isShabbat
            ? t('shabbat.shabbatShalom')
            : t('shabbat.erevShabbat')}
        </Text>
      </View>

      {parasha && (
        <Text style={[styles.parashaText, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('shabbat.parashat', { name: parasha })}
        </Text>
      )}

      {countdown && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownValue}>{countdown}</Text>
          {countdownLabel && (
            <Text style={styles.countdownLabel}>{countdownLabel}</Text>
          )}
        </View>
      )}

      <View style={styles.timesRow}>
        {shabbatTimes?.candleLighting && (
          <View
            style={[styles.timeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            accessibilityLabel={t('shabbat.candleLighting', { time: shabbatTimes.candleLighting })}
            accessibilityRole="text"
          >
            <NativeIcon name="sun" size="xs" color={SHABBAT_GOLD_LIGHT} />
            <View>
              <Text style={styles.timeLabel}>{t('shabbat.candleLightingLabel')}</Text>
              <Text style={styles.timeValue}>{shabbatTimes.candleLighting}</Text>
            </View>
          </View>
        )}

        {shabbatTimes?.havdalah && (
          <View
            style={[styles.timeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            accessibilityLabel={t('shabbat.havdalah', { time: shabbatTimes.havdalah })}
            accessibilityRole="text"
          >
            <NativeIcon name="moon" size="xs" color={SHABBAT_GOLD_LIGHT} />
            <View>
              <Text style={styles.timeLabel}>{t('shabbat.havdalahLabel')}</Text>
              <Text style={styles.timeValue}>{shabbatTimes.havdalah}</Text>
            </View>
          </View>
        )}
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: SHABBAT_GOLD_BG,
    borderWidth: 1,
    borderColor: SHABBAT_GOLD_BORDER,
  },
  headerRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: SHABBAT_GOLD,
  },
  parashaText: {
    fontSize: fontSize.sm,
    color: SHABBAT_GOLD_LIGHT,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  countdownValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: SHABBAT_GOLD,
    letterSpacing: 1,
  },
  countdownLabel: {
    fontSize: fontSize.xs,
    color: SHABBAT_GOLD_LIGHT,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  timeItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeLabel: {
    fontSize: fontSize.xs,
    color: SHABBAT_GOLD_LIGHT,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: SHABBAT_GOLD,
  },
});

export default ShabbatBanner;
