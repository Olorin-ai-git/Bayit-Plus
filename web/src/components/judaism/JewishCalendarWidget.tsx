import { useState, useEffect } from 'react';
import { Calendar, BookOpen, Star, Flame, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import logger from '@/utils/logger';

interface CalendarData {
  gregorian_date: string;
  hebrew_date: string;
  hebrew_date_full: string;
  day_of_week: string;
  day_of_week_he: string;
  is_shabbat: boolean;
  is_holiday: boolean;
  parasha?: string;
  parasha_he?: string;
  holidays: Array<{
    title: string;
    title_he?: string;
    category: string;
    yomtov: boolean;
  }>;
  omer_count?: number;
}

interface DafYomi {
  tractate: string;
  tractate_he: string;
  page: string;
  date: string;
  sefaria_url: string;
}

export function JewishCalendarWidget() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [dafYomi, setDafYomi] = useState<DafYomi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      const [calendarResponse, dafResponse] = await Promise.all([
        judaismService.getCalendarToday(),
        judaismService.getDafYomi(),
      ]);

      if (calendarResponse) {
        setCalendarData(calendarResponse);
      }
      if (dafResponse) {
        setDafYomi(dafResponse);
      }
    } catch (err) {
      logger.error('Failed to load calendar data', 'JewishCalendarWidget', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayName = () => {
    if (!calendarData) return '';
    return i18n.language === 'he' ? calendarData.day_of_week_he : calendarData.day_of_week;
  };

  const getParasha = () => {
    if (!calendarData?.parasha) return null;
    return i18n.language === 'he' ? calendarData.parasha_he : calendarData.parasha;
  };

  if (isLoading) {
    return (
      <GlassCard className="p-4">
        <div className="py-8 flex justify-center">
          <Loader2 size={32} color={colors.primary} className="animate-spin" />
        </div>
      </GlassCard>
    );
  }

  if (!calendarData) {
    return null;
  }

  return (
    <GlassCard className="p-4">
      <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={24} color={colors.primary} />
        <h3
          className="text-xl font-bold"
          style={{ textAlign: isRTL ? 'right' : 'left', color: colors.text }}
        >
          {t('judaism.calendar.title', 'Jewish Calendar')}
        </h3>
      </div>

      {/* Hebrew Date */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ background: `linear-gradient(to right, ${colors.primary}33, ${colors.primaryDark}33)` }}
      >
        <p className="text-3xl font-bold text-center mb-1" style={{ color: colors.text }}>
          {calendarData.hebrew_date}
        </p>
        <p className="text-center" style={{ color: colors.textSecondary }}>
          {getDayName()} • {calendarData.gregorian_date}
        </p>

        {/* Shabbat/Holiday Badge */}
        {(calendarData.is_shabbat || calendarData.is_holiday) && (
          <div className="flex justify-center mt-2">
            <div
              className="px-3 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: `${colors.gold}4D` }}
            >
              <Star size={14} color={colors.gold} fill={colors.gold} />
              <span className="font-medium" style={{ color: colors.gold }}>
                {calendarData.is_shabbat
                  ? t('judaism.calendar.shabbat', 'Shabbat')
                  : t('judaism.calendar.holiday', 'Holiday')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Parasha */}
      {getParasha() && (
        <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: colors.glassLight }}>
          <div className={`flex items-center gap-2 `}>
            <BookOpen size={18} color={colors.primary} />
            <span className="text-sm" style={{ color: colors.textMuted }}>
              {t('judaism.calendar.parasha', 'Parasha')}:
            </span>
            <span className="font-medium" style={{ color: colors.text }}>{getParasha()}</span>
          </div>
        </div>
      )}

      {/* Daf Yomi */}
      {dafYomi && (
        <button
          className="w-full rounded-lg p-3 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: colors.glassLight }}
          onClick={() => {
            if (dafYomi.sefaria_url) {
              window.open(dafYomi.sefaria_url, '_blank');
            }
          }}
        >
          <div className={`flex items-center gap-2 `}>
            <Flame size={18} color={colors.warning} />
            <span className="text-sm" style={{ color: colors.textMuted }}>
              {t('judaism.calendar.dafYomi', 'Daf Yomi')}:
            </span>
            <span className="font-medium" style={{ color: colors.text }}>
              {i18n.language === 'he' ? dafYomi.tractate_he : dafYomi.tractate} {dafYomi.page}
            </span>
          </div>
        </button>
      )}

      {/* Omer Count */}
      {calendarData.omer_count && (
        <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: `${colors.warning}33` }}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm" style={{ color: colors.warning }}>
              {t('judaism.calendar.omerDay', 'Day')} {calendarData.omer_count}{' '}
              {t('judaism.calendar.ofOmer', 'of the Omer')}
            </span>
          </div>
        </div>
      )}

      {/* Holidays */}
      {calendarData.holidays.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {calendarData.holidays.map((holiday, index) => (
            <div
              key={index}
              className="rounded-lg p-2"
              style={{ backgroundColor: colors.glassLight }}
            >
              <p className="font-medium text-center" style={{ color: colors.text }}>
                {i18n.language === 'he' && holiday.title_he
                  ? holiday.title_he
                  : holiday.title}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>
    </GlassCard>
  );
}
