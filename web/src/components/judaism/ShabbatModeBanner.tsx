import { useState, useEffect, useCallback } from 'react';
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
  timezone?: string;
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
  const { isRTL } = useDirection();
  const [shabbatTimes, setShabbatTimes] = useState<ShabbatTimes | null>(null);
  const [isShabbatMode, setIsShabbatMode] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const checkShabbatMode = useCallback((times: ShabbatTimes) => {
    const now = new Date();
    const candleLighting = new Date(times.candle_lighting);
    const havdalah = new Date(times.havdalah);
    return now >= candleLighting && now <= havdalah;
  }, []);

  const calculateCountdown = useCallback((havdalahTime: string) => {
    const now = new Date();
    const havdalah = new Date(havdalahTime);
    const diff = havdalah.getTime() - now.getTime();

    if (diff <= 0) return '';

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

    const interval = setInterval(() => {
      const inShabbat = checkShabbatMode(shabbatTimes);
      setIsShabbatMode(inShabbat);
      if (inShabbat) {
        setCountdown(calculateCountdown(shabbatTimes.havdalah));
      }
    }, 1000);

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

  if (isLoading || !isShabbatMode || dismissed) {
    return null;
  }

  return (
    <GlassCard className="mx-4 mb-4 overflow-hidden relative">
      {/* Animated background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colors.warning}26 0%, ${colors.primary}26 50%, ${colors.primaryDark}26 100%)`,
        }}
      />

      <div className="relative p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header with dismiss button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Animated candles */}
            <div className="flex gap-1">
              <span className="text-2xl animate-pulse">🕯️</span>
              <span className="text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>🕯️</span>
            </div>

            <div>
              <p className="text-xl font-bold" style={{ color: colors.text }}>
                {t('judaism.shabbat.shabbatShalom', 'Shabbat Shalom!')}
              </p>
              <p className="text-sm font-medium" style={{ color: colors.warning }}>
                {t('judaism.shabbat.shabbatMode', 'Shabbat Mode')}
              </p>
            </div>

            {/* Challah */}
            <span className="text-2xl">🍞</span>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X size={16} color={colors.textMuted} />
          </button>
        </div>

        {/* Parasha display */}
        {getParasha() && (
          <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: `${colors.primary}33` }}>
            <p className="text-center text-sm" style={{ color: colors.primaryLight }}>
              {t('judaism.shabbat.parashat', 'Parashat')} {getParasha()}
            </p>
          </div>
        )}

        {/* Countdown section */}
        <div
          className="flex items-center justify-between rounded-xl p-3"
          style={{ backgroundColor: colors.glassStrong }}
        >
          <div className="flex items-center gap-2">
            <Moon size={20} color={colors.primaryLight} />
            <span className="text-sm" style={{ color: colors.primaryLight }}>
              {t('judaism.shabbat.endsIn', 'Shabbat ends in')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono" style={{ color: colors.text }}>
              {countdown}
            </span>
            <div className="flex items-center gap-1">
              <Flame size={14} color={colors.warning} />
              <span className="text-xs" style={{ color: colors.warning }}>
                {t('judaism.shabbat.havdalah', 'Havdalah')}
              </span>
            </div>
          </div>
        </div>

        {/* Decorative stars - position based on RTL */}
        <div className={`absolute top-2 ${isRTL ? 'left-12' : 'right-12'} opacity-50`}>
          <span className="text-lg">✨</span>
        </div>
        <div className={`absolute bottom-2 ${isRTL ? 'right-2' : 'left-2'} opacity-30`}>
          <span className="text-sm">⭐</span>
        </div>
      </div>
    </GlassCard>
  );
}
