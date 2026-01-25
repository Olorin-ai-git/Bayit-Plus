import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users, DollarSign, Clock, Activity } from 'lucide-react';
import { liveQuotasService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import AdminLayout from '@/components/admin/AdminLayout';
import logger from '@/utils/logger';
import { SystemStats, TopUser, UsageReport } from './types';
import StatCard from './StatCard';
import ReportCard from './ReportCard';
import TopUsersTable from './TopUsersTable';

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
          <StatCard
            icon={Users}
            label={t('admin.liveQuotas.totalUsers', 'Total Users with Quotas')}
            value={systemStats?.total_users_with_quotas || 0}
            isRTL={isRTL}
          />
          <StatCard
            icon={Activity}
            label={t('admin.liveQuotas.activeSessions', 'Active Sessions')}
            value={systemStats?.active_sessions || 0}
            color="#10b981"
            isRTL={isRTL}
          />
          <StatCard
            icon={Clock}
            label={t('admin.liveQuotas.subtitlesToday', 'Subtitle Minutes (Today)')}
            value={(systemStats?.total_subtitle_minutes_today || 0).toFixed(0)}
            isRTL={isRTL}
          />
          <StatCard
            icon={Clock}
            label={t('admin.liveQuotas.dubbingToday', 'Dubbing Minutes (Today)')}
            value={(systemStats?.total_dubbing_minutes_today || 0).toFixed(0)}
            isRTL={isRTL}
          />
          <StatCard
            icon={DollarSign}
            label={t('admin.liveQuotas.costToday', 'Cost (Today)')}
            value={`$${(systemStats?.total_cost_today || 0).toFixed(2)}`}
            color="#f59e0b"
            isRTL={isRTL}
          />
          <StatCard
            icon={DollarSign}
            label={t('admin.liveQuotas.costMonth', 'Cost (This Month)')}
            value={`$${(systemStats?.total_cost_month || 0).toFixed(2)}`}
            color="#ef4444"
            isRTL={isRTL}
          />
        </View>

        {/* Usage Reports */}
        <View style={styles.reportsGrid}>
          <ReportCard
            title={t('admin.liveQuotas.last7Days', 'Last 7 Days')}
            report={weeklyReport}
            isRTL={isRTL}
          />
          <ReportCard
            title={t('admin.liveQuotas.last30Days', 'Last 30 Days')}
            report={monthlyReport}
            isRTL={isRTL}
          />
        </View>

        {/* Top Users */}
        <TopUsersTable topUsers={topUsers} isRTL={isRTL} />
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
    color: colors.error.DEFAULT,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  reportsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
