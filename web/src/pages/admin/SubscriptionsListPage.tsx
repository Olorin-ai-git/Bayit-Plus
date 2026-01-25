import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Filter, X } from 'lucide-react';
import { subscriptionsService } from '@/services/adminApi';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassPageHeader } from '@bayit/shared/ui';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import StatCard from '@/components/admin/StatCard';
import logger from '@/utils/logger';

interface User {
  id: string;
  name?: string;
  email?: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  next_billing?: string;
  created_at?: string;
}

interface SubscriptionWithUser extends Subscription {
  user: User;
}

interface SubscriptionsStats {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  expired: number;
  revenue_this_month: number;
}

const statusColors = {
  active: { bg: 'rgba(34, 197, 94, 0.1)', text: colors.success.DEFAULT },
  paused: { bg: 'rgba(251, 191, 36, 0.1)', text: colors.warning },
  cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: colors.error.DEFAULT },
  expired: { bg: 'rgba(107, 114, 128, 0.1)', text: colors.textMuted },
};

export default function SubscriptionsListPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();

  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [stats, setStats] = useState<SubscriptionsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadSubscriptions = useCallback(async () => {
    try {
      setError(null);
      const filters: any = {
        page,
        page_size: pageSize,
      };

      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const response = await subscriptionsService.getSubscriptions(filters);
      const items = Array.isArray(response) ? response : response?.items || [];
      const totalCount = Array.isArray(response) ? response.length : response?.total || 0;

      // Filter out any null/undefined items
      setSubscriptions(items.filter((item: any) => item != null));
      setTotal(totalCount);

      // Calculate stats from data
      const statsData: SubscriptionsStats = {
        total: totalCount,
        active: items.filter((s: SubscriptionWithUser) => s?.status === 'active').length,
        paused: items.filter((s: SubscriptionWithUser) => s?.status === 'paused').length,
        cancelled: items.filter((s: SubscriptionWithUser) => s?.status === 'cancelled').length,
        expired: items.filter((s: SubscriptionWithUser) => s?.status === 'expired').length,
        revenue_this_month: items
          .filter((s: SubscriptionWithUser) => s?.status === 'active')
          .reduce((sum: number, s: SubscriptionWithUser) => sum + (s?.amount || 0), 0),
      };
      setStats(statsData);
    } catch (err: any) {
      const message = err?.message || 'Failed to load subscriptions';
      setError(message);
      logger.error('Failed to load subscriptions', 'SubscriptionsListPage', err);
      notifications.showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
    setShowFilters(false);
  };

  const handleViewDetails = (subscription: SubscriptionWithUser) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  const handlePauseSubscription = async (id: string) => {
    try {
      await subscriptionsService.pauseSubscription(id);
      notifications.showSuccess(t('admin.subscriptions.pauseSuccess', 'Subscription paused'));
      loadSubscriptions();
    } catch (err: any) {
      logger.error('Failed to pause subscription', 'SubscriptionsListPage', err);
      notifications.showError(t('admin.subscriptions.pauseFailed', 'Failed to pause subscription'));
    }
  };

  const handleResumeSubscription = async (id: string) => {
    try {
      await subscriptionsService.resumeSubscription(id);
      notifications.showSuccess(t('admin.subscriptions.resumeSuccess', 'Subscription resumed'));
      loadSubscriptions();
    } catch (err: any) {
      logger.error('Failed to resume subscription', 'SubscriptionsListPage', err);
      notifications.showError(t('admin.subscriptions.resumeFailed', 'Failed to resume subscription'));
    }
  };

  const handleCancelSubscription = async (id: string) => {
    notifications.show({
      level: 'warning',
      message: t('admin.subscriptions.confirmCancel', 'Are you sure you want to cancel this subscription?'),
      dismissable: true,
      action: {
        label: t('common.cancel', 'Cancel'),
        type: 'action',
        onPress: async () => {
          try {
            await subscriptionsService.cancelSubscription(id);
            notifications.showSuccess(t('admin.subscriptions.cancelSuccess', 'Subscription cancelled'));
            loadSubscriptions();
          } catch (err: any) {
            logger.error('Failed to cancel subscription', 'SubscriptionsListPage', err);
            notifications.showError(t('admin.subscriptions.cancelFailed', 'Failed to cancel subscription'));
          }
        },
      },
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  const pageConfig = ADMIN_PAGE_CONFIG.subscriptions;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.subscriptions.title', 'Subscriptions')}
        subtitle={t('admin.subscriptions.subtitle', 'View and manage system subscribers')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={stats?.total}
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

      {/* Stats */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard
            title={t('admin.subscriptions.stats.total', 'Total')}
            value={stats.total.toString()}
            icon="📊"
            color="primary"
          />
          <StatCard
            title={t('admin.subscriptions.stats.active', 'Active')}
            value={stats.active.toString()}
            icon="✅"
            color="success"
          />
          <StatCard
            title={t('admin.subscriptions.stats.paused', 'Paused')}
            value={stats.paused.toString()}
            icon="⏸"
            color="warning"
          />
          <StatCard
            title={t('admin.subscriptions.stats.revenue', 'Monthly Revenue')}
            value={formatCurrency(stats.revenue_this_month)}
            icon="💰"
            color="secondary"
          />
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersRow, { flexDirection }]}>
        <GlassInput
          placeholder={t('admin.subscriptions.search', 'Search subscriptions...')}
          value={searchQuery}
          onChangeText={handleSearch}
          containerStyle={styles.searchInput}
        />
        <GlassButton
          title={t('common.filter', 'Filter')}
          variant="ghost"
          icon={<Filter size={16} color="white" />}
          onPress={() => setShowFilters(!showFilters)}
        />
      </View>

      {/* Status Filter Pills */}
      {showFilters && (
        <View style={[styles.filterPills, { flexDirection }]}>
          {['all', 'active', 'paused', 'cancelled', 'expired'].map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterPill,
                statusFilter === status && styles.filterPillActive,
              ]}
              onPress={() => handleStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === status && styles.filterPillTextActive,
                ]}
              >
                {t(`admin.subscriptions.filters.${status}`, status)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Subscriptions Table */}
      <GlassCard style={styles.tableCard}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { flexDirection }]}>
          <Text style={[styles.tableHeaderText, styles.colUser]}>
            {t('admin.subscriptions.columns.user', 'User')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colPlan]}>
            {t('admin.subscriptions.columns.plan', 'Plan')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>
            {t('admin.subscriptions.columns.amount', 'Amount')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>
            {t('admin.subscriptions.columns.status', 'Status')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colNextBilling]}>
            {t('admin.subscriptions.columns.nextBilling', 'Next Billing')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colActions]}>
            {t('common.actions', 'Actions')}
          </Text>
        </View>

        {/* Table Body */}
        {subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('admin.subscriptions.noData', 'No subscriptions found')}
            </Text>
          </View>
        ) : (
          subscriptions.map((subscription) => (
            <View key={subscription.id} style={[styles.tableRow, { flexDirection }]}>
              <View style={styles.colUser}>
                <Text style={styles.userName}>{subscription.user?.name || '-'}</Text>
                <Text style={styles.userEmail}>{subscription.user?.email || '-'}</Text>
              </View>
              <Text style={[styles.planText, styles.colPlan]}>{subscription.plan || '-'}</Text>
              <Text style={[styles.amountText, styles.colAmount]}>
                {formatCurrency(subscription.amount)}
              </Text>
              <View style={styles.colStatus}>
                {subscription.status && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[subscription.status]?.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors[subscription.status]?.text },
                      ]}
                    >
                      {t(`admin.subscriptions.status.${subscription.status}`, subscription.status)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.dateText, styles.colNextBilling]}>
                {formatDate(subscription.next_billing || '')}
              </Text>
              <View style={[styles.actionsRow, styles.colActions]}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleViewDetails(subscription)}
                >
                  <Text style={styles.actionText}>View</Text>
                </Pressable>
                {subscription.status === 'active' && (
                  <Pressable
                    style={[styles.actionButton, styles.warningButton]}
                    onPress={() => handlePauseSubscription(subscription.id)}
                  >
                    <Text style={styles.actionText}>Pause</Text>
                  </Pressable>
                )}
                {subscription.status === 'paused' && (
                  <Pressable
                    style={[styles.actionButton, styles.successButton]}
                    onPress={() => handleResumeSubscription(subscription.id)}
                  >
                    <Text style={styles.actionText}>Resume</Text>
                  </Pressable>
                )}
                {subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
                  <Pressable
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={() => handleCancelSubscription(subscription.id)}
                  >
                    <Text style={styles.actionText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
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

      {/* Details Modal */}
      <GlassModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={t('admin.subscriptions.details', 'Subscription Details')}
      >
        {selectedSubscription && (
          <View style={styles.modalContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.subscriptions.columns.user', 'User')}:</Text>
              <Text style={styles.detailValue}>{selectedSubscription.user?.name || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('common.email', 'Email')}:</Text>
              <Text style={styles.detailValue}>{selectedSubscription.user?.email || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.subscriptions.columns.plan', 'Plan')}:</Text>
              <Text style={styles.detailValue}>{selectedSubscription.plan}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.subscriptions.columns.amount', 'Amount')}:</Text>
              <Text style={styles.detailValue}>{formatCurrency(selectedSubscription.amount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.subscriptions.columns.status', 'Status')}:</Text>
              <Text style={styles.detailValue}>{selectedSubscription.status}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('admin.subscriptions.columns.nextBilling', 'Next Billing')}:
              </Text>
              <Text style={styles.detailValue}>{formatDate(selectedSubscription.next_billing || '')}</Text>
            </View>
            <View style={styles.modalActions}>
              <GlassButton
                title={t('common.close', 'Close')}
                variant="ghost"
                onPress={() => setShowDetailsModal(false)}
              />
            </View>
          </View>
        )}
      </GlassModal>
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
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  colUser: {
    flex: 2,
  },
  colPlan: {
    flex: 1,
  },
  colAmount: {
    flex: 1,
  },
  colStatus: {
    flex: 1,
  },
  colNextBilling: {
    flex: 1,
  },
  colActions: {
    flex: 2,
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
  planText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  amountText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  warningButton: {
    borderColor: colors.warning,
  },
  successButton: {
    borderColor: colors.success.DEFAULT,
  },
  dangerButton: {
    borderColor: colors.error.DEFAULT,
  },
  actionText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '500',
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
  modalContent: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  modalActions: {
    marginTop: spacing.md,
  },
});
