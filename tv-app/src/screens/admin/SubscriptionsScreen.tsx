/**
 * SubscriptionsScreen
 * Subscription management with extend, cancel, and plan change features
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
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useDirection } from '@bayit/shared/hooks';
import { AdminLayout, DataTable, Column, StatCard } from '@bayit/shared/admin';
import { subscriptionsService, SubscriptionsFilter } from '../../services/adminApi';
import { Subscription, User } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor, getPlanColor } from '../../utils/adminConstants';

type SubscriptionWithUser = Subscription & { user: User };

export const SubscriptionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionWithUser | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [discountMonths, setDiscountMonths] = useState('3');
  const [churnAnalytics, setChurnAnalytics] = useState<any>(null);

  const [filters, setFilters] = useState<SubscriptionsFilter>({
    search: '',
    plan: '',
    status: '',
    page: 1,
    page_size: 20,
  });

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsResponse, analytics] = await Promise.all([
        subscriptionsService.getSubscriptions(filters),
        subscriptionsService.getChurnAnalytics(),
      ]);
      setSubscriptions(subsResponse.items);
      setTotalSubscriptions(subsResponse.total);
      setChurnAnalytics(analytics);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscriptions';
      setError(errorMessage);
      setSubscriptions([]);
      setTotalSubscriptions(0);
      setChurnAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleSearch = (text: string) => setFilters(prev => ({ ...prev, search: text, page: 1 }));
  const handlePageChange = (page: number) => setFilters(prev => ({ ...prev, page }));

  const handleExtend = (sub: SubscriptionWithUser) => {
    setSelectedSub(sub);
    setExtendDays('30');
    setShowExtendModal(true);
  };

  const handleConfirmExtend = async () => {
    if (!selectedSub) return;
    const days = parseInt(extendDays);
    if (isNaN(days) || days <= 0) {
      Alert.alert(t('common.error', 'Error'), t('admin.subscriptions.invalidDays', 'Please enter a valid number of days'));
      return;
    }
    try {
      await subscriptionsService.extendSubscription(selectedSub.id, days);
      setShowExtendModal(false);
      loadSubscriptions();
      Alert.alert(t('admin.subscriptions.extended', 'Extended'), t('admin.subscriptions.extendedMessage', `Subscription extended by ${days} days`));
    } catch (error) {
      console.error('Error extending subscription:', error);
    }
  };

  const handleApplyDiscount = (sub: SubscriptionWithUser) => {
    setSelectedSub(sub);
    setDiscountPercent('10');
    setDiscountMonths('3');
    setShowDiscountModal(true);
  };

  const handleConfirmDiscount = async () => {
    if (!selectedSub) return;
    const percent = parseInt(discountPercent);
    const months = parseInt(discountMonths);
    if (isNaN(percent) || percent <= 0 || percent > 100 || isNaN(months) || months <= 0) {
      Alert.alert(t('common.error', 'Error'), t('admin.subscriptions.invalidDiscount', 'Please enter valid discount values'));
      return;
    }
    try {
      await subscriptionsService.applyDiscount(selectedSub.id, percent, months);
      setShowDiscountModal(false);
      loadSubscriptions();
      Alert.alert(t('admin.subscriptions.discountApplied', 'Discount Applied'), t('admin.subscriptions.discountMessage', `${percent}% discount applied for ${months} months`));
    } catch (error) {
      console.error('Error applying discount:', error);
    }
  };

  const handleCancel = async (sub: SubscriptionWithUser) => {
    Alert.alert(
      t('admin.subscriptions.cancelConfirm', 'Cancel Subscription'),
      t('admin.subscriptions.cancelMessage', 'Are you sure you want to cancel this subscription?'),
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('common.yes', 'Yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionsService.cancelSubscription(sub.id, 'Cancelled by admin');
              loadSubscriptions();
            } catch (error) {
              console.error('Error cancelling subscription:', error);
            }
          },
        },
      ]
    );
  };

  const handlePause = async (sub: SubscriptionWithUser) => {
    try {
      await subscriptionsService.pauseSubscription(sub.id);
      loadSubscriptions();
    } catch (error) {
      console.error('Error pausing subscription:', error);
    }
  };

  const handleResume = async (sub: SubscriptionWithUser) => {
    try {
      await subscriptionsService.resumeSubscription(sub.id);
      loadSubscriptions();
    } catch (error) {
      console.error('Error resuming subscription:', error);
    }
  };

  const columns: Column<SubscriptionWithUser>[] = [
    {
      key: 'user',
      header: t('admin.subscriptions.columns.user', 'User'),
      width: 180,
      render: (sub) => (
        <View>
          <Text style={styles.userName}>{sub.user.name}</Text>
          <Text style={styles.userEmail}>{sub.user.email}</Text>
        </View>
      ),
    },
    {
      key: 'plan',
      header: t('admin.subscriptions.columns.plan', 'Plan'),
      width: 120,
      render: (sub) => <Text style={styles.planText}>{sub.plan}</Text>,
    },
    {
      key: 'status',
      header: t('admin.subscriptions.columns.status', 'Status'),
      width: 100,
      render: (sub) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sub.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>{sub.status}</Text>
        </View>
      ),
    },
    {
      key: 'price',
      header: t('admin.subscriptions.columns.price', 'Price'),
      width: 80,
      align: 'right',
      render: (sub) => <Text style={styles.priceText}>{formatCurrency(sub.price || 0)}</Text>,
    },
    {
      key: 'start_date',
      header: t('admin.subscriptions.columns.started', 'Started'),
      width: 100,
      render: (sub) => <Text style={styles.dateText}>{formatDate(sub.start_date)}</Text>,
    },
    {
      key: 'end_date',
      header: t('admin.subscriptions.columns.renews', 'Renews'),
      width: 100,
      render: (sub) => <Text style={styles.dateText}>{sub.end_date ? formatDate(sub.end_date) : '-'}</Text>,
    },
  ];

  const renderActions = (sub: SubscriptionWithUser) => (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.actionButton} onPress={() => handleExtend(sub)}>
        <Text style={styles.actionIcon}>📅</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => handleApplyDiscount(sub)}>
        <Text style={styles.actionIcon}>🏷️</Text>
      </TouchableOpacity>
      {sub.status === 'active' ? (
        <TouchableOpacity style={[styles.actionButton, styles.pauseButton]} onPress={() => handlePause(sub)}>
          <Text style={styles.actionIcon}>⏸️</Text>
        </TouchableOpacity>
      ) : sub.status === 'paused' ? (
        <TouchableOpacity style={[styles.actionButton, styles.resumeButton]} onPress={() => handleResume(sub)}>
          <Text style={styles.actionIcon}>▶️</Text>
        </TouchableOpacity>
      ) : null}
      {sub.status !== 'cancelled' && (
        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => handleCancel(sub)}>
          <Text style={styles.actionIcon}>❌</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity style={styles.plansButton} onPress={() => navigation.navigate('PlanManagement')}>
        <Text style={styles.plansButtonText}>⚙️ {t('admin.subscriptions.managePlans', 'Manage Plans')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout title={t('admin.titles.subscriptions', 'Subscriptions')} actions={headerActions}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Analytics Cards */}
        <View style={styles.statsRow}>
          <StatCard title={t('admin.subscriptions.active', 'Active')} value={subscriptions.filter(s => s.status === 'active').length.toString()} icon="✅" color={colors.success} />
          <StatCard title={t('admin.subscriptions.churnRate', 'Churn Rate')} value={`${churnAnalytics?.churn_rate || 0}%`} icon="📉" color={churnAnalytics?.churn_rate < 5 ? colors.success : colors.error} />
          <StatCard title={t('admin.subscriptions.atRisk', 'At Risk')} value={(churnAnalytics?.at_risk_users || 0).toString()} icon="⚠️" color={colors.warning} />
          <StatCard title={t('admin.subscriptions.retention', 'Retention')} value={`${churnAnalytics?.retention_rate || 0}%`} icon="📈" color={colors.primary} />
        </View>

        {/* Plan Filter */}
        <View style={styles.planFilters}>
          {['', 'free', 'basic', 'premium', 'enterprise'].map((plan) => (
            <TouchableOpacity
              key={plan}
              style={[styles.planFilter, filters.plan === plan && styles.planFilterActive]}
              onPress={() => setFilters(prev => ({ ...prev, plan, page: 1 }))}
            >
              <Text style={[styles.planFilterText, filters.plan === plan && styles.planFilterTextActive]}>
                {plan || t('common.all', 'All')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <DataTable
          columns={columns}
          data={subscriptions}
          keyExtractor={(s) => s.id}
          loading={loading}
          searchable
          searchPlaceholder={t('admin.subscriptions.searchPlaceholder', 'Search by user name or email...')}
          onSearch={handleSearch}
          pagination={{ page: filters.page || 1, pageSize: filters.page_size || 20, total: totalSubscriptions, onPageChange: handlePageChange }}
          actions={renderActions}
          emptyMessage={t('admin.subscriptions.noSubscriptions', 'No subscriptions found')}
        />

        {/* Extend Modal */}
        <Modal visible={showExtendModal} transparent animationType="fade" onRequestClose={() => setShowExtendModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('admin.subscriptions.extendSubscription', 'Extend Subscription')}</Text>
              <Text style={styles.modalInfo}>{selectedSub?.user.name} - {selectedSub?.plan}</Text>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.subscriptions.days', 'Days to extend')}</Text>
                <TextInput style={styles.formInput} value={extendDays} onChangeText={setExtendDays} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.quickOptions}>
                {[7, 14, 30, 60, 90].map((days) => (
                  <TouchableOpacity key={days} style={[styles.quickOption, extendDays === days.toString() && styles.quickOptionActive]} onPress={() => setExtendDays(days.toString())}>
                    <Text style={[styles.quickOptionText, extendDays === days.toString() && styles.quickOptionTextActive]}>{days}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowExtendModal(false)}>
                  <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirmExtend}>
                  <Text style={styles.modalConfirmText}>{t('admin.subscriptions.extend', 'Extend')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Discount Modal */}
        <Modal visible={showDiscountModal} transparent animationType="fade" onRequestClose={() => setShowDiscountModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('admin.subscriptions.applyDiscount', 'Apply Discount')}</Text>
              <Text style={styles.modalInfo}>{selectedSub?.user.name} - {selectedSub?.plan}</Text>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.subscriptions.discountPercent', 'Discount (%)')}</Text>
                <TextInput style={styles.formInput} value={discountPercent} onChangeText={setDiscountPercent} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.subscriptions.discountMonths', 'Number of months')}</Text>
                <TextInput style={styles.formInput} value={discountMonths} onChangeText={setDiscountMonths} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowDiscountModal(false)}>
                  <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirmDiscount}>
                  <Text style={styles.modalConfirmText}>{t('admin.subscriptions.apply', 'Apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  plansButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.secondary, borderRadius: borderRadius.md },
  plansButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  planFilters: { flexDirection: 'row', backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, padding: 2, marginBottom: spacing.lg, alignSelf: 'flex-start' },
  planFilter: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  planFilterActive: { backgroundColor: colors.primary },
  planFilterText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  planFilterTextActive: { color: colors.text, fontWeight: '600' },
  userName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  userEmail: { fontSize: fontSize.xs, color: colors.textSecondary },
  planText: { fontSize: fontSize.sm, color: colors.text, textTransform: 'capitalize', fontWeight: '600' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  statusText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  priceText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.success },
  dateText: { fontSize: fontSize.xs, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  actionButton: { width: 28, height: 28, borderRadius: borderRadius.sm, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  pauseButton: { backgroundColor: colors.warning + '30' },
  resumeButton: { backgroundColor: colors.success + '30' },
  cancelButton: { backgroundColor: colors.error + '30' },
  actionIcon: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  modalTitle: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.sm },
  modalInfo: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg },
  formGroup: { marginBottom: spacing.md },
  formLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  formInput: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: fontSize.md },
  quickOptions: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  quickOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.glassBorder },
  quickOptionActive: { backgroundColor: colors.primary + '30', borderColor: colors.primary },
  quickOptionText: { fontSize: fontSize.sm, color: colors.textSecondary },
  quickOptionTextActive: { color: colors.primary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  modalCancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md },
  modalCancelText: { fontSize: fontSize.sm, color: colors.textSecondary },
  modalConfirmButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  modalConfirmText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
});

export default SubscriptionsScreen;
