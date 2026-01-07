import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { zmanService } from '../services/api';

interface TimeData {
  israel: {
    time: string;
    datetime: string;
    day: string;
  };
  local: {
    time: string;
    datetime: string;
    timezone: string;
  };
  shabbat: {
    is_shabbat: boolean;
    is_erev_shabbat: boolean;
    countdown?: string;
    countdown_label?: string;
    candle_lighting?: string;
    havdalah?: string;
    parasha?: string;
    parasha_hebrew?: string;
  };
}

interface DualClockProps {
  showShabbatStatus?: boolean;
  compact?: boolean;
}

interface AnalogClockProps {
  hours: number;
  minutes: number;
  size?: number;
  label: string;
  flag: string;
  sublabel?: string;
  accentColor?: string;
  isShabbat?: boolean;
}

/**
 * AnalogClock Component
 * Renders an analog clock face with hour and minute hands
 */
const AnalogClock: React.FC<AnalogClockProps> = ({
  hours,
  minutes,
  size = 120,
  label,
  flag,
  sublabel,
  accentColor = colors.primary,
  isShabbat = false,
}) => {
  const { textAlign } = useDirection();
  // Calculate hand rotations
  const hourRotation = ((hours % 12) + minutes / 60) * 30; // 30 degrees per hour
  const minuteRotation = minutes * 6; // 6 degrees per minute

  const clockRadius = size / 2;
  const hourHandLength = clockRadius * 0.5;
  const minuteHandLength = clockRadius * 0.7;
  const centerDotSize = size * 0.08;

  // Generate hour markers
  const hourMarkers = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const isMainHour = i % 3 === 0;
    const markerLength = isMainHour ? 8 : 4;
    const outerRadius = clockRadius - 4;
    const innerRadius = outerRadius - markerLength;

    hourMarkers.push(
      <View
        key={i}
        style={[
          styles.hourMarker,
          {
            width: isMainHour ? 3 : 2,
            height: markerLength,
            backgroundColor: isMainHour ? colors.text : 'rgba(255, 255, 255, 0.3)',
            position: 'absolute',
            left: clockRadius + Math.cos(angle) * (outerRadius - markerLength / 2) - (isMainHour ? 1.5 : 1),
            top: clockRadius + Math.sin(angle) * (outerRadius - markerLength / 2) - markerLength / 2,
            transform: [{ rotate: `${i * 30}deg` }],
          },
        ]}
      />
    );
  }

  return (
    <View style={styles.analogClockContainer}>
      {/* Clock Face */}
      <View
        style={[
          styles.clockFace,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: accentColor,
          },
        ]}
      >
        {/* Hour markers */}
        {hourMarkers}

        {/* Hour Hand */}
        <View
          style={[
            styles.clockHand,
            styles.hourHand,
            {
              width: 4,
              height: hourHandLength,
              backgroundColor: colors.text,
              left: clockRadius - 2,
              top: clockRadius - hourHandLength,
              transformOrigin: 'center bottom',
              transform: [{ rotate: `${hourRotation}deg` }],
            },
          ]}
        />

        {/* Minute Hand */}
        <View
          style={[
            styles.clockHand,
            styles.minuteHand,
            {
              width: 2,
              height: minuteHandLength,
              backgroundColor: accentColor,
              left: clockRadius - 1,
              top: clockRadius - minuteHandLength,
              transformOrigin: 'center bottom',
              transform: [{ rotate: `${minuteRotation}deg` }],
            },
          ]}
        />

        {/* Center Dot */}
        <View
          style={[
            styles.centerDot,
            {
              width: centerDotSize,
              height: centerDotSize,
              borderRadius: centerDotSize / 2,
              backgroundColor: accentColor,
              left: clockRadius - centerDotSize / 2,
              top: clockRadius - centerDotSize / 2,
            },
          ]}
        />

        {/* Shabbat indicator */}
        {isShabbat && (
          <View style={styles.shabbatIndicator}>
            <Text style={styles.shabbatStar}>✡</Text>
          </View>
        )}
      </View>

      {/* Label */}
      <View style={styles.clockLabelContainer}>
        <View style={[styles.clockLabelRow, { flexDirection: 'row' }]}>
          <Text style={styles.clockFlag}>{flag}</Text>
          <Text style={[styles.clockLabel, { color: accentColor, textAlign }]}>{label}</Text>
        </View>
        {sublabel && <Text style={[styles.clockSublabel, { textAlign }]}>{sublabel}</Text>}
      </View>
    </View>
  );
};

/**
 * DualClock Component for TV App
 * Displays analog clocks for Israel and local time side by side.
 * Shows Shabbat status and countdown when applicable.
 */
export const DualClock: React.FC<DualClockProps> = ({
  showShabbatStatus = true,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { flexDirection, textAlign } = useDirection();
  const [timeData, setTimeData] = useState<TimeData | null>(null);
  const [loading, setLoading] = useState(true);

  const generateFallbackTime = (): TimeData => {
    const now = new Date();
    // Format time for Israel (UTC+2 or UTC+3 during DST)
    let israelTimeStr: string;
    let israelDayStr: string;
    let localTimeStr: string;
    let localTimezone: string;

    try {
      israelTimeStr = now.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jerusalem',
      });
      israelDayStr = now.toLocaleDateString('he-IL', {
        weekday: 'long',
        timeZone: 'Asia/Jerusalem',
      });
      localTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      localTimezone = Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'America/New_York';
    } catch {
      // Fallback for environments with limited Intl support (like tvOS)
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      israelTimeStr = `${hours}:${minutes}`;
      israelDayStr = '';
      localTimeStr = `${hours}:${minutes}`;
      localTimezone = 'Local';
    }

    return {
      israel: {
        time: israelTimeStr,
        datetime: now.toISOString(),
        day: israelDayStr,
      },
      local: {
        time: localTimeStr,
        datetime: now.toISOString(),
        timezone: localTimezone,
      },
      shabbat: {
        is_shabbat: false,
        is_erev_shabbat: false,
      },
    };
  };

  const fetchTime = useCallback(async () => {
    try {
      const data = await zmanService.getTime();
      setTimeData(data as TimeData);
    } catch (err) {
      console.error('Failed to fetch time:', err);
      setTimeData(generateFallbackTime());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTime();
    // Update every minute
    const interval = setInterval(fetchTime, 60000);
    return () => clearInterval(interval);
  }, [fetchTime]);

  // Parse time string to get hours and minutes
  const parseTime = (timeStr: string): { hours: number; minutes: number } => {
    const parts = timeStr.split(':');
    return {
      hours: parseInt(parts[0], 10) || 0,
      minutes: parseInt(parts[1], 10) || 0,
    };
  };

  if (loading) {
    return (
      <GlassView style={styles.container} intensity="light">
        <ActivityIndicator color={colors.primary} />
      </GlassView>
    );
  }

  if (!timeData) {
    return null;
  }

  const { israel, local, shabbat } = timeData;
  const israelParsed = parseTime(israel.time);
  const localParsed = parseTime(local.time);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { flexDirection }]}>
        <Text style={styles.flagEmoji}>🇮🇱</Text>
        <Text style={[styles.compactTime, { textAlign }]}>{israel.time}</Text>
        {shabbat.is_shabbat && <Text style={styles.starEmoji}>✡</Text>}
      </View>
    );
  }

  return (
    <GlassView style={styles.container} intensity="medium">
      <View style={[styles.clocksRow, { flexDirection }]}>
        {/* Israel Clock */}
        <AnalogClock
          hours={israelParsed.hours}
          minutes={israelParsed.minutes}
          size={140}
          label={t('clock.israel')}
          flag="🇮🇱"
          sublabel={israel.day}
          accentColor={colors.primary}
          isShabbat={shabbat.is_shabbat}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
        </View>

        {/* Local Clock */}
        <AnalogClock
          hours={localParsed.hours}
          minutes={localParsed.minutes}
          size={140}
          label={t('clock.local')}
          flag="📍"
          sublabel={local.timezone.split('/')[1]?.replace('_', ' ')}
          accentColor={colors.primary}
        />
      </View>

      {/* Digital time display */}
      <View style={[styles.digitalTimeRow, { flexDirection }]}>
        <Text style={styles.digitalTime}>{israel.time}</Text>
        <Text style={styles.digitalTimeSeparator}>|</Text>
        <Text style={[styles.digitalTime, styles.digitalTimeLocal]}>{local.time}</Text>
      </View>

      {/* Shabbat Status */}
      {showShabbatStatus && (shabbat.is_shabbat || shabbat.is_erev_shabbat) && (
        <View style={styles.shabbatSection}>
          {shabbat.is_shabbat ? (
            <View style={[styles.shabbatRow, { flexDirection }]}>
              <View style={[styles.shabbatLabel, { flexDirection }]}>
                <Text style={styles.starEmoji}>✡</Text>
                <Text style={[styles.shabbatText, { textAlign }]}>{t('clock.shabbatShalom')}</Text>
              </View>
              {shabbat.countdown && (
                <View style={[styles.countdownContainer, { flexDirection }]}>
                  <Text style={[styles.countdownLabel, { textAlign }]}>{shabbat.countdown_label}: </Text>
                  <Text style={[styles.countdownTime, { textAlign }]}>{shabbat.countdown}</Text>
                </View>
              )}
            </View>
          ) : shabbat.is_erev_shabbat ? (
            <View style={[styles.shabbatRow, { flexDirection }]}>
              <View style={[styles.shabbatLabel, { flexDirection }]}>
                <Text style={styles.candleEmoji}>🕯️</Text>
                <Text style={[styles.erevShabbatText, { textAlign }]}>{t('clock.erevShabbat')}</Text>
              </View>
              <View style={[styles.countdownContainer, { flexDirection }]}>
                {shabbat.candle_lighting && (
                  <Text style={[styles.candleLighting, { textAlign }]}>
                    {t('clock.candleLighting')}: {shabbat.candle_lighting}
                  </Text>
                )}
                {shabbat.countdown && (
                  <Text style={[styles.countdownTime, { textAlign }]}> ({shabbat.countdown})</Text>
                )}
              </View>
            </View>
          ) : null}

          {/* Parasha */}
          {shabbat.parasha_hebrew && (
            <Text style={[styles.parasha, { textAlign }]}>{t('clock.parasha')} {shabbat.parasha_hebrew}</Text>
          )}
        </View>
      )}
    </GlassView>
  );
};

/**
 * Minimal clock display for header/navbar
 */
export const MiniClock: React.FC = () => {
  const { flexDirection, textAlign } = useDirection();
  const [time, setTime] = useState('');
  const [isShabbat, setIsShabbat] = useState(false);

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const data = await zmanService.getTime() as TimeData;
        setTime(data.israel.time);
        setIsShabbat(data.shabbat.is_shabbat);
      } catch (err) {
        console.error('Failed to fetch time:', err);
      }
    };

    fetchTime();
    const interval = setInterval(fetchTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.miniContainer, { flexDirection }]}>
      <Text style={styles.miniFlag}>🇮🇱</Text>
      <Text style={[styles.miniTime, { textAlign }]}>{time || '--:--'}</Text>
      {isShabbat && <Text style={styles.miniStar}>✡</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactTime: {
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    color: colors.text,
    opacity: 0.8,
  },
  clocksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  divider: {
    height: 160,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dividerLine: {
    width: 1,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  // Analog Clock styles
  analogClockContainer: {
    alignItems: 'center',
  },
  clockFace: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 3,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourMarker: {
    borderRadius: 1,
  },
  clockHand: {
    position: 'absolute',
    borderRadius: 2,
  },
  hourHand: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  minuteHand: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  centerDot: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  shabbatIndicator: {
    position: 'absolute',
    top: '60%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  shabbatStar: {
    fontSize: 16,
    color: colors.warning,
  },
  clockLabelContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  clockLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  clockFlag: {
    fontSize: 18,
  },
  clockLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  clockSublabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Digital time row
  digitalTimeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  digitalTime: {
    fontFamily: 'monospace',
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  digitalTimeLocal: {
    opacity: 0.7,
  },
  digitalTimeSeparator: {
    fontSize: fontSize.lg,
    color: 'rgba(255, 255, 255, 0.2)',
  },
  // Shabbat styles
  flagEmoji: {
    fontSize: 12,
  },
  shabbatSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  shabbatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shabbatLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  starEmoji: {
    fontSize: 16,
    color: colors.warning,
  },
  candleEmoji: {
    fontSize: 16,
  },
  shabbatText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.warning,
  },
  erevShabbatText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.secondary,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  countdownTime: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  candleLighting: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  parasha: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Mini Clock styles
  miniContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  miniFlag: {
    fontSize: 12,
  },
  miniTime: {
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    color: colors.text,
    opacity: 0.8,
  },
  miniStar: {
    fontSize: 12,
    color: colors.warning,
  },
});

export default DualClock;
