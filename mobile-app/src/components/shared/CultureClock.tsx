/**
 * CultureClock - Mobile wrapper for shared CultureClock component
 *
 * Displays Hebrew and secular time using the shared CultureClock
 * from the Bayit+ shared components library.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CultureClock as SharedCultureClock } from '@bayit/shared-components/CultureClock';
import { colors, spacing } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('CultureClockMobile');

interface CultureClockProps {
  showHebrew: boolean;
  timezone?: string;
}

export const CultureClock: React.FC<CultureClockProps> = ({
  showHebrew,
  timezone,
}) => {
  const { t } = useTranslation();

  const cultureId = showHebrew ? 'israeli' : 'usa';

  return (
    <View
      style={styles.container}
      accessibilityLabel={
        showHebrew
          ? t('cultureClock.hebrewTimeLabel')
          : t('cultureClock.secularTimeLabel')
      }
      accessibilityRole="timer"
      accessibilityHint={t('cultureClock.timeHint')}
    >
      <SharedCultureClock
        cultureId={cultureId}
        showDate
        showDayOfWeek
        showTimezoneLabel
        variant="medium"
        style={styles.clock}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  clock: {
    backgroundColor: colors.glassMedium,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
