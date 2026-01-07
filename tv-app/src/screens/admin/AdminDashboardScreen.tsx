/**
 * AdminDashboardScreen
 * Main dashboard for admin panel with stats, charts, and activity
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useDirection } from '@bayit/shared/hooks';
import { AdminLayout, StatCard } from '@bayit/shared/admin';
import { dashboardService } from '../../services/adminApi';
import { DashboardStats, AuditLog, ChartDataPoint } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatNumber, formatCurrency, formatDateTime } from '../../utils/formatters';
import { getActivityIcon } from '../../utils/adminConstants';

const { width } = Dimensions.get('window');

export const AdminDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [revenueData, setRevenueData] = useState<ChartDataPoint[]>([]);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [statsData, activityData, chartData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(10),
        dashboardService.getRevenueChart('daily'),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
      setRevenueData(chartData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Show error state
  if (error) {
    return (
      <AdminLayout title={t('admin.titles.dashboard', 'Dashboard')}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
            <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </AdminLayout>
    );
  }

  // Show loading state
  if (loading || !stats) {
    return (
      <AdminLayout title={t('admin.titles.dashboard', 'Dashboard')}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={t('admin.titles.dashboard', 'Dashboard')}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stats Row 1 - Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('admin.dashboard.users', 'Users')}
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.stats.totalUsers', 'Total Users')}
              value={formatNumber(stats.total_users)}
              icon="👥"
              color={colors.primary}
              onPress={() => navigation.navigate('UsersList')}
            />
            <StatCard
              title={t('admin.stats.activeUsers', 'Active Users')}
              value={formatNumber(stats.active_users)}
              icon="✅"
              color={colors.success}
              trend={{ value: 12.5, isPositive: true }}
            />
            <StatCard
              title={t('admin.stats.newToday', 'New Today')}
              value={formatNumber(stats.new_users_today)}
              icon="🆕"
              color={colors.secondary}
              trend={{ value: 8.2, isPositive: true }}
            />
            <StatCard
              title={t('admin.stats.newThisWeek', 'New This Week')}
              value={formatNumber(stats.new_users_this_week)}
              icon="📈"
              color={colors.warning}
            />
          </View>
        </View>

        {/* Stats Row 2 - Revenue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('admin.dashboard.revenue', 'Revenue')}
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.stats.totalRevenue', 'Total Revenue')}
              value={formatCurrency(stats.total_revenue)}
              icon="💰"
              color={colors.success}
              onPress={() => navigation.navigate('BillingOverview')}
            />
            <StatCard
              title={t('admin.stats.revenueToday', 'Today')}
              value={formatCurrency(stats.revenue_today)}
              icon="📊"
              color={colors.primary}
              trend={{ value: 15.3, isPositive: true }}
            />
            <StatCard
              title={t('admin.stats.revenueMonth', 'This Month')}
              value={formatCurrency(stats.revenue_this_month)}
              icon="📅"
              color={colors.secondary}
            />
            <StatCard
              title={t('admin.stats.arpu', 'ARPU')}
              value={`$${stats.avg_revenue_per_user.toFixed(2)}`}
              icon="💵"
              color={colors.warning}
            />
          </View>
        </View>

        {/* Stats Row 3 - Subscriptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('admin.dashboard.subscriptions', 'Subscriptions')}
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.stats.activeSubscriptions', 'Active Subscriptions')}
              value={formatNumber(stats.active_subscriptions)}
              icon="📦"
              color={colors.primary}
              onPress={() => navigation.navigate('Subscriptions')}
            />
            <StatCard
              title={t('admin.stats.churnRate', 'Churn Rate')}
              value={`${stats.churn_rate}%`}
              icon="📉"
              color={stats.churn_rate < 5 ? colors.success : colors.error}
              trend={{ value: 0.5, isPositive: stats.churn_rate < 5 }}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('admin.dashboard.recentActivity', 'Recent Activity')}
          </Text>
          <View style={styles.activityCard}>
            {recentActivity.map((activity, index) => (
              <View
                key={activity.id}
                style={[
                  styles.activityItem,
                  index < recentActivity.length - 1 && styles.activityItemBorder,
                ]}
              >
                <View style={styles.activityIcon}>
                  <Text style={styles.activityIconText}>
                    {getActivityIcon(activity.action)}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>
                    {activity.action.replace('.', ' ').replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.activityDetails}>
                    {activity.details && typeof activity.details === 'object'
                      ? Object.values(activity.details).join(' - ')
                      : ''}
                  </Text>
                </View>
                <Text style={styles.activityTime}>
                  {formatDateTime(activity.created_at)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('admin.dashboard.quickActions', 'Quick Actions')}
          </Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="👤"
              label={t('admin.actions.addUser', 'Add User')}
              onPress={() => navigation.navigate('UserDetail', { userId: undefined })}
            />
            <QuickAction
              icon="🎯"
              label={t('admin.actions.newCampaign', 'New Campaign')}
              onPress={() => navigation.navigate('CampaignDetail', { campaignId: undefined })}
            />
            <QuickAction
              icon="✉️"
              label={t('admin.actions.sendEmail', 'Send Email')}
              onPress={() => navigation.navigate('EmailCampaigns')}
            />
            <QuickAction
              icon="📊"
              label={t('admin.actions.viewReports', 'View Reports')}
              onPress={() => navigation.navigate('BillingOverview')}
            />
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
};

// Quick Action Button Component
const QuickAction: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <View style={styles.quickAction}>
    <View style={styles.quickActionButton}>
      <Text
        style={styles.quickActionIcon}
        onPress={onPress}
      >
        {icon}
      </Text>
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  activityCard: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activityIconText: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  activityDetails: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    width: 100,
  },
  quickActionButton: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionIcon: {
    fontSize: 28,
  },
  quickActionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default AdminDashboardScreen;
