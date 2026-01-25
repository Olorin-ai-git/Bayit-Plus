/**
 * SubscriptionsScreen
 * Subscription management with extend, cancel, and plan change features
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DataTable, Column } from '../../components/admin/DataTable';
import { StatCard } from '../../components/admin/StatCard';
import { subscriptionsService, SubscriptionsFilter } from '../../services/adminApi';
import { Subscription, User } from '../../types/rbac';

import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor, getPlanColor } from '../../utils/adminConstants';
import { logger } from '../../utils/logger';

type SubscriptionWithUser = Subscription & { user: User };

// Scoped logger for subscriptions screen
const subscriptionsLogger = logger.scope('Admin:Subscriptions');

export const SubscriptionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const notifications = useNotifications();
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
      subscriptionsLogger.error('Error loading subscriptions', {
        filters,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
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
      notifications.showError(t('admin.subscriptions.invalidDays', 'Please enter a valid number of days'), t('common.error', 'Error'));
      return;
    }
    try {
      await subscriptionsService.extendSubscription(selectedSub.id, days);
      setShowExtendModal(false);
      loadSubscriptions();
      notifications.showSuccess(t('admin.subscriptions.extendedMessage', `Subscription extended by ${days} days`), t('admin.subscriptions.extended', 'Extended'));
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
      notifications.showError(t('admin.subscriptions.invalidDiscount', 'Please enter valid discount values'), t('common.error', 'Error'));
      return;
    }
    try {
      await subscriptionsService.applyDiscount(selectedSub.id, percent, months);
      setShowDiscountModal(false);
      loadSubscriptions();
      notifications.showSuccess(t('admin.subscriptions.discountMessage', `${percent}% discount applied for ${months} months`), t('admin.subscriptions.discountApplied', 'Discount Applied'));
    } catch (error) {
      console.error('Error applying discount:', error);
    }
  };

  const handleCancel = async (sub: SubscriptionWithUser) => {
    notifications.show({
      level: 'warning',
      title: t('admin.subscriptions.cancelConfirm', 'Cancel Subscription'),
      message: t('admin.subscriptions.cancelMessage', 'Are you sure you want to cancel this subscription?'),
      dismissable: true,
      action: {
        label: t('common.yes', 'Yes'),
        type: 'action',
        onPress: async () => {
          try {
            await subscriptionsService.cancelSubscription(sub.id, 'Cancelled by admin');
            loadSubscriptions();
          } catch (error) {
            console.error('Error cancelling subscription:', error);
          }
        },
      },
    });
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
          <Text className="text-sm font-semibold text-white">{sub.user.name}</Text>
          <Text className="text-xs text-gray-400">{sub.user.email}</Text>
        </View>
      ),
    },
    {
      key: 'plan',
      header: t('admin.subscriptions.columns.plan', 'Plan'),
      width: 120,
      render: (sub) => <Text className="text-sm text-white capitalize font-semibold">{sub.plan}</Text>,
    },
    {
      key: 'status',
      header: t('admin.subscriptions.columns.status', 'Status'),
      width: 100,
      render: (sub) => (
        <View className="px-2 py-0.5 rounded self-start" style={{ backgroundColor: getStatusColor(sub.status) + '20' }}>
          <Text className="text-xs font-semibold capitalize" style={{ color: getStatusColor(sub.status) }}>{sub.status}</Text>
        </View>
      ),
    },
    {
      key: 'price',
      header: t('admin.subscriptions.columns.price', 'Price'),
      width: 80,
      align: 'right',
      render: (sub) => <Text className="text-sm font-semibold text-green-500">{formatCurrency(sub.price || 0)}</Text>,
    },
    {
      key: 'start_date',
      header: t('admin.subscriptions.columns.started', 'Started'),
      width: 100,
      render: (sub) => <Text className="text-xs text-gray-400">{formatDate(sub.start_date)}</Text>,
    },
    {
      key: 'end_date',
      header: t('admin.subscriptions.columns.renews', 'Renews'),
      width: 100,
      render: (sub) => <Text className="text-xs text-gray-400">{sub.end_date ? formatDate(sub.end_date) : '-'}</Text>,
    },
  ];

  const renderActions = (sub: SubscriptionWithUser) => (
    <View className="flex-row gap-1">
      <TouchableOpacity className="w-7 h-7 rounded bg-white/10 justify-center items-center" onPress={() => handleExtend(sub)}>
        <Text className="text-xs">📅</Text>
      </TouchableOpacity>
      <TouchableOpacity className="w-7 h-7 rounded bg-white/10 justify-center items-center" onPress={() => handleApplyDiscount(sub)}>
        <Text className="text-xs">🏷️</Text>
      </TouchableOpacity>
      {sub.status === 'active' ? (
        <TouchableOpacity className="w-7 h-7 rounded justify-center items-center bg-yellow-500/30" onPress={() => handlePause(sub)}>
          <Text className="text-xs">⏸️</Text>
        </TouchableOpacity>
      ) : sub.status === 'paused' ? (
        <TouchableOpacity className="w-7 h-7 rounded justify-center items-center bg-green-500/30" onPress={() => handleResume(sub)}>
          <Text className="text-xs">▶️</Text>
        </TouchableOpacity>
      ) : null}
      {sub.status !== 'cancelled' && (
        <TouchableOpacity className="w-7 h-7 rounded justify-center items-center bg-red-500/30" onPress={() => handleCancel(sub)}>
          <Text className="text-xs">❌</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const headerActions = (
    <View className="flex-row gap-2">
      <TouchableOpacity className="px-3 py-2 rounded-lg bg-purple-600" onPress={() => navigation.navigate('PlanManagement')}>
        <Text className="text-sm text-white">⚙️ {t('admin.subscriptions.managePlans', 'Manage Plans')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout title={t('admin.titles.subscriptions', 'Subscriptions')} actions={headerActions}>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Analytics Cards */}
        <View className="flex-row flex-wrap gap-3 mb-4">
          <StatCard title={t('admin.subscriptions.active', 'Active')} value={subscriptions.filter(s => s.status === 'active').length.toString()} icon="✅" color="#10b981" />
          <StatCard title={t('admin.subscriptions.churnRate', 'Churn Rate')} value={`${churnAnalytics?.churn_rate || 0}%`} icon="📉" color={churnAnalytics?.churn_rate < 5 ? "#10b981" : "#ef4444"} />
          <StatCard title={t('admin.subscriptions.atRisk', 'At Risk')} value={(churnAnalytics?.at_risk_users || 0).toString()} icon="⚠️" color="#f59e0b" />
          <StatCard title={t('admin.subscriptions.retention', 'Retention')} value={`${churnAnalytics?.retention_rate || 0}%`} icon="📈" color="#a855f7" />
        </View>

        {/* Plan Filter */}
        <View className="flex-row rounded-lg p-0.5 mb-4 self-start bg-gray-800">
          {['', 'free', 'basic', 'premium', 'enterprise'].map((plan) => (
            <TouchableOpacity
              key={plan}
              className={`px-3 py-2 rounded ${filters.plan === plan ? 'bg-purple-500' : ''}`}
              onPress={() => setFilters(prev => ({ ...prev, plan, page: 1 }))}
            >
              <Text className={`text-sm capitalize ${filters.plan === plan ? 'text-white font-semibold' : 'text-gray-400'}`}>
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
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="w-11/12 max-w-md rounded-2xl p-4 border bg-gray-900/95 border-white/10">
              <Text className="text-xl font-bold text-white mb-2">{t('admin.subscriptions.extendSubscription', 'Extend Subscription')}</Text>
              <Text className="text-sm text-gray-400 mb-4">{selectedSub?.user.name} - {selectedSub?.plan}</Text>
              <View className="mb-3">
                <Text className="text-sm font-semibold text-white mb-1">{t('admin.subscriptions.days', 'Days to extend')}</Text>
                <TextInput className="rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-white text-base" value={extendDays} onChangeText={setExtendDays} keyboardType="numeric" placeholderTextColor="#9ca3af" />
              </View>
              <View className="flex-row gap-1 mb-4">
                {[7, 14, 30, 60, 90].map((days) => (
                  <TouchableOpacity key={days} className={`px-3 py-2 rounded border ${extendDays === days.toString() ? 'bg-purple-500/30 border-purple-500' : 'bg-gray-800 border-white/10'}`} onPress={() => setExtendDays(days.toString())}>
                    <Text className={`text-sm ${extendDays === days.toString() ? 'text-purple-500 font-semibold' : 'text-gray-400'}`}>{days}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row justify-end gap-2">
                <TouchableOpacity className="px-4 py-2 rounded-lg bg-gray-800" onPress={() => setShowExtendModal(false)}>
                  <Text className="text-sm text-gray-400">{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-4 py-2 rounded-lg bg-purple-500" onPress={handleConfirmExtend}>
                  <Text className="text-sm text-white font-semibold">{t('admin.subscriptions.extend', 'Extend')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Discount Modal */}
        <Modal visible={showDiscountModal} transparent animationType="fade" onRequestClose={() => setShowDiscountModal(false)}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="w-11/12 max-w-md rounded-2xl p-4 border bg-gray-900/95 border-white/10">
              <Text className="text-xl font-bold text-white mb-2">{t('admin.subscriptions.applyDiscount', 'Apply Discount')}</Text>
              <Text className="text-sm text-gray-400 mb-4">{selectedSub?.user.name} - {selectedSub?.plan}</Text>
              <View className="mb-3">
                <Text className="text-sm font-semibold text-white mb-1">{t('admin.subscriptions.discountPercent', 'Discount (%)')}</Text>
                <TextInput className="rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-white text-base" value={discountPercent} onChangeText={setDiscountPercent} keyboardType="numeric" placeholderTextColor="#9ca3af" />
              </View>
              <View className="mb-3">
                <Text className="text-sm font-semibold text-white mb-1">{t('admin.subscriptions.discountMonths', 'Number of months')}</Text>
                <TextInput className="rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-white text-base" value={discountMonths} onChangeText={setDiscountMonths} keyboardType="numeric" placeholderTextColor="#9ca3af" />
              </View>
              <View className="flex-row justify-end gap-2">
                <TouchableOpacity className="px-4 py-2 rounded-lg bg-gray-800" onPress={() => setShowDiscountModal(false)}>
                  <Text className="text-sm text-gray-400">{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-4 py-2 rounded-lg bg-purple-500" onPress={handleConfirmDiscount}>
                  <Text className="text-sm text-white font-semibold">{t('admin.subscriptions.apply', 'Apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AdminLayout>
  );
};

export default SubscriptionsScreen;
