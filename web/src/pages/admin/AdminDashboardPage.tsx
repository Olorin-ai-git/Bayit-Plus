import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, UserPlus, Tag, Mail, BarChart3 } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { dashboardService } from '@/services/adminApi';
import { colors } from '@bayit/shared/theme';
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
      <View className="flex-1 justify-center items-center px-4">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-base text-red-500 mb-4">{error}</Text>
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
      <View className="flex-1 justify-center items-center gap-2">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-gray-400">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4" style={{ flexDirection }}>
        <View>
          <Text className="text-2xl font-bold text-white" style={{ textAlign }}>{t('admin.dashboard.title')}</Text>
          <Text className="text-sm text-gray-400 mt-1" style={{ textAlign }}>{t('admin.dashboard.subtitle')}</Text>
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
      <View className="mb-4">
        <Text className="text-lg font-semibold text-white mb-3" style={{ textAlign }}>{t('admin.dashboard.users')}</Text>
        <View className="flex-row flex-wrap gap-3">
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
      <View className="mb-4">
        <Text className="text-lg font-semibold text-white mb-3" style={{ textAlign }}>{t('admin.dashboard.revenue')}</Text>
        <View className="flex-row flex-wrap gap-3">
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
      <View className="mb-4">
        <Text className="text-lg font-semibold text-white mb-3" style={{ textAlign }}>{t('admin.dashboard.subscriptions')}</Text>
        <View className="flex-row gap-3 max-w-[620px]">
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
      <View className="flex-row gap-4 flex-wrap" style={{ flexDirection }}>
        {/* Recent Activity */}
        <View className="flex-[2] min-w-[300px]">
          <Text className="text-lg font-semibold text-white mb-3" style={{ textAlign }}>{t('admin.dashboard.recentActivity')}</Text>
          <GlassCard className="p-0 min-h-[200px] flex-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <View key={activity.id} className="flex-row items-center gap-3 px-3 py-3 border-b border-white/5" style={{ flexDirection }}>
                  <View className="w-10 h-10 rounded-full bg-gray-800 justify-center items-center">
                    <Text className="text-lg">{getActivityIcon(activity.action)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-white capitalize" style={{ textAlign }}>
                      {t(`admin.auditActions.${activity.action}`, activity.action.replace(/_/g, ' '))}
                    </Text>
                    {activity.details && (
                      <Text className="text-xs text-gray-400" style={{ textAlign }} numberOfLines={1}>
                        {formatActivityDetails(activity.details)}
                      </Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400">{formatDateTime(activity.created_at)}</Text>
                </View>
              ))
            ) : (
              <View className="px-8 py-10 items-center justify-center">
                <Text className="text-sm text-gray-400">{t('admin.dashboard.noRecentActivity', 'No recent activity')}</Text>
              </View>
            )}
          </GlassCard>
        </View>

        {/* Quick Actions */}
        <View className="flex-1 min-w-[250px]">
          <Text className="text-lg font-semibold text-white mb-3" style={{ textAlign }}>{t('admin.dashboard.quickActions')}</Text>
          <GlassCard className="p-3 flex-1">
            <Link to="/admin/users/new" style={{ textDecoration: 'none' }}>
              <Pressable className="flex-row items-center gap-3 px-3 py-3 rounded-md" style={{ flexDirection }}>
                <View className="w-10 h-10 rounded-md bg-purple-500/20 justify-center items-center">
                  <UserPlus size={20} color={colors.primary} />
                </View>
                <Text className="text-sm font-medium text-white flex-1" style={{ textAlign }}>{t('admin.actions.addUser')}</Text>
              </Pressable>
            </Link>
            <Link to="/admin/campaigns/new" style={{ textDecoration: 'none' }}>
              <Pressable className="flex-row items-center gap-3 px-3 py-3 rounded-md" style={{ flexDirection }}>
                <View className="w-10 h-10 rounded-md bg-purple-500/20 justify-center items-center">
                  <Tag size={20} color="#8B5CF6" />
                </View>
                <Text className="text-sm font-medium text-white flex-1" style={{ textAlign }}>{t('admin.actions.newCampaign')}</Text>
              </Pressable>
            </Link>
            <Link to="/admin/emails" style={{ textDecoration: 'none' }}>
              <Pressable className="flex-row items-center gap-3 px-3 py-3 rounded-md" style={{ flexDirection }}>
                <View className="w-10 h-10 rounded-md bg-amber-500/20 justify-center items-center">
                  <Mail size={20} color="#F59E0B" />
                </View>
                <Text className="text-sm font-medium text-white flex-1" style={{ textAlign }}>{t('admin.actions.sendEmail')}</Text>
              </Pressable>
            </Link>
            <Link to="/admin/billing" style={{ textDecoration: 'none' }}>
              <Pressable className="flex-row items-center gap-3 px-3 py-3 rounded-md" style={{ flexDirection }}>
                <View className="w-10 h-10 rounded-md bg-green-500/20 justify-center items-center">
                  <BarChart3 size={20} color="#22C55E" />
                </View>
                <Text className="text-sm font-medium text-white flex-1" style={{ textAlign }}>{t('admin.actions.viewReports')}</Text>
              </Pressable>
            </Link>
          </GlassCard>
        </View>
      </View>
    </ScrollView>
  );
}
