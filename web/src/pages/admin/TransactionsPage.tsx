import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Download, Eye, FileText } from 'lucide-react';
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web';
import { billingService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
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
      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: style.bg }}>
        <Text className="text-xs font-medium" style={{ color: style.text }}>{t(style.labelKey)}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'id',
      label: t('admin.transactions.columns.id'),
      width: 100,
      render: (id: string) => <Text className="text-xs text-gray-400 font-mono">{id.slice(0, 8)}...</Text>,
    },
    {
      key: 'user',
      label: t('admin.transactions.columns.user'),
      render: (_: any, tx: Transaction) => (
        <View>
          <Text className="text-sm font-medium text-white">{tx.user.name}</Text>
          <Text className="text-xs text-gray-400">{tx.user.email}</Text>
        </View>
      ),
    },
    {
      key: 'amount',
      label: t('admin.transactions.columns.amount'),
      width: 100,
      render: (_: any, tx: Transaction) => (
        <Text className="text-sm font-semibold text-green-500">{formatCurrency(tx.amount, tx.currency)}</Text>
      ),
    },
    {
      key: 'type',
      label: t('admin.transactions.columns.type'),
      width: 100,
      render: (type: string) => <Text className="text-sm text-white">{type}</Text>,
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
      render: (date: string) => <Text className="text-xs text-gray-400">{formatDate(date)}</Text>,
    },
    {
      key: 'actions',
      label: '',
      width: 80,
      render: (_: any, tx: Transaction) => (
        <Pressable className="p-1 rounded bg-white/10" onPress={() => handleViewDetails(tx)}>
          <Eye size={16} color={colors.primary} />
        </Pressable>
      ),
    },
  ];

  const filterButtons = (
    <View className="flex flex-row gap-2 mb-6">
      {(['all', 'completed', 'pending', 'failed', 'refunded'] as const).map((status) => (
        <Pressable
          key={status}
          onPress={() => setFilters((prev) => ({ ...prev, status }))}
          style={[
            styles.filterButton,
            filters.status === status && styles.filterButtonActive
          ]}
        >
          <Text style={[
            styles.filterButtonText,
            filters.status === status && styles.filterButtonTextActive
          ]}>
            {status === 'all' ? t('admin.transactions.filters.all') : t(statusColors[status]?.labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View className="flex flex-row items-center justify-between mb-6">
        <View>
          <Text className="text-2xl font-bold text-white">{t('admin.titles.transactions')}</Text>
          <Text className="text-sm text-gray-400 mt-1">{t('admin.transactions.subtitle')}</Text>
        </View>
        <GlassButton
          title={t('admin.transactions.exportCsv')}
          variant="ghost"
          icon={<Download size={16} color="white" />}
          onPress={handleExport}
        />
      </View>

      {filterButtons}

      <GlassTable
        columns={columns}
        data={transactions}
        loading={loading}
        searchPlaceholder={t('admin.transactions.searchPlaceholder')}
        onSearch={handleSearch}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={t('admin.transactions.emptyMessage')}
        isRTL={isRTL}
      />

      <GlassModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t('admin.transactions.details')}
      >
        {selectedTransaction && (
          <View className="gap-4">
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm text-gray-400">{t('admin.transactions.columns.id')}:</Text>
              <Text className="text-sm text-white font-medium">{selectedTransaction.id}</Text>
            </View>
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm text-gray-400">{t('admin.transactions.columns.user')}:</Text>
              <Text className="text-sm text-white font-medium">{selectedTransaction.user.name}</Text>
            </View>
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm text-gray-400">{t('admin.transactions.email')}:</Text>
              <Text className="text-sm text-white font-medium">{selectedTransaction.user.email}</Text>
            </View>
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm text-gray-400">{t('admin.transactions.columns.amount')}:</Text>
              <Text className="text-sm text-white font-medium">
                {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
              </Text>
            </View>
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm text-gray-400">{t('admin.transactions.columns.type')}:</Text>
              <Text className="text-sm text-white font-medium">{selectedTransaction.type}</Text>
            </View>
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm text-gray-400">{t('admin.transactions.columns.status')}:</Text>
              {getStatusBadge(selectedTransaction.status)}
            </View>
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm text-gray-400">{t('admin.transactions.columns.date')}:</Text>
              <Text className="text-sm text-white font-medium">{formatDate(selectedTransaction.created_at)}</Text>
            </View>
          </View>
        )}
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#a855f7',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
});
