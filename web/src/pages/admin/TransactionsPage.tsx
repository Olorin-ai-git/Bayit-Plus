import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Filter, Download } from 'lucide-react';
import { NativeIcon } from '@olorin/shared-icons/native';
import { billingService } from '@/services/adminApi';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassInput, GlassPageHeader } from '@bayit/shared/ui';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import StatCard from '@/components/admin/StatCard';
import logger from '@/utils/logger';

interface Transaction {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  type: 'subscription' | 'one-time' | 'refund';
  payment_method?: string;
  created_at: string;
  description?: string;
}

interface TransactionStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  total_amount: number;
}

const statusColors = {
  completed: { bg: 'rgba(34, 197, 94, 0.1)', text: colors.success.DEFAULT },
  pending: { bg: 'rgba(251, 191, 36, 0.1)', text: colors.warning },
  failed: { bg: 'rgba(239, 68, 68, 0.1)', text: colors.error.DEFAULT },
  refunded: { bg: 'rgba(107, 114, 128, 0.1)', text: colors.textMuted },
};

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadTransactions = useCallback(async () => {
    try {
      const filters: any = {
        page,
        page_size: pageSize,
      };

      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;

      const response = await billingService.getTransactions(filters);
      const items = Array.isArray(response) ? response : response?.items || [];
      const totalCount = Array.isArray(response) ? response.length : response?.total || 0;

      setTransactions(items.filter((item: any) => item != null));
      setTotal(totalCount);

      // Calculate stats
      const statsData: TransactionStats = {
        total: totalCount,
        completed: items.filter((t: Transaction) => t?.status === 'completed').length,
        pending: items.filter((t: Transaction) => t?.status === 'pending').length,
        failed: items.filter((t: Transaction) => t?.status === 'failed').length,
        total_amount: items
          .filter((t: Transaction) => t?.status === 'completed')
          .reduce((sum: number, t: Transaction) => sum + (t?.amount || 0), 0),
      };
      setStats(statsData);
    } catch (err: any) {
      const message = err?.message || 'Failed to load transactions';
      logger.error('Failed to load transactions', 'TransactionsPage', err);
      notifications.showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
  };

  const handleExport = async () => {
    try {
      notifications.showInfo(t('admin.transactions.exportStarted', 'Exporting transactions...'));
      // Export logic would go here
      notifications.showSuccess(t('admin.transactions.exportSuccess', 'Export completed'));
    } catch (err: any) {
      logger.error('Failed to export transactions', 'TransactionsPage', err);
      notifications.showError(t('admin.transactions.exportFailed', 'Export failed'));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  const pageConfig = ADMIN_PAGE_CONFIG.transactions;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.transactions.title', 'Transactions')}
        subtitle={t('admin.transactions.subtitle', 'View and manage payment transactions')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={stats?.total}
        isRTL={isRTL}
        action={
          <View style={[styles.headerActions, { flexDirection }]}>
            <GlassButton
              title={t('admin.transactions.export', 'Export')}
              variant="ghost"
              icon={<Download size={16} color="white" />}
              onPress={handleExport}
            />
            <GlassButton
              title={t('admin.dashboard.refresh', 'Refresh')}
              variant="ghost"
              icon={<RefreshCw size={16} color="white" />}
              onPress={handleRefresh}
              disabled={refreshing}
            />
          </View>
        }
      />

      {/* Stats */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.transactions.stats.total', 'Total')}
            value={stats.total.toString()}
            icon={<NativeIcon name="discover" size="md" color={colors.primary.DEFAULT} />}
            color="primary"
          />
          <StatCard
            title={t('admin.transactions.stats.completed', 'Completed')}
            value={stats.completed.toString()}
            icon={<NativeIcon name="info" size="md" color="#22C55E" />}
            color="success"
          />
          <StatCard
            title={t('admin.transactions.stats.pending', 'Pending')}
            value={stats.pending.toString()}
            icon={<NativeIcon name="discover" size="md" color="#F59E0B" />}
            color="warning"
          />
          <StatCard
            title={t('admin.transactions.stats.totalAmount', 'Total Amount')}
            value={formatCurrency(stats.total_amount)}
            icon={<NativeIcon name="discover" size="md" color="#8B5CF6" />}
            color="secondary"
          />
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersRow, { flexDirection }]}>
        <GlassInput
          placeholder={t('admin.transactions.search', 'Search transactions...')}
          value={searchQuery}
          onChangeText={(text) => { setSearchQuery(text); setPage(1); }}
          containerStyle={styles.searchInput}
        />
        <GlassButton
          title={t('common.filter', 'Filter')}
          variant="ghost"
          icon={<Filter size={16} color="white" />}
          onPress={() => setShowFilters(!showFilters)}
        />
      </View>

      {/* Filter Pills */}
      {showFilters && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>{t('admin.transactions.filterByStatus', 'Status')}:</Text>
          <View style={[styles.filterPills, { flexDirection }]}>
            {['all', 'completed', 'pending', 'failed', 'refunded'].map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterPill,
                  statusFilter === status && styles.filterPillActive,
                ]}
                onPress={() => { setStatusFilter(status); setPage(1); setShowFilters(false); }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    statusFilter === status && styles.filterPillTextActive,
                  ]}
                >
                  {t(`admin.transactions.status.${status}`, status)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterLabel}>{t('admin.transactions.filterByType', 'Type')}:</Text>
          <View style={[styles.filterPills, { flexDirection }]}>
            {['all', 'subscription', 'one-time', 'refund'].map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.filterPill,
                  typeFilter === type && styles.filterPillActive,
                ]}
                onPress={() => { setTypeFilter(type); setPage(1); setShowFilters(false); }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    typeFilter === type && styles.filterPillTextActive,
                  ]}
                >
                  {t(`admin.transactions.type.${type}`, type)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Transactions Table */}
      <GlassCard style={styles.tableCard}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { flexDirection }]}>
          <Text style={[styles.tableHeaderText, styles.colId]}>ID</Text>
          <Text style={[styles.tableHeaderText, styles.colUser]}>
            {t('admin.transactions.columns.user', 'User')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>
            {t('admin.transactions.columns.amount', 'Amount')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colType]}>
            {t('admin.transactions.columns.type', 'Type')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>
            {t('admin.transactions.columns.status', 'Status')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colDate]}>
            {t('admin.transactions.columns.date', 'Date')}
          </Text>
        </View>

        {/* Table Body */}
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('admin.transactions.noData', 'No transactions found')}
            </Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={[styles.tableRow, { flexDirection }]}>
              <Text style={[styles.idText, styles.colId]}>{transaction.id.slice(0, 8)}...</Text>
              <View style={styles.colUser}>
                <Text style={styles.userName}>{transaction.user_name || '-'}</Text>
                <Text style={styles.userEmail}>{transaction.user_email || '-'}</Text>
              </View>
              <Text style={[styles.amountText, styles.colAmount]}>
                {formatCurrency(transaction.amount)}
              </Text>
              <Text style={[styles.typeText, styles.colType]}>
                {t(`admin.transactions.type.${transaction.type}`, transaction.type)}
              </Text>
              <View style={styles.colStatus}>
                {transaction.status && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[transaction.status]?.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors[transaction.status]?.text },
                      ]}
                    >
                      {t(`admin.transactions.status.${transaction.status}`, transaction.status)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.dateText, styles.colDate]}>
                {formatDate(transaction.created_at)}
              </Text>
            </View>
          ))
        )}
      </GlassCard>

      {/* Pagination */}
      {total > pageSize && (
        <View style={[styles.pagination, { flexDirection }]}>
          <GlassButton
            title={t('common.previous', 'Previous')}
            variant="ghost"
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          />
          <Text style={styles.pageInfo}>
            {t('common.pageOf', `Page ${page} of ${Math.ceil(total / pageSize)}`)}
          </Text>
          <GlassButton
            title={t('common.next', 'Next')}
            variant="ghost"
            onPress={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
            disabled={page >= Math.ceil(total / pageSize)}
          />
        </View>
      )}
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
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  filtersRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
  },
  filtersSection: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterPillActive: {
    backgroundColor: colors.glassPurple,
    borderColor: colors.primary.DEFAULT,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: colors.primary.DEFAULT,
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  tableHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    alignItems: 'center',
  },
  colId: {
    flex: 1,
  },
  colUser: {
    flex: 2,
  },
  colAmount: {
    flex: 1,
  },
  colType: {
    flex: 1,
  },
  colStatus: {
    flex: 1,
  },
  colDate: {
    flex: 2,
  },
  idText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  userName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  typeText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  pageInfo: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
