/**
 * TransactionsScreen
 * Full transaction history with search, filters, and export
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DataTable, Column } from '../../components/admin/DataTable';
import { billingService, BillingFilter } from '../../services/adminApi';
import { Transaction } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor, getPaymentMethodIcon } from '../../utils/adminConstants';

export const TransactionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<BillingFilter>({
    search: '',
    status: '',
    date_from: '',
    date_to: '',
    amount_min: undefined,
    amount_max: undefined,
    page: 1,
    page_size: 20,
  });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await billingService.getTransactions(filters);
      setTransactions(response.items);
      setTotalTransactions(response.total);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      setTransactions([]);
      setTotalTransactions(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSearch = (text: string) => {
    setFilters(prev => ({ ...prev, search: text, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetails(true);
  };

  const handleRefund = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setRefundAmount(transaction.amount.toString());
    setRefundReason('');
    setShowRefundModal(true);
  };

  const handleProcessRefund = async () => {
    if (!selectedTransaction) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedTransaction.amount) {
      Alert.alert(t('common.error', 'Error'), t('admin.transactions.invalidAmount', 'Invalid refund amount'));
      return;
    }

    if (!refundReason.trim()) {
      Alert.alert(t('common.error', 'Error'), t('admin.transactions.reasonRequired', 'Refund reason is required'));
      return;
    }

    try {
      await billingService.processRefund(selectedTransaction.id, {
        amount,
        reason: refundReason,
      });
      setShowRefundModal(false);
      Alert.alert(
        t('admin.transactions.refundProcessed', 'Refund Processed'),
        t('admin.transactions.refundSuccess', 'The refund has been processed successfully.')
      );
      loadTransactions();
    } catch (error) {
      console.error('Error processing refund:', error);
      Alert.alert(t('common.error', 'Error'), t('admin.transactions.refundError', 'Failed to process refund'));
    }
  };

  const handleExport = async () => {
    try {
      const blob = await billingService.exportTransactions(filters);
      // In a real app, this would trigger a download
      Alert.alert(
        t('admin.transactions.exportSuccess', 'Export Ready'),
        t('admin.transactions.exportMessage', 'Transaction data has been exported.')
      );
    } catch (error) {
      console.error('Error exporting transactions:', error);
    }
  };

  const handleGenerateInvoice = async (transaction: Transaction) => {
    try {
      await billingService.generateInvoice(transaction.id);
      Alert.alert(
        t('admin.transactions.invoiceGenerated', 'Invoice Generated'),
        t('admin.transactions.invoiceMessage', 'Invoice has been generated and is ready for download.')
      );
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'id',
      header: t('admin.transactions.columns.id', 'Transaction ID'),
      width: 140,
      render: (transaction) => (
        <Text className="text-xs text-gray-500 font-mono">{transaction.id.slice(0, 12)}...</Text>
      ),
    },
    {
      key: 'user_id',
      header: t('admin.transactions.columns.user', 'User'),
      width: 140,
      render: (transaction) => (
        <Text style={styles.userText}>{transaction.user_id.slice(0, 12)}...</Text>
      ),
    },
    {
      key: 'description',
      header: t('admin.transactions.columns.description', 'Description'),
      width: 180,
      render: (transaction) => (
        <Text style={styles.descriptionText}>{transaction.description || 'Payment'}</Text>
      ),
    },
    {
      key: 'amount',
      header: t('admin.transactions.columns.amount', 'Amount'),
      width: 100,
      align: 'right',
      sortable: true,
      render: (transaction) => (
        <Text style={[styles.amountText, { color: getStatusColor(transaction.status) }]}>
          {formatCurrency(transaction.amount)}
        </Text>
      ),
    },
    {
      key: 'payment_method',
      header: t('admin.transactions.columns.method', 'Method'),
      width: 100,
      render: (transaction) => (
        <Text style={styles.methodText}>{transaction.payment_method}</Text>
      ),
    },
    {
      key: 'status',
      header: t('admin.transactions.columns.status', 'Status'),
      width: 100,
      sortable: true,
      render: (transaction) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
            {transaction.status}
          </Text>
        </View>
      ),
    },
    {
      key: 'created_at',
      header: t('admin.transactions.columns.date', 'Date'),
      width: 160,
      sortable: true,
      render: (transaction) => (
        <Text style={styles.dateText}>{formatDate(transaction.created_at)}</Text>
      ),
    },
  ];

  const renderActions = (transaction: Transaction) => (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleViewDetails(transaction)}
      >
        <Text style={styles.actionIcon}>👁️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleGenerateInvoice(transaction)}
      >
        <Text style={styles.actionIcon}>📄</Text>
      </TouchableOpacity>
      {transaction.status === 'completed' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.refundButton]}
          onPress={() => handleRefund(transaction)}
        >
          <Text style={styles.actionIcon}>↩️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
        <Text style={styles.filterButtonIcon}>🔍</Text>
        <Text style={styles.filterButtonText}>{t('admin.transactions.filters', 'Filters')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
        <Text style={styles.exportButtonText}>📥 {t('admin.transactions.export', 'Export')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout
      title={t('admin.titles.transactions', 'Transactions')}
      actions={headerActions}
    >
      <View style={styles.container}>
        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalTransactions}</Text>
            <Text style={styles.summaryLabel}>{t('admin.transactions.total', 'Total Transactions')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {transactions.filter(t => t.status === 'completed').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('admin.transactions.completed', 'Completed')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {transactions.filter(t => t.status === 'pending').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('admin.transactions.pending', 'Pending')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: colors.secondary }]}>
              {transactions.filter(t => t.status === 'refunded').length}
            </Text>
            <Text style={styles.summaryLabel}>{t('admin.transactions.refunded', 'Refunded')}</Text>
          </View>
        </View>

        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t) => t.id}
          loading={loading}
          searchable
          searchPlaceholder={t('admin.transactions.searchPlaceholder', 'Search by ID, user, or description...')}
          onSearch={handleSearch}
          sortable
          pagination={{
            page: filters.page || 1,
            pageSize: filters.page_size || 20,
            total: totalTransactions,
            onPageChange: handlePageChange,
          }}
          actions={renderActions}
          emptyMessage={t('admin.transactions.noTransactions', 'No transactions found')}
        />

        {/* Filters Modal */}
        <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('admin.transactions.filterTitle', 'Filter Transactions')}</Text>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.transactions.status', 'Status')}</Text>
                <View style={styles.filterOptions}>
                  {['', 'completed', 'pending', 'failed', 'refunded'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.filterOption, filters.status === status && styles.filterOptionActive]}
                      onPress={() => setFilters(prev => ({ ...prev, status }))}
                    >
                      <Text style={[styles.filterOptionText, filters.status === status && styles.filterOptionTextActive]}>
                        {status || t('common.all', 'All')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.transactions.dateRange', 'Date Range')}</Text>
                <View style={styles.dateInputs}>
                  <TextInput
                    style={styles.dateInput}
                    value={filters.date_from}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, date_from: text }))}
                    placeholder={t('placeholder.dateRange.from', 'From (YYYY-MM-DD)')}
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={styles.dateInput}
                    value={filters.date_to}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, date_to: text }))}
                    placeholder={t('placeholder.dateRange.to', 'To (YYYY-MM-DD)')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('admin.transactions.amountRange', 'Amount Range')}</Text>
                <View style={styles.amountInputs}>
                  <TextInput
                    style={styles.amountInput}
                    value={filters.amount_min?.toString() || ''}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, amount_min: text ? parseFloat(text) : undefined }))}
                    placeholder={t('placeholder.amount.min', 'Min')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                  <Text style={styles.amountSeparator}>-</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={filters.amount_max?.toString() || ''}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, amount_max: text ? parseFloat(text) : undefined }))}
                    placeholder={t('placeholder.amount.max', 'Max')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalClearButton} onPress={() => setFilters(prev => ({ ...prev, status: '', date_from: '', date_to: '', amount_min: undefined, amount_max: undefined }))}>
                  <Text style={styles.modalClearText}>{t('admin.transactions.clearFilters', 'Clear')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalApplyButton} onPress={() => setShowFilters(false)}>
                  <Text style={styles.modalApplyText}>{t('admin.transactions.apply', 'Apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Transaction Details Modal */}
        <Modal visible={showDetails} transparent animationType="fade" onRequestClose={() => setShowDetails(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailsModal}>
              <Text style={styles.modalTitle}>{t('admin.transactions.details', 'Transaction Details')}</Text>

              {selectedTransaction && (
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.transactions.transactionId', 'Transaction ID')}</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.transactions.userId', 'User ID')}</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.user_id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.transactions.amount', 'Amount')}</Text>
                    <Text style={[styles.detailValue, { color: colors.success, fontWeight: 'bold' }]}>
                      {formatCurrency(selectedTransaction.amount)} {selectedTransaction.currency}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.transactions.status', 'Status')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTransaction.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedTransaction.status) }]}>
                        {selectedTransaction.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.transactions.paymentMethod', 'Payment Method')}</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.payment_method}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.transactions.description', 'Description')}</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.description || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.transactions.date', 'Date')}</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedTransaction.created_at)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailsActions}>
                {selectedTransaction?.status === 'completed' && (
                  <TouchableOpacity style={styles.refundDetailButton} onPress={() => { setShowDetails(false); handleRefund(selectedTransaction); }}>
                    <Text style={styles.refundDetailButtonText}>↩️ {t('admin.transactions.processRefund', 'Process Refund')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowDetails(false)}>
                  <Text style={styles.closeButtonText}>{t('common.close', 'Close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Refund Modal */}
        <Modal visible={showRefundModal} transparent animationType="fade" onRequestClose={() => setShowRefundModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.refundModal}>
              <Text style={styles.modalTitle}>{t('admin.transactions.processRefund', 'Process Refund')}</Text>

              {selectedTransaction && (
                <>
                  <Text style={styles.refundInfo}>
                    {t('admin.transactions.originalAmount', 'Original Amount')}: {formatCurrency(selectedTransaction.amount)}
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{t('admin.transactions.refundAmount', 'Refund Amount')}</Text>
                    <TextInput
                      style={styles.formInput}
                      value={refundAmount}
                      onChangeText={setRefundAmount}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{t('admin.transactions.refundReason', 'Reason')}</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea]}
                      value={refundReason}
                      onChangeText={setRefundReason}
                      placeholder={t('admin.transactions.reasonPlaceholder', 'Enter refund reason...')}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.refundActions}>
                    <TouchableOpacity style={styles.cancelRefundButton} onPress={() => setShowRefundModal(false)}>
                      <Text style={styles.cancelRefundText}>{t('common.cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmRefundButton} onPress={handleProcessRefund}>
                      <Text style={styles.confirmRefundText}>{t('admin.transactions.confirmRefund', 'Confirm Refund')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};


export default TransactionsScreen;
