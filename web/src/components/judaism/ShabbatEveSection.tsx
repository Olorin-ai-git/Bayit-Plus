import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Moon, BookOpen, Music, Utensils, Clock, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import logger from '@/utils/logger';

interface ShabbatStatus {
  status: 'regular' | 'erev_shabbat' | 'shabbat';
  is_erev_shabbat: boolean;
  is_shabbat: boolean;
  candle_lighting: string;
  havdalah: string;
  parasha: string;
  parasha_he: string;
  timezone?: string;
}

interface ShabbatEveSectionProps {
  defaultCity?: string;
  defaultState?: string;
}

export function ShabbatEveSection({
  defaultCity = 'New York',
  defaultState = 'NY',
}: ShabbatEveSectionProps) {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ShabbatStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>('');

  const calculateCountdown = useCallback((candleLightingTime: string) => {
    const now = new Date();
    const candleLighting = new Date(candleLightingTime);
    const diff = candleLighting.getTime() - now.getTime();

    if (diff <= 0) return '';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  useEffect(() => {
    loadShabbatData();
  }, []);

  useEffect(() => {
    if (!status?.candle_lighting || !status.is_erev_shabbat) return;

    const interval = setInterval(() => {
      setCountdown(calculateCountdown(status.candle_lighting));
    }, 60000);

    setCountdown(calculateCountdown(status.candle_lighting));

    return () => clearInterval(interval);
  }, [status, calculateCountdown]);

  const loadShabbatData = async () => {
    try {
      setIsLoading(true);
      const statusRes = await judaismService.getShabbatStatus(defaultCity, defaultState);
      if (statusRes) setStatus(statusRes);
    } catch (err) {
      logger.error('Failed to load Shabbat data', 'ShabbatEveSection', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const date = new Date(timeStr);
      // Use the city's timezone to display the correct local time
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: status?.timezone || 'America/New_York',
      };
      return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', options);
    } catch {
      return timeStr;
    }
  };

  const getParasha = () => {
    if (!status?.parasha) return '';
    return i18n.language === 'he' ? status.parasha_he : status.parasha;
  };

  // Quick action buttons for Shabbat
  const quickActions = [
    {
      id: 'music',
      icon: Music,
      label: t('judaism.erevShabbat.shabbatSongs', 'Shabbat Songs'),
      color: colors.warning,
      bgColor: `${colors.warning}33`,
      route: '/judaism?category=music',
    },
    {
      id: 'parasha',
      icon: BookOpen,
      label: t('judaism.erevShabbat.parashaStudy', 'Parasha'),
      color: colors.primaryLight,
      bgColor: `${colors.primaryLight}33`,
      route: '/judaism?category=shiurim',
    },
    {
      id: 'recipes',
      icon: Utensils,
      label: t('judaism.erevShabbat.shabbatRecipes', 'Recipes'),
      color: colors.success,
      bgColor: `${colors.success}33`,
      route: '/judaism?category=holidays',
    },
    {
      id: 'tefila',
      icon: Sparkles,
      label: t('judaism.erevShabbat.prayers', 'Prayers'),
      color: colors.primary,
      bgColor: `${colors.primary}33`,
      route: '/judaism?category=tefila',
    },
  ];

  if (isLoading) return null;
  if (!status?.is_erev_shabbat) return null;

  return (
    <div className="px-4 mb-6">
      <GlassCard className="overflow-hidden relative">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${colors.warning}26 0%, ${colors.primary}1A 50%, ${colors.primaryDark}1A 100%)`,
          }}
        />

        {/* Decorative elements */}
        <div className="absolute top-4 right-8 opacity-20">
          <span style={{ fontSize: 80 }}>✡</span>
        </div>

        <div className="relative p-5" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Top Row: Title and Countdown */}
          <div className="flex items-start justify-between mb-5">
            {/* Left: Title with icons */}
            <div className="flex items-center gap-4">
              <div className="flex items-end">
                <span style={{ fontSize: 48, marginRight: -8 }}>🕯️</span>
                <span style={{ fontSize: 48 }}>🕯️</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {t('judaism.erevShabbat.title', 'Erev Shabbat')}
                </h2>
                <p className="text-amber-300 text-lg mt-1">
                  {t('judaism.erevShabbat.shabbatShalom', 'Shabbat Shalom!')} 🍞
                </p>
              </div>
            </div>

            {/* Right: Countdown Timer */}
            {countdown && (
              <div
                className="bg-black/40 rounded-2xl px-5 py-3 flex flex-col items-center"
                style={{ borderWidth: 1, borderColor: `${colors.warning}4D` }}
              >
                <div className={`flex items-center gap-2 mb-1 `}>
                  <Clock size={16} color={colors.warning} />
                  <span className="text-sm font-medium" style={{ color: colors.warning }}>
                    {t('judaism.erevShabbat.timeUntil', 'Time until Shabbat')}
                  </span>
                </div>
                <span className="text-3xl font-bold font-mono" style={{ color: colors.text }}>
                  {countdown}
                </span>
              </div>
            )}
          </div>

          {/* Parasha Banner */}
          {getParasha() && (
            <div
              className="rounded-xl px-5 py-3 mb-5"
              style={{ backgroundColor: `${colors.primary}33`, borderWidth: 1, borderColor: `${colors.primary}4D` }}
            >
              <div className={`flex items-center justify-center gap-3 `}>
                <BookOpen size={24} color={colors.primaryLight} />
                <div className="flex flex-col items-center">
                  <span className="text-sm" style={{ color: colors.primaryLight }}>
                    {t('judaism.shabbat.parashat', 'Parashat')}
                  </span>
                  <span className="text-2xl font-bold" style={{ color: colors.text }}>
                    {getParasha()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Shabbat Times Row */}
          <div className="flex gap-4 mb-5">
            {/* Candle Lighting */}
            <div
              className="flex-1 rounded-xl p-4 flex flex-col items-center"
              style={{ backgroundColor: `${colors.warning}26`, borderWidth: 1, borderColor: `${colors.warning}4D` }}
            >
              <Flame size={32} color={colors.warning} />
              <span className="text-sm mt-2 font-medium" style={{ color: colors.warning }}>
                {t('judaism.shabbat.candleLighting', 'Candle Lighting')}
              </span>
              <span className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
                {formatTime(status.candle_lighting)}
              </span>
              <span className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {t('judaism.shabbat.friday', 'Friday')}
              </span>
            </div>

            {/* Havdalah */}
            <div
              className="flex-1 rounded-xl p-4 flex flex-col items-center"
              style={{ backgroundColor: `${colors.primary}26`, borderWidth: 1, borderColor: `${colors.primary}4D` }}
            >
              <Moon size={32} color={colors.primaryLight} />
              <span className="text-sm mt-2 font-medium" style={{ color: colors.primaryLight }}>
                {t('judaism.shabbat.havdalah', 'Havdalah')}
              </span>
              <span className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
                {formatTime(status.havdalah)}
              </span>
              <span className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {t('judaism.shabbat.saturday', 'Saturday')}
              </span>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div>
            <p
              className="text-sm mb-3"
              style={{ textAlign: isRTL ? 'right' : 'left', color: colors.textMuted }}
            >
              {t('judaism.erevShabbat.prepareFor', 'Prepare for Shabbat')}
            </p>
            <div className={`flex gap-3 `}>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div
                    className="rounded-xl p-3 flex flex-col items-center"
                    style={{
                      backgroundColor: action.bgColor,
                      borderWidth: 1,
                      borderColor: `${action.color}4D`,
                    }}
                  >
                    <action.icon size={24} color={action.color} />
                    <span
                      className="text-xs font-medium mt-2 text-center truncate w-full"
                      style={{ color: colors.text }}
                    >
                      {action.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
