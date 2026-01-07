import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Mail, Bell, Users, TrendingUp } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { marketingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import logger from '@/utils/logger';

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
        <GlassButton title={t('common.retry', 'נסה שוב')} onPress={loadData} variant="primary" />
      </View>
    );
  }

  if (loading || !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading', 'טוען...')}</Text>
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
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.marketing', 'לוח שיווק')}</Text>
          <Text style={styles.subtitle}>סקירת קמפיינים וביצועים</Text>
        </View>
        <GlassButton title="רענן" variant="secondary" icon={<RefreshCw size={16} color={colors.text} />} onPress={handleRefresh} disabled={refreshing} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.marketing.emailMetrics', 'אימייל')}</Text>
        <View style={styles.statsGrid}>
          <StatCard title="נשלחו" value={metrics.emailsSent.toLocaleString()} icon="📧" color="primary" to="/admin/emails" />
          <StatCard title="שיעור פתיחה" value={`${metrics.emailOpenRate}%`} icon="📬" color="success" />
          <StatCard title="שיעור הקלקה" value={`${metrics.emailClickRate}%`} icon="🖱️" color="secondary" />
          <StatCard title="הסרת מנוי" value={`${metrics.unsubscribeRate}%`} icon="🚫" color={metrics.unsubscribeRate > 2 ? 'error' : 'success'} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.marketing.pushMetrics', 'התראות פוש')}</Text>
        <View style={styles.statsGrid}>
          <StatCard title="נשלחו" value={metrics.pushSent.toLocaleString()} icon="🔔" color="warning" to="/admin/push" />
          <StatCard title="שיעור פתיחה" value={`${metrics.pushOpenRate}%`} icon="👆" color="success" />
          <StatCard title="סגמנטים פעילים" value={metrics.activeSegments.toString()} icon="👥" color="primary" />
          <StatCard title="שיעור המרה" value={`${metrics.conversionRate}%`} icon="🎯" color="success" />
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.campaignsSection}>
          <Text style={styles.sectionTitle}>{t('admin.marketing.recentCampaigns', 'קמפיינים אחרונים')}</Text>
          <GlassCard style={styles.campaignsList}>
            {recentCampaigns.map((campaign) => (
              <View key={campaign.id} style={styles.campaignItem}>
                <View style={styles.campaignIcon}>
                  {campaign.type === 'email' ? <Mail size={18} color={colors.primary} /> : <Bell size={18} color={colors.warning} />}
                </View>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <Text style={styles.campaignStats}>
                    {campaign.sent.toLocaleString()} נשלחו • {campaign.opened.toLocaleString()} נפתחו
                  </Text>
                </View>
                <View style={[styles.campaignStatus, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
                  <Text style={[styles.campaignStatusText, { color: getStatusColor(campaign.status) }]}>
                    {campaign.status === 'active' ? 'פעיל' : campaign.status === 'completed' ? 'הושלם' : campaign.status === 'scheduled' ? 'מתוזמן' : 'טיוטה'}
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.segmentsSection}>
          <Text style={styles.sectionTitle}>{t('admin.marketing.audienceSegments', 'סגמנטי קהל')}</Text>
          <GlassCard style={styles.segmentsList}>
            {segments.map((segment, index) => (
              <View key={index} style={styles.segmentItem}>
                <View style={styles.segmentIcon}>
                  <Users size={18} color={colors.secondary} />
                </View>
                <View style={styles.segmentInfo}>
                  <Text style={styles.segmentName}>{segment.name}</Text>
                </View>
                <Text style={styles.segmentCount}>{segment.count.toLocaleString()}</Text>
              </View>
            ))}
          </GlassCard>
        </View>
      </View>

      <View style={styles.quickLinksSection}>
        <Text style={styles.sectionTitle}>{t('admin.marketing.quickActions', 'פעולות מהירות')}</Text>
        <View style={styles.quickLinks}>
          <Link to="/admin/emails" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <Mail size={24} color={colors.primary} />
              <Text style={styles.quickLinkText}>קמפייני אימייל</Text>
            </GlassCard>
          </Link>
          <Link to="/admin/push" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <Bell size={24} color={colors.warning} />
              <Text style={styles.quickLinkText}>התראות פוש</Text>
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
