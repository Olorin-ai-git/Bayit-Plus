/**
 * MarketingDashboardScreen
 * Marketing analytics and campaign overview
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export const MarketingDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Mock data for marketing metrics
  const metrics = {
    emailsSent: 15234,
    emailOpenRate: 32.5,
    emailClickRate: 8.2,
    pushSent: 45678,
    pushOpenRate: 28.4,
    activeSegments: 12,
    conversionRate: 4.8,
    unsubscribeRate: 0.8,
  };

  const recentCampaigns = [
    { id: '1', name: 'Welcome Series', type: 'email', status: 'active', sent: 2500, opened: 1250, clicked: 312 },
    { id: '2', name: 'Weekly Newsletter', type: 'email', status: 'completed', sent: 10000, opened: 3200, clicked: 640 },
    { id: '3', name: 'New Feature Alert', type: 'push', status: 'active', sent: 8500, opened: 2975, clicked: 425 },
    { id: '4', name: 'Promo Reminder', type: 'push', status: 'scheduled', sent: 0, opened: 0, clicked: 0 },
  ];

  const segments = [
    { name: 'Active Users', count: 8500 },
    { name: 'Premium Subscribers', count: 3200 },
    { name: 'Inactive 30 days', count: 1500 },
    { name: 'New Users (7 days)', count: 450 },
    { name: 'High Value', count: 890 },
  ];

  return (
    <AdminLayout title={t('admin.titles.marketingDashboard', 'Marketing Dashboard')}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.marketing.overview', 'Overview')}</Text>
          <View style={styles.statsGrid}>
            <StatCard title={t('admin.marketing.emailsSent', 'Emails Sent')} value={metrics.emailsSent.toLocaleString()} icon="✉️" color={colors.primary} />
            <StatCard title={t('admin.marketing.emailOpenRate', 'Email Open Rate')} value={`${metrics.emailOpenRate}%`} icon="📬" color={colors.success} trend={{ value: 2.3, isPositive: true }} />
            <StatCard title={t('admin.marketing.pushSent', 'Push Sent')} value={metrics.pushSent.toLocaleString()} icon="🔔" color={colors.secondary} />
            <StatCard title={t('admin.marketing.pushOpenRate', 'Push Open Rate')} value={`${metrics.pushOpenRate}%`} icon="👀" color={colors.warning} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.marketing.quickActions', 'Quick Actions')}</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('EmailCampaigns')}>
              <Text style={styles.actionIcon}>✉️</Text>
              <Text style={styles.actionTitle}>{t('admin.marketing.emailCampaigns', 'Email Campaigns')}</Text>
              <Text style={styles.actionDesc}>{t('admin.marketing.emailCampaignsDesc', 'Create and manage email campaigns')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('PushNotifications')}>
              <Text style={styles.actionIcon}>🔔</Text>
              <Text style={styles.actionTitle}>{t('admin.marketing.pushNotifications', 'Push Notifications')}</Text>
              <Text style={styles.actionDesc}>{t('admin.marketing.pushDesc', 'Send push notifications to users')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Campaigns */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('admin.marketing.recentCampaigns', 'Recent Campaigns')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmailCampaigns')}>
              <Text style={styles.viewAllLink}>{t('admin.marketing.viewAll', 'View All')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.campaignsList}>
            {recentCampaigns.map((campaign) => (
              <View key={campaign.id} style={styles.campaignItem}>
                <View style={styles.campaignIcon}>
                  <Text style={styles.campaignIconText}>{campaign.type === 'email' ? '✉️' : '🔔'}</Text>
                </View>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <View style={styles.campaignMeta}>
                    <View style={[styles.campaignStatus, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
                      <Text style={[styles.campaignStatusText, { color: getStatusColor(campaign.status) }]}>{campaign.status}</Text>
                    </View>
                    <Text style={styles.campaignType}>{campaign.type}</Text>
                  </View>
                </View>
                <View style={styles.campaignStats}>
                  <Text style={styles.campaignStatLabel}>{t('admin.marketing.sent', 'Sent')}</Text>
                  <Text style={styles.campaignStatValue}>{campaign.sent.toLocaleString()}</Text>
                </View>
                <View style={styles.campaignStats}>
                  <Text style={styles.campaignStatLabel}>{t('admin.marketing.opened', 'Opened')}</Text>
                  <Text style={styles.campaignStatValue}>
                    {campaign.sent > 0 ? `${((campaign.opened / campaign.sent) * 100).toFixed(1)}%` : '-'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Audience Segments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.marketing.audienceSegments', 'Audience Segments')}</Text>
          <View style={styles.segmentsList}>
            {segments.map((segment, index) => (
              <View key={index} style={styles.segmentItem}>
                <Text style={styles.segmentName}>{segment.name}</Text>
                <Text style={styles.segmentCount}>{segment.count.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.marketing.performance', 'Performance Metrics')}</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.emailClickRate}%</Text>
              <Text style={styles.metricLabel}>{t('admin.marketing.clickRate', 'Email Click Rate')}</Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricBarFill, { width: `${metrics.emailClickRate * 5}%` }]} />
              </View>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.conversionRate}%</Text>
              <Text style={styles.metricLabel}>{t('admin.marketing.conversionRate', 'Conversion Rate')}</Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricBarFill, { width: `${metrics.conversionRate * 10}%`, backgroundColor: colors.success }]} />
              </View>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.unsubscribeRate}%</Text>
              <Text style={styles.metricLabel}>{t('admin.marketing.unsubscribeRate', 'Unsubscribe Rate')}</Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricBarFill, { width: `${metrics.unsubscribeRate * 50}%`, backgroundColor: colors.error }]} />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md },
  viewAllLink: { fontSize: fontSize.sm, color: colors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionsGrid: { flexDirection: 'row', gap: spacing.md },
  actionCard: { flex: 1, backgroundColor: colors.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.lg, alignItems: 'center' },
  actionIcon: { fontSize: 32, marginBottom: spacing.sm },
  actionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  actionDesc: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  campaignsList: { backgroundColor: colors.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  campaignItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  campaignIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  campaignIconText: { fontSize: 18 },
  campaignInfo: { flex: 1 },
  campaignName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  campaignMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  campaignStatus: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  campaignStatusText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  campaignType: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'capitalize' },
  campaignStats: { alignItems: 'center', marginLeft: spacing.md, minWidth: 50 },
  campaignStatLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  campaignStatValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  segmentsList: { backgroundColor: colors.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  segmentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  segmentName: { fontSize: fontSize.sm, color: colors.text },
  segmentCount: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  metricsGrid: { flexDirection: 'row', gap: spacing.md },
  metricCard: { flex: 1, backgroundColor: colors.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.md },
  metricValue: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text },
  metricLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.sm },
  metricBar: { height: 6, backgroundColor: colors.backgroundLighter, borderRadius: 3, overflow: 'hidden' },
  metricBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
});

export default MarketingDashboardScreen;
