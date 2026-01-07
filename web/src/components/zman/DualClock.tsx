import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Star, Clock } from 'lucide-react';
import { zmanService } from '../../services/api';
import { AnalogClock } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import logger from '@/utils/logger';

interface TimeData {
  israel: { time: string; day: string };
  local: { time: string; timezone: string };
  shabbat: {
    is_shabbat: boolean;
    is_erev_shabbat: boolean;
    countdown?: string;
    countdown_label?: string;
    candle_lighting?: string;
    parasha_hebrew?: string;
  };
}

interface DualClockProps {
  showShabbatStatus?: boolean;
  compact?: boolean;
  style?: any;
}

/**
 * DualClock Component
 * Displays analog clocks for Israel and local time.
 * Shows Shabbat status and countdown when applicable.
 */
export default function DualClock({
  showShabbatStatus = true,
  compact = false,
  style,
}: DualClockProps) {
  const [timeData, setTimeData] = useState<TimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTime = useCallback(async () => {
    try {
      const data = await zmanService.getTime();
      setTimeData(data);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch time', 'DualClock', err);
      setError('Unable to fetch time');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTime();
    const interval = setInterval(fetchTime, 60000);
    return () => clearInterval(interval);
  }, [fetchTime]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error || !timeData) {
    return null;
  }

  const { israel, local, shabbat } = timeData;
  const [israelHours, israelMinutes] = israel.time.split(':').map(Number);
  const [localHours, localMinutes] = local.time.split(':').map(Number);
  const localTimezone = local.timezone.split('/')[1]?.replace('_', ' ') || local.timezone;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <AnalogClock
          hours={israelHours}
          minutes={israelMinutes}
          size={50}
          flag="🇮🇱"
          accentColor={colors.primary}
          isShabbat={shabbat.is_shabbat}
        />
        {shabbat.is_shabbat && (
          <View style={styles.compactShabbat}>
            <Star size={12} color={colors.warning} />
            <Text style={styles.compactShabbatText}>שבת</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.clocksRow}>
        {/* Israel Clock */}
        <AnalogClock
          hours={israelHours}
          minutes={israelMinutes}
          size={100}
          label="ישראל"
          flag="🇮🇱"
          sublabel={israel.day}
          accentColor={colors.primary}
          isShabbat={shabbat.is_shabbat}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Local Clock */}
        <AnalogClock
          hours={localHours}
          minutes={localMinutes}
          size={100}
          label="מקומי"
          sublabel={localTimezone}
          accentColor={colors.secondary}
        />
      </View>

      {/* Shabbat Status */}
      {showShabbatStatus && (shabbat.is_shabbat || shabbat.is_erev_shabbat) && (
        <View style={styles.shabbatContainer}>
          {shabbat.is_shabbat ? (
            <View style={styles.shabbatRow}>
              <View style={styles.shabbatLabel}>
                <Star size={14} color={colors.warning} />
                <Text style={styles.shabbatText}>שבת שלום!</Text>
              </View>
              {shabbat.countdown && (
                <Text style={styles.countdownText}>
                  {shabbat.countdown_label}: {shabbat.countdown}
                </Text>
              )}
            </View>
          ) : shabbat.is_erev_shabbat ? (
            <View style={styles.shabbatRow}>
              <View style={styles.shabbatLabel}>
                <Clock size={14} color={colors.accent} />
                <Text style={[styles.shabbatText, { color: colors.accent }]}>ערב שבת</Text>
              </View>
              <View style={styles.erevDetails}>
                {shabbat.candle_lighting && (
                  <Text style={styles.candleLighting}>הדלקת נרות: {shabbat.candle_lighting}</Text>
                )}
                {shabbat.countdown && (
                  <Text style={styles.countdownText}>
                    {shabbat.countdown_label}: {shabbat.countdown}
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {shabbat.parasha_hebrew && (
            <Text style={styles.parasha}>פרשת {shabbat.parasha_hebrew}</Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Minimal clock display for header/navbar
 */
export function MiniClock({ style }: { style?: any }) {
  const [timeData, setTimeData] = useState<{ hours: number; minutes: number; isShabbat: boolean } | null>(null);

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const data = await zmanService.getTime();
        const [hours, minutes] = data.israel.time.split(':').map(Number);
        setTimeData({ hours, minutes, isShabbat: data.shabbat.is_shabbat });
      } catch (err) {
        logger.error('Failed to fetch time', 'MiniClock', err);
      }
    };

    fetchTime();
    const interval = setInterval(fetchTime, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!timeData) return null;

  return (
    <View style={[styles.miniContainer, style]}>
      <AnalogClock
        hours={timeData.hours}
        minutes={timeData.minutes}
        size={36}
        accentColor={colors.primary}
        isShabbat={timeData.isShabbat}
      />
      {timeData.isShabbat && <Star size={10} color={colors.warning} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 140,
  },
  clocksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: spacing.xl,
  },
  divider: {
    width: 1,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactShabbat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactShabbatText: {
    fontSize: 11,
    color: colors.warning,
  },
  shabbatContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  shabbatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shabbatLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shabbatText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  countdownText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
  },
  erevDetails: {
    alignItems: 'flex-end',
    gap: 2,
  },
  candleLighting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  parasha: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  miniContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
