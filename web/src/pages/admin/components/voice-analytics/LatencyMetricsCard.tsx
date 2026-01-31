import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import { logger } from '@/utils/logger';

interface LatencyPercentiles {
  p50?: number;
  p95?: number;
  p99?: number;
  avg?: number;
  min?: number;
  max?: number;
}

interface LatencyData {
  stt_latency: LatencyPercentiles;
  tts_latency: LatencyPercentiles;
  end_to_end_latency: LatencyPercentiles;
  sample_count: number;
}

const PERIODS = ['day', 'week', 'month'] as const;

export default function LatencyMetricsCard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<string>('day');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LatencyData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await voiceManagementService.getLatencyMetrics(period);
      const metrics = res.data?.metrics ?? res.metrics;
      setData(metrics);
    } catch (error: any) {
      logger.error('Failed to load latency metrics', 'LatencyMetricsCard', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const renderRow = (label: string, percentiles: LatencyPercentiles) => (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{percentiles.p50 ?? '-'}ms</Text>
      <Text style={styles.metricValue}>{percentiles.p95 ?? '-'}ms</Text>
      <Text style={styles.metricValue}>{percentiles.p99 ?? '-'}ms</Text>
    </View>
  );

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('admin.voiceManagement.analytics.latencyMetrics', 'Latency Metrics')}
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
      ) : data ? (
        <View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, styles.headerLabel]} />
            <Text style={styles.headerCell}>p50</Text>
            <Text style={styles.headerCell}>p95</Text>
            <Text style={styles.headerCell}>p99</Text>
          </View>
          {renderRow('STT', data.stt_latency)}
          {renderRow('TTS', data.tts_latency)}
          {renderRow('E2E', data.end_to_end_latency)}
          <Text style={styles.sampleCount}>
            {t('admin.voiceManagement.analytics.samples', 'Samples')}: {data.sample_count}
          </Text>
        </View>
      ) : null}
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
  metricRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  metricLabel: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  headerLabel: { fontWeight: '600' },
  metricValue: { width: 80, textAlign: 'center', fontSize: fontSize.sm, color: colors.primary.DEFAULT, fontWeight: '500' },
  headerCell: { width: 80, textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
  sampleCount: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'right' },
});
