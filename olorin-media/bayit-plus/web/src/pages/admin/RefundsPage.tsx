import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';;
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { GlassInput } from '@bayit/shared/ui';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web';
import StatCard from '@/components/admin/StatCard';
import { billingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassModal, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface Refund {
  id: string;
  transaction_id: string;
  user?: { name: string; email: string };
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  approved: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' },
  rejected: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function RefundsPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billingService.getRefunds({
        status: statusFilter,
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setRefunds(data.items || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      logger.error('Failed to load refunds', 'RefundsPage', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : i18n.language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleApprove = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowApproveConfirm(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRefund) return;
    try {
      await billingService.approveRefund(selectedRefund.id);
      setShowApproveConfirm(false);
      loadRefunds();
    } catch (error) {
      logger.error('Failed to approve refund', 'RefundsPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const handleReject = (refund: Refund) => {
    setSelectedRefund(refund);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRefund || !rejectReason.trim()) {
      setErrorMessage(t('admin.refunds.errors.rejectReasonRequired'));
      setShowErrorModal(true);
      return;
    }
    try {
      await billingService.rejectRefund(selectedRefund.id, rejectReason);
      setShowRejectModal(false);
      loadRefunds();
    } catch (error) {
      logger.error('Failed to reject refund', 'RefundsPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.pending;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{t(`admin.refunds.status.${status}`)}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'id',
      label: t('admin.refunds.columns.id'),
      width: 100,
      render: (id: string) => <Text style={styles.idText}>{id.slice(0, 8)}...</Text>,
    },
    {
      key: 'user',
      label: t('admin.refunds.columns.user'),
      render: (_: any, refund: Refund) => (
        <View>
          <Text className="text-sm font-medium text-white">{refund.user?.name || 'N/A'}</Text>
          <Text className="text-xs text-gray-400">{refund.user?.email || ''}</Text>
        </View>
      ),
    },
    {
      key: 'amount',
      label: t('admin.refunds.columns.amount'),
      width: 100,
      render: (_: any, refund: Refund) => (
        <Text style={styles.amountText}>{formatCurrency(refund.amount)}</Text>
      ),
    },
    {
      key: 'reason',
      label: t('admin.refunds.columns.reason'),
      width: 200,
      render: (reason: string) => (
        <Text style={styles.reasonText} numberOfLines={2}>{reason}</Text>
      ),
    },
    {
      key: 'status',
      label: t('admin.refunds.columns.status'),
      width: 100,
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: 'created_at',
      label: t('admin.refunds.columns.requestDate'),
      width: 150,
      render: (date: string) => <Text style={styles.dateText}>{formatDate(date)}</Text>,
    },
    {
      key: 'actions',
      label: '',
      width: 100,
      render: (_: any, refund: Refund) => (
        refund.status === 'pending' ? (
          <View style={styles.actionsRow}>
            <Pressable style={[styles.actionButton, styles.approveButton]} onPress={() => handleApprove(refund)}>
              <Check size={16} color="#22C55E" />
            </Pressable>
            <Pressable style={[styles.actionButton, styles.rejectButton]} onPress={() => handleReject(refund)}>
              <X size={16} color="#EF4444" />
            </Pressable>
          </View>
        ) : null
      ),
    },
  ];

  const pendingCount = refunds.filter(r => r.status === 'pending').length;
  const approvedCount = refunds.filter(r => r.status === 'approved').length;
  const rejectedCount = refunds.filter(r => r.status === 'rejected').length;
  const totalApproved = refunds.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View className="flex flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-2xl font-bold text-white">{t('admin.refunds.title')}</Text>
          <Text className="text-sm text-gray-400 mt-1">{t('admin.refunds.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.summaryCards}>
        <StatCard title={t('admin.refunds.stats.pendingTitle')} value={pendingCount.toString()} icon="⏳" color="warning" />
        <StatCard title={t('admin.refunds.stats.approvedTitle')} value={approvedCount.toString()} icon="✅" color="success" />
        <StatCard title={t('admin.refunds.stats.rejectedTitle')} value={rejectedCount.toString()} icon="❌" color="error" />
        <StatCard title={t('admin.refunds.stats.totalRefunded')} value={formatCurrency(totalApproved)} icon="💰" color="primary" />
      </View>

      <View style={styles.filtersRow}>
        {['', 'pending', 'approved', 'rejected'].map((status) => {
          const getStatusLabel = (s: string) => {
            if (s === '') return t('admin.common.all');
            if (s === 'pending') return t('admin.refunds.status.pending');
            if (s === 'approved') return t('admin.refunds.status.approved');
            if (s === 'rejected') return t('admin.refunds.status.rejected');
            return s;
          };
          return (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
            >
              <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                {getStatusLabel(status)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GlassTable
        columns={columns}
        data={refunds}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={t('admin.refunds.emptyMessage')}
        searchable={false}
        isRTL={isRTL}
      />

      <GlassModal
        visible={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        title={t('admin.refunds.approveModal.title')}
      >
        <View style={styles.modalContent}>
          {selectedRefund && (
            <Text style={styles.refundInfo}>
              {t('admin.refunds.approveModal.message')} {formatCurrency(selectedRefund.amount)}?
            </Text>
          )}
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={() => setShowApproveConfirm(false)} />
            <GlassButton title={t('common.confirm')} variant="success" onPress={handleConfirmApprove} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={t('common.error')}
      >
        <View style={styles.modalContent}>
          <Text className="flex-1 text-red-500 text-sm">{errorMessage}</Text>
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.ok')} variant="success" onPress={() => setShowErrorModal(false)} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={t('admin.refunds.rejectModal.title')}
      >
        <View style={styles.modalContent}>
          {selectedRefund && (
            <Text style={styles.refundInfo}>
              {t('admin.refunds.rejectModal.message')} {formatCurrency(selectedRefund.amount)}
            </Text>
          )}
          <View style={styles.formGroup}>
            <GlassInput
              label={t('admin.refunds.rejectModal.reasonLabel')}
              containerStyle={styles.textArea}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t('admin.refunds.rejectModal.reasonPlaceholder')}
              multiline
              numberOfLines={3}
            />
          </View>
          <View className="flex flex-row gap-4 mt-6">
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={() => setShowRejectModal(false)} />
            <GlassButton title={t('admin.refunds.rejectModal.submitButton')} variant="danger" onPress={handleConfirmReject} />
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  );
}

