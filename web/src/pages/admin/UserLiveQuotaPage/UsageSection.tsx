import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import { QuotaData } from './types';
import UsageRow from './UsageRow';

interface UsageSectionProps {
  quota: QuotaData | null;
  usage: QuotaData | null;
  isRTL: boolean;
}

export default function UsageSection({ quota, usage, isRTL }: UsageSectionProps) {
  const { t } = useTranslation();

  if (!quota || !usage) return null;

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
        <TrendingUp size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
          {t('admin.liveQuotas.currentUsage', 'Current Usage')}
        </Text>
      </View>

      <View style={styles.usageGrid}>
        <UsageRow
          label={t('admin.liveQuotas.subtitlesHour', 'Subtitles (Hour)')}
          current={usage.subtitle_usage_current_hour}
          limit={quota.subtitle_minutes_per_hour}
          accumulated={usage.accumulated_subtitle_minutes}
          isRTL={isRTL}
        />
        <UsageRow
          label={t('admin.liveQuotas.subtitlesDay', 'Subtitles (Day)')}
          current={usage.subtitle_usage_current_day}
          limit={quota.subtitle_minutes_per_day}
          isRTL={isRTL}
        />
        <UsageRow
          label={t('admin.liveQuotas.subtitlesMonth', 'Subtitles (Month)')}
          current={usage.subtitle_usage_current_month}
          limit={quota.subtitle_minutes_per_month}
          isRTL={isRTL}
        />
        <UsageRow
          label={t('admin.liveQuotas.dubbingHour', 'Dubbing (Hour)')}
          current={usage.dubbing_usage_current_hour}
          limit={quota.dubbing_minutes_per_hour}
          accumulated={usage.accumulated_dubbing_minutes}
          isRTL={isRTL}
        />
        <UsageRow
          label={t('admin.liveQuotas.dubbingDay', 'Dubbing (Day)')}
          current={usage.dubbing_usage_current_day}
          limit={quota.dubbing_minutes_per_day}
          isRTL={isRTL}
        />
        <UsageRow
          label={t('admin.liveQuotas.dubbingMonth', 'Dubbing (Month)')}
          current={usage.dubbing_usage_current_month}
          limit={quota.dubbing_minutes_per_month}
          isRTL={isRTL}
        />
      </View>

      <View style={styles.costSection}>
        <DollarSign size={16} color={colors.primary} />
        <Text style={styles.costLabel}>
          {t('admin.liveQuotas.estimatedCost', 'Estimated Cost (This Month)')}:
        </Text>
        <Text style={styles.costValue}>
          ${usage.estimated_cost_current_month?.toFixed(2) || '0.00'}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  usageGrid: {
    gap: spacing.xs,
  },
  costSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  costLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  costValue: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
