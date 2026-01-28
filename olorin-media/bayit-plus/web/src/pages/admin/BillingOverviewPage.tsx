import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CreditCard, AlertCircle, DollarSign } from 'lucide-react';
import { NativeIcon } from '@olorin/shared-icons/native';
import StatCard from '@/components/admin/StatCard';
import { billingService, subscriptionsService } from '@/services/adminApi';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassPageHeader } from '@bayit/shared/ui';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

export default function BillingOverviewPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [churnData, setChurnData] = useState<ChurnAnalytics | null>(null);

  const loadData = useCallback(async () => {
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
      notifications.showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !overview) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <NativeIcon name="discover" size="xl" color={colors.error.DEFAULT} />
        <Text style={styles.errorText}>{error}</Text>
        <GlassButton
          title={t('common.retry', 'Retry')}
          onPress={loadData}
          variant="primary"
        />
      </View>
    );
  }

  const pageConfig = ADMIN_PAGE_CONFIG.billing;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.billing.title', 'Billing & Revenue')}
        subtitle={t('admin.billing.subtitle', 'Overview of revenue, transactions, and refunds')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={formatCurrency(overview.total_transactions)}
        isRTL={isRTL}
        action={
          <GlassButton
            title={t('admin.dashboard.refresh', 'Refresh')}
            variant="ghost"
            icon={<RefreshCw size={16} color="white" />}
            onPress={handleRefresh}
            disabled={refreshing}
          />
        }
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('admin.billing.revenue', 'Revenue')}
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.billing.today', 'Today')}
            value={formatCurrency(overview.today)}
            icon={<NativeIcon name="discover" size="md" color="#22C55E" />}
            color="success"
          />
          <StatCard
            title={t('admin.billing.thisWeek', 'This Week')}
            value={formatCurrency(overview.this_week)}
            icon={<NativeIcon name="discover" size="md" color={colors.primary.DEFAULT} />}
            color="primary"
          />
          <StatCard
            title={t('admin.billing.thisMonth', 'This Month')}
            value={formatCurrency(overview.this_month)}
            icon={<NativeIcon name="discover" size="md" color="#8B5CF6" />}
            color="secondary"
          />
          <StatCard
            title={t('admin.billing.thisYear', 'This Year')}
            value={formatCurrency(overview.this_year)}
            icon={<NativeIcon name="discover" size="md" color="#F59E0B" />}
            color="warning"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('admin.billing.metrics', 'Transaction Metrics')}
        </Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.billing.totalTransactions', 'Total Transactions')}
            value={overview.total_transactions?.toLocaleString() || '0'}
            icon={<NativeIcon name="discover" size="md" color={colors.primary.DEFAULT} />}
            color="primary"
            to="/admin/transactions"
          />
          <StatCard
            title={t('admin.billing.avgTransaction', 'Avg Transaction')}
            value={formatCurrency(overview.avg_transaction || 0)}
            icon={<NativeIcon name="discover" size="md" color="#8B5CF6" />}
            color="secondary"
          />
          <StatCard
            title={t('admin.billing.pendingRefunds', 'Pending Refunds')}
            value={overview.pending_refunds.toString()}
            icon={<NativeIcon name="discover" size="md" color="#F59E0B" />}
            color={overview.pending_refunds > 0 ? 'warning' : 'success'}
            to="/admin/refunds"
          />
          <StatCard
            title={t('admin.billing.refundRate', 'Refund Rate')}
            value={`${overview.refund_rate || 0}%`}
            icon={<NativeIcon name="discover" size="md" color={overview.refund_rate > 5 ? '#EF4444' : '#22C55E'} />}
            color={overview.refund_rate > 5 ? 'error' : 'success'}
          />
        </View>
      </View>

      {churnData && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('admin.billing.retention', 'Customer Retention')}
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.billing.retentionRate', 'Retention Rate')}
              value={`${churnData.retention_rate}%`}
              icon={<NativeIcon name="discover" size="md" color="#22C55E" />}
              color="success"
            />
            <StatCard
              title={t('admin.billing.churnRate', 'Churn Rate')}
              value={`${churnData.churn_rate}%`}
              icon={<NativeIcon name="discover" size="md" color={churnData.churn_rate > 5 ? '#EF4444' : '#22C55E'} />}
              color={churnData.churn_rate > 5 ? 'error' : 'success'}
            />
            <StatCard
              title={t('admin.billing.atRiskUsers', 'At Risk Users')}
              value={churnData.at_risk_users.toString()}
              icon={<NativeIcon name="discover" size="md" color="#F59E0B" />}
              color="warning"
            />
            <StatCard
              title={t('admin.billing.churnedUsers', 'Churned Users')}
              value={churnData.churned_users.toString()}
              icon="👋"
              color="error"
            />
          </View>
        </View>
      )}

      <View style={styles.quickLinksSection}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('admin.billing.quickLinks', 'Quick Links')}
        </Text>
        <View style={styles.quickLinks}>
          <Link to="/admin/transactions" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <CreditCard size={24} color={colors.primary.DEFAULT} />
              <Text style={styles.quickLinkText}>
                {t('admin.nav.transactions', 'Transactions')}
              </Text>
            </GlassCard>
          </Link>
          <Link to="/admin/refunds" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <AlertCircle size={24} color={colors.warning} />
              <Text style={styles.quickLinkText}>
                {t('admin.nav.refunds', 'Refunds')}
              </Text>
            </GlassCard>
          </Link>
          <Link to="/admin/plans" style={{ textDecoration: 'none', flex: 1 }}>
            <GlassCard style={styles.quickLinkCard}>
              <DollarSign size={24} color={colors.success.DEFAULT} />
              <Text style={styles.quickLinkText}>
                {t('admin.nav.plans', 'Plans')}
              </Text>
            </GlassCard>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error.DEFAULT,
    textAlign: 'center',
  },
  header: {
    marginBottom: spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickLinksSection: {
    marginTop: spacing.lg,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickLinkCard: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 120,
    justifyContent: 'center',
  },
  quickLinkText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});
