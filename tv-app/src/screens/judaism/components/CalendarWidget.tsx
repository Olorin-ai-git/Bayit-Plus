/**
 * CalendarWidget component - Displays Jewish calendar information.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';
import { GlassView } from '../../../components';
import { useDirection } from '@bayit/shared/hooks';
import { styles } from '../JudaismScreen.styles';
import { CalendarData } from '../types';

interface CalendarWidgetProps {
  data: CalendarData;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ data }) => {
  const { t, i18n } = useTranslation();
  const { flexDirection } = useDirection();

  const getDayName = () => {
    return i18n.language === 'he' ? data.day_of_week_he : data.day_of_week;
  };

  return (
    <GlassView style={styles.calendarWidget}>
      <View style={[styles.calendarHeader, { flexDirection }]}>
        <NativeIcon name="calendar" size="lg" context="tv" color="#a855f7" />
        <Text style={styles.calendarTitle}>
          {t('judaism.calendar.title', 'Jewish Calendar')}
        </Text>
      </View>
      <View style={styles.hebrewDateContainer}>
        <Text style={styles.hebrewDate}>{data.hebrew_date}</Text>
        <Text style={styles.gregorianDate}>
          {getDayName()} • {data.gregorian_date}
        </Text>
      </View>
      {(data.is_shabbat || data.is_holiday) && (
        <View style={styles.specialDayBadge}>
          <NativeIcon name="star" size="md" context="tv" color="#fbbf24" />
          <Text style={styles.specialDayText}>
            {data.is_shabbat ? t('judaism.calendar.shabbat', 'Shabbat') : t('judaism.calendar.holiday', 'Holiday')}
          </Text>
        </View>
      )}
      {data.parasha && (
        <View style={styles.parashaRow}>
          <NativeIcon name="book" size="md" context="tv" color="#a855f7" />
          <Text style={styles.parashaRowLabel}>{t('judaism.calendar.parasha', 'Parasha')}:</Text>
          <Text style={styles.parashaRowValue}>
            {i18n.language === 'he' ? data.parasha_he : data.parasha}
          </Text>
        </View>
      )}
      {data.holidays.length > 0 && (
        <View style={styles.holidaysList}>
          {data.holidays.map((holiday, index) => (
            <View key={index} style={styles.holidayItem}>
              <Text style={styles.holidayItemText}>
                {i18n.language === 'he' && holiday.title_he ? holiday.title_he : holiday.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </GlassView>
  );
};
