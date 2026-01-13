import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Mail, Bell, Users, TrendingUp } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { marketingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';
import { adminButtonStyles } from '@/styles/adminButtonStyles';

interface MarketingMetrics {
  emailsSent: number;
  emailOpenRate: number;
  emailClickRate: number;
  pushSent: number;
  pushOpenRate: number;
  activeSegments: number;
  conversionRate: number;
  unsubscribeRate: number;
}

interface RecentCampaign {
  id: string;
  name: string;
  type: 'email' | 'push';
  status: string;
  sent: number;
  opened: number;
  clicked: number;
}

interface AudienceSegment {
  name: string;
  count: number;
}

export default function MarketingDashboardPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [segments, setSegments] = useState<AudienceSegment[]>([]);

  const loadData = async () => {
    try {
      setError(null);
      const [metricsData, campaignsData, segmentsData] = await Promise.all([
        marketingService.getMetrics(),
        marketingService.getRecentCampaigns(5),
        marketingService.getAudienceSegments(),
      ]);
      setMetrics(metricsData);
      setRecentCampaigns(campaignsData);
      setSegments(segmentsData);
    } catch (err: any) {
      const message = err?.message || 'Failed to load marketing data';
      setError(message);
      logger.error('Failed to load marketing data', 'MarketingDashboardPage', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton title={t('common.retry')} onPress={loadData} variant="secondary" style={adminButtonStyles.primaryButton} textStyle={adminButtonStyles.buttonText} />
      </View>
    );
  }

  if (loading || !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'completed': return '#8B5CF6';
      case 'scheduled': return colors.warning;
      default: return colors.textMuted;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.marketing')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.marketingDashboard.subtitle')}</Text>
        </View>
        <GlassButton title={t('admin.marketingDashboard.refresh')} variant="secondary" icon={<RefreshCw size={16} color={colors.text} />} onPress={handleRefresh} disabled={refreshing} style={adminButtonStyles.secondaryButton} textStyle={adminButtonStyles.buttonText} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.marketing.emailMetrics')}</Text>
        <View style={styles.statsGrid}>
          <StatCard title={t('admin.marketingDashboard.sent', { defaultValue: 'Sent' })} value={metrics.emailsSent.toLocaleString()} icon="📧" color="primary" to="/admin/emails" />
          <StatCard title={t('admin.marketingDashboard.emailOpenRate')} value={`${metrics.emailOpenRate}%`} icon="📬" color="success" />
          <StatCard title={t('admin.marketingDashboard.clickRate', { defaultValue: 'Click Rate' })} value={`${metrics.emailClickRate}%`} icon="🖱️" color="secondary" />
          <StatCard title={t('admin.marketingDashboard.unsubscribeRate', { defaultValue: 'Unsubscribe Rate' })} value={`${metrics.unsubscribeRate}%`} icon="🚫" color={metrics.unsubscribeRate > 2 ? 'error' : 'success'} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.marketing.pushMetrics')}</Text>
        <View style={styles.statsGrid}>
          <StatCard title={t('admin.marketingDashboard.sent', { defaultValue: 'Sent' })} value={metrics.pushSent.toLocaleString()} icon="🔔" color="warning" to="/admin/push" />
          <StatCard title={t('admin.marketingDashboard.openRate', { defaultValue: 'Open Rate' })} value={`${metrics.pushOpenRate}%`} icon="👆" color="success" />
          <StatCard title={t('admin.marketingDashboard.activeSegments')} value={metrics.activeSegments.toString()} icon="👥" color="primary" />
          <StatCard title={t('admin.marketingDashboard.conversionRate', { defaultValue: 'Conversion Rate' })} value={`${metrics.conversionRate}%`} icon="🎯" color="success" />
        </View>
      </View>

      <View style={[styles.bottomSection, { flexDirection }]}>
        <View style={styles.campaignsSection}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.marketing.recentCampaigns')}</Text>
          <GlassCard style={styles.campaignsList}>
            {recentCampaigns.map((campaign) => (
              <View key={campaign.id} style={[styles.campaignItem, { flexDirection }]}>
                <View style={styles.campaignIcon}>
                  {campaign.type === 'email' ? <Mail size={18} color={colors.primary} /> : <Bell size={18} color={colors.warning} />}
                </View>
                <View style={styles.campaignInfo}>
                  <Text style={[styles.campaignName, { textAlign }]}>{campaign.name}</Text>
                  <Text style={[styles.campaignStats, { textAlign }]}>
                    {campaign.sent.toLocaleString()} {t('admin.emailCampaigns.columns.sent').toLowerCase()} • {campaign.opened.toLocaleString()} {t('admin.emailCampaigns.columns.opened').toLowerCase()}
                  </Text>
                </View>
                <View style={[styles.campaignStatus, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
                  <Text style={[styles.campaignStatusText, { color: getStatusColor(campaign.status) }]}>
                    {t(`admin.marketingDashboard.campaignStatus.${campaign.status}`, { defaultValue: campaign.status })}
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.segmentsSection}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.marketing.audienceSegments')}</Text>
          <GlassCard style={styles.segmentsList}>
            {segments.map((segment, index) => (
              <View key={index} style={[styles.segmentItem, { flexDirection }]}>
                <View style={styles.segmentIcon}>
                  <Users size={18} color={colors.secondary} />
                </View>
                <View style={styles.segmentInfo}>
                  <Text style={[styles.segmentName, { textAlign }]}>{segment.name}</Text>
                </View>
                <Text style={styles.segmentCount}>{segment.count.toLocaleString()}</Text>
              </View>
            ))}
          </GlassCard>
        </View>
      </View>

      <View style={styles.quickLinksSection}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.marketing.quickActions')}</Text>
        <View style={[styles.quickLinks, { flexDirection }]}>
          <Link to="/admin/emails" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <Mail size={24} color={colors.primary} />
              <Text style={styles.quickLinkText}>{t('admin.nav.emailCampaigns')}</Text>
            </GlassCard>
          </Link>
          <Link to="/admin/push" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <Bell size={24} color={colors.warning} />
              <Text style={styles.quickLinkText}>{t('admin.nav.pushNotifications')}</Text>
            </GlassCard>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  loadingText: { fontSize: 14, color: colors.textMuted },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorIcon: { fontSize: 48, marginBottom: spacing.md },
  errorText: { fontSize: 16, color: colors.error, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  bottomSection: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  campaignsSection: { flex: 2 },
  campaignsList: { padding: 0 },
  campaignItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  campaignIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  campaignInfo: { flex: 1 },
  campaignName: { fontSize: 14, fontWeight: '500', color: colors.text },
  campaignStats: { fontSize: 12, color: colors.textMuted },
  campaignStatus: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  campaignStatusText: { fontSize: 12, fontWeight: '500' },
  segmentsSection: { flex: 1 },
  segmentsList: { padding: 0 },
  segmentItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  segmentIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  segmentInfo: { flex: 1 },
  segmentName: { fontSize: 14, color: colors.text },
  segmentCount: { fontSize: 14, fontWeight: '600', color: colors.primary },
  quickLinksSection: { marginTop: spacing.md },
  quickLinks: { flexDirection: 'row', gap: spacing.md },
  quickLinkCard: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  quickLinkText: { fontSize: 14, fontWeight: '500', color: colors.text },
});
