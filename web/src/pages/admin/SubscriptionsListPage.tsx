import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { GlassTable, GlassButton, GlassModal, GlassCheckbox, GlassInput } from '@bayit/shared/ui';
import StatCard from '@/components/admin/StatCard';
import { subscriptionsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';
import { adminButtonStyles } from '@/styles/adminButtonStyles';

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
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{t(style.labelKey)}</Text>
      </View>
    );
  };

  const getPlanBadge = (plan: string) => {
    const style = planColors[plan] || { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280' };
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{plan}</Text>
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
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
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
        <Text style={styles.amountText}>${amount}{t('admin.subscriptions.perMonth')}</Text>
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
            <Text style={styles.dateText}>
              {new Date(date).toLocaleDateString(localeMap[locale] || 'en-US')}
            </Text>
          );
        } catch {
          return <Text style={styles.dateText}>{t('common.invalidDate')}</Text>;
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.subscriptions')}</Text>
          <Text style={styles.subtitle}>{t('admin.subscriptions.subtitle')}</Text>
        </View>
        <View style={styles.actions}>
          <GlassButton
            title={t('common.add')}
            onPress={handleAdd}
            variant="secondary"
            icon={<Plus size={18} color={colors.text} />}
            style={styles.addButton}
            textStyle={styles.buttonText}
          />
          <GlassButton
            title={t('common.edit')}
            onPress={handleEdit}
            variant="secondary"
            icon={<Edit size={18} color={colors.text} />}
            disabled={selectedIds.size !== 1}
            style={styles.actionButton}
            textStyle={styles.buttonText}
          />
          <GlassButton
            title={t('common.delete')}
            onPress={handleDelete}
            variant="secondary"
            icon={<Trash2 size={18} color={colors.error} />}
            disabled={selectedIds.size === 0}
            style={styles.deleteButton}
            textStyle={styles.buttonText}
          />
        </View>
      </View>

      <View style={[styles.selectionBar, !someSelected && styles.selectionBarHidden]}>
        {someSelected ? (
          <>
            <Users size={16} color={colors.primary} />
            <Text style={styles.selectionText}>
              {selectedIds.size} {t('admin.subscriptions.selected')}
            </Text>
          </>
        ) : (
          <Text style={styles.selectionPlaceholder}> </Text>
        )}
      </View>

      {/* Plan Stats */}
      <View style={styles.statsGrid}>
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
        <Text style={styles.modalLabel}>
          {t('admin.subscriptions.editPlan.user')}: {selectedSubscription?.user.name}
        </Text>
        <Text style={styles.modalLabel}>
          {t('admin.subscriptions.editPlan.currentPlan')}: {selectedSubscription?.plan}
        </Text>

        <Text style={styles.modalLabel}>{t('admin.subscriptions.editPlan.newPlan')}:</Text>
        <View style={styles.planSelector}>
          {plans.map((plan) => (
            <GlassButton
              key={plan.id}
              title={`${plan.name_he || plan.name} - $${plan.price}/mo`}
              onPress={() => setSelectedPlan(plan.slug)}
              variant="secondary"
              style={[
                styles.planOption,
                selectedPlan === plan.slug ? styles.planOptionSelected : styles.planOptionUnselected
              ]}
              textStyle={styles.buttonText}
            />
          ))}
        </View>

        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setEditModalOpen(false)}
            variant="secondary"
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.buttonText}
          />
          <GlassButton
            title={t('common.save')}
            onPress={handleSaveEdit}
            variant="secondary"
            style={[styles.modalButton, styles.saveButton]}
            textStyle={styles.buttonText}
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
          containerStyle={styles.inputContainer}
        />

        <GlassInput
          label={t('admin.subscriptions.addSubscription.duration')}
          value={String(durationDays)}
          onChangeText={(text) => setDurationDays(Number(text) || 30)}
          placeholder="30"
          keyboardType="numeric"
          containerStyle={styles.inputContainer}
        />

        <Text style={styles.modalLabel}>{t('admin.subscriptions.addSubscription.selectPlan')}:</Text>
        <View style={styles.planSelector}>
          {plans.map((plan) => (
            <GlassButton
              key={plan.id}
              title={`${plan.name_he || plan.name} - $${plan.price}/mo`}
              onPress={() => setSelectedPlan(plan.slug)}
              variant="secondary"
              style={[
                styles.planOption,
                selectedPlan === plan.slug ? styles.planOptionSelected : styles.planOptionUnselected
              ]}
              textStyle={styles.buttonText}
            />
          ))}
        </View>

        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setAddModalOpen(false)}
            variant="secondary"
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.buttonText}
          />
          <GlassButton
            title={t('common.save')}
            onPress={handleSaveAdd}
            variant="secondary"
            style={[styles.modalButton, styles.saveButton]}
            textStyle={styles.buttonText}
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
        <Text style={styles.modalLabel}>{errorMessage}</Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.ok')}
            onPress={() => setErrorModalOpen(false)}
            variant="secondary"
            style={[styles.modalButton, styles.saveButton]}
            textStyle={styles.buttonText}
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
        <Text style={styles.modalLabel}>
          {t('admin.subscriptions.confirmDeleteMultiple', { count: selectedIds.size })}
        </Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setDeleteConfirmOpen(false)}
            variant="secondary"
            style={[styles.modalButton, styles.cancelButton]}
            textStyle={styles.buttonText}
          />
          <GlassButton
            title={t('common.delete')}
            onPress={handleDeleteConfirm}
            variant="secondary"
            style={[styles.modalButton, styles.deleteButton]}
            textStyle={styles.buttonText}
          />
        </View>
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addButton: adminButtonStyles.primaryButton,
  actionButton: adminButtonStyles.secondaryButton,
  deleteButton: adminButtonStyles.dangerButton,
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    minHeight: 48,
  },
  selectionBarHidden: {
    backgroundColor: 'transparent',
    opacity: 0,
  },
  selectionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  selectionPlaceholder: {
    fontSize: 14,
    opacity: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dateText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalLabel: {
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  planSelector: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  planOption: {
    width: '100%',
  },
  planOptionSelected: adminButtonStyles.selectedButton,
  planOptionUnselected: adminButtonStyles.unselectedButton,
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: adminButtonStyles.cancelButton,
  saveButton: adminButtonStyles.successButton,
  inputContainer: {
    marginBottom: spacing.md,
  },
  buttonText: adminButtonStyles.buttonText,
});
