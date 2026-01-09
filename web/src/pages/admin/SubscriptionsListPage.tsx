import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Pause, Play, XCircle, PlusCircle } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatCard from '@/components/admin/StatCard';
import { subscriptionsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface User {
  name: string;
  email: string;
}

interface Subscription {
  id: string;
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
  Basic: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3B82F6' },
  Premium: { bg: 'rgba(139, 92, 246, 0.2)', text: '#8B5CF6' },
  Family: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
};

export default function SubscriptionsListPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });

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
      setSubscriptions(subsData.items || []);
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

  const columns = [
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
      render: (date: string) => (
        <Text style={styles.dateText}>
          {new Date(date).toLocaleDateString('he-IL')}
        </Text>
      ),
    },
    {
      key: 'status',
      label: t('admin.subscriptions.columns.status'),
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: 'actions',
      label: '',
      width: 50,
      render: (_: any, sub: Subscription) => (
        <View style={styles.actionsCell}>
          <Pressable style={styles.actionButton}>
            <MoreVertical size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{t('admin.titles.subscriptions')}</Text>
        <Text style={styles.subtitle}>{t('admin.subscriptions.subtitle')}</Text>
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
            color={plan.name === 'Premium' ? 'secondary' : plan.name === 'Family' ? 'warning' : 'primary'}
          />
        ))}
      </View>

      {/* Table */}
      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        searchPlaceholder={t('admin.subscriptions.searchPlaceholder')}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.subscriptions.emptyMessage')}
      />
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
  actionsCell: {
    position: 'relative',
  },
  actionButton: {
    padding: spacing.xs,
  },
});
