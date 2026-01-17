import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Calendar, BookOpen, Star, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
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
  const { isRTL, textAlign, flexDirection } = useDirection();
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
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GlassCard>
    );
  }

  if (!calendarData) {
    return null;
  }

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-4" style={{ flexDirection }}>
        <Calendar size={24} color={colors.primary} />
        <Text className="text-xl font-bold text-white" style={{ textAlign }}>
          {t('judaism.calendar.title', 'Jewish Calendar')}
        </Text>
      </View>

      {/* Hebrew Date */}
      <View className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-4 mb-4">
        <Text className="text-3xl font-bold text-white text-center mb-1">
          {calendarData.hebrew_date}
        </Text>
        <Text className="text-gray-300 text-center">
          {getDayName()} • {calendarData.gregorian_date}
        </Text>

        {/* Shabbat/Holiday Badge */}
        {(calendarData.is_shabbat || calendarData.is_holiday) && (
          <View className="flex-row justify-center mt-2">
            <View className="bg-yellow-500/30 px-3 py-1 rounded-full flex-row items-center gap-1">
              <Star size={14} color="#FBBF24" fill="#FBBF24" />
              <Text className="text-yellow-400 font-medium">
                {calendarData.is_shabbat
                  ? t('judaism.calendar.shabbat', 'Shabbat')
                  : t('judaism.calendar.holiday', 'Holiday')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Parasha */}
      {getParasha() && (
        <View className="bg-white/5 rounded-lg p-3 mb-3">
          <View className="flex-row items-center gap-2" style={{ flexDirection }}>
            <BookOpen size={18} color="#8B5CF6" />
            <Text className="text-gray-400 text-sm">
              {t('judaism.calendar.parasha', 'Parasha')}:
            </Text>
            <Text className="text-white font-medium">{getParasha()}</Text>
          </View>
        </View>
      )}

      {/* Daf Yomi */}
      {dafYomi && (
        <Pressable
          className="bg-white/5 rounded-lg p-3 mb-3"
          onPress={() => {
            if (dafYomi.sefaria_url) {
              window.open(dafYomi.sefaria_url, '_blank');
            }
          }}
        >
          <View className="flex-row items-center gap-2" style={{ flexDirection }}>
            <Flame size={18} color="#F59E0B" />
            <Text className="text-gray-400 text-sm">
              {t('judaism.calendar.dafYomi', 'Daf Yomi')}:
            </Text>
            <Text className="text-white font-medium">
              {i18n.language === 'he' ? dafYomi.tractate_he : dafYomi.tractate} {dafYomi.page}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Omer Count */}
      {calendarData.omer_count && (
        <View className="bg-orange-500/20 rounded-lg p-3 mb-3">
          <View className="flex-row items-center justify-center gap-2">
            <Text className="text-orange-400 text-sm">
              {t('judaism.calendar.omerDay', 'Day')} {calendarData.omer_count}{' '}
              {t('judaism.calendar.ofOmer', 'of the Omer')}
            </Text>
          </View>
        </View>
      )}

      {/* Holidays */}
      {calendarData.holidays.length > 0 && (
        <View className="mt-2">
          {calendarData.holidays.map((holiday, index) => (
            <View
              key={index}
              className={`bg-white/5 rounded-lg p-2 ${index > 0 ? 'mt-2' : ''}`}
            >
              <Text className="text-white font-medium text-center">
                {i18n.language === 'he' && holiday.title_he
                  ? holiday.title_he
                  : holiday.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}
