import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { TopUser } from './types';

interface TopUsersTableProps {
  topUsers: TopUser[];
  isRTL: boolean;
}

export default function TopUsersTable({ topUsers, isRTL }: TopUsersTableProps) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
        <TrendingUp size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
          {t('admin.liveQuotas.topUsers', 'Top Users (Last 30 Days)')}
        </Text>
      </View>
      <View style={styles.table}>
        <View style={[styles.tableHeader, isRTL && styles.tableHeaderRTL]}>
          <Text style={[styles.tableHeaderCell, styles.userColumn]}>
            {t('admin.liveQuotas.user', 'User')}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.numberColumn]}>
            {t('admin.liveQuotas.subtitles', 'Subtitles')}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.numberColumn]}>
            {t('admin.liveQuotas.dubbing', 'Dubbing')}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.numberColumn]}>
            {t('admin.liveQuotas.cost', 'Cost')}
          </Text>
        </View>
        {topUsers.map((user) => (
          <View key={user.user_id} style={[styles.tableRow, isRTL && styles.tableRowRTL]}>
            <View style={[styles.tableCell, styles.userColumn]}>
              <Text style={styles.userName}>{user.user_name}</Text>
              <Text style={styles.userEmail}>{user.user_email}</Text>
            </View>
            <Text style={[styles.tableCell, styles.numberColumn]}>
              {user.subtitle_minutes.toFixed(0)} min
            </Text>
            <Text style={[styles.tableCell, styles.numberColumn]}>
              {user.dubbing_minutes.toFixed(0)} min
            </Text>
            <Text style={[styles.tableCell, styles.numberColumn, styles.costCell]}>
              ${user.total_cost.toFixed(2)}
            </Text>
          </View>
        ))}
        {topUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('admin.liveQuotas.noData', 'No usage data available')}
            </Text>
          </View>
        )}
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  table: {
    gap: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.sm,
  },
  tableHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableRowRTL: {
    flexDirection: 'row-reverse',
  },
  tableCell: {
    fontSize: 14,
    color: colors.text,
  },
  userColumn: {
    flex: 2,
  },
  numberColumn: {
    flex: 1,
    textAlign: 'right',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  costCell: {
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
