import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { GlassButton, GlassModal, GlassCheckbox, GlassInput } from '@bayit/shared/ui';
import { GlassTable } from '@bayit/shared/ui/web';
import StatCard from '@/components/admin/StatCard';
import { subscriptionsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface User {
  name: string;
  email: string;
  id: string;
}

interface Subscription {
  id: string;
  user_id: string;
  user: User;
  plan: string;
  amount: number;
  next_billing: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
}

interface Plan {
  id: string;
  name: string;
  name_he?: string;
  slug: string;
  price: number;
  subscribers: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const statusColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.subscriptions.status.active' },
  paused: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', labelKey: 'admin.subscriptions.status.paused' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', labelKey: 'admin.subscriptions.status.cancelled' },
  expired: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', labelKey: 'admin.subscriptions.status.expired' },
};

const planColors: Record<string, { bg: string; text: string }> = {
  Basic: { bg: 'rgba(107, 33, 168, 0.3)', text: '#3B82F6' },
  basic: { bg: 'rgba(107, 33, 168, 0.3)', text: '#3B82F6' },
  Premium: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' },
  premium: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' },
  Family: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  family: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
};

export default function SubscriptionsListPage() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [durationDays, setDurationDays] = useState(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subsData, plansData] = await Promise.all([
        subscriptionsService.getSubscriptions({
          page: pagination.page,
          page_size: pagination.pageSize,
        }),
        subscriptionsService.getPlans(),
      ]);

      // Transform data to match expected structure
      const transformedSubs = (subsData.items || []).map(item => ({
        ...item,
        amount: item.amount || 0,
        next_billing: item.end_date || item.next_billing || new Date().toISOString(),
      }));

      setSubscriptions(transformedSubs);
      setPlans(plansData || []);
      setPagination((prev) => ({ ...prev, total: subsData.total || 0 }));
    } catch (error) {
      logger.error('Failed to load subscriptions', 'SubscriptionsListPage', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(subscriptions.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleEdit = () => {
    if (selectedIds.size !== 1) {
      setErrorMessage(t('admin.subscriptions.selectOneToEdit'));
      setErrorModalOpen(true);
      return;
    }
    const sub = subscriptions.find(s => selectedIds.has(s.id));
    if (sub) {
      setSelectedSubscription(sub);
      setSelectedPlan(sub.plan);
      setEditModalOpen(true);
    }
  };

  const handleAdd = () => {
    setNewUserEmail('');
    setSelectedPlan('');
    setDurationDays(30);
    setAddModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!newUserEmail || !selectedPlan) {
      setErrorMessage(t('admin.subscriptions.fillAllFields'));
      setErrorModalOpen(true);
      return;
    }

    try {
      const user = subscriptions.find(s => s.user.email === newUserEmail);
      if (!user) {
        setErrorMessage(t('admin.subscriptions.userNotFound'));
        setErrorModalOpen(true);
        return;
      }

      await subscriptionsService.createSubscription(user.user_id, selectedPlan, durationDays);
      setAddModalOpen(false);
      setNewUserEmail('');
      setSelectedPlan('');
      setDurationDays(30);
      loadData();
    } catch (error) {
      logger.error('Failed to create subscription', 'SubscriptionsListPage', error);
      setErrorMessage(t('common.error'));
      setErrorModalOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSubscription || !selectedPlan) return;

    try {
      await subscriptionsService.updateSubscriptionPlan(selectedSubscription.user_id, selectedPlan);
      setEditModalOpen(false);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      logger.error('Failed to update subscription', 'SubscriptionsListPage', error);
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) {
      setErrorMessage(t('admin.subscriptions.selectToDelete'));
      setErrorModalOpen(true);
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const deletePromises = Array.from(selectedIds).map(id => {
        const sub = subscriptions.find(s => s.id === id);
        return sub ? subscriptionsService.deleteSubscription(sub.user_id) : null;
      });

      await Promise.all(deletePromises.filter(p => p !== null));
      setDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      logger.error('Failed to delete subscriptions', 'SubscriptionsListPage', error);
      setDeleteConfirmOpen(false);
      setErrorMessage(t('common.error'));
      setErrorModalOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.active;
    return (
      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: style.bg }}>
        <Text className="text-xs font-medium" style={{ color: style.text }}>{t(style.labelKey)}</Text>
      </View>
    );
  };

  const getPlanBadge = (plan: string) => {
    const style = planColors[plan] || { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280' };
    return (
      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: style.bg }}>
        <Text className="text-xs font-medium" style={{ color: style.text }}>{plan}</Text>
      </View>
    );
  };

  const allSelected = subscriptions.length > 0 && selectedIds.size === subscriptions.length;
  const someSelected = selectedIds.size > 0;

  const columns = [
    {
      key: 'select',
      label: (
        <GlassCheckbox
          checked={allSelected}
          onChange={handleSelectAll}
        />
      ),
      width: 50,
      render: (_: any, sub: Subscription) => (
        <GlassCheckbox
          checked={selectedIds.has(sub.id)}
          onChange={(checked) => handleSelectOne(sub.id, checked)}
        />
      ),
    },
    {
      key: 'user',
      label: t('admin.subscriptions.columns.user'),
      render: (user: User) => (
        <View>
          <Text className="text-sm font-medium text-white">{user?.name}</Text>
          <Text className="text-xs text-gray-400">{user?.email}</Text>
        </View>
      ),
    },
    {
      key: 'plan',
      label: t('admin.subscriptions.columns.plan'),
      render: (plan: string) => getPlanBadge(plan),
    },
    {
      key: 'amount',
      label: t('admin.subscriptions.columns.price'),
      render: (amount: number) => (
        <Text className="text-sm font-medium text-white">${amount}{t('admin.subscriptions.perMonth')}</Text>
      ),
    },
    {
      key: 'next_billing',
      label: t('admin.subscriptions.columns.nextBilling'),
      render: (date: string) => {
        try {
          const locale = i18n.language || 'en';
          const localeMap: Record<string, string> = {
            'en': 'en-US',
            'he': 'he-IL',
            'es': 'es-ES'
          };
          return (
            <Text className="text-sm text-gray-400">
              {new Date(date).toLocaleDateString(localeMap[locale] || 'en-US')}
            </Text>
          );
        } catch {
          return <Text className="text-sm text-gray-400">{t('common.invalidDate')}</Text>;
        }
      },
    },
    {
      key: 'status',
      label: t('admin.subscriptions.columns.status'),
      render: (status: string) => getStatusBadge(status),
    },
  ];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      {/* Header */}
      <View className="mb-6 flex flex-row justify-between items-start">
        <View>
          <Text className="text-2xl font-bold text-white">{t('admin.titles.subscriptions')}</Text>
          <Text className="text-sm text-gray-400 mt-1">{t('admin.subscriptions.subtitle')}</Text>
        </View>
        <View className="flex flex-row gap-2">
          <GlassButton
            title={t('common.add')}
            onPress={handleAdd}
            variant="primary"
            icon={<Plus size={18} color="white" />}
          />
          <GlassButton
            title={t('common.edit')}
            onPress={handleEdit}
            variant="ghost"
            icon={<Edit size={18} color="white" />}
            disabled={selectedIds.size !== 1}
          />
          <GlassButton
            title={t('common.delete')}
            onPress={handleDelete}
            variant="danger"
            icon={<Trash2 size={18} color="white" />}
            disabled={selectedIds.size === 0}
          />
        </View>
      </View>

      <View className={`flex flex-row items-center gap-2 p-4 bg-purple-700/20 rounded-lg mb-4 min-h-[48px] ${!someSelected ? 'bg-transparent opacity-0' : ''}`}>
        {someSelected ? (
          <>
            <Users size={16} color={colors.primary} />
            <Text className="text-purple-500 text-sm font-medium">
              {selectedIds.size} {t('admin.subscriptions.selected')}
            </Text>
          </>
        ) : (
          <Text className="text-sm opacity-0"> </Text>
        )}
      </View>

      {/* Plan Stats */}
      <View className="flex flex-row gap-4 mb-6">
        {plans.map((plan) => (
          <StatCard
            key={plan.id}
            title={plan.name_he || plan.name}
            value={plan.subscribers || 0}
            subtitle={`$${plan.price}${t('admin.subscriptions.perMonth')}`}
            icon="📦"
            color={plan.name === 'Premium' || plan.name === 'premium' ? 'secondary' : plan.name === 'Family' || plan.name === 'family' ? 'warning' : 'primary'}
          />
        ))}
      </View>

      {/* Table */}
      <GlassTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        searchPlaceholder={t('admin.subscriptions.searchPlaceholder')}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.subscriptions.emptyMessage')}
        isRTL={isRTL}
      />

      {/* Edit Plan Modal */}
      <GlassModal
        visible={editModalOpen}
        title={t('admin.subscriptions.editPlan.title')}
        onClose={() => setEditModalOpen(false)}
        dismissable={true}
      >
        <Text className="text-sm text-white mt-4 mb-1">
          {t('admin.subscriptions.editPlan.user')}: {selectedSubscription?.user.name}
        </Text>
        <Text className="text-sm text-white mt-4 mb-1">
          {t('admin.subscriptions.editPlan.currentPlan')}: {selectedSubscription?.plan}
        </Text>

        <Text className="text-sm text-white mt-4 mb-1">{t('admin.subscriptions.editPlan.newPlan')}:</Text>
        <View className="gap-2 mt-2">
          {plans.map((plan) => (
            <GlassButton
              key={plan.id}
              title={`${plan.name_he || plan.name} - $${plan.price}/mo`}
              onPress={() => setSelectedPlan(plan.slug)}
              variant={selectedPlan === plan.slug ? 'primary' : 'ghost'}
              className="w-full"
            />
          ))}
        </View>

        <View className="flex flex-row gap-4 mt-6">
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setEditModalOpen(false)}
            variant="cancel"
            className="flex-1"
          />
          <GlassButton
            title={t('common.save')}
            onPress={handleSaveEdit}
            variant="success"
            className="flex-1"
          />
        </View>
      </GlassModal>

      {/* Add Subscription Modal */}
      <GlassModal
        visible={addModalOpen}
        title={t('admin.subscriptions.addSubscription.title')}
        onClose={() => setAddModalOpen(false)}
        dismissable={true}
      >
        <GlassInput
          label={t('admin.subscriptions.addSubscription.userEmail')}
          value={newUserEmail}
          onChangeText={setNewUserEmail}
          placeholder={t('admin.subscriptions.addSubscription.emailPlaceholder')}
          autoCapitalize="none"
          keyboardType="email-address"
          containerStyle="mb-4"
        />

        <GlassInput
          label={t('admin.subscriptions.addSubscription.duration')}
          value={String(durationDays)}
          onChangeText={(text) => setDurationDays(Number(text) || 30)}
          placeholder="30"
          keyboardType="numeric"
          containerStyle="mb-4"
        />

        <Text className="text-sm text-white mt-4 mb-1">{t('admin.subscriptions.addSubscription.selectPlan')}:</Text>
        <View className="gap-2 mt-2">
          {plans.map((plan) => (
            <GlassButton
              key={plan.id}
              title={`${plan.name_he || plan.name} - $${plan.price}/mo`}
              onPress={() => setSelectedPlan(plan.slug)}
              variant={selectedPlan === plan.slug ? 'primary' : 'ghost'}
              className="w-full"
            />
          ))}
        </View>

        <View className="flex flex-row gap-4 mt-6">
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setAddModalOpen(false)}
            variant="cancel"
            className="flex-1"
          />
          <GlassButton
            title={t('common.save')}
            onPress={handleSaveAdd}
            variant="success"
            className="flex-1"
          />
        </View>
      </GlassModal>

      {/* Error Modal */}
      <GlassModal
        visible={errorModalOpen}
        title={t('common.error')}
        onClose={() => setErrorModalOpen(false)}
        dismissable={true}
      >
        <Text className="text-sm text-white mt-4 mb-1">{errorMessage}</Text>
        <View className="flex flex-row gap-4 mt-6">
          <GlassButton
            title={t('common.ok')}
            onPress={() => setErrorModalOpen(false)}
            variant="success"
            className="flex-1"
          />
        </View>
      </GlassModal>

      {/* Delete Confirmation Modal */}
      <GlassModal
        visible={deleteConfirmOpen}
        title={t('common.confirm')}
        onClose={() => setDeleteConfirmOpen(false)}
        dismissable={true}
      >
        <Text className="text-sm text-white mt-4 mb-1">
          {t('admin.subscriptions.confirmDeleteMultiple', { count: selectedIds.size })}
        </Text>
        <View className="flex flex-row gap-4 mt-6">
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setDeleteConfirmOpen(false)}
            variant="cancel"
            className="flex-1"
          />
          <GlassButton
            title={t('common.delete')}
            onPress={handleDeleteConfirm}
            variant="danger"
            className="flex-1"
          />
        </View>
      </GlassModal>
    </ScrollView>
  );
}

