/**
 * RefundsScreen
 * Refund management with approval workflow
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminLayout, DataTable, Column } from '@bayit/shared/admin';
import { billingService, BillingFilter } from '../../services/adminApi';
import { Refund } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor } from '../../utils/adminConstants';

export const RefundsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRefunds, setTotalRefunds] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [filters, setFilters] = useState<BillingFilter>({
    status: '',
    page: 1,
    page_size: 20,
  });

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await billingService.getRefunds({ ...filters, status: statusFilter });
      setRefunds(response.items);
      setTotalRefunds(response.total);
    } catch (err) {
      console.error('Error loading refunds:', err);
      setError(err instanceof Error ? err.message : 'Failed to load refunds');
      setRefunds([]);
      setTotalRefunds(0);
    } finally {
      setLoading(false);
    }
  }, [filters, statusFilter]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleApprove = async (refund: Refund) => {
    Alert.alert(
      t('admin.refunds.approveConfirm', 'Approve Refund'),
      t('admin.refunds.approveMessage', `Approve refund of $${refund.amount.toFixed(2)}?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('admin.refunds.approve', 'Approve'),
          onPress: async () => {
            try {
              await billingService.approveRefund(refund.id);
              loadRefunds();
              Alert.alert(t('admin.refunds.approved', 'Approved'), t('admin.refunds.approvedMessage', 'Refund has been approved.'));
            } catch (error) {
              console.error('Error approving refund:', error);
            }
          },
        },
      ]
    );
  };

  const handleReject = (refund: Refund) => {
    setSelectedRefund(refund);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRefund || !rejectReason.trim()) {
      Alert.alert(t('common.error', 'Error'), t('admin.refunds.reasonRequired', 'Rejection reason is required'));
      return;
    }

    try {
      await billingService.rejectRefund(selectedRefund.id, rejectReason);
      setShowRejectModal(false);
      loadRefunds();
      Alert.alert(t('admin.refunds.rejected', 'Rejected'), t('admin.refunds.rejectedMessage', 'Refund has been rejected.'));
    } catch (error) {
      console.error('Error rejecting refund:', error);
    }
  };

  const columns: Column<Refund>[] = [
    {
      key: 'id',
      header: t('admin.refunds.columns.id', 'Refund ID'),
      width: 120,
      render: (refund) => <Text style={styles.idText}>{refund.id.slice(0, 10)}...</Text>,
    },
    {
      key: 'transaction_id',
      header: t('admin.refunds.columns.transaction', 'Transaction'),
      width: 120,
      render: (refund) => <Text style={styles.transactionText}>{refund.transaction_id.slice(0, 10)}...</Text>,
    },
    {
      key: 'amount',
      header: t('admin.refunds.columns.amount', 'Amount'),
      width: 100,
      align: 'right',
      render: (refund) => <Text style={styles.amountText}>{formatCurrency(refund.amount)}</Text>,
    },
    {
      key: 'reason',
      header: t('admin.refunds.columns.reason', 'Reason'),
      width: 200,
      render: (refund) => <Text style={styles.reasonText} numberOfLines={2}>{refund.reason}</Text>,
    },
    {
      key: 'status',
      header: t('admin.refunds.columns.status', 'Status'),
      width: 100,
      render: (refund) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(refund.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(refund.status) }]}>{refund.status}</Text>
        </View>
      ),
    },
    {
      key: 'created_at',
      header: t('admin.refunds.columns.requested', 'Requested'),
      width: 160,
      render: (refund) => <Text style={styles.dateText}>{formatDate(refund.created_at)}</Text>,
    },
  ];

  const renderActions = (refund: Refund) => (
    <View style={styles.actionsRow}>
      {refund.status === 'pending' && (
        <>
          <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleApprove(refund)}>
            <Text style={styles.actionIcon}>✅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleReject(refund)}>
            <Text style={styles.actionIcon}>❌</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const headerActions = (
    <View style={styles.statusFilters}>
      {['', 'pending', 'approved', 'rejected'].map((status) => (
        <TouchableOpacity
          key={status}
          style={[styles.statusFilterButton, statusFilter === status && styles.statusFilterButtonActive]}
          onPress={() => setStatusFilter(status)}
        >
          <Text style={[styles.statusFilterText, statusFilter === status && styles.statusFilterTextActive]}>
            {status || t('common.all', 'All')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const pendingCount = refunds.filter(r => r.status === 'pending').length;

  return (
    <AdminLayout title={t('admin.titles.refunds', 'Refunds')} actions={headerActions}>
      <View style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.pendingCard]}>
            <Text style={styles.summaryValue}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>{t('admin.refunds.pending', 'Pending Review')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {refunds.filter(r => r.status === 'approved').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('admin.refunds.approved', 'Approved')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {refunds.filter(r => r.status === 'rejected').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('admin.refunds.rejected', 'Rejected')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {formatCurrency(refunds.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0))}
            </Text>
            <Text style={styles.summaryLabel}>{t('admin.refunds.totalApproved', 'Total Refunded')}</Text>
          </View>
        </View>

        <DataTable
          columns={columns}
          data={refunds}
          keyExtractor={(r) => r.id}
          loading={loading}
          pagination={{
            page: filters.page || 1,
            pageSize: filters.page_size || 20,
            total: totalRefunds,
            onPageChange: handlePageChange,
          }}
          actions={renderActions}
          emptyMessage={t('admin.refunds.noRefunds', 'No refunds found')}
        />

        {/* Reject Modal */}
        <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('admin.refunds.rejectRefund', 'Reject Refund')}</Text>

              {selectedRefund && (
                <Text style={styles.refundInfo}>
                  {t('admin.refunds.rejectingAmount', 'Rejecting refund of')} {formatCurrency(selectedRefund.amount)}
                </Text>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.refunds.rejectionReason', 'Rejection Reason')}</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder={t('admin.refunds.reasonPlaceholder', 'Enter reason for rejection...')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowRejectModal(false)}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmRejectButton} onPress={handleConfirmReject}>
                  <Text style={styles.confirmRejectText}>{t('admin.refunds.confirmReject', 'Reject Refund')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  statusFilters: { flexDirection: 'row', backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, padding: 2 },
  statusFilterButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  statusFilterButtonActive: { backgroundColor: colors.primary },
  statusFilterText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  statusFilterTextActive: { color: colors.text, fontWeight: '600' },
  summaryCards: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  summaryCard: { flex: 1, backgroundColor: colors.glass, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.md, alignItems: 'center' },
  pendingCard: { borderColor: colors.warning },
  summaryValue: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  idText: { fontSize: fontSize.xs, color: colors.textSecondary, fontFamily: 'monospace' },
  transactionText: { fontSize: fontSize.sm, color: colors.text },
  amountText: { fontSize: fontSize.sm, fontWeight: 'bold', color: colors.error },
  reasonText: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  dateText: { fontSize: fontSize.xs, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  actionButton: { width: 30, height: 30, borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  approveButton: { backgroundColor: colors.success + '30' },
  rejectButton: { backgroundColor: colors.error + '30' },
  actionIcon: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  modalTitle: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md },
  refundInfo: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg },
  formGroup: { marginBottom: spacing.md },
  formLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  formInput: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: fontSize.md },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md },
  cancelButtonText: { fontSize: fontSize.sm, color: colors.textSecondary },
  confirmRejectButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.error, borderRadius: borderRadius.md },
  confirmRejectText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
});

export default RefundsScreen;
