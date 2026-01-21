import { useState, useEffect, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, MoreVertical, Edit, Ban, Key, Trash2 } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'banned';
  subscription?: {
    plan: string;
  };
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', label: 'פעיל' },
  inactive: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', label: 'לא פעיל' },
  banned: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', label: 'חסום' },
};

const filterLabels: Record<string, string> = {
  all: 'הכל',
  active: 'פעילים',
  inactive: 'לא פעילים',
  banned: 'חסומים',
};

export default function UsersListPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersService.getUsers({
        ...filters,
        page: pagination.page,
        page_size: pagination.pageSize,
      });
      setUsers(data.items || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      logger.error('Failed to load users', 'UsersListPage', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.inactive;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{style.label}</Text>
      </View>
    );
  };

  const columns = [
    {
      key: 'name',
      label: 'שם',
      render: (_: any, user: User) => (
        <View style={styles.userCell}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0) || '?'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'role',
      label: 'תפקיד',
      render: (role: string) => (
        <Text style={styles.cellText}>{role || 'user'}</Text>
      ),
    },
    {
      key: 'subscription',
      label: 'מנוי',
      render: (sub: User['subscription']) => (
        <Text style={styles.cellText}>{sub?.plan || 'ללא מנוי'}</Text>
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      render: (status: string) => getStatusBadge(status),
    },
    {
      key: 'created_at',
      label: 'נוצר',
      render: (date: string) => (
        <Text style={styles.dateText}>
          {new Date(date).toLocaleDateString('he-IL')}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 50,
      render: (_: any, user: User) => (
        <View style={styles.actionsCell}>
          <Pressable style={styles.actionButton}>
            <MoreVertical size={16} color={colors.textMuted} />
          </Pressable>
          {/* Dropdown menu would be implemented with a modal or native menu */}
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>{t('admin.titles.users', 'ניהול משתמשים')}</Text>
          <Text style={styles.subtitle}>צפה ונהל את משתמשי המערכת</Text>
        </View>
        <Link to="/admin/users/new" style={{ textDecoration: 'none' }}>
          <GlassButton
            title="הוסף משתמש"
            variant="primary"
            icon={<UserPlus size={18} color={colors.text} />}
          />
        </Link>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {(['all', 'active', 'inactive', 'banned'] as const).map((status) => (
          <Pressable
            key={status}
            onPress={() => setFilters((prev) => ({ ...prev, status }))}
            style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filters.status === status && styles.filterTextActive]}>
              {filterLabels[status]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchPlaceholder="חפש משתמש..."
        onSearch={handleSearch}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="לא נמצאו משתמשים"
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.text,
    fontWeight: '500',
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
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
  cellText: {
    fontSize: 14,
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
