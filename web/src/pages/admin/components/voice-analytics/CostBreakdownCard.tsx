import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassCard } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import { logger } from '@/utils/logger';

interface CostItem {
  component: string;
  cost: number;
}

export default function CostBreakdownCard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CostItem[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await voiceManagementService.getCostBreakdown();
      const breakdown = res.data?.breakdown ?? res.breakdown ?? {};

      const parsed: CostItem[] = Object.entries(breakdown).map(
        ([component, cost]) => ({ component, cost: Number(cost) || 0 })
      );
      parsed.sort((a, b) => b.cost - a.cost);

      setItems(parsed);
      setTotal(parsed.reduce((sum, i) => sum + i.cost, 0));
    } catch (error: any) {
      logger.error('Failed to load cost breakdown', 'CostBreakdownCard', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>
        {t('admin.voiceManagement.analytics.costBreakdown', 'Voice Cost Breakdown')}
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          {t('admin.voiceManagement.analytics.noCostData', 'No cost data available')}
        </Text>
      ) : (
        <View>
          {items.map((item) => {
            const pct = total > 0 ? (item.cost / total) * 100 : 0;
            return (
              <View key={item.component} style={styles.row}>
                <Text style={styles.componentName}>{item.component}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${Math.min(pct, 100)}%` }]} />
                </View>
                <Text style={styles.costValue}>${item.cost.toFixed(2)}</Text>
              </View>
            );
          })}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {t('admin.voiceManagement.analytics.totalCost', 'Total')}
            </Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  loader: { padding: spacing.lg },
  empty: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  componentName: { width: 100, fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  barContainer: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: colors.primary.DEFAULT, borderRadius: 4 },
  costValue: { width: 80, textAlign: 'right', fontSize: fontSize.sm, color: colors.primary.DEFAULT, fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', marginTop: spacing.sm },
  totalLabel: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  totalValue: { fontSize: fontSize.base, fontWeight: '600', color: colors.primary.DEFAULT },
});
