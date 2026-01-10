import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, Eye, FileText } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { billingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassModal } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface Transaction {
  id: string;
  user: { name: string; email: string };
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  type: string;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const statusColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  completed: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.transactions.status.completed' },
  pending: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', labelKey: 'admin.transactions.status.pending' },
  failed: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', labelKey: 'admin.transactions.status.failed' },
  refunded: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6', labelKey: 'admin.transactions.status.refunded' },
};

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billingService.getTransactions({
        ...filters,
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setTransactions(data.items || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      logger.error('Failed to load transactions', 'TransactionsPage', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleExport = async () => {
    try {
      const blob = await billingService.exportTransactions(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export transactions', 'TransactionsPage', error);
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.pending;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{t(style.labelKey)}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'id',
      label: t('admin.transactions.columns.id'),
      width: 100,
      render: (id: string) => <Text style={styles.idText}>{id.slice(0, 8)}...</Text>,
    },
    {
      key: 'user',
      label: t('admin.transactions.columns.user'),
      render: (_: any, tx: Transaction) => (
        <View>
          <Text style={styles.userName}>{tx.user.name}</Text>
          <Text style={styles.userEmail}>{tx.user.email}</Text>
        </View>
      ),
    },
    {
      key: 'amount',
      label: t('admin.transactions.columns.amount'),
      width: 100,
      render: (_: any, tx: Transaction) => (
        <Text style={styles.amountText}>{formatCurrency(tx.amount, tx.currency)}</Text>
      ),
    },
    {
      key: 'type',
      label: t('admin.transactions.columns.type'),
      width: 100,
      render: (type: string) => <Text style={styles.cellText}>{type}</Text>,
    },
    {
      key: 'status',
      label: t('admin.transactions.columns.status'),
      width: 100,
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: 'created_at',
      label: t('admin.transactions.columns.date'),
      width: 160,
      render: (date: string) => <Text style={styles.dateText}>{formatDate(date)}</Text>,
    },
    {
      key: 'actions',
      label: '',
      width: 80,
      render: (_: any, tx: Transaction) => (
        <Pressable style={styles.actionButton} onPress={() => handleViewDetails(tx)}>
          <Eye size={16} color={colors.primary} />
        </Pressable>
      ),
    },
  ];

  const filterButtons = (
    <View style={styles.filtersRow}>
      {(['all', 'completed', 'pending', 'failed', 'refunded'] as const).map((status) => (
        <Pressable
          key={status}
          onPress={() => setFilters((prev) => ({ ...prev, status }))}
          style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}
        >
          <Text style={[styles.filterText, filters.status === status && styles.filterTextActive]}>
            {status === 'all' ? t('admin.transactions.filters.all') : t(statusColors[status]?.labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.transactions')}</Text>
          <Text style={styles.subtitle}>{t('admin.transactions.subtitle')}</Text>
        </View>
        <GlassButton
          title={t('admin.transactions.exportCsv')}
          variant="secondary"
          icon={<Download size={16} color={colors.text} />}
          onPress={handleExport}
        />
      </View>

      {filterButtons}

      <DataTable
        columns={isRTL ? [...columns].reverse() : columns}
        data={transactions}
        loading={loading}
        searchPlaceholder={t('admin.transactions.searchPlaceholder')}
        onSearch={handleSearch}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={t('admin.transactions.emptyMessage')}
      />

      <GlassModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t('admin.transactions.details')}
      >
        {selectedTransaction && (
          <View style={styles.modalContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.transactions.columns.id')}:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.transactions.columns.user')}:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.user.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.transactions.email')}:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.user.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.transactions.columns.amount')}:</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.transactions.columns.type')}:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.transactions.columns.status')}:</Text>
              {getStatusBadge(selectedTransaction.status)}
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.transactions.columns.date')}:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedTransaction.created_at)}</Text>
            </View>
          </View>
        )}
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
  filtersRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  filterButtonActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 14, color: colors.textMuted },
  filterTextActive: { color: colors.text, fontWeight: '500' },
  idText: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  userName: { fontSize: 14, fontWeight: '500', color: colors.text },
  userEmail: { fontSize: 12, color: colors.textMuted },
  amountText: { fontSize: 14, fontWeight: '600', color: colors.success },
  cellText: { fontSize: 14, color: colors.text },
  dateText: { fontSize: 12, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  actionButton: { padding: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.glass },
  modalContent: { gap: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
});
