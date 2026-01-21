/**
 * ShabbatEveBanner component - Displays Shabbat eve information.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../../../components';
import { useDirection } from '@bayit/shared/hooks';
import { styles } from '../JudaismScreen.styles';
import { ShabbatStatus } from '../types';

interface ShabbatEveBannerProps {
  status: ShabbatStatus;
  getLocalizedText: (item: any, field: string) => string;
}

export const ShabbatEveBanner: React.FC<ShabbatEveBannerProps> = ({ status }) => {
  const { t, i18n } = useTranslation();
  const { flexDirection } = useDirection();

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  const getParasha = () => {
    return i18n.language === 'he' ? status.parasha_he : status.parasha;
  };

  return (
    <GlassView style={styles.shabbatBanner}>
      <View style={[styles.shabbatHeader, { flexDirection }]}>
        <View style={[styles.shabbatIconsContainer, { flexDirection }]}>
          <Text style={styles.shabbatCandle}>🕯️</Text>
          <Text style={[styles.shabbatCandle, { marginLeft: -8 }]}>🕯️</Text>
        </View>
        <View style={styles.shabbatTitleContainer}>
          <Text style={styles.shabbatTitle}>
            {t('judaism.erevShabbat.title', 'Erev Shabbat')}
          </Text>
          <Text style={styles.shabbatSubtitle}>
            {t('judaism.erevShabbat.shabbatShalom', 'Shabbat Shalom!')} 🍞
          </Text>
        </View>
      </View>

      {getParasha() && (
        <View style={styles.parashaContainer}>
          <Text style={styles.parashaLabel}>
            {t('judaism.shabbat.parashat', 'Parashat')}
          </Text>
          <Text style={styles.parashaName}>{getParasha()}</Text>
        </View>
      )}

      <View style={[styles.shabbatTimesRow, { flexDirection }]}>
        <View style={styles.shabbatTimeCard}>
          <Text style={styles.shabbatTimeIcon}>🔥</Text>
          <Text style={styles.shabbatTimeLabel}>
            {t('judaism.shabbat.candleLighting', 'Candle Lighting')}
          </Text>
          <Text style={styles.shabbatTimeValue}>
            {formatTime(status.candle_lighting)}
          </Text>
        </View>
        <View style={styles.shabbatTimeCard}>
          <Text style={styles.shabbatTimeIcon}>🌙</Text>
          <Text style={styles.shabbatTimeLabel}>
            {t('judaism.shabbat.havdalah', 'Havdalah')}
          </Text>
          <Text style={styles.shabbatTimeValue}>
            {formatTime(status.havdalah)}
          </Text>
        </View>
      </View>
    </GlassView>
  );
};
