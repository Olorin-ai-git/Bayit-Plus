import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CreditCard, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { billingService, subscriptionsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface BillingOverview {
  today: number;
  this_week: number;
  this_month: number;
  this_year: number;
  pending_refunds: number;
  total_transactions: number;
  avg_transaction: number;
  refund_rate: number;
}

interface ChurnAnalytics {
  churn_rate: number;
  churned_users: number;
  at_risk_users: number;
  retention_rate: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function BillingOverviewPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [churnData, setChurnData] = useState<ChurnAnalytics | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [overviewData, churn] = await Promise.all([
        billingService.getOverview(),
        subscriptionsService.getChurnAnalytics(),
      ]);
      setOverview(overviewData);
      setChurnData(churn);
    } catch (err: any) {
      const message = err?.message || 'Failed to load billing data';
      setError(message);
      logger.error('Failed to load billing data', 'BillingOverviewPage', err);
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

  if (loading || !overview) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading', 'טוען...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.billing', 'סקירת חיובים')}</Text>
          <Text style={styles.subtitle}>מעקב אחר הכנסות ותשלומים</Text>
        </View>
        <View style={styles.headerActions}>
          <GlassButton
            title="רענן"
            variant="secondary"
            icon={<RefreshCw size={16} color={colors.text} />}
            onPress={handleRefresh}
            disabled={refreshing}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.billing.revenue', 'הכנסות')}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.billing.today', 'היום')}
            value={formatCurrency(overview.today)}
            icon="💵"
            color="success"
          />
          <StatCard
            title={t('admin.billing.thisWeek', 'השבוע')}
            value={formatCurrency(overview.this_week)}
            icon="📅"
            color="primary"
          />
          <StatCard
            title={t('admin.billing.thisMonth', 'החודש')}
            value={formatCurrency(overview.this_month)}
            icon="📊"
            color="secondary"
          />
          <StatCard
            title={t('admin.billing.thisYear', 'השנה')}
            value={formatCurrency(overview.this_year)}
            icon="📈"
            color="warning"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.billing.metrics', 'מדדים')}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.billing.totalTransactions', 'סה״כ עסקאות')}
            value={overview.total_transactions?.toLocaleString() || '0'}
            icon="💳"
            color="primary"
            to="/admin/transactions"
          />
          <StatCard
            title={t('admin.billing.avgTransaction', 'ממוצע עסקה')}
            value={formatCurrency(overview.avg_transaction || 0)}
            icon="📉"
            color="secondary"
          />
          <StatCard
            title={t('admin.billing.pendingRefunds', 'החזרים בהמתנה')}
            value={overview.pending_refunds.toString()}
            icon="⏳"
            color={overview.pending_refunds > 0 ? 'warning' : 'success'}
            to="/admin/refunds"
          />
          <StatCard
            title={t('admin.billing.refundRate', 'אחוז החזרים')}
            value={`${overview.refund_rate || 0}%`}
            icon="↩️"
            color={overview.refund_rate > 5 ? 'error' : 'success'}
          />
        </View>
      </View>

      {churnData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.billing.retention', 'שימור לקוחות')}</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.billing.retentionRate', 'שיעור שימור')}
              value={`${churnData.retention_rate}%`}
              icon="🎯"
              color="success"
            />
            <StatCard
              title={t('admin.billing.churnRate', 'שיעור נטישה')}
              value={`${churnData.churn_rate}%`}
              icon="📉"
              color={churnData.churn_rate > 5 ? 'error' : 'success'}
            />
            <StatCard
              title={t('admin.billing.atRiskUsers', 'משתמשים בסיכון')}
              value={churnData.at_risk_users.toString()}
              icon="⚠️"
              color="warning"
            />
            <StatCard
              title={t('admin.billing.churnedUsers', 'עזבו החודש')}
              value={churnData.churned_users.toString()}
              icon="👋"
              color="error"
            />
          </View>
        </View>
      )}

      <View style={styles.quickLinksSection}>
        <Text style={styles.sectionTitle}>{t('admin.billing.quickLinks', 'קישורים מהירים')}</Text>
        <View style={styles.quickLinks}>
          <Link to="/admin/transactions" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <CreditCard size={24} color={colors.primary} />
              <Text style={styles.quickLinkText}>{t('admin.nav.transactions', 'עסקאות')}</Text>
            </GlassCard>
          </Link>
          <Link to="/admin/refunds" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <AlertCircle size={24} color={colors.warning} />
              <Text style={styles.quickLinkText}>{t('admin.nav.refunds', 'החזרים')}</Text>
            </GlassCard>
          </Link>
          <Link to="/admin/plans" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <DollarSign size={24} color={colors.success} />
              <Text style={styles.quickLinkText}>{t('admin.nav.plans', 'תוכניות')}</Text>
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
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickLinksSection: { marginTop: spacing.md },
  quickLinks: { flexDirection: 'row', gap: spacing.md },
  quickLinkCard: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  quickLinkText: { fontSize: 14, fontWeight: '500', color: colors.text },
});
