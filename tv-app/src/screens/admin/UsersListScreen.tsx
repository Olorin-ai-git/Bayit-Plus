/**
 * UsersListScreen
 * Full user management list with search, filters, sorting, and bulk actions
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AdminLayout, DataTable, Column } from '@bayit/shared/admin';
import { usersService, UsersFilter } from '../../services/adminApi';
import { User, Subscription } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatDate } from '../../utils/formatters';
import { getRoleColor } from '../../utils/adminConstants';

type UserStatus = 'active' | 'inactive' | 'all';

export const UsersListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filters
  const [filters, setFilters] = useState<UsersFilter>({
    search: '',
    role: '',
    status: 'all',
    subscription: '',
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.getUsers(filters);
      setUsers(response.items);
      setTotalUsers(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setError(message);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Search handler with debounce
  const handleSearch = (text: string) => {
    setFilters(prev => ({ ...prev, search: text, page: 1 }));
  };

  // Filter handlers
  const handleRoleFilter = (role: string) => {
    setFilters(prev => ({ ...prev, role, page: 1 }));
  };

  const handleStatusFilter = (status: UserStatus) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  // Sort handler
  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort_by: key, sort_order: direction }));
  };

  // Pagination handler
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // User actions
  const handleViewUser = (user: User) => {
    navigation.navigate('UserDetail', { userId: user.id });
  };

  const handleCreateUser = () => {
    navigation.navigate('UserDetail', { userId: undefined });
  };

  const handleDeleteUser = async (user: User) => {
    Alert.alert(
      t('admin.users.deleteConfirm', 'Delete User'),
      t('admin.users.deleteMessage', `Are you sure you want to delete ${user.name}?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await usersService.deleteUser(user.id);
              loadUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
            }
          },
        },
      ]
    );
  };

  const handleBanUser = async (user: User) => {
    try {
      await usersService.banUser(user.id, 'Banned by admin');
      loadUsers();
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      await usersService.resetPassword(user.id);
      Alert.alert(
        t('admin.users.passwordReset', 'Password Reset'),
        t('admin.users.passwordResetSuccess', 'Password reset email sent successfully.')
      );
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    Alert.alert(
      t('admin.users.bulkDeleteConfirm', 'Delete Selected Users'),
      t('admin.users.bulkDeleteMessage', `Are you sure you want to delete ${selectedUsers.length} users?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedUsers.map(id => usersService.deleteUser(id)));
              setSelectedUsers([]);
              loadUsers();
            } catch (error) {
              console.error('Error bulk deleting users:', error);
            }
          },
        },
      ]
    );
  };

  const handleBulkBan = async () => {
    try {
      await Promise.all(selectedUsers.map(id => usersService.banUser(id, 'Bulk ban by admin')));
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Error bulk banning users:', error);
    }
  };

  // Get status color based on active state
  const getStatusColor = (isActive: boolean): string => {
    return isActive ? colors.success : colors.error;
  };

  // Table columns
  const columns: Column<User>[] = [
    {
      key: 'name',
      header: t('admin.users.columns.name', 'Name'),
      width: 200,
      sortable: true,
      render: (user) => (
        <View style={styles.userCell}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name?.charAt(0).toUpperCase() || '?'}
            </Text>
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
      header: t('admin.users.columns.role', 'Role'),
      width: 130,
      sortable: true,
      render: (user) => (
        <View style={[styles.badge, { backgroundColor: getRoleColor(user.role) + '30' }]}>
          <Text style={[styles.badgeText, { color: getRoleColor(user.role) }]}>
            {user.role.replace('_', ' ')}
          </Text>
        </View>
      ),
    },
    {
      key: 'is_active',
      header: t('admin.users.columns.status', 'Status'),
      width: 100,
      sortable: true,
      align: 'center',
      render: (user) => (
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.is_active) }]} />
      ),
    },
    {
      key: 'subscription',
      header: t('admin.users.columns.subscription', 'Subscription'),
      width: 130,
      render: (user) => (
        <Text style={styles.subscriptionText}>
          {user.subscription?.plan || '-'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      header: t('admin.users.columns.created', 'Created'),
      width: 120,
      sortable: true,
      render: (user) => (
        <Text style={styles.dateText}>{formatDate(user.created_at)}</Text>
      ),
    },
    {
      key: 'last_login',
      header: t('admin.users.columns.lastLogin', 'Last Login'),
      width: 120,
      sortable: true,
      render: (user) => (
        <Text style={styles.dateText}>{formatDate(user.last_login)}</Text>
      ),
    },
  ];

  // Actions renderer
  const renderActions = (user: User) => (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleViewUser(user)}
      >
        <Text style={styles.actionIcon}>👁️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleResetPassword(user)}
      >
        <Text style={styles.actionIcon}>🔑</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleBanUser(user)}
      >
        <Text style={styles.actionIcon}>🚫</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleDeleteUser(user)}
      >
        <Text style={styles.actionIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  // Header actions
  const headerActions = (
    <View style={styles.headerActions}>
      {selectedUsers.length > 0 && (
        <TouchableOpacity
          style={styles.bulkActionsButton}
          onPress={() => setShowBulkActions(true)}
        >
          <Text style={styles.bulkActionsText}>
            {t('admin.users.bulkActions', 'Bulk Actions')} ({selectedUsers.length})
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
      >
        <Text style={styles.filterButtonIcon}>🔍</Text>
        <Text style={styles.filterButtonText}>
          {t('admin.users.filters', 'Filters')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleCreateUser}
      >
        <Text style={styles.addButtonIcon}>+</Text>
        <Text style={styles.addButtonText}>
          {t('admin.users.addUser', 'Add User')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AdminLayout
      title={t('admin.titles.users', 'Users')}
      actions={headerActions}
    >
      <View style={styles.container}>
        {/* Active Filters Display */}
        {(filters.role || filters.status !== 'all' || filters.subscription) && (
          <View style={styles.activeFilters}>
            {filters.role && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => handleRoleFilter('')}
              >
                <Text style={styles.filterChipText}>
                  Role: {filters.role} ✕
                </Text>
              </TouchableOpacity>
            )}
            {filters.status !== 'all' && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => handleStatusFilter('all')}
              >
                <Text style={styles.filterChipText}>
                  Status: {filters.status} ✕
                </Text>
              </TouchableOpacity>
            )}
            {filters.subscription && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => setFilters(prev => ({ ...prev, subscription: '' }))}
              >
                <Text style={styles.filterChipText}>
                  Plan: {filters.subscription} ✕
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(user) => user.id}
          loading={loading}
          searchable
          searchPlaceholder={t('admin.users.searchPlaceholder', 'Search by name or email...')}
          onSearch={handleSearch}
          sortable
          defaultSort={{ key: 'created_at', direction: 'desc' }}
          onSort={handleSort}
          pagination={{
            page: filters.page || 1,
            pageSize: filters.page_size || 20,
            total: totalUsers,
            onPageChange: handlePageChange,
          }}
          onRowPress={handleViewUser}
          selectedRows={selectedUsers}
          onSelectionChange={setSelectedUsers}
          actions={renderActions}
          emptyMessage={t('admin.users.noUsers', 'No users found')}
        />

        {/* Filters Modal */}
        <Modal
          visible={showFilters}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {t('admin.users.filterTitle', 'Filter Users')}
              </Text>

              {/* Role Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>
                  {t('admin.users.filterRole', 'Role')}
                </Text>
                <View style={styles.filterOptions}>
                  {['', 'super_admin', 'admin', 'content_manager', 'billing_admin', 'support', 'user'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.filterOption,
                        filters.role === role && styles.filterOptionActive,
                      ]}
                      onPress={() => handleRoleFilter(role)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.role === role && styles.filterOptionTextActive,
                      ]}>
                        {role || t('common.all', 'All')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>
                  {t('admin.users.filterStatus', 'Status')}
                </Text>
                <View style={styles.filterOptions}>
                  {(['all', 'active', 'inactive'] as UserStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        filters.status === status && styles.filterOptionActive,
                      ]}
                      onPress={() => handleStatusFilter(status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.status === status && styles.filterOptionTextActive,
                      ]}>
                        {t(`admin.users.status.${status}`, status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Subscription Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>
                  {t('admin.users.filterSubscription', 'Subscription Plan')}
                </Text>
                <View style={styles.filterOptions}>
                  {['', 'free', 'basic', 'premium', 'enterprise'].map((plan) => (
                    <TouchableOpacity
                      key={plan}
                      style={[
                        styles.filterOption,
                        filters.subscription === plan && styles.filterOptionActive,
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, subscription: plan }))}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.subscription === plan && styles.filterOptionTextActive,
                      ]}>
                        {plan || t('common.all', 'All')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      role: '',
                      status: 'all',
                      subscription: '',
                    }));
                  }}
                >
                  <Text style={styles.modalCancelText}>
                    {t('admin.users.clearFilters', 'Clear All')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalApplyButton}
                  onPress={() => setShowFilters(false)}
                >
                  <Text style={styles.modalApplyText}>
                    {t('admin.users.applyFilters', 'Apply')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bulk Actions Modal */}
        <Modal
          visible={showBulkActions}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBulkActions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bulkActionsModal}>
              <Text style={styles.modalTitle}>
                {t('admin.users.bulkActionsTitle', 'Bulk Actions')}
              </Text>
              <Text style={styles.bulkActionsInfo}>
                {t('admin.users.selectedCount', '{{count}} users selected', { count: selectedUsers.length })}
              </Text>

              <TouchableOpacity
                style={styles.bulkActionItem}
                onPress={() => {
                  setShowBulkActions(false);
                  handleBulkBan();
                }}
              >
                <Text style={styles.bulkActionIcon}>🚫</Text>
                <Text style={styles.bulkActionText}>
                  {t('admin.users.bulkBan', 'Ban Selected Users')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bulkActionItem, styles.bulkActionDanger]}
                onPress={() => {
                  setShowBulkActions(false);
                  handleBulkDelete();
                }}
              >
                <Text style={styles.bulkActionIcon}>🗑️</Text>
                <Text style={[styles.bulkActionText, styles.bulkActionDangerText]}>
                  {t('admin.users.bulkDelete', 'Delete Selected Users')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkActionCancel}
                onPress={() => setShowBulkActions(false)}
              >
                <Text style={styles.bulkActionCancelText}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterButtonIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
  },
  addButtonIcon: {
    fontSize: 18,
    color: colors.text,
    marginRight: spacing.xs,
    fontWeight: 'bold',
  },
  addButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  bulkActionsButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warning + '30',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  bulkActionsText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: '600',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '30',
    borderRadius: borderRadius.sm,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  userName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subscriptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.error + '30',
  },
  actionIcon: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterOptionActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
  },
  modalCancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalApplyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  modalApplyText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  bulkActionsModal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bulkActionsInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  bulkActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  bulkActionDanger: {
    backgroundColor: colors.error + '20',
  },
  bulkActionIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  bulkActionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  bulkActionDangerText: {
    color: colors.error,
  },
  bulkActionCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  bulkActionCancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default UsersListScreen;
