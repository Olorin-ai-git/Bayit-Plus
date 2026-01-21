/**
 * CultureClock Component
 *
 * Displays time in the selected culture's primary timezone.
 * Replaces hardcoded "Israel Time" with dynamic culture-aware time.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '../theme';
import { useCultureStore, CultureTime } from '../contexts/CultureContext';
import { cultureService } from '../services/api';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

interface CultureClockProps {
  cultureId?: string; // Optional - uses current culture if not provided
  showDate?: boolean;
  showDayOfWeek?: boolean;
  showTimezoneLabel?: boolean;
  variant?: 'large' | 'medium' | 'small';
  style?: any;
}

/**
 * CultureClock Component
 *
 * Displays the current time in the culture's timezone.
 * Supports multiple display variants and optional date/day display.
 */
export const CultureClock: React.FC<CultureClockProps> = ({
  cultureId,
  showDate = false,
  showDayOfWeek = false,
  showTimezoneLabel = true,
  variant = 'medium',
  style,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const { currentCulture, cultureTime: storeTime, getLocalizedName } = useCultureStore();

  const [time, setTime] = useState<CultureTime | null>(storeTime);
  const [loading, setLoading] = useState(false);

  // Determine which culture to use
  const effectiveCultureId = cultureId || currentCulture?.culture_id || 'israeli';

  // Fetch time from API
  const fetchTime = useCallback(async () => {
    try {
      setLoading(true);
      const response = await cultureService.getCultureTime(effectiveCultureId);
      const timeData: CultureTime = response.data || response;
      setTime(timeData);
    } catch (err) {
      console.warn('Failed to fetch culture time:', err);
      // Fallback to local calculation
      setTime(calculateLocalTime(effectiveCultureId));
    } finally {
      setLoading(false);
    }
  }, [effectiveCultureId]);

  // Calculate time locally as fallback
  const calculateLocalTime = (cultId: string): CultureTime => {
    const timezones: Record<string, string> = {
      israeli: 'Asia/Jerusalem',
      chinese: 'Asia/Shanghai',
      japanese: 'Asia/Tokyo',
      korean: 'Asia/Seoul',
      indian: 'Asia/Kolkata',
    };

    const timezone = timezones[cultId] || 'UTC';
    const now = new Date();

    return {
      culture_id: cultId,
      timezone,
      current_time: now.toISOString(),
      display_time: now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      display_date: now.toLocaleDateString('en-US', {
        timeZone: timezone,
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      day_of_week: now.toLocaleDateString('en-US', {
        timeZone: timezone,
        weekday: 'long',
      }),
      is_weekend: cultId === 'israeli'
        ? [5, 6].includes(now.getDay())
        : [0, 6].includes(now.getDay()),
    };
  };

  // Initial fetch
  useEffect(() => {
    fetchTime();
  }, [fetchTime]);

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Use local calculation for updates (faster than API)
      setTime(calculateLocalTime(effectiveCultureId));
    }, 60000);

    return () => clearInterval(interval);
  }, [effectiveCultureId]);

  // Get culture display name for timezone label
  const getCultureLabel = (): string => {
    if (!currentCulture) {
      // Fallback labels
      const labels: Record<string, Record<string, string>> = {
        israeli: { en: 'Israel', he: 'ישראל', es: 'Israel' },
        chinese: { en: 'China', he: 'סין', es: 'China' },
        japanese: { en: 'Japan', he: 'יפן', es: 'Japón' },
        korean: { en: 'Korea', he: 'קוריאה', es: 'Corea' },
        indian: { en: 'India', he: 'הודו', es: 'India' },
      };
      const cultureLbl = labels[effectiveCultureId];
      if (cultureLbl) {
        return cultureLbl[i18n.language] || cultureLbl.en || '';
      }
      return '';
    }
    return getLocalizedName(currentCulture, i18n.language);
  };

  // Get culture flag emoji
  const getCultureFlag = (): string => {
    const flags: Record<string, string> = {
      israeli: '🇮🇱',
      chinese: '🇨🇳',
      japanese: '🇯🇵',
      korean: '🇰🇷',
      indian: '🇮🇳',
    };
    return flags[effectiveCultureId] || '🌍';
  };

  // Variant-based styles
  const variantStyles = {
    large: {
      time: isTV ? fontSize.xxl : fontSize.xl,
      label: isTV ? fontSize.md : fontSize.sm,
      date: isTV ? fontSize.sm : fontSize.xs,
    },
    medium: {
      time: isTV ? fontSize.xl : fontSize.lg,
      label: isTV ? fontSize.sm : fontSize.xs,
      date: isTV ? fontSize.xs : 10,
    },
    small: {
      time: isTV ? fontSize.lg : fontSize.md,
      label: isTV ? fontSize.xs : 10,
      date: isTV ? 10 : 8,
    },
  };

  const sizes = variantStyles[variant] || variantStyles.medium;

  if (!time) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.timeText, { fontSize: sizes.time }]}>--:--</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Timezone label */}
      {showTimezoneLabel && (
        <View style={[styles.labelContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.flagEmoji, { fontSize: sizes.label }]}>
            {getCultureFlag()}
          </Text>
          <Text style={[styles.labelText, { fontSize: sizes.label }]}>
            {t('cultureClock.timeIn', { location: getCultureLabel() })}
          </Text>
        </View>
      )}

      {/* Time */}
      <Text style={[styles.timeText, { fontSize: sizes.time }]}>
        {time.display_time}
      </Text>

      {/* Date and day of week */}
      {(showDate || showDayOfWeek) && (
        <View style={[styles.dateContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {showDayOfWeek && (
            <Text style={[styles.dateText, { fontSize: sizes.date }]}>
              {time.day_of_week}
            </Text>
          )}
          {showDate && showDayOfWeek && (
            <Text style={[styles.dateSeparator, { fontSize: sizes.date }]}>•</Text>
          )}
          {showDate && (
            <Text style={[styles.dateText, { fontSize: sizes.date }]}>
              {time.display_date}
            </Text>
          )}
        </View>
      )}

      {/* Weekend indicator */}
      {time.is_weekend && (
        <Text style={[styles.weekendBadge, { fontSize: sizes.date }]}>
          {effectiveCultureId === 'israeli'
            ? t('cultureClock.shabbat')
            : t('cultureClock.weekend')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  labelContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  flagEmoji: {
    marginRight: spacing.xs,
  },
  labelText: {
    color: colors.textMuted,
  },
  timeText: {
    fontWeight: 'bold',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  dateContainer: {
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  dateText: {
    color: colors.textSecondary,
  },
  dateSeparator: {
    color: colors.textMuted,
  },
  weekendBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '600',
  },
});

export default CultureClock;
