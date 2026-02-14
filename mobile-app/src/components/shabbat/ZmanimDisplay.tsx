/**
 * ZmanimDisplay
 *
 * Prayer times and Jewish day-times display showing sunrise,
 * sunset, midday, candle lighting, and havdalah.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon, IconName } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { zmanService } from '@bayit/shared-services/api';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('ZmanimDisplay');

interface ZmanimDisplayProps {
  location?: { lat: number; lng: number };
  date?: Date;
}

interface ZmanTime { key: string; label: string; time: string; icon: IconName }

interface ZmanimData {
  sunrise?: string; sunset?: string; midday?: string;
  candle_lighting?: string; havdalah?: string;
  dawn?: string; nightfall?: string; hebrew_date?: string;
}

export const ZmanimDisplay: React.FC<ZmanimDisplayProps> = ({ location }) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [zmanim, setZmanim] = useState<ZmanimData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZmanim = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await zmanService.getShabbatTimes(location?.lat, location?.lng);
      setZmanim(response as unknown as ZmanimData);
    } catch (err) {
      moduleLogger.error('Failed to fetch zmanim', { error: err instanceof Error ? err.message : String(err), location });
      setError(err instanceof Error ? err.message : String(err));
    } finally { setIsLoading(false); }
  }, [location]);

  useEffect(() => { fetchZmanim(); }, [fetchZmanim]);

  if (isLoading) {
    return (<GlassCard style={styles.container}><View style={styles.loadWrap}><GlassLoadingSpinner size="small" /></View></GlassCard>);
  }
  if (error || !zmanim) {
    return (
      <GlassCard style={styles.container}>
        <View style={styles.errWrap}><NativeIcon name="alertCircle" size="sm" color={colors.textMuted} /><Text style={styles.errText}>{t('zmanim.loadError')}</Text></View>
      </GlassCard>
    );
  }

  const items: ZmanTime[] = [
    ...(zmanim.dawn ? [{ key: 'dawn', label: t('zmanim.dawn'), time: zmanim.dawn, icon: 'sunrise' as IconName }] : []),
    ...(zmanim.sunrise ? [{ key: 'sunrise', label: t('zmanim.sunrise'), time: zmanim.sunrise, icon: 'sunrise' as IconName }] : []),
    ...(zmanim.midday ? [{ key: 'midday', label: t('zmanim.midday'), time: zmanim.midday, icon: 'sun' as IconName }] : []),
    ...(zmanim.sunset ? [{ key: 'sunset', label: t('zmanim.sunset'), time: zmanim.sunset, icon: 'sunset' as IconName }] : []),
    ...(zmanim.nightfall ? [{ key: 'nightfall', label: t('zmanim.nightfall'), time: zmanim.nightfall, icon: 'moon' as IconName }] : []),
    ...(zmanim.candle_lighting ? [{ key: 'candleLighting', label: t('zmanim.candleLighting'), time: zmanim.candle_lighting, icon: 'candle' as IconName }] : []),
    ...(zmanim.havdalah ? [{ key: 'havdalah', label: t('zmanim.havdalah'), time: zmanim.havdalah, icon: 'star' as IconName }] : []),
  ];

  return (
    <GlassCard style={styles.container} accessibilityLabel={t('zmanim.title')} accessibilityRole="list">
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <NativeIcon name="clock" size="md" color={colors.primary} />
        <Text style={styles.headerText}>{t('zmanim.title')}</Text>
      </View>
      {zmanim.hebrew_date && <Text style={[styles.hebrewDate, { textAlign: isRTL ? 'right' : 'left' }]}>{zmanim.hebrew_date}</Text>}
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.key} style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            accessibilityLabel={`${item.label}: ${item.time}`} accessibilityRole="text">
            <View style={[styles.labelWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <NativeIcon name={item.icon} size="sm" color={colors.textSecondary} />
              <Text style={styles.label}>{item.label}</Text>
            </View>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        ))}
      </View>
      {items.length === 0 && <Text style={styles.noData}>{t('zmanim.noData')}</Text>}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.md, marginHorizontal: spacing.md, marginVertical: spacing.sm },
  loadWrap: { height: 100, justifyContent: 'center', alignItems: 'center' },
  errWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  errText: { color: colors.textMuted, fontSize: fontSize.sm },
  headerRow: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  headerText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  hebrewDate: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500', marginBottom: spacing.md },
  list: { gap: spacing.xs },
  row: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  labelWrap: { alignItems: 'center', gap: spacing.sm },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  time: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  noData: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});

export default ZmanimDisplay;
