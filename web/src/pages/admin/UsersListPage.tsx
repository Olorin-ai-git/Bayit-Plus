import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, TextInput } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Edit, Ban, Key, Trash2, X } from 'lucide-react';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassButton, GlassView, GlassTable, GlassTableCell, GlassTableColumn } from '@bayit/shared/ui';
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

const statusColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.users.status.active' },
  inactive: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', labelKey: 'admin.users.status.inactive' },
  banned: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', labelKey: 'admin.users.status.blocked' },
};

const filterKeys: Record<string, string> = {
  all: 'admin.users.filters.all',
  active: 'admin.users.filters.active',
  inactive: 'admin.users.filters.inactive',
  banned: 'admin.users.filters.blocked',
};

export default function UsersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'all' });

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [banModal, setBanModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
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

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
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
      loadUsers();
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
      loadUsers();
    } catch (error) {
      logger.error('Failed to ban/unban user', 'UsersListPage', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(t('admin.users.confirmResetPassword', { email: user.email }))) return;
    try {
      await usersService.resetPassword(user.id);
      alert(t('admin.users.resetPasswordSent'));
    } catch (error) {
      logger.error('Failed to reset password', 'UsersListPage', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || statusColors.inactive;
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{t(style.labelKey)}</Text>
      </View>
    );
  };

  const columns: GlassTableColumn<User>[] = [
    {
      key: 'name',
      label: t('admin.users.columns.name'),
      render: (_: any, user: User) => (
        <View style={[styles.userCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0) || '?'}</Text>
          </View>
          <GlassTableCell.TwoLine
            primary={user.name}
            secondary={user.email}
            align={isRTL ? 'right' : 'left'}
          />
        </View>
      ),
    },
    {
      key: 'role',
      label: t('admin.users.columns.role'),
      width: 100,
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
    },
    {
      key: 'status',
      label: t('admin.users.columns.status'),
      width: 100,
      render: (status: string) => {
        const variant = status === 'active' ? 'success' : status === 'banned' ? 'error' : 'default';
        const style = statusColors[status] || statusColors.inactive;
        return (
          <GlassTableCell.Badge variant={variant}>
            {t(style.labelKey)}
          </GlassTableCell.Badge>
        );
      },
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
    },
    {
      key: 'actions',
      label: '',
      width: 140,
      render: (_: any, user: User) => (
        <GlassTableCell.Actions isRTL={isRTL}>
          <GlassTableCell.ActionButton
            onPress={() => handleEdit(user)}
            icon={<Edit size={16} color="#3b82f6" />}
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
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.users')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.users.subtitle')}</Text>
        </View>
        <Link to="/admin/users/new" style={{ textDecoration: 'none' }}>
          <GlassButton
            title={t('admin.users.addUser')}
            variant="primary"
            icon={<UserPlus size={18} color={colors.text} />}
          />
        </Link>
      </View>

      {/* Filters */}
      <View style={[styles.filtersRow, { flexDirection }]}>
        {(['all', 'active', 'inactive', 'banned'] as const).map((status) => (
          <Pressable
            key={status}
            onPress={() => setFilters((prev) => ({ ...prev, status }))}
            style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filters.status === status && styles.filterTextActive]}>
              {t(filterKeys[status])}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Table */}
      <GlassTable
        columns={columns}
        data={users}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage={t('admin.users.emptyMessage', { defaultValue: 'No users found' })}
        isRTL={isRTL}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal({ open: false, user: null })}
      >
        <View style={styles.modalOverlay}>
          <GlassView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('admin.users.confirmDelete', 'Delete User')}</Text>
              <Pressable onPress={() => setDeleteModal({ open: false, user: null })}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.modalText}>
              {t('admin.users.confirmDeleteMessage', 'Are you sure you want to delete {{name}}? This action cannot be undone.', { name: deleteModal.user?.name })}
            </Text>
            <View style={styles.modalActions}>
              <GlassButton
                title={t('common.cancel', 'Cancel')}
                variant="secondary"
                onPress={() => setDeleteModal({ open: false, user: null })}
              />
              <GlassButton
                title={actionLoading ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                variant="primary"
                onPress={handleDeleteConfirm}
                disabled={actionLoading}
                style={{ backgroundColor: colors.error }}
              />
            </View>
          </GlassView>
        </View>
      </Modal>

      {/* Ban/Unban Modal */}
      <Modal
        visible={banModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => setBanModal({ open: false, user: null })}
      >
        <View style={styles.modalOverlay}>
          <GlassView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {banModal.user?.status === 'banned'
                  ? t('admin.users.unban')
                  : t('admin.users.block')}
              </Text>
              <Pressable onPress={() => setBanModal({ open: false, user: null })}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {banModal.user?.status !== 'banned' && (
              <>
                <Text style={styles.modalLabel}>{t('admin.users.banReasonPrompt')}</Text>
                <TextInput
                  value={banReason}
                  onChangeText={setBanReason}
                  placeholder={t('admin.users.banReason')}
                  placeholderTextColor={colors.textMuted}
                  style={styles.modalInput}
                  multiline
                />
              </>
            )}
            {banModal.user?.status === 'banned' && (
              <Text style={styles.modalText}>
                {t('admin.users.confirmUnban')}
              </Text>
            )}
            <View style={styles.modalActions}>
              <GlassButton
                title={t('common.cancel', 'Cancel')}
                variant="secondary"
                onPress={() => setBanModal({ open: false, user: null })}
              />
              <GlassButton
                title={actionLoading
                  ? t('common.saving', 'Saving...')
                  : banModal.user?.status === 'banned'
                    ? t('admin.users.unban')
                    : t('admin.users.block')}
                variant="primary"
                onPress={handleBanConfirm}
                disabled={actionLoading}
                style={{ backgroundColor: banModal.user?.status === 'banned' ? '#22C55E' : '#F59E0B' }}
              />
            </View>
          </GlassView>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
