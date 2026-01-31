import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import { logger } from '@/utils/logger';

interface UsageDataPoint {
  period: string;
  feature_type: string;
  session_count: number;
  total_minutes: number;
  total_cost: number;
}

const PERIODS = ['day', 'week', 'month'] as const;

export default function UsageChartsCard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<string>('day');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageDataPoint[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await voiceManagementService.getUsageCharts(period);
      const chartData = res.data?.data ?? res.data ?? [];
      setData(Array.isArray(chartData) ? chartData : []);
    } catch (error: any) {
      logger.error('Failed to load usage charts', 'UsageChartsCard', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('admin.voiceManagement.analytics.usageCharts', 'Usage Data')}
        </Text>
        <View style={styles.periodSelector}>
          {PERIODS.map((p) => (
            <GlassButton
              key={p}
              title={t(`admin.voiceManagement.analytics.period.${p}`, p)}
              variant={period === p ? 'primary' : 'secondary'}
              onPress={() => setPeriod(p)}
              style={styles.periodBtn}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : data.length === 0 ? (
        <Text style={styles.empty}>
          {t('admin.voiceManagement.analytics.noUsageData', 'No usage data for this period')}
        </Text>
      ) : (
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerText]}>
              {t('admin.voiceManagement.analytics.feature', 'Feature')}
            </Text>
            <Text style={[styles.cellNum, styles.headerText]}>
              {t('admin.voiceManagement.analytics.sessions', 'Sessions')}
            </Text>
            <Text style={[styles.cellNum, styles.headerText]}>
              {t('admin.voiceManagement.analytics.minutes', 'Minutes')}
            </Text>
            <Text style={[styles.cellNum, styles.headerText]}>
              {t('admin.voiceManagement.analytics.cost', 'Cost')}
            </Text>
          </View>
          {data.map((item, idx) => (
            <View key={`${item.feature_type}-${idx}`} style={styles.tableRow}>
              <Text style={styles.cell}>{item.feature_type}</Text>
              <Text style={styles.cellNum}>{item.session_count}</Text>
              <Text style={styles.cellNum}>{item.total_minutes?.toFixed(1)}</Text>
              <Text style={styles.cellNum}>${item.total_cost?.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, flexWrap: 'wrap', gap: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text },
  periodSelector: { flexDirection: 'row', gap: spacing.xs },
  periodBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  loader: { padding: spacing.lg },
  empty: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', paddingBottom: spacing.sm, marginBottom: spacing.xs },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerText: { fontWeight: '600', color: colors.textMuted, fontSize: fontSize.xs },
  cell: { flex: 2, fontSize: fontSize.sm, color: colors.text },
  cellNum: { flex: 1, fontSize: fontSize.sm, color: colors.primary.DEFAULT, textAlign: 'right', fontWeight: '500' },
});
