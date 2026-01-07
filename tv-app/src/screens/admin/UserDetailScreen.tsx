/**
 * UserDetailScreen
 * Full user detail view with editing, role management, activity history, and billing
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDirection } from '@bayit/shared/hooks';
import { AdminLayout } from '@bayit/shared/admin';
import { usersService } from '../../services/adminApi';
import { User, Role, Permission, AuditLog, Transaction, ROLE_PERMISSIONS } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getRoleColor, getRoleLabel } from '../../utils/adminConstants';

type UserDetailRouteProp = RouteProp<AdminStackParamList, 'UserDetail'>;

type TabType = 'profile' | 'permissions' | 'activity' | 'billing' | 'subscription';

export const UserDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<UserDetailRouteProp>();
  const { userId } = route.params;

  const isNewUser = !userId;

  // State
  const [loading, setLoading] = useState(!isNewUser);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [billingHistory, setBillingHistory] = useState<Transaction[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as Role,
    is_active: true,
    permissions: [] as Permission[],
  });

  // Load user data
  useEffect(() => {
    if (!isNewUser) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, activityData, billingData] = await Promise.all([
        usersService.getUser(userId!),
        usersService.getUserActivity(userId!, 50),
        usersService.getUserBillingHistory(userId!),
      ]);
      setUser(userData);
      setActivity(activityData);
      setBillingHistory(billingData);
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '',
        role: userData.role,
        is_active: userData.is_active,
        permissions: userData.permissions || [],
      });
    } catch (err) {
      console.error('Error loading user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Save user
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert(
        t('admin.users.validationError', 'Validation Error'),
        t('admin.users.nameEmailRequired', 'Name and email are required.')
      );
      return;
    }

    if (isNewUser && !formData.password) {
      Alert.alert(
        t('admin.users.validationError', 'Validation Error'),
        t('admin.users.passwordRequired', 'Password is required for new users.')
      );
      return;
    }

    setSaving(true);
    try {
      if (isNewUser) {
        await usersService.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          is_active: formData.is_active,
        });
        Alert.alert(
          t('admin.users.created', 'User Created'),
          t('admin.users.createdSuccess', 'User has been created successfully.')
        );
        navigation.goBack();
      } else {
        await usersService.updateUser(userId!, {
          name: formData.name,
          email: formData.email,
          is_active: formData.is_active,
        });
        Alert.alert(
          t('admin.users.updated', 'User Updated'),
          t('admin.users.updatedSuccess', 'User has been updated successfully.')
        );
        loadUserData();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert(
        t('admin.users.saveError', 'Error'),
        t('admin.users.saveErrorMessage', 'Failed to save user. Please try again.')
      );
    } finally {
      setSaving(false);
    }
  };

  // Update role
  const handleUpdateRole = async (newRole: Role) => {
    setSaving(true);
    try {
      await usersService.updateRole(userId!, newRole, formData.permissions);
      setFormData(prev => ({ ...prev, role: newRole }));
      setShowRoleModal(false);
      loadUserData();
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle permission
  const handleTogglePermission = (permission: Permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // Reset password
  const handleResetPassword = async () => {
    try {
      await usersService.resetPassword(userId!);
      setShowPasswordModal(false);
      Alert.alert(
        t('admin.users.passwordReset', 'Password Reset'),
        t('admin.users.passwordResetSuccess', 'Password reset email has been sent.')
      );
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  // Ban user
  const handleBanUser = async () => {
    Alert.alert(
      t('admin.users.banConfirm', 'Ban User'),
      t('admin.users.banMessage', 'Are you sure you want to ban this user?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('admin.users.ban', 'Ban'),
          style: 'destructive',
          onPress: async () => {
            try {
              await usersService.banUser(userId!, 'Banned by admin');
              loadUserData();
            } catch (error) {
              console.error('Error banning user:', error);
            }
          },
        },
      ]
    );
  };

  // Delete user
  const handleDeleteUser = async () => {
    Alert.alert(
      t('admin.users.deleteConfirm', 'Delete User'),
      t('admin.users.deleteMessage', 'Are you sure you want to permanently delete this user?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await usersService.deleteUser(userId!);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting user:', error);
            }
          },
        },
      ]
    );
  };

  // Tabs
  const tabs: { key: TabType; label: string }[] = [
    { key: 'profile', label: t('admin.users.tabs.profile', 'Profile') },
    { key: 'permissions', label: t('admin.users.tabs.permissions', 'Permissions') },
    { key: 'activity', label: t('admin.users.tabs.activity', 'Activity') },
    { key: 'billing', label: t('admin.users.tabs.billing', 'Billing') },
    { key: 'subscription', label: t('admin.users.tabs.subscription', 'Subscription') },
  ];

  if (loading) {
    return (
      <AdminLayout title={t('admin.titles.userDetail', 'User Detail')}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title={t('admin.titles.userDetail', 'User Detail')}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
            <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </AdminLayout>
    );
  }

  const rolePermissions = ROLE_PERMISSIONS[formData.role] || [];
  const allPermissions = Object.keys(ROLE_PERMISSIONS.super_admin) as Permission[];

  return (
    <AdminLayout
      title={isNewUser ? t('admin.titles.newUser', 'New User') : user?.name || 'User'}
      actions={
        !isNewUser && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <Text style={styles.actionButtonText}>🔑 {t('admin.users.resetPassword', 'Reset Password')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleBanUser}
            >
              <Text style={styles.dangerButtonText}>🚫 {t('admin.users.ban', 'Ban')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDeleteUser}
            >
              <Text style={styles.dangerButtonText}>🗑️ {t('common.delete', 'Delete')}</Text>
            </TouchableOpacity>
          </View>
        )
      }
    >
      <View style={styles.container}>
        {/* User Header Card */}
        {!isNewUser && user && (
          <View style={styles.userHeader}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>
                {user.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userHeaderInfo}>
              <Text style={styles.userHeaderName}>{user.name}</Text>
              <Text style={styles.userHeaderEmail}>{user.email}</Text>
              <View style={styles.userHeaderMeta}>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '30' }]}>
                  <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                    {getRoleLabel(user.role)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: user.is_active ? colors.success + '30' : colors.error + '30' }]}>
                  <Text style={[styles.statusBadgeText, { color: user.is_active ? colors.success : colors.error }]}>
                    {user.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.userHeaderStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDate(user.created_at).split(',')[0]}</Text>
                <Text style={styles.statLabel}>{t('admin.users.joined', 'Joined')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDate(user.last_login).split(',')[0]}</Text>
                <Text style={styles.statLabel}>{t('admin.users.lastLogin', 'Last Login')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tabs */}
        {!isNewUser && (
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Tab */}
          {(activeTab === 'profile' || isNewUser) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('admin.users.profileInfo', 'Profile Information')}
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.users.name', 'Name')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder={t('admin.users.namePlaceholder', 'Enter name')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.users.email', 'Email')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder={t('admin.users.emailPlaceholder', 'Enter email')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {isNewUser && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('admin.users.password', 'Password')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                    placeholder={t('admin.users.passwordPlaceholder', 'Enter password')}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('admin.users.role', 'Role')}</Text>
                <TouchableOpacity
                  style={styles.roleSelector}
                  onPress={() => setShowRoleModal(true)}
                >
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(formData.role) + '30' }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(formData.role) }]}>
                      {getRoleLabel(formData.role)}
                    </Text>
                  </View>
                  <Text style={styles.roleSelectorArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>{t('admin.users.active', 'Active')}</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                    trackColor={{ false: colors.backgroundLighter, true: colors.success + '50' }}
                    thumbColor={formData.is_active ? colors.success : colors.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isNewUser ? t('admin.users.create', 'Create User') : t('admin.users.save', 'Save Changes')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && !isNewUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('admin.users.permissionsTitle', 'User Permissions')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('admin.users.permissionsSubtitle', 'Role-based permissions are inherited. Custom permissions can be added below.')}
              </Text>

              <Text style={styles.permissionGroupTitle}>
                {t('admin.users.rolePermissions', 'Role Permissions')} ({formData.role})
              </Text>
              <View style={styles.permissionsList}>
                {rolePermissions.map((permission) => (
                  <View key={permission} style={styles.permissionItem}>
                    <Text style={styles.permissionText}>{permission}</Text>
                    <Text style={styles.permissionInherited}>
                      {t('admin.users.inherited', 'Inherited')}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.permissionGroupTitle}>
                {t('admin.users.customPermissions', 'Custom Permissions')}
              </Text>
              <View style={styles.permissionsList}>
                {(Object.values(ROLE_PERMISSIONS.super_admin) as unknown as Permission[]).map((permission) => {
                  if (rolePermissions.includes(permission)) return null;
                  const isGranted = formData.permissions.includes(permission);
                  return (
                    <TouchableOpacity
                      key={permission}
                      style={[styles.permissionItem, isGranted && styles.permissionItemActive]}
                      onPress={() => handleTogglePermission(permission)}
                    >
                      <Text style={[styles.permissionText, isGranted && styles.permissionTextActive]}>
                        {permission}
                      </Text>
                      <View style={[styles.permissionCheckbox, isGranted && styles.permissionCheckboxActive]}>
                        {isGranted && <Text style={styles.permissionCheckmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleUpdateRole(formData.role)}
              >
                <Text style={styles.saveButtonText}>
                  {t('admin.users.savePermissions', 'Save Permissions')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && !isNewUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('admin.users.activityTitle', 'Activity History')}
              </Text>

              {activity.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('admin.users.noActivity', 'No activity recorded')}
                </Text>
              ) : (
                activity.map((log) => (
                  <View key={log.id} style={styles.activityItem}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityAction}>
                        {log.action.replace('.', ' ').replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.activityDetails}>
                        {log.resource_type}: {log.resource_id}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatDate(log.created_at)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && !isNewUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('admin.users.billingTitle', 'Billing History')}
              </Text>

              {billingHistory.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('admin.users.noBilling', 'No billing history')}
                </Text>
              ) : (
                billingHistory.map((transaction) => (
                  <View key={transaction.id} style={styles.billingItem}>
                    <View style={styles.billingIcon}>
                      <Text style={styles.billingIconText}>💳</Text>
                    </View>
                    <View style={styles.billingContent}>
                      <Text style={styles.billingDescription}>
                        {transaction.description || 'Payment'}
                      </Text>
                      <Text style={styles.billingDate}>
                        {formatDate(transaction.created_at)}
                      </Text>
                    </View>
                    <View style={styles.billingAmount}>
                      <Text style={[
                        styles.billingAmountText,
                        { color: transaction.status === 'refunded' ? colors.error : colors.success }
                      ]}>
                        {transaction.status === 'refunded' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </Text>
                      <Text style={styles.billingStatus}>
                        {transaction.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && !isNewUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('admin.users.subscriptionTitle', 'Subscription Details')}
              </Text>

              {user?.subscription ? (
                <View style={styles.subscriptionCard}>
                  <View style={styles.subscriptionHeader}>
                    <Text style={styles.subscriptionPlan}>{user.subscription.plan}</Text>
                    <View style={[
                      styles.subscriptionStatusBadge,
                      { backgroundColor: user.subscription.status === 'active' ? colors.success + '30' : colors.warning + '30' }
                    ]}>
                      <Text style={[
                        styles.subscriptionStatusText,
                        { color: user.subscription.status === 'active' ? colors.success : colors.warning }
                      ]}>
                        {user.subscription.status}
                      </Text>
                    </View>
                  </View>
                  {user.subscription.end_date && (
                    <Text style={styles.subscriptionExpiry}>
                      {t('admin.users.expiresOn', 'Expires')}: {formatDate(user.subscription.end_date).split(',')[0]}
                    </Text>
                  )}

                  <View style={styles.subscriptionActions}>
                    <TouchableOpacity style={styles.subscriptionActionButton}>
                      <Text style={styles.subscriptionActionText}>
                        {t('admin.users.extendSubscription', 'Extend')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subscriptionActionButton}>
                      <Text style={styles.subscriptionActionText}>
                        {t('admin.users.changePlan', 'Change Plan')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.subscriptionActionButton, styles.subscriptionCancelButton]}>
                      <Text style={styles.subscriptionCancelText}>
                        {t('admin.users.cancelSubscription', 'Cancel')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.noSubscription}>
                  <Text style={styles.noSubscriptionText}>
                    {t('admin.users.noSubscription', 'No active subscription')}
                  </Text>
                  <TouchableOpacity style={styles.addSubscriptionButton}>
                    <Text style={styles.addSubscriptionText}>
                      {t('admin.users.addSubscription', 'Add Subscription')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Role Selection Modal */}
        <Modal
          visible={showRoleModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRoleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {t('admin.users.selectRole', 'Select Role')}
              </Text>

              {(['user', 'support', 'billing_admin', 'content_manager', 'admin', 'super_admin'] as Role[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    formData.role === role && styles.roleOptionActive,
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, role }));
                    if (!isNewUser) {
                      handleUpdateRole(role);
                    } else {
                      setShowRoleModal(false);
                    }
                  }}
                >
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) + '30' }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(role) }]}>
                      {getRoleLabel(role)}
                    </Text>
                  </View>
                  <Text style={styles.rolePermissionCount}>
                    {ROLE_PERMISSIONS[role]?.length || 0} permissions
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Password Reset Modal */}
        <Modal
          visible={showPasswordModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPasswordModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {t('admin.users.resetPasswordTitle', 'Reset Password')}
              </Text>
              <Text style={styles.modalText}>
                {t('admin.users.resetPasswordMessage', 'This will send a password reset email to the user.')}
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.modalConfirmText}>{t('admin.users.sendReset', 'Send Reset Email')}</Text>
                </TouchableOpacity>
              </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  dangerButton: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  dangerButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarTextLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  userHeaderInfo: {
    flex: 1,
  },
  userHeaderName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  userHeaderEmail: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  userHeaderMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  userHeaderStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roleSelectorArrow: {
    fontSize: 12,
    color: colors.textMuted,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  permissionGroupTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  permissionsList: {
    marginBottom: spacing.md,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  permissionItemActive: {
    backgroundColor: colors.primary + '20',
  },
  permissionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  permissionTextActive: {
    color: colors.primary,
  },
  permissionInherited: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  permissionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  permissionCheckmark: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  activityDetails: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  activityTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  billingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  billingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  billingIconText: {
    fontSize: 18,
  },
  billingContent: {
    flex: 1,
  },
  billingDescription: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  billingDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  billingAmount: {
    alignItems: 'flex-end',
  },
  billingAmountText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  billingStatus: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  subscriptionCard: {
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subscriptionPlan: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  subscriptionStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  subscriptionStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  subscriptionExpiry: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  subscriptionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  subscriptionActionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  subscriptionActionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  subscriptionCancelButton: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  subscriptionCancelText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  noSubscription: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  noSubscriptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  addSubscriptionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  addSubscriptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
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
  modalText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  roleOptionActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rolePermissionCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  modalConfirmText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
});

export default UserDetailScreen;
