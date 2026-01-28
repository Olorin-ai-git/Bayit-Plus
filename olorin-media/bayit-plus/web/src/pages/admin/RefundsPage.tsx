import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Check, X } from 'lucide-react';
import { NativeIcon } from '@olorin/shared-icons/native';
import { billingService } from '@/services/adminApi';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassPageHeader } from '@bayit/shared/ui';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';
import StatCard from '@/components/admin/StatCard';
import logger from '@/utils/logger';

interface Refund {
  id: string;
  transaction_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  processed_at?: string;
}

interface RefundStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount: number;
}

const statusColors = {
  pending: { bg: 'rgba(251, 191, 36, 0.1)', text: colors.warning },
  approved: { bg: 'rgba(34, 197, 94, 0.1)', text: colors.success.DEFAULT },
  rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: colors.error.DEFAULT },
  completed: { bg: 'rgba(107, 114, 128, 0.1)', text: colors.textMuted },
};

export default function RefundsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [stats, setStats] = useState<RefundStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadRefunds = useCallback(async () => {
    try {
      const filters: any = {
        page,
        page_size: pageSize,
      };

      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const response = await billingService.getRefunds(filters);
      const items = Array.isArray(response) ? response : response?.items || [];
      const totalCount = Array.isArray(response) ? response.length : response?.total || 0;

      setRefunds(items.filter((item: any) => item != null));
      setTotal(totalCount);

      // Calculate stats
      const statsData: RefundStats = {
        total: totalCount,
        pending: items.filter((r: Refund) => r?.status === 'pending').length,
        approved: items.filter((r: Refund) => r?.status === 'approved').length,
        rejected: items.filter((r: Refund) => r?.status === 'rejected').length,
        total_amount: items
          .filter((r: Refund) => r?.status === 'completed' || r?.status === 'approved')
          .reduce((sum: number, r: Refund) => sum + (r?.amount || 0), 0),
      };
      setStats(statsData);
    } catch (err: any) {
      const message = err?.message || 'Failed to load refunds';
      logger.error('Failed to load refunds', 'RefundsPage', err);
      notifications.showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRefunds();
  };

  const handleApproveRefund = async (id: string) => {
    try {
      await billingService.approveRefund(id);
      notifications.showSuccess(t('admin.refunds.approveSuccess', 'Refund approved'));
      loadRefunds();
    } catch (err: any) {
      logger.error('Failed to approve refund', 'RefundsPage', err);
      notifications.showError(t('admin.refunds.approveFailed', 'Failed to approve refund'));
    }
  };

  const handleRejectRefund = async (id: string) => {
    notifications.show({
      level: 'warning',
      message: t('admin.refunds.confirmReject', 'Are you sure you want to reject this refund?'),
      dismissable: true,
      action: {
        label: t('common.confirm', 'Confirm'),
        type: 'action',
        onPress: async () => {
          try {
            await billingService.rejectRefund(id);
            notifications.showSuccess(t('admin.refunds.rejectSuccess', 'Refund rejected'));
            loadRefunds();
          } catch (err: any) {
            logger.error('Failed to reject refund', 'RefundsPage', err);
            notifications.showError(t('admin.refunds.rejectFailed', 'Failed to reject refund'));
          }
        },
      },
    });
  };

  const handleViewDetails = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowDetailsModal(true);
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

  const pageConfig = ADMIN_PAGE_CONFIG.refunds;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.refunds.title', 'Refund Requests')}
        subtitle={t('admin.refunds.subtitle', 'Review and process refund requests')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={stats?.pending}
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
            title={t('admin.refunds.stats.total', 'Total')}
            value={stats.total.toString()}
            icon={<NativeIcon name="discover" size="md" color={colors.primary.DEFAULT} />}
            color="primary"
          />
          <StatCard
            title={t('admin.refunds.stats.pending', 'Pending')}
            value={stats.pending.toString()}
            icon={<NativeIcon name="discover" size="md" color="#F59E0B" />}
            color="warning"
          />
          <StatCard
            title={t('admin.refunds.stats.approved', 'Approved')}
            value={stats.approved.toString()}
            icon={<NativeIcon name="info" size="md" color="#22C55E" />}
            color="success"
          />
          <StatCard
            title={t('admin.refunds.stats.totalAmount', 'Total Amount')}
            value={formatCurrency(stats.total_amount)}
            icon={<NativeIcon name="discover" size="md" color="#8B5CF6" />}
            color="secondary"
          />
        </View>
      )}

      {/* Search and Filters */}
      <View style={[styles.filtersRow, { flexDirection }]}>
        <GlassInput
          placeholder={t('admin.refunds.search', 'Search refunds...')}
          value={searchQuery}
          onChangeText={(text) => { setSearchQuery(text); setPage(1); }}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Status Filter Pills */}
      <View style={[styles.filterPills, { flexDirection }]}>
        {['all', 'pending', 'approved', 'rejected', 'completed'].map((status) => (
          <Pressable
            key={status}
            style={[
              styles.filterPill,
              statusFilter === status && styles.filterPillActive,
            ]}
            onPress={() => { setStatusFilter(status); setPage(1); }}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === status && styles.filterPillTextActive,
              ]}
            >
              {t(`admin.refunds.status.${status}`, status)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Refunds Table */}
      <GlassCard style={styles.tableCard}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { flexDirection }]}>
          <Text style={[styles.tableHeaderText, styles.colId]}>ID</Text>
          <Text style={[styles.tableHeaderText, styles.colUser]}>
            {t('admin.refunds.columns.user', 'User')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>
            {t('admin.refunds.columns.amount', 'Amount')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colReason]}>
            {t('admin.refunds.columns.reason', 'Reason')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>
            {t('admin.refunds.columns.status', 'Status')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colDate]}>
            {t('admin.refunds.columns.date', 'Requested')}
          </Text>
          <Text style={[styles.tableHeaderText, styles.colActions]}>
            {t('common.actions', 'Actions')}
          </Text>
        </View>

        {/* Table Body */}
        {refunds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('admin.refunds.noData', 'No refund requests found')}
            </Text>
          </View>
        ) : (
          refunds.map((refund) => (
            <View key={refund.id} style={[styles.tableRow, { flexDirection }]}>
              <Text style={[styles.idText, styles.colId]}>{refund.id.slice(0, 8)}...</Text>
              <View style={styles.colUser}>
                <Text style={styles.userName}>{refund.user_name || '-'}</Text>
                <Text style={styles.userEmail}>{refund.user_email || '-'}</Text>
              </View>
              <Text style={[styles.amountText, styles.colAmount]}>
                {formatCurrency(refund.amount)}
              </Text>
              <Text style={[styles.reasonText, styles.colReason]} numberOfLines={1}>
                {refund.reason || '-'}
              </Text>
              <View style={styles.colStatus}>
                {refund.status && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[refund.status]?.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors[refund.status]?.text },
                      ]}
                    >
                      {t(`admin.refunds.status.${refund.status}`, refund.status)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.dateText, styles.colDate]}>
                {formatDate(refund.requested_at)}
              </Text>
              <View style={[styles.actionsRow, styles.colActions]}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleViewDetails(refund)}
                >
                  <Text style={styles.actionText}>View</Text>
                </Pressable>
                {refund.status === 'pending' && (
                  <>
                    <Pressable
                      style={[styles.actionButton, styles.successButton]}
                      onPress={() => handleApproveRefund(refund.id)}
                    >
                      <Check size={14} color={colors.success.DEFAULT} />
                      <Text style={styles.actionText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.dangerButton]}
                      onPress={() => handleRejectRefund(refund.id)}
                    >
                      <X size={14} color={colors.error.DEFAULT} />
                      <Text style={styles.actionText}>Reject</Text>
                    </Pressable>
                  </>
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
        title={t('admin.refunds.details', 'Refund Details')}
      >
        {selectedRefund && (
          <View style={styles.modalContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID:</Text>
              <Text style={styles.detailValue}>{selectedRefund.id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.refunds.columns.user', 'User')}:</Text>
              <Text style={styles.detailValue}>{selectedRefund.user_name || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('common.email', 'Email')}:</Text>
              <Text style={styles.detailValue}>{selectedRefund.user_email || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.refunds.columns.amount', 'Amount')}:</Text>
              <Text style={styles.detailValue}>{formatCurrency(selectedRefund.amount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.refunds.columns.status', 'Status')}:</Text>
              <Text style={styles.detailValue}>{selectedRefund.status}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.refunds.columns.reason', 'Reason')}:</Text>
              <Text style={styles.detailValue}>{selectedRefund.reason || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.refunds.columns.date', 'Requested')}:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedRefund.requested_at)}</Text>
            </View>
            {selectedRefund.processed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('admin.refunds.processedAt', 'Processed')}:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedRefund.processed_at)}</Text>
              </View>
            )}
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
  colId: {
    flex: 1,
  },
  colUser: {
    flex: 2,
  },
  colAmount: {
    flex: 1,
  },
  colReason: {
    flex: 2,
  },
  colStatus: {
    flex: 1,
  },
  colDate: {
    flex: 1.5,
  },
  colActions: {
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
  reasonText: {
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
