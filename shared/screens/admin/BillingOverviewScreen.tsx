/**
 * BillingOverviewScreen
 * Full billing dashboard with revenue metrics, charts, and transaction overview
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { billingService } from '../../services/adminApi';
import { Transaction } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const { width } = Dimensions.get('window');

interface BillingOverview {
  today: number;
  this_week: number;
  this_month: number;
  this_year: number;
  pending_refunds: number;
}

export const BillingOverviewScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [overviewData, transactionsData] = await Promise.all([
        billingService.getOverview(),
        billingService.getTransactions({ page: 1, page_size: 10 }),
      ]);
      setOverview(overviewData);
      setRecentTransactions(transactionsData.items);
    } catch (err) {
      console.error('Error loading billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      completed: colors.success,
      pending: colors.warning,
      failed: colors.error,
      refunded: colors.secondary,
    };
    return statusColors[status] || colors.textMuted;
  };

  const periods: { key: 'day' | 'week' | 'month' | 'year'; label: string }[] = [
    { key: 'day', label: t('admin.billing.today', 'Today') },
    { key: 'week', label: t('admin.billing.thisWeek', 'This Week') },
    { key: 'month', label: t('admin.billing.thisMonth', 'This Month') },
    { key: 'year', label: t('admin.billing.thisYear', 'This Year') },
  ];

  const getRevenue = () => {
    if (!overview) return 0;
    switch (selectedPeriod) {
      case 'day': return overview.today;
      case 'week': return overview.this_week;
      case 'month': return overview.this_month;
      case 'year': return overview.this_year;
    }
  };

  // Mock chart data
  const chartData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.floor(Math.random() * 5000) + 1000,
  }));

  const maxChartValue = Math.max(...chartData.map(d => d.value));

  return (
    <AdminLayout
      title={t('admin.titles.billingOverview', 'Billing Overview')}
      actions={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => {/* Export logic */}}
          >
            <Text style={styles.exportButtonText}>📥 {t('admin.billing.export', 'Export')}</Text>
          </TouchableOpacity>
        </View>
      }
    >
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
        {/* Revenue Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.billing.revenue', 'Revenue')}</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.billing.today', 'Today')}
              value={formatCurrency(overview?.today || 0)}
              icon="💰"
              color={colors.success}
              trend={{ value: 12.5, isPositive: true }}
            />
            <StatCard
              title={t('admin.billing.thisWeek', 'This Week')}
              value={formatCurrency(overview?.this_week || 0)}
              icon="📊"
              color={colors.primary}
              trend={{ value: 8.3, isPositive: true }}
            />
            <StatCard
              title={t('admin.billing.thisMonth', 'This Month')}
              value={formatCurrency(overview?.this_month || 0)}
              icon="📅"
              color={colors.secondary}
              trend={{ value: 15.2, isPositive: true }}
            />
            <StatCard
              title={t('admin.billing.thisYear', 'This Year')}
              value={formatCurrency(overview?.this_year || 0)}
              icon="📈"
              color={colors.warning}
            />
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>{t('admin.billing.revenueChart', 'Revenue Trend')}</Text>
            <View style={styles.periodSelector}>
              {periods.map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[styles.periodButton, selectedPeriod === period.key && styles.periodButtonActive]}
                  onPress={() => setSelectedPeriod(period.key)}
                >
                  <Text style={[styles.periodButtonText, selectedPeriod === period.key && styles.periodButtonTextActive]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.chartBars}>
              {chartData.map((data, index) => (
                <View key={index} style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: `${(data.value / maxChartValue) * 100}%` },
                    ]}
                  />
                  <Text style={styles.chartBarLabel}>{data.day}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartLegend}>
              <Text style={styles.chartLegendText}>
                {t('admin.billing.total', 'Total')}: {formatCurrency(chartData.reduce((sum, d) => sum + d.value, 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.billing.quickActions', 'Quick Actions')}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Transactions')}
            >
              <Text style={styles.quickActionIcon}>📋</Text>
              <Text style={styles.quickActionTitle}>{t('admin.billing.viewTransactions', 'Transactions')}</Text>
              <Text style={styles.quickActionDesc}>{t('admin.billing.viewAllTransactions', 'View all transactions')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Refunds')}
            >
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>{overview?.pending_refunds || 0}</Text>
              </View>
              <Text style={styles.quickActionIcon}>↩️</Text>
              <Text style={styles.quickActionTitle}>{t('admin.billing.refunds', 'Refunds')}</Text>
              <Text style={styles.quickActionDesc}>{t('admin.billing.manageRefunds', 'Manage refund requests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Subscriptions')}
            >
              <Text style={styles.quickActionIcon}>📦</Text>
              <Text style={styles.quickActionTitle}>{t('admin.billing.subscriptions', 'Subscriptions')}</Text>
              <Text style={styles.quickActionDesc}>{t('admin.billing.manageSubscriptions', 'Manage subscriptions')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('PlanManagement')}
            >
              <Text style={styles.quickActionIcon}>⚙️</Text>
              <Text style={styles.quickActionTitle}>{t('admin.billing.plans', 'Plans')}</Text>
              <Text style={styles.quickActionDesc}>{t('admin.billing.managePlans', 'Manage pricing plans')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('admin.billing.recentTransactions', 'Recent Transactions')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.viewAllLink}>{t('admin.billing.viewAll', 'View All')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Text style={styles.transactionIconText}>
                    {transaction.status === 'refunded' ? '↩️' : '💳'}
                  </Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description || 'Payment'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[styles.transactionAmountText, { color: getStatusColor(transaction.status) }]}>
                    {transaction.status === 'refunded' ? '-' : '+'}{formatCurrency(transaction.amount)}
                  </Text>
                  <View style={[styles.transactionStatus, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
                    <Text style={[styles.transactionStatusText, { color: getStatusColor(transaction.status) }]}>
                      {transaction.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Methods Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.billing.paymentMethods', 'Payment Methods')}</Text>
          <View style={styles.paymentMethodsList}>
            {[
              { method: 'Credit Card', percentage: 65, icon: '💳' },
              { method: 'PayPal', percentage: 20, icon: '🅿️' },
              { method: 'Apple Pay', percentage: 10, icon: '🍎' },
              { method: 'Google Pay', percentage: 5, icon: '🤖' },
            ].map((item, index) => (
              <View key={index} style={styles.paymentMethodItem}>
                <Text style={styles.paymentMethodIcon}>{item.icon}</Text>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>{item.method}</Text>
                  <View style={styles.paymentMethodBar}>
                    <View
                      style={[styles.paymentMethodBarFill, { width: `${item.percentage}%` }]}
                    />
                  </View>
                </View>
                <Text style={styles.paymentMethodPercentage}>{item.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  exportButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  viewAllLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    marginBottom: spacing.md,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 30,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chartLegend: {
    alignItems: 'flex-end',
  },
  chartLegendText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBadgeText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: 'bold',
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  quickActionDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  transactionStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  transactionStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  paymentMethodsList: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    width: 30,
    textAlign: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  paymentMethodName: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paymentMethodBar: {
    height: 6,
    backgroundColor: colors.backgroundLighter,
    borderRadius: 3,
    overflow: 'hidden',
  },
  paymentMethodBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  paymentMethodPercentage: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    width: 40,
    textAlign: 'right',
  },
});

export default BillingOverviewScreen;
