import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Activity,
  Calendar,
} from 'lucide-react';
import { liveQuotasService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import AdminLayout from '@/components/admin/AdminLayout';
import logger from '@/utils/logger';

interface SystemStats {
  total_users_with_quotas: number;
  active_sessions: number;
  total_subtitle_minutes_today: number;
  total_dubbing_minutes_today: number;
  total_cost_today: number;
  total_cost_month: number;
}

interface TopUser {
  user_id: string;
  user_name: string;
  user_email: string;
  subtitle_minutes: number;
  dubbing_minutes: number;
  total_cost: number;
}

interface UsageReport {
  total_sessions: number;
  total_minutes: number;
  total_cost: number;
}

export default function LiveUsageAnalyticsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<UsageReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<UsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setError(null);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [stats, topUsersData, weeklyData, monthlyData] = await Promise.all([
        liveQuotasService.getSystemStats(),
        liveQuotasService.getTopUsers({
          start_date: monthAgo.toISOString(),
          end_date: now.toISOString(),
          limit: 10,
        }),
        liveQuotasService.getUsageReport({
          start_date: weekAgo.toISOString(),
          end_date: now.toISOString(),
        }),
        liveQuotasService.getUsageReport({
          start_date: monthAgo.toISOString(),
          end_date: now.toISOString(),
        }),
      ]);

      setSystemStats(stats);
      setTopUsers(topUsersData);
      setWeeklyReport(weeklyData);
      setMonthlyReport(monthlyData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics');
      logger.error('Failed to load analytics', 'LiveUsageAnalyticsPage', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const renderStatCard = (
    icon: any,
    label: string,
    value: string | number,
    color: string = colors.primary
  ) => {
    const Icon = icon;
    return (
      <GlassCard style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <Icon size={24} color={color} />
        </View>
        <View style={styles.statContent}>
          <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{label}</Text>
          <Text style={[styles.statValue, isRTL && styles.textRTL]}>{value}</Text>
        </View>
      </GlassCard>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {t('admin.liveQuotas.analytics', 'Live Features Usage Analytics')}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Real-time Stats */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            Users,
            t('admin.liveQuotas.totalUsers', 'Total Users with Quotas'),
            systemStats?.total_users_with_quotas || 0
          )}
          {renderStatCard(
            Activity,
            t('admin.liveQuotas.activeSessions', 'Active Sessions'),
            systemStats?.active_sessions || 0,
            '#10b981'
          )}
          {renderStatCard(
            Clock,
            t('admin.liveQuotas.subtitlesToday', 'Subtitle Minutes (Today)'),
            (systemStats?.total_subtitle_minutes_today || 0).toFixed(0)
          )}
          {renderStatCard(
            Clock,
            t('admin.liveQuotas.dubbingToday', 'Dubbing Minutes (Today)'),
            (systemStats?.total_dubbing_minutes_today || 0).toFixed(0)
          )}
          {renderStatCard(
            DollarSign,
            t('admin.liveQuotas.costToday', 'Cost (Today)'),
            `$${(systemStats?.total_cost_today || 0).toFixed(2)}`,
            '#f59e0b'
          )}
          {renderStatCard(
            DollarSign,
            t('admin.liveQuotas.costMonth', 'Cost (This Month)'),
            `$${(systemStats?.total_cost_month || 0).toFixed(2)}`,
            '#ef4444'
          )}
        </View>

        {/* Usage Reports */}
        <View style={styles.reportsGrid}>
          <GlassCard style={styles.reportCard}>
            <View style={[styles.reportHeader, isRTL && styles.reportHeaderRTL]}>
              <Calendar size={20} color={colors.primary} />
              <Text style={[styles.reportTitle, isRTL && styles.textRTL]}>
                {t('admin.liveQuotas.last7Days', 'Last 7 Days')}
              </Text>
            </View>
            <View style={styles.reportStats}>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>
                  {t('admin.liveQuotas.totalSessions', 'Total Sessions')}
                </Text>
                <Text style={styles.reportStatValue}>
                  {weeklyReport?.total_sessions || 0}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>
                  {t('admin.liveQuotas.totalMinutes', 'Total Minutes')}
                </Text>
                <Text style={styles.reportStatValue}>
                  {(weeklyReport?.total_minutes || 0).toFixed(0)}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>
                  {t('admin.liveQuotas.totalCost', 'Total Cost')}
                </Text>
                <Text style={styles.reportStatValue}>
                  ${(weeklyReport?.total_cost || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.reportCard}>
            <View style={[styles.reportHeader, isRTL && styles.reportHeaderRTL]}>
              <Calendar size={20} color={colors.primary} />
              <Text style={[styles.reportTitle, isRTL && styles.textRTL]}>
                {t('admin.liveQuotas.last30Days', 'Last 30 Days')}
              </Text>
            </View>
            <View style={styles.reportStats}>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>
                  {t('admin.liveQuotas.totalSessions', 'Total Sessions')}
                </Text>
                <Text style={styles.reportStatValue}>
                  {monthlyReport?.total_sessions || 0}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>
                  {t('admin.liveQuotas.totalMinutes', 'Total Minutes')}
                </Text>
                <Text style={styles.reportStatValue}>
                  {(monthlyReport?.total_minutes || 0).toFixed(0)}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>
                  {t('admin.liveQuotas.totalCost', 'Total Cost')}
                </Text>
                <Text style={styles.reportStatValue}>
                  ${(monthlyReport?.total_cost || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Top Users */}
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
            {topUsers.map((user, index) => (
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
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  errorBanner: {
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: colors.error,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  reportsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reportCard: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  reportStats: {
    gap: spacing.md,
  },
  reportStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportStatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  reportStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
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
    color: colors.primary,
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
