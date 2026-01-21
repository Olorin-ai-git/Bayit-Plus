import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize } from '../theme';
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

    hourMarkers.push(
      <View
        key={i}
        className="rounded-sm"
        style={{
          width: isMainHour ? 3 : 2,
          height: markerLength,
          backgroundColor: isMainHour ? colors.text : 'rgba(255, 255, 255, 0.3)',
          position: 'absolute',
          left: clockRadius + Math.cos(angle) * (outerRadius - markerLength / 2) - (isMainHour ? 1.5 : 1),
          top: clockRadius + Math.sin(angle) * (outerRadius - markerLength / 2) - markerLength / 2,
          transform: [{ rotate: `${i * 30}deg` }],
        }}
      />
    );
  }

  return (
    <View className="items-center">
      {/* Clock Face */}
      <View
        className="relative justify-center items-center"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderWidth: 3,
          borderColor: accentColor,
        }}
      >
        {/* Hour markers */}
        {hourMarkers}

        {/* Hour Hand */}
        <View
          className="absolute rounded-sm"
          style={{
            width: 4,
            height: hourHandLength,
            backgroundColor: colors.text,
            left: clockRadius - 2,
            top: clockRadius - hourHandLength,
            transformOrigin: 'center bottom',
            transform: [{ rotate: `${hourRotation}deg` }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 1,
          }}
        />

        {/* Minute Hand */}
        <View
          className="absolute rounded-sm"
          style={{
            width: 2,
            height: minuteHandLength,
            backgroundColor: accentColor,
            left: clockRadius - 1,
            top: clockRadius - minuteHandLength,
            transformOrigin: 'center bottom',
            transform: [{ rotate: `${minuteRotation}deg` }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
          }}
        />

        {/* Center Dot */}
        <View
          className="absolute"
          style={{
            width: centerDotSize,
            height: centerDotSize,
            borderRadius: centerDotSize / 2,
            backgroundColor: accentColor,
            left: clockRadius - centerDotSize / 2,
            top: clockRadius - centerDotSize / 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
          }}
        />

        {/* Shabbat indicator */}
        {isShabbat && (
          <View
            className="absolute"
            style={{
              top: '60%',
              left: '50%',
              transform: [{ translateX: -8 }, { translateY: -8 }],
            }}
          >
            <Text className="text-base" style={{ color: colors.warning }}>✡</Text>
          </View>
        )}
      </View>

      {/* Label */}
      <View className="mt-3 items-center">
        <View className="flex-row items-center gap-1">
          <Text className="text-lg">{flag}</Text>
          <Text className="text-base font-semibold" style={{ color: accentColor, textAlign }}>{label}</Text>
        </View>
        {sublabel && (
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted, textAlign }}>{sublabel}</Text>
        )}
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
      <GlassView className="p-6 rounded-lg" intensity="light">
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
      <View className="flex-row items-center gap-2" style={{ flexDirection }}>
        <Text className="text-xs">🇮🇱</Text>
        <Text className="font-mono text-sm opacity-80" style={{ color: colors.text, textAlign }}>{israel.time}</Text>
        {shabbat.is_shabbat && <Text className="text-base" style={{ color: colors.warning }}>✡</Text>}
      </View>
    );
  }

  return (
    <GlassView className="p-6 rounded-lg" intensity="medium">
      <View className="flex-row items-center justify-center gap-10" style={{ flexDirection }}>
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
        <View className="h-40 justify-center px-3">
          <View className="w-px h-24 bg-white/15" />
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
      <View className="flex-row justify-center items-center mt-3 gap-3" style={{ flexDirection }}>
        <Text className="font-mono text-lg font-semibold" style={{ color: colors.text }}>{israel.time}</Text>
        <Text className="text-lg text-white/20">|</Text>
        <Text className="font-mono text-lg font-semibold opacity-70" style={{ color: colors.text }}>{local.time}</Text>
      </View>

      {/* Shabbat Status */}
      {showShabbatStatus && (shabbat.is_shabbat || shabbat.is_erev_shabbat) && (
        <View className="mt-3 pt-3 border-t border-white/10">
          {shabbat.is_shabbat ? (
            <View className="flex-row items-center justify-between" style={{ flexDirection }}>
              <View className="flex-row items-center gap-2" style={{ flexDirection }}>
                <Text className="text-base" style={{ color: colors.warning }}>✡</Text>
                <Text className="text-base font-semibold" style={{ color: colors.warning, textAlign }}>{t('clock.shabbatShalom')}</Text>
              </View>
              {shabbat.countdown && (
                <View className="flex-row items-center" style={{ flexDirection }}>
                  <Text className="text-xs" style={{ color: colors.textSecondary, textAlign }}>{shabbat.countdown_label}: </Text>
                  <Text className="text-xs font-mono" style={{ color: colors.textSecondary, textAlign }}>{shabbat.countdown}</Text>
                </View>
              )}
            </View>
          ) : shabbat.is_erev_shabbat ? (
            <View className="flex-row items-center justify-between" style={{ flexDirection }}>
              <View className="flex-row items-center gap-2" style={{ flexDirection }}>
                <Text className="text-base">🕯️</Text>
                <Text className="text-base font-semibold" style={{ color: colors.secondary, textAlign }}>{t('clock.erevShabbat')}</Text>
              </View>
              <View className="flex-row items-center" style={{ flexDirection }}>
                {shabbat.candle_lighting && (
                  <Text className="text-xs" style={{ color: colors.textSecondary, textAlign }}>
                    {t('clock.candleLighting')}: {shabbat.candle_lighting}
                  </Text>
                )}
                {shabbat.countdown && (
                  <Text className="text-xs font-mono" style={{ color: colors.textSecondary, textAlign }}> ({shabbat.countdown})</Text>
                )}
              </View>
            </View>
          ) : null}

          {/* Parasha */}
          {shabbat.parasha_hebrew && (
            <Text className="mt-2 text-xs text-center" style={{ color: colors.textMuted, textAlign }}>{t('clock.parasha')} {shabbat.parasha_hebrew}</Text>
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
    <View className="flex-row items-center gap-2" style={{ flexDirection }}>
      <Text className="text-xs">🇮🇱</Text>
      <Text className="font-mono text-sm opacity-80" style={{ color: colors.text, textAlign }}>{time || '--:--'}</Text>
      {isShabbat && <Text className="text-xs" style={{ color: colors.warning }}>✡</Text>}
    </View>
  );
};

export default DualClock;
