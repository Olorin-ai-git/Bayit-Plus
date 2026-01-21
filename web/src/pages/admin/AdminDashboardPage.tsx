import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, UserPlus, Tag, Mail, BarChart3 } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { dashboardService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface DashboardStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_this_week: number;
  total_revenue: number;
  revenue_today: number;
  revenue_this_month: number;
  avg_revenue_per_user: number;
  active_subscriptions: number;
  churn_rate: number;
}

interface Activity {
  id: string;
  action: string;
  details?: Record<string, string>;
  created_at: string;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const getActivityIcon = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('user')) return '👤';
  if (lowerAction.includes('subscription')) return '📦';
  if (lowerAction.includes('payment')) return '💰';
  if (lowerAction.includes('campaign')) return '🎯';
  if (lowerAction.includes('login')) return '🔑';
  if (lowerAction.includes('widget')) return '📺';
  if (lowerAction.includes('channel')) return '📡';
  if (lowerAction.includes('content')) return '🎬';
  return '📋';
};

// Format activity details - handle nested objects
const formatActivityDetails = (details: Record<string, any>): string => {
  const extractValue = (value: any): string | null => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
      // Handle arrays - extract meaningful values
      return value.map(extractValue).filter(Boolean).join(', ') || null;
    }
    if (typeof value === 'object') {
      // Extract meaningful fields from nested objects
      if (value.title) return String(value.title);
      if (value.name) return String(value.name);
      if (value.email) return String(value.email);
      if (value.label) return String(value.label);
      // For objects with only id, skip them
      if (Object.keys(value).length === 1 && value.id) return null;
      // Try to get any string value from the object
      const stringValue = Object.values(value).find(v => typeof v === 'string' && v.length < 100);
      if (stringValue) return String(stringValue);
      return null;
    }
    // Don't include very long strings or ObjectIds
    const str = String(value);
    if (str.length > 50 || /^[0-9a-f]{24}$/i.test(str)) return null;
    return str;
  };

  return Object.entries(details)
    .map(([key, value]) => extractValue(value))
    .filter(Boolean)
    .join(' - ');
};

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) {
      return t('admin.dashboard.timeAgo.minutes', { count: diffMins });
    }
    if (diffHours < 24) {
      return t('admin.dashboard.timeAgo.hours', { count: diffHours });
    }
    return date.toLocaleDateString(
      i18n.language === 'he' ? 'he-IL' : i18n.language === 'es' ? 'es-ES' : 'en-US'
    );
  };

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [statsData, activityData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(10),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
    } catch (err: any) {
      const message = err?.message || 'Failed to load dashboard data';
      setError(message);
      logger.error('Failed to load dashboard data', 'AdminDashboard', err);
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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton
          title={t('common.retry')}
          onPress={loadDashboardData}
          variant="primary"
        />
      </View>
    );
  }

  if (loading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.dashboard.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.dashboard.subtitle')}</Text>
        </View>
        <GlassButton
          title={t('admin.dashboard.refresh')}
          onPress={handleRefresh}
          disabled={refreshing}
          variant="ghost"
          icon={<RefreshCw size={18} color="white" />}
        />
      </View>

      {/* Users Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.dashboard.users')}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.stats.totalUsers')}
            value={formatNumber(stats.total_users)}
            icon="👥"
            color="primary"
            to="/admin/users"
          />
          <StatCard
            title={t('admin.stats.activeUsers')}
            value={formatNumber(stats.active_users)}
            icon="✅"
            color="success"
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title={t('admin.stats.newToday')}
            value={formatNumber(stats.new_users_today)}
            icon="🆕"
            color="secondary"
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatCard
            title={t('admin.stats.newThisWeek')}
            value={formatNumber(stats.new_users_this_week)}
            icon="📈"
            color="warning"
          />
        </View>
      </View>

      {/* Revenue Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.dashboard.revenue')}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.stats.totalRevenue')}
            value={formatCurrency(stats.total_revenue)}
            icon="💰"
            color="success"
            to="/admin/billing"
          />
          <StatCard
            title={t('admin.stats.revenueToday')}
            value={formatCurrency(stats.revenue_today)}
            icon="📊"
            color="primary"
            trend={{ value: 15.3, isPositive: true }}
          />
          <StatCard
            title={t('admin.stats.revenueMonth')}
            value={formatCurrency(stats.revenue_this_month)}
            icon="📅"
            color="secondary"
          />
          <StatCard
            title={t('admin.stats.arpu')}
            value={`$${stats.avg_revenue_per_user.toFixed(2)}`}
            icon="💵"
            color="warning"
          />
        </View>
      </View>

      {/* Subscriptions Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.dashboard.subscriptions')}</Text>
        <View style={styles.statsGridHalf}>
          <StatCard
            title={t('admin.stats.activeSubscriptions')}
            value={formatNumber(stats.active_subscriptions)}
            icon="📦"
            color="primary"
            to="/admin/subscriptions"
          />
          <StatCard
            title={t('admin.stats.churnRate')}
            value={`${stats.churn_rate}%`}
            icon="📉"
            color={stats.churn_rate < 5 ? 'success' : 'error'}
            trend={{ value: 0.5, isPositive: stats.churn_rate < 5 }}
          />
        </View>
      </View>

      {/* Recent Activity & Quick Actions */}
      <View style={[styles.bottomSection, { flexDirection }]}>
        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.dashboard.recentActivity')}</Text>
          <GlassCard style={styles.activityCard}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <View key={activity.id} style={[styles.activityItem, { flexDirection }]}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityIconText}>{getActivityIcon(activity.action)}</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityAction, { textAlign }]}>
                      {t(`admin.auditActions.${activity.action}`, activity.action.replace(/_/g, ' '))}
                    </Text>
                    {activity.details && (
                      <Text style={[styles.activityDetails, { textAlign }]} numberOfLines={1}>
                        {formatActivityDetails(activity.details)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.activityTime}>{formatDateTime(activity.created_at)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyActivityText}>{t('admin.dashboard.noRecentActivity', 'No recent activity')}</Text>
              </View>
            )}
          </GlassCard>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.dashboard.quickActions')}</Text>
          <GlassCard style={styles.quickActionsCard}>
            <Link to="/admin/users/new" style={{ textDecoration: 'none' }}>
              <Pressable style={[styles.quickAction, { flexDirection }]}>
                <View style={[styles.quickActionIcon, { backgroundColor: colors.glassPurpleLight }]}>
                  <UserPlus size={20} color={colors.primary} />
                </View>
                <Text style={[styles.quickActionText, { textAlign }]}>{t('admin.actions.addUser')}</Text>
              </Pressable>
            </Link>
            <Link to="/admin/campaigns/new" style={{ textDecoration: 'none' }}>
              <Pressable style={[styles.quickAction, { flexDirection }]}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Tag size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.quickActionText, { textAlign }]}>{t('admin.actions.newCampaign')}</Text>
              </Pressable>
            </Link>
            <Link to="/admin/emails" style={{ textDecoration: 'none' }}>
              <Pressable style={[styles.quickAction, { flexDirection }]}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Mail size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.quickActionText, { textAlign }]}>{t('admin.actions.sendEmail')}</Text>
              </Pressable>
            </Link>
            <Link to="/admin/billing" style={{ textDecoration: 'none' }}>
              <Pressable style={[styles.quickAction, { flexDirection }]}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <BarChart3 size={20} color="#22C55E" />
                </View>
                <Text style={[styles.quickActionText, { textAlign }]}>{t('admin.actions.viewReports')}</Text>
              </Pressable>
            </Link>
          </GlassCard>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  statsGridHalf: {
    flexDirection: 'row',
    gap: spacing.md,
    maxWidth: 620,
  },
  bottomSection: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  bottomSectionRTL: {
    flexDirection: 'row-reverse',
  },
  activitySection: {
    flex: 2,
    minWidth: 300,
  },
  activityCard: {
    padding: 0,
    minHeight: 200,
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityItemRTL: {
    flexDirection: 'row-reverse',
  },
  emptyActivity: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivityText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconText: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textTransform: 'capitalize',
  },
  activityDetails: {
    fontSize: 12,
    color: colors.textMuted,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  quickActionsSection: {
    flex: 1,
    minWidth: 250,
  },
  quickActionsCard: {
    padding: spacing.md,
    flex: 1,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  quickActionRTL: {
    flexDirection: 'row-reverse',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  textRTL: {
    textAlign: 'right',
  },
});
