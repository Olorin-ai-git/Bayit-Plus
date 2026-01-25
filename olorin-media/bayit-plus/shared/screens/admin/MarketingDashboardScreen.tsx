/**
 * MarketingDashboardScreen
 * Marketing analytics and campaign overview
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { marketingService, MarketingMetrics, RecentCampaign, AudienceSegment } from '../../services/adminApi';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { colors } from '../../theme';

export const MarketingDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const notifications = useNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [segments, setSegments] = useState<AudienceSegment[]>([]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [metricsData, campaignsData, segmentsData] = await Promise.all([
        marketingService.getMetrics(),
        marketingService.getRecentCampaigns(4),
        marketingService.getAudienceSegments(),
      ]);
      setMetrics(metricsData);
      setRecentCampaigns(campaignsData);
      setSegments(segmentsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.marketing.loadError', 'Failed to load marketing data');
      setError(errorMessage);
      notifications.showError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, notifications]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <AdminLayout title={t('admin.titles.marketingDashboard', 'Marketing Dashboard')}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  if (error || !metrics) {
    return (
      <AdminLayout title={t('admin.titles.marketingDashboard', 'Marketing Dashboard')}>
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-base text-red-500 text-center mb-4">{error || t('admin.marketing.noData', 'No data available')}</Text>
          <TouchableOpacity className="px-4 py-2 bg-purple-500 rounded-lg" onPress={loadData}>
            <Text className="text-sm text-white font-semibold">{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={t('admin.titles.marketingDashboard', 'Marketing Dashboard')}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Overview Stats */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-white mb-4">{t('admin.marketing.overview', 'Overview')}</Text>
          <View className="flex-row flex-wrap gap-4">
            <StatCard title={t('admin.marketing.emailsSent', 'Emails Sent')} value={metrics.emailsSent.toLocaleString()} icon="✉️" color={colors.primary} />
            <StatCard title={t('admin.marketing.emailOpenRate', 'Email Open Rate')} value={`${metrics.emailOpenRate}%`} icon="📬" color={colors.success} trend={{ value: 2.3, isPositive: true }} />
            <StatCard title={t('admin.marketing.pushSent', 'Push Sent')} value={metrics.pushSent.toLocaleString()} icon="🔔" color={colors.secondary} />
            <StatCard title={t('admin.marketing.pushOpenRate', 'Push Open Rate')} value={`${metrics.pushOpenRate}%`} icon="👀" color={colors.warning} />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-white mb-4">{t('admin.marketing.quickActions', 'Quick Actions')}</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity className="flex-1 bg-white/10 rounded-2xl border border-white/10 p-4 items-center" onPress={() => navigation.navigate('EmailCampaigns')}>
              <Text className="text-3xl mb-2">✉️</Text>
              <Text className="text-sm font-semibold text-white mb-1">{t('admin.marketing.emailCampaigns', 'Email Campaigns')}</Text>
              <Text className="text-xs text-gray-400 text-center">{t('admin.marketing.emailCampaignsDesc', 'Create and manage email campaigns')}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white/10 rounded-2xl border border-white/10 p-4 items-center" onPress={() => navigation.navigate('PushNotifications')}>
              <Text className="text-3xl mb-2">🔔</Text>
              <Text className="text-sm font-semibold text-white mb-1">{t('admin.marketing.pushNotifications', 'Push Notifications')}</Text>
              <Text className="text-xs text-gray-400 text-center">{t('admin.marketing.pushDesc', 'Send push notifications to users')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Campaigns */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-white">{t('admin.marketing.recentCampaigns', 'Recent Campaigns')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmailCampaigns')}>
              <Text className="text-sm text-purple-500">{t('admin.marketing.viewAll', 'View All')}</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
            {recentCampaigns.map((campaign) => (
              <View key={campaign.id} className="flex-row items-center p-4 border-b border-white/10">
                <View className="w-10 h-10 rounded-full bg-white/5 justify-center items-center mr-3">
                  <Text className="text-lg">{campaign.type === 'email' ? '✉️' : '🔔'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">{campaign.name}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="px-2 py-0.5 rounded-sm" style={{ backgroundColor: getStatusColor(campaign.status) + '20' }}>
                      <Text className="text-xs font-semibold capitalize" style={{ color: getStatusColor(campaign.status) }}>{campaign.status}</Text>
                    </View>
                    <Text className="text-xs text-gray-500 capitalize">{campaign.type}</Text>
                  </View>
                </View>
                <View className="items-center min-w-[50px]">
                  <Text className="text-xs text-gray-500">{t('admin.marketing.sent', 'Sent')}</Text>
                  <Text className="text-sm font-semibold text-white">{campaign.sent.toLocaleString()}</Text>
                </View>
                <View className="items-center min-w-[50px] ml-4">
                  <Text className="text-xs text-gray-500">{t('admin.marketing.opened', 'Opened')}</Text>
                  <Text className="text-sm font-semibold text-white">
                    {campaign.sent > 0 ? `${((campaign.opened / campaign.sent) * 100).toFixed(1)}%` : '-'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Audience Segments */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-white mb-4">{t('admin.marketing.audienceSegments', 'Audience Segments')}</Text>
          <View className="bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
            {segments.map((segment, index) => (
              <View key={index} className="flex-row justify-between items-center p-4 border-b border-white/10">
                <Text className="text-sm text-white">{segment.name}</Text>
                <Text className="text-sm font-semibold text-purple-500">{segment.count.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Metrics */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-white mb-4">{t('admin.marketing.performance', 'Performance Metrics')}</Text>
          <View className="flex-row gap-4">
            <View className="flex-1 bg-white/10 rounded-2xl border border-white/10 p-4">
              <Text className="text-xl font-bold text-white">{metrics.emailClickRate}%</Text>
              <Text className="text-xs text-gray-400 mt-1 mb-2">{t('admin.marketing.clickRate', 'Email Click Rate')}</Text>
              <View className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <View className="h-full bg-purple-500 rounded-full" style={{ width: `${metrics.emailClickRate * 5}%` }} />
              </View>
            </View>
            <View className="flex-1 bg-white/10 rounded-2xl border border-white/10 p-4">
              <Text className="text-xl font-bold text-white">{metrics.conversionRate}%</Text>
              <Text className="text-xs text-gray-400 mt-1 mb-2">{t('admin.marketing.conversionRate', 'Conversion Rate')}</Text>
              <View className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <View className="h-full bg-green-500 rounded-full" style={{ width: `${metrics.conversionRate * 10}%` }} />
              </View>
            </View>
            <View className="flex-1 bg-white/10 rounded-2xl border border-white/10 p-4">
              <Text className="text-xl font-bold text-white">{metrics.unsubscribeRate}%</Text>
              <Text className="text-xs text-gray-400 mt-1 mb-2">{t('admin.marketing.unsubscribeRate', 'Unsubscribe Rate')}</Text>
              <View className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <View className="h-full bg-red-500 rounded-full" style={{ width: `${metrics.unsubscribeRate * 50}%` }} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
};

const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    active: colors.success,
    completed: colors.primary,
    scheduled: colors.warning,
    draft: colors.textMuted,
  };
  return map[status] || colors.textMuted;
};

export default MarketingDashboardScreen;
