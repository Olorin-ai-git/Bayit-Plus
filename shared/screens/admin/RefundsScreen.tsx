/**
 * RefundsScreen
 * Refund management with approval workflow
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DataTable, Column } from '../../components/admin/DataTable';
import { billingService, BillingFilter } from '../../services/adminApi';
import { Refund } from '../../types/rbac';

import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor } from '../../utils/adminConstants';

export const RefundsScreen: React.FC = () => {
  const { t } = useTranslation();
  const notifications = useNotifications();
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
    notifications.show({
      level: 'warning',
      title: t('admin.refunds.approveConfirm', 'Approve Refund'),
      message: t('admin.refunds.approveMessage', `Approve refund of $${refund.amount.toFixed(2)}?`),
      dismissable: true,
      action: {
        label: t('admin.refunds.approve', 'Approve'),
        type: 'action',
        onPress: async () => {
          try {
            await billingService.approveRefund(refund.id);
            loadRefunds();
            notifications.showSuccess(t('admin.refunds.approvedMessage', 'Refund has been approved.'), t('admin.refunds.approved', 'Approved'));
          } catch (error) {
            console.error('Error approving refund:', error);
          }
        },
      },
    });
  };

  const handleReject = (refund: Refund) => {
    setSelectedRefund(refund);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRefund || !rejectReason.trim()) {
      notifications.showError(t('admin.refunds.reasonRequired', 'Rejection reason is required'), t('common.error', 'Error'));
      return;
    }

    try {
      await billingService.rejectRefund(selectedRefund.id, rejectReason);
      setShowRejectModal(false);
      loadRefunds();
      notifications.showSuccess(t('admin.refunds.rejectedMessage', 'Refund has been rejected.'), t('admin.refunds.rejected', 'Rejected'));
    } catch (error) {
      console.error('Error rejecting refund:', error);
    }
  };

  const columns: Column<Refund>[] = [
    {
      key: 'id',
      header: t('admin.refunds.columns.id', 'Refund ID'),
      width: 120,
      render: (refund) => <Text className="text-xs text-gray-400 font-mono">{refund.id.slice(0, 10)}...</Text>,
    },
    {
      key: 'transaction_id',
      header: t('admin.refunds.columns.transaction', 'Transaction'),
      width: 120,
      render: (refund) => <Text className="text-sm text-white">{refund.transaction_id.slice(0, 10)}...</Text>,
    },
    {
      key: 'amount',
      header: t('admin.refunds.columns.amount', 'Amount'),
      width: 100,
      align: 'right',
      render: (refund) => <Text className="text-sm font-bold text-red-500">{formatCurrency(refund.amount)}</Text>,
    },
    {
      key: 'reason',
      header: t('admin.refunds.columns.reason', 'Reason'),
      width: 200,
      render: (refund) => <Text className="text-sm text-gray-400" numberOfLines={2}>{refund.reason}</Text>,
    },
    {
      key: 'status',
      header: t('admin.refunds.columns.status', 'Status'),
      width: 100,
      render: (refund) => (
        <View className="px-2 py-0.5 rounded-sm self-start" style={{ backgroundColor: getStatusColor(refund.status) + '20' }}>
          <Text className="text-xs font-semibold capitalize" style={{ color: getStatusColor(refund.status) }}>{refund.status}</Text>
        </View>
      ),
    },
    {
      key: 'created_at',
      header: t('admin.refunds.columns.requested', 'Requested'),
      width: 160,
      render: (refund) => <Text className="text-xs text-gray-400">{formatDate(refund.created_at)}</Text>,
    },
  ];

  const renderActions = (refund: Refund) => (
    <View className="flex-row gap-1">
      {refund.status === 'pending' && (
        <>
          <TouchableOpacity className="w-[30px] h-[30px] rounded-sm justify-center items-center bg-green-500/30" onPress={() => handleApprove(refund)}>
            <Text className="text-sm">✅</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-[30px] h-[30px] rounded-sm justify-center items-center bg-red-500/30" onPress={() => handleReject(refund)}>
            <Text className="text-sm">❌</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const headerActions = (
    <View className="flex-row bg-gray-800 rounded-md p-0.5">
      {['', 'pending', 'approved', 'rejected'].map((status) => (
        <TouchableOpacity
          key={status}
          className={`px-3 py-2 rounded-sm ${statusFilter === status ? 'bg-purple-600' : ''}`}
          onPress={() => setStatusFilter(status)}
        >
          <Text className={`text-sm capitalize ${statusFilter === status ? 'text-white font-semibold' : 'text-gray-400'}`}>
            {status || t('common.all', 'All')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const pendingCount = refunds.filter(r => r.status === 'pending').length;

  return (
    <AdminLayout title={t('admin.titles.refunds', 'Refunds')} actions={headerActions}>
      <View className="flex-1 p-4">
        {/* Summary */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-black/20 rounded-md border border-yellow-500 p-3 items-center">
            <Text className="text-xl font-bold text-white">{pendingCount}</Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">{t('admin.refunds.pending', 'Pending Review')}</Text>
          </View>
          <View className="flex-1 bg-black/20 rounded-md border border-white/10 p-3 items-center">
            <Text className="text-xl font-bold text-green-500">
              {refunds.filter(r => r.status === 'approved').length}
            </Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">{t('admin.refunds.approved', 'Approved')}</Text>
          </View>
          <View className="flex-1 bg-black/20 rounded-md border border-white/10 p-3 items-center">
            <Text className="text-xl font-bold text-red-500">
              {refunds.filter(r => r.status === 'rejected').length}
            </Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">{t('admin.refunds.rejected', 'Rejected')}</Text>
          </View>
          <View className="flex-1 bg-black/20 rounded-md border border-white/10 p-3 items-center">
            <Text className="text-xl font-bold text-purple-500">
              {formatCurrency(refunds.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0))}
            </Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">{t('admin.refunds.totalApproved', 'Total Refunded')}</Text>
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
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="w-[90%] max-w-[400px] bg-gray-900/95 rounded-lg p-4 border border-white/10">
              <Text className="text-xl font-bold text-white mb-3">{t('admin.refunds.rejectRefund', 'Reject Refund')}</Text>

              {selectedRefund && (
                <Text className="text-sm text-gray-400 mb-4">
                  {t('admin.refunds.rejectingAmount', 'Rejecting refund of')} {formatCurrency(selectedRefund.amount)}
                </Text>
              )}

              <View className="mb-3">
                <Text className="text-sm font-semibold text-white mb-1">{t('admin.refunds.rejectionReason', 'Rejection Reason')}</Text>
                <TextInput
                  className="bg-gray-800 rounded-md border border-white/10 px-3 py-2 text-white text-base min-h-[80px]"
                  style={{ textAlignVertical: 'top' }}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder={t('admin.refunds.reasonPlaceholder', 'Enter reason for rejection...')}
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="flex-row justify-end gap-2 mt-4">
                <TouchableOpacity className="px-4 py-2 bg-gray-800 rounded-md" onPress={() => setShowRejectModal(false)}>
                  <Text className="text-sm text-gray-400">{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-4 py-2 bg-red-500 rounded-md" onPress={handleConfirmReject}>
                  <Text className="text-sm text-white font-semibold">{t('admin.refunds.confirmReject', 'Reject Refund')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

export default RefundsScreen;
