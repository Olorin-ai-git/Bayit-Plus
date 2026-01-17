import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flame, Moon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import logger from '@/utils/logger';

interface ShabbatTimes {
  city: string;
  state: string;
  candle_lighting: string;
  havdalah: string;
  parasha?: string;
  parasha_he?: string;
}

interface ShabbatModeBannerProps {
  defaultCity?: string;
  defaultState?: string;
  onDismiss?: () => void;
}

export function ShabbatModeBanner({
  defaultCity = 'New York',
  defaultState = 'NY',
  onDismiss,
}: ShabbatModeBannerProps) {
  const { t, i18n } = useTranslation();
  const { isRTL, flexDirection } = useDirection();
  const [shabbatTimes, setShabbatTimes] = useState<ShabbatTimes | null>(null);
  const [isShabbatMode, setIsShabbatMode] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const checkShabbatMode = useCallback((times: ShabbatTimes) => {
    const now = new Date();
    const candleLighting = new Date(times.candle_lighting);
    const havdalah = new Date(times.havdalah);

    // Check if current time is between candle lighting and havdalah
    return now >= candleLighting && now <= havdalah;
  }, []);

  const calculateCountdown = useCallback((havdalahTime: string) => {
    const now = new Date();
    const havdalah = new Date(havdalahTime);
    const diff = havdalah.getTime() - now.getTime();

    if (diff <= 0) {
      return '';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    loadShabbatTimes();
  }, []);

  useEffect(() => {
    if (!shabbatTimes) return;

    // Update Shabbat mode status and countdown every second
    const interval = setInterval(() => {
      const inShabbat = checkShabbatMode(shabbatTimes);
      setIsShabbatMode(inShabbat);

      if (inShabbat) {
        setCountdown(calculateCountdown(shabbatTimes.havdalah));
      }
    }, 1000);

    // Initial check
    const inShabbat = checkShabbatMode(shabbatTimes);
    setIsShabbatMode(inShabbat);
    if (inShabbat) {
      setCountdown(calculateCountdown(shabbatTimes.havdalah));
    }

    return () => clearInterval(interval);
  }, [shabbatTimes, checkShabbatMode, calculateCountdown]);

  const loadShabbatTimes = async () => {
    try {
      setIsLoading(true);
      const response = await judaismService.getShabbatTimes(defaultCity, defaultState);
      if (response) {
        setShabbatTimes(response);
      }
    } catch (err) {
      logger.error('Failed to load Shabbat times for banner', 'ShabbatModeBanner', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getParasha = () => {
    if (!shabbatTimes?.parasha) return '';
    return i18n.language === 'he' ? shabbatTimes.parasha_he : shabbatTimes.parasha;
  };

  // Don't render if loading, not in Shabbat mode, or dismissed
  if (isLoading || !isShabbatMode || dismissed) {
    return null;
  }

  return (
    <GlassCard className="mx-4 mb-4 overflow-hidden">
      {/* Animated background gradient */}
      <View
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(168, 85, 247, 0.15) 50%, rgba(59, 130, 246, 0.15) 100%)',
        }}
      />

      <View className="relative p-4">
        {/* Header with dismiss button */}
        <View className="flex-row items-center justify-between mb-3" style={{ flexDirection }}>
          <View className="flex-row items-center gap-3" style={{ flexDirection }}>
            {/* Animated candles */}
            <View className="flex-row gap-1">
              <View className="items-center">
                <Text className="text-2xl animate-pulse">🕯️</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>🕯️</Text>
              </View>
            </View>

            <View>
              <Text className="text-xl font-bold text-white">
                {t('judaism.shabbat.shabbatShalom', 'Shabbat Shalom!')}
              </Text>
              <Text className="text-amber-300 text-sm font-medium">
                {t('judaism.shabbat.shabbatMode', 'Shabbat Mode')}
              </Text>
            </View>

            {/* Challah */}
            <Text className="text-2xl">🍞</Text>
          </View>

          {/* Dismiss button */}
          <Pressable
            onPress={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
            style={{ cursor: 'pointer' }}
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Parasha display */}
        {getParasha() && (
          <View className="bg-purple-500/20 rounded-lg px-3 py-2 mb-3">
            <Text className="text-purple-300 text-center text-sm">
              {t('judaism.shabbat.parashat', 'Parashat')} {getParasha()}
            </Text>
          </View>
        )}

        {/* Countdown section */}
        <View
          className="flex-row items-center justify-between bg-black/30 rounded-xl p-3"
          style={{ flexDirection }}
        >
          <View className="flex-row items-center gap-2" style={{ flexDirection }}>
            <Moon size={20} color="#818CF8" />
            <Text className="text-indigo-300 text-sm">
              {t('judaism.shabbat.endsIn', 'Shabbat ends in')}
            </Text>
          </View>

          <View className="flex-row items-center gap-2" style={{ flexDirection }}>
            <Text className="text-white text-2xl font-bold font-mono">
              {countdown}
            </Text>
            <View className="flex-row items-center gap-1" style={{ flexDirection }}>
              <Flame size={14} color="#F59E0B" />
              <Text className="text-amber-400 text-xs">
                {t('judaism.shabbat.havdalah', 'Havdalah')}
              </Text>
            </View>
          </View>
        </View>

        {/* Decorative stars */}
        <View className="absolute top-2 right-12 opacity-50">
          <Text className="text-lg">✨</Text>
        </View>
        <View className="absolute bottom-2 left-2 opacity-30">
          <Text className="text-sm">⭐</Text>
        </View>
      </View>
    </GlassCard>
  );
}
