import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Edit, Ban, Key, Trash2 } from 'lucide-react';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassButton, GlassModal, GlassInput } from '@bayit/shared/ui';
import { GlassTable, GlassTableCell, type GlassTableColumn } from '@bayit/shared/ui/web';
import { useDirection } from '@/hooks/useDirection';
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

type FilterStatus = 'all' | 'active' | 'inactive' | 'banned';

interface ModalState {
  open: boolean;
  user: User | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; labelKey: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.users.status.active' },
  inactive: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', labelKey: 'admin.users.status.inactive' },
  banned: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', labelKey: 'admin.users.status.blocked' },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'admin.users.roles.superAdmin',
  admin: 'admin.users.roles.admin',
  moderator: 'admin.users.roles.moderator',
  user: 'admin.users.roles.user',
};

const FILTER_KEYS: Record<FilterStatus, string> = {
  all: 'admin.users.filters.all',
  active: 'admin.users.filters.active',
  inactive: 'admin.users.filters.inactive',
  banned: 'admin.users.filters.blocked',
};

const FILTERS: FilterStatus[] = ['all', 'active', 'inactive', 'banned'];

export default function UsersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' as FilterStatus });

  const [deleteModal, setDeleteModal] = useState<ModalState>({ open: false, user: null });
  const [banModal, setBanModal] = useState<ModalState>({ open: false, user: null });
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleFilterChange = (status: FilterStatus) => {
    setFilters((prev) => ({ ...prev, status }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleEdit = (user: User) => {
    navigate(`/admin/users/${user.id}`);
  };

  const handleDeleteClick = (user: User) => {
    setDeleteModal({ open: true, user });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.user) return;
    setActionLoading(true);
    try {
      await usersService.deleteUser(deleteModal.user.id);
      setDeleteModal({ open: false, user: null });
      await loadUsers();
    } catch (error) {
      logger.error('Failed to delete user', 'UsersListPage', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanClick = (user: User) => {
    setBanModal({ open: true, user });
    setBanReason('');
  };

  const handleBanConfirm = async () => {
    if (!banModal.user) return;
    setActionLoading(true);
    try {
      if (banModal.user.status === 'banned') {
        await usersService.unbanUser(banModal.user.id);
      } else {
        await usersService.banUser(banModal.user.id, banReason);
      }
      setBanModal({ open: false, user: null });
      await loadUsers();
    } catch (error) {
      logger.error('Failed to ban/unban user', 'UsersListPage', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      await usersService.resetPassword(user.id);
      logger.info('Password reset email sent', 'UsersListPage', { userId: user.id });
    } catch (error) {
      logger.error('Failed to reset password', 'UsersListPage', error);
    }
  };

  const renderUserCell = (user: User) => (
    <View style={[styles.userCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.avatar, isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }]}>
        <Text style={styles.avatarText}>{user.name?.charAt(0) || '?'}</Text>
      </View>
      <GlassTableCell.TwoLine
        primary={user.name}
        secondary={user.email}
        align={isRTL ? 'right' : 'left'}
      />
    </View>
  );

  const renderStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'inactive';
    const variant = normalizedStatus === 'active' ? 'success' : normalizedStatus === 'banned' ? 'error' : 'default';
    const style = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.inactive;
    return (
      <GlassTableCell.Badge variant={variant}>
        {t(style.labelKey)}
      </GlassTableCell.Badge>
    );
  };

  const renderRole = (role: string) => {
    const roleKey = ROLE_LABELS[role] || 'admin.users.roles.user';
    return (
      <GlassTableCell.Text>
        {t(roleKey, { defaultValue: role })}
      </GlassTableCell.Text>
    );
  };

  const renderActions = (user: User) => (
    <GlassTableCell.Actions isRTL={isRTL}>
      <GlassTableCell.ActionButton
        onPress={() => handleEdit(user)}
        icon={<Edit size={16} color="#a855f7" />}
        variant="primary"
      />
      <GlassTableCell.ActionButton
        onPress={() => handleResetPassword(user)}
        icon={<Key size={16} color={colors.textMuted} />}
      />
      <GlassTableCell.ActionButton
        onPress={() => handleBanClick(user)}
        icon={<Ban size={16} color={user.status === 'banned' ? '#22C55E' : '#F59E0B'} />}
      />
      <GlassTableCell.ActionButton
        onPress={() => handleDeleteClick(user)}
        icon={<Trash2 size={16} color="#ef4444" />}
        variant="danger"
      />
    </GlassTableCell.Actions>
  );

  const columns: GlassTableColumn<User>[] = [
    {
      key: 'name',
      label: t('admin.users.columns.name'),
      render: (_: any, user: User) => renderUserCell(user),
      align: isRTL ? 'right' : 'left',
    },
    {
      key: 'role',
      label: t('admin.users.columns.role'),
      width: 120,
      render: (role: string) => renderRole(role),
      align: isRTL ? 'right' : 'left',
    },
    {
      key: 'subscription',
      label: t('admin.users.columns.subscription'),
      width: 120,
      render: (sub: User['subscription']) => (
        <GlassTableCell.Text muted={!sub?.plan}>
          {sub?.plan || t('admin.users.columns.noSubscription')}
        </GlassTableCell.Text>
      ),
      align: isRTL ? 'right' : 'left',
    },
    {
      key: 'status',
      label: t('admin.users.columns.status'),
      width: 100,
      render: (status: string) => renderStatusBadge(status),
      align: isRTL ? 'right' : 'left',
    },
    {
      key: 'created_at',
      label: t('admin.users.columns.created'),
      width: 100,
      render: (date: string) => (
        <GlassTableCell.Text muted>
          {new Date(date).toLocaleDateString('he-IL')}
        </GlassTableCell.Text>
      ),
      align: isRTL ? 'right' : 'left',
    },
    {
      key: 'actions',
      label: '',
      width: 140,
      render: (_: any, user: User) => renderActions(user),
      align: 'center',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.users')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.users.subtitle')}</Text>
        </View>
        <Link to="/admin/users/new" style={styles.link}>
          <GlassButton
            title={t('admin.users.addUser')}
            variant="primary"
            icon={<UserPlus size={18} color="white" />}
          />
        </Link>
      </View>

      <View style={[styles.filtersRow, { flexDirection }]}>
        {FILTERS.map((status) => (
          <Pressable
            key={status}
            onPress={() => handleFilterChange(status)}
            style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filters.status === status && styles.filterTextActive]}>
              {t(FILTER_KEYS[status])}
            </Text>
          </Pressable>
        ))}
      </View>

      <GlassTable
        columns={columns}
        data={users}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={t('admin.users.emptyMessage', { defaultValue: 'No users found' })}
        isRTL={isRTL}
      />

      <GlassModal
        visible={deleteModal.open}
        title={t('admin.users.confirmDelete', 'Delete User')}
        onClose={() => setDeleteModal({ open: false, user: null })}
        dismissable={true}
      >
        <Text style={styles.modalText}>
          {t('admin.users.confirmDeleteMessage', 'Are you sure you want to delete {{name}}? This action cannot be undone.', { name: deleteModal.user?.name })}
        </Text>
        <View style={styles.modalActions}>
          <View style={styles.modalButton}>
            <GlassButton
              title={t('common.cancel', 'Cancel')}
              variant="cancel"
              onPress={() => setDeleteModal({ open: false, user: null })}
            />
          </View>
          <View style={styles.modalButton}>
            <GlassButton
              title={actionLoading ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
              variant="danger"
              onPress={handleDeleteConfirm}
              disabled={actionLoading}
            />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={banModal.open}
        title={banModal.user?.status === 'banned' ? t('admin.users.unban') : t('admin.users.block')}
        onClose={() => setBanModal({ open: false, user: null })}
        dismissable={true}
      >
        {banModal.user?.status !== 'banned' && (
          <GlassInput
            label={t('admin.users.banReasonPrompt')}
            value={banReason}
            onChangeText={setBanReason}
            placeholder={t('admin.users.banReason')}
            containerStyle={styles.modalInput}
            multiline
          />
        )}
        {banModal.user?.status === 'banned' && (
          <Text style={styles.modalText}>
            {t('admin.users.confirmUnban')}
          </Text>
        )}
        <View style={styles.modalActions}>
          <View style={styles.modalButton}>
            <GlassButton
              title={t('common.cancel', 'Cancel')}
              variant="cancel"
              onPress={() => setBanModal({ open: false, user: null })}
            />
          </View>
          <View style={styles.modalButton}>
            <GlassButton
              title={actionLoading
                ? t('common.saving', 'Saving...')
                : banModal.user?.status === 'banned'
                  ? t('admin.users.unban')
                  : t('admin.users.block')}
              variant={banModal.user?.status === 'banned' ? 'success' : 'warning'}
              onPress={handleBanConfirm}
              disabled={actionLoading}
            />
          </View>
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
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  link: {
    textDecoration: 'none',
  },
  filtersRow: {
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  filterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  filterText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: '#a855f7',
    fontWeight: '600',
  },
  userCell: {
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a855f7',
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalInput: {
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
