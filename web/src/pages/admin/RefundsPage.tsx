import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatCard from '@/components/admin/StatCard';
import { billingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassModal, GlassButton } from '@bayit/shared/ui';
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

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', label: 'ממתין' },
  approved: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', label: 'אושר' },
  rejected: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', label: 'נדחה' },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function RefundsPage() {
  const { t } = useTranslation();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
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

  const handleApprove = async (refund: Refund) => {
    if (!window.confirm(`אשר החזר של ${formatCurrency(refund.amount)}?`)) return;
    try {
      await billingService.approveRefund(refund.id);
      loadRefunds();
    } catch (error) {
      logger.error('Failed to approve refund', 'RefundsPage', error);
    }
  };

  const handleReject = (refund: Refund) => {
    setSelectedRefund(refund);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRefund || !rejectReason.trim()) {
      alert('נא להזין סיבת דחייה');
      return;
    }
    try {
      await billingService.rejectRefund(selectedRefund.id, rejectReason);
      setShowRejectModal(false);
      loadRefunds();
    } catch (error) {
      logger.error('Failed to reject refund', 'RefundsPage', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.pending;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{style.label}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'id',
      label: 'מזהה',
      width: 100,
      render: (id: string) => <Text style={styles.idText}>{id.slice(0, 8)}...</Text>,
    },
    {
      key: 'user',
      label: 'משתמש',
      render: (_: any, refund: Refund) => (
        <View>
          <Text style={styles.userName}>{refund.user?.name || 'N/A'}</Text>
          <Text style={styles.userEmail}>{refund.user?.email || ''}</Text>
        </View>
      ),
    },
    {
      key: 'amount',
      label: 'סכום',
      width: 100,
      render: (_: any, refund: Refund) => (
        <Text style={styles.amountText}>{formatCurrency(refund.amount)}</Text>
      ),
    },
    {
      key: 'reason',
      label: 'סיבה',
      width: 200,
      render: (reason: string) => (
        <Text style={styles.reasonText} numberOfLines={2}>{reason}</Text>
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      width: 100,
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: 'created_at',
      label: 'תאריך בקשה',
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.refunds', 'החזרים')}</Text>
          <Text style={styles.subtitle}>ניהול בקשות להחזר כספי</Text>
        </View>
      </View>

      <View style={styles.summaryCards}>
        <StatCard title="ממתינים לאישור" value={pendingCount.toString()} icon="⏳" color="warning" />
        <StatCard title="אושרו" value={approvedCount.toString()} icon="✅" color="success" />
        <StatCard title="נדחו" value={rejectedCount.toString()} icon="❌" color="error" />
        <StatCard title="סה״כ הוחזר" value={formatCurrency(totalApproved)} icon="💰" color="primary" />
      </View>

      <View style={styles.filtersRow}>
        {['', 'pending', 'approved', 'rejected'].map((status) => (
          <Pressable
            key={status}
            onPress={() => setStatusFilter(status)}
            style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
              {status === '' ? 'הכל' : statusColors[status]?.label || status}
            </Text>
          </Pressable>
        ))}
      </View>

      <DataTable
        columns={columns}
        data={refunds}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="לא נמצאו בקשות להחזר"
        searchable={false}
      />

      <GlassModal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="דחיית בקשת החזר"
      >
        <View style={styles.modalContent}>
          {selectedRefund && (
            <Text style={styles.refundInfo}>
              דחיית החזר בסך {formatCurrency(selectedRefund.amount)}
            </Text>
          )}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>סיבת הדחייה</Text>
            <TextInput
              style={styles.textArea}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="נא להזין את סיבת הדחייה..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.modalActions}>
            <GlassButton title="ביטול" variant="secondary" onPress={() => setShowRejectModal(false)} />
            <GlassButton title="דחה בקשה" variant="primary" onPress={handleConfirmReject} />
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  summaryCards: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  filtersRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  filterButtonActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 14, color: colors.textMuted, textTransform: 'capitalize' },
  filterTextActive: { color: colors.text, fontWeight: '500' },
  idText: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  userName: { fontSize: 14, fontWeight: '500', color: colors.text },
  userEmail: { fontSize: 12, color: colors.textMuted },
  amountText: { fontSize: 14, fontWeight: '600', color: colors.error },
  reasonText: { fontSize: 13, color: colors.textSecondary },
  dateText: { fontSize: 12, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  actionButton: { width: 32, height: 32, borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  approveButton: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  rejectButton: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  modalContent: { gap: spacing.md },
  refundInfo: { fontSize: 14, color: colors.textSecondary },
  formGroup: { gap: spacing.xs },
  formLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  textArea: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.md, color: colors.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
});
