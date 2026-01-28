import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail, Key, Ban, UserCheck, Edit2, Trash2, Clock } from 'lucide-react';
import { NativeIcon } from '@olorin/shared-icons/native';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassModal, GlassInput, GlassToggle, GlassView, GlassPageHeader } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useNotifications } from '@olorin/glass-ui/hooks';;
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';
import logger from '@/utils/logger';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'banned';
  subscription?: { plan: string; status: string };
  created_at: string;
  ban_reason?: string;
}

interface Activity {
  id: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  created_at: string;
}

const statusColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.users.status.active' },
  inactive: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', labelKey: 'admin.users.status.inactive' },
  banned: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', labelKey: 'admin.users.status.blocked' },
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

export default function UserDetailPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const notifications = useNotifications();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [billingHistory, setBillingHistory] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [promptCallback, setPromptCallback] = useState<((value: string) => void) | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'viewer',
    is_active: true,
  });

  const loadUserData = async () => {
    if (!userId) return;
    try {
      setError(null);
      const [userData, activityData, billingData] = await Promise.all([
        usersService.getUser(userId),
        usersService.getUserActivity(userId, 10),
        usersService.getUserBillingHistory(userId),
      ]);
      setUser(userData);
      setActivity(activityData || []);
      setBillingHistory(billingData || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user data');
      logger.error('Failed to load user data', 'UserDetailPage', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const handleResetPassword = () => {
    if (!user) return;
    notifications.show({
      level: 'warning',
      message: t('admin.users.confirmResetPassword', { email: user.email }),
      dismissable: true,
      action: {
        label: t('common.send', 'Send'),
        type: 'action',
        onPress: async () => {
          try {
            await usersService.resetPassword(user.id);
            setSuccessMessage(t('admin.users.resetPasswordSent'));
            setSuccessModalOpen(true);
          } catch (error) {
            logger.error('Failed to reset password', 'UserDetailPage', error);
          }
        },
      },
    });
  };

  const handleBan = async () => {
    if (!user) return;
    setPromptInput('');
    setPromptCallback(() => async (reason: string) => {
      if (!reason) return;
      try {
        await usersService.banUser(user.id, reason);
        loadUserData();
      } catch (error) {
        logger.error('Failed to ban user', 'UserDetailPage', error);
      }
    });
    setPromptModalOpen(true);
  };

  const handleUnban = () => {
    if (!user) return;
    notifications.show({
      level: 'warning',
      message: t('admin.users.confirmUnban', { defaultValue: 'Unban user?' }),
      dismissable: true,
      action: {
        label: t('common.unban', 'Unban'),
        type: 'action',
        onPress: async () => {
          try {
            await usersService.unbanUser(user.id);
            loadUserData();
          } catch (error) {
            logger.error('Failed to unban user', 'UserDetailPage', error);
          }
        },
      },
    });
  };

  const handleEdit = () => {
    if (!user) return;
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.status === 'active',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!user) return;
    try {
      logger.info('Updating user with data:', 'UserDetailPage', editForm);
      await usersService.updateUser(user.id, editForm);
      setSuccessMessage(t('admin.users.userUpdated', { defaultValue: 'User updated successfully' }));
      setSuccessModalOpen(true);
      setEditModalOpen(false);
      loadUserData();
    } catch (error: any) {
      logger.error('Failed to update user', 'UserDetailPage', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to update user';
      alert(errorMessage);
    }
  };

  const handleDelete = () => {
    if (!user) return;
    notifications.show({
      level: 'warning',
      message: t('admin.users.confirmDelete', { defaultValue: `Are you sure you want to delete ${user.name}? This action cannot be undone.` }),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            await usersService.deleteUser(user.id);
            setSuccessMessage(t('admin.users.userDeleted', { defaultValue: 'User deleted successfully' }));
            setSuccessModalOpen(true);
            setTimeout(() => navigate('/admin/users'), 1500);
          } catch (error: any) {
            logger.error('Failed to delete user', 'UserDetailPage', error);
            alert(error?.message || 'Failed to delete user');
          }
        },
      },
    });
  };

  if (loading) {
    return (
      <GlassView className="flex-1 justify-center items-center gap-2">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-sm text-gray-400">{t('common.loading')}</Text>
      </GlassView>
    );
  }

  if (error || !user) {
    return (
      <GlassView style={styles.errorContainer}>
        <NativeIcon name="discover" size="xl" color={colors.error.DEFAULT} />
        <Text className="flex-1 text-red-500 text-sm">{error || t('admin.users.notFound', { defaultValue: 'User not found' })}</Text>
        <GlassButton title={t('common.back')} onPress={() => navigate('/admin/users')} variant="primary" />
      </GlassView>
    );
  }

  const statusStyle = statusColors[user.status] || statusColors.inactive;

  const pageConfig = ADMIN_PAGE_CONFIG['user-detail'];
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={user.name}
        subtitle={t('admin.userDetail.subtitle')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        isRTL={isRTL}
      />

      <GlassView className="flex flex-row justify-between items-start mb-6">
        <GlassButton
          title={t('admin.users.backToList', { defaultValue: 'Back to list' })}
          icon={<ArrowRight size={20} color={colors.text} />}
          onPress={() => navigate('/admin/users')}
          variant="secondary"
          style={styles.backButton}
          textStyle={styles.backText}
        />
      </GlassView>

      <GlassView style={styles.mainContent}>
        <GlassCard style={styles.profileCard}>
          <GlassView style={styles.profileHeader}>
            <GlassView style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || '?'}</Text>
            </GlassView>
            <GlassView style={styles.profileInfo}>
              <Text className="text-sm font-medium text-white">{user.name}</Text>
              <Text className="text-xs text-gray-400">{user.email}</Text>
              <GlassView style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>{t(statusStyle.labelKey)}</Text>
              </GlassView>
            </GlassView>
          </GlassView>
          {user.ban_reason && (
            <Text style={styles.banReason}>{t('admin.users.banReason', { defaultValue: 'Ban reason' })}: {user.ban_reason}</Text>
          )}
          <GlassView style={styles.actionButtons}>
            <GlassButton
              title={t('common.edit', { defaultValue: 'Edit' })}
              variant="primary"
              icon={<Edit2 size={16} color={colors.text} />}
              onPress={handleEdit}
              style={styles.actionButton}
            />
            <GlassButton
              title={t('admin.liveQuotas.title', 'Live Quotas')}
              variant="secondary"
              icon={<Clock size={16} color={colors.primary} />}
              onPress={() => navigate(`/admin/users/${userId}/live-quota`)}
              style={styles.actionButton}
            />
            <GlassButton
              title={t('admin.users.resetPassword')}
              variant="secondary"
              icon={<Key size={16} color={colors.text} />}
              onPress={handleResetPassword}
              style={styles.actionButton}
            />
            {user.status === 'banned' ? (
              <GlassButton 
                title={t('admin.users.unban', { defaultValue: 'Unban' })} 
                variant="primary" 
                icon={<UserCheck size={16} color={colors.text} />} 
                onPress={handleUnban}
                style={styles.actionButton}
              />
            ) : (
              <GlassButton 
                title={t('admin.users.block')} 
                variant="secondary" 
                icon={<Ban size={16} color={colors.error} />} 
                onPress={handleBan}
                style={styles.actionButton}
              />
            )}
            <GlassButton 
              title={t('common.delete', { defaultValue: 'Delete' })} 
              variant="secondary" 
              icon={<Trash2 size={16} color={colors.error} />} 
              onPress={handleDelete}
              style={styles.actionButton}
            />
          </GlassView>
        </GlassCard>

        <GlassView style={styles.detailsSection}>
          <GlassCard style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.users.userDetails', { defaultValue: 'User Details' })}</Text>
            <GlassView style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.id', { defaultValue: 'ID' })}:</Text>
              <Text style={styles.infoValue}>{user.id}</Text>
            </GlassView>
            <GlassView style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.columns.role')}:</Text>
              <Text style={styles.infoValue}>{user.role}</Text>
            </GlassView>
            <GlassView style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.columns.subscription')}:</Text>
              <Text style={styles.infoValue}>{user.subscription?.plan || t('admin.users.columns.noSubscription')}</Text>
            </GlassView>
            <GlassView style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.registered', { defaultValue: 'Registered' })}:</Text>
              <Text style={styles.infoValue}>{formatDate(user.created_at)}</Text>
            </GlassView>
          </GlassCard>

          <GlassCard style={styles.activityCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.users.recentActivity')}</Text>
            {activity.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.users.noActivity')}</Text>
            ) : (
              activity.map((item) => (
                <GlassView key={item.id} style={[styles.activityItem, { flexDirection }]}>
                  <Text style={[styles.activityAction, { textAlign }]}>{item.action.replace('.', ' ').replace(/_/g, ' ')}</Text>
                  <Text style={styles.activityDate}>{formatDate(item.created_at)}</Text>
                </GlassView>
              ))
            )}
          </GlassCard>

          <GlassCard style={styles.billingCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.users.billingHistory', { defaultValue: 'Billing History' })}</Text>
            {billingHistory.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.users.noPayments', { defaultValue: 'No payments' })}</Text>
            ) : (
              billingHistory.map((tx) => (
                <GlassView key={tx.id} style={[styles.billingItem, { flexDirection }]}>
                  <GlassView>
                    <Text style={[styles.billingType, { textAlign }]}>{tx.type}</Text>
                    <Text style={styles.billingDate}>{formatDate(tx.created_at)}</Text>
                  </GlassView>
                  <Text style={styles.billingAmount}>{formatCurrency(tx.amount, tx.currency)}</Text>
                </GlassView>
              ))
            )}
          </GlassCard>
        </GlassView>
      </GlassView>

      {/* Success Modal */}
      <GlassModal
        visible={successModalOpen}
        title={t('common.success')}
        onClose={() => setSuccessModalOpen(false)}
        dismissable={true}
      >
        <Text style={styles.modalText}>{successMessage}</Text>
        <GlassView className="flex flex-row gap-4 mt-6">
          <GlassButton
            title={t('common.ok')}
            onPress={() => setSuccessModalOpen(false)}
            variant="primary"
            style={styles.okButton}
          />
        </GlassView>
      </GlassModal>

      {/* Prompt Modal for Ban Reason */}
      <GlassModal
        visible={promptModalOpen}
        title={t('admin.users.banReasonPrompt')}
        onClose={() => setPromptModalOpen(false)}
        dismissable={true}
      >
        <GlassInput
          label={t('admin.users.banReason')}
          value={promptInput}
          onChangeText={setPromptInput}
          placeholder={t('admin.users.banReason')}
          containerStyle={styles.modalInput}
          multiline
        />
        <GlassView className="flex flex-row gap-4 mt-6">
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setPromptModalOpen(false)}
            variant="secondary"
          />
          <GlassButton
            title={t('common.confirm')}
            onPress={() => {
              if (promptCallback) {
                promptCallback(promptInput);
                setPromptModalOpen(false);
              }
            }}
            variant="primary"
          />
        </GlassView>
      </GlassModal>

      {/* Edit User Modal */}
      <GlassModal
        visible={editModalOpen}
        title={t('admin.users.editUser', { defaultValue: 'Edit User' })}
        onClose={() => setEditModalOpen(false)}
        dismissable={true}
      >
        <GlassView style={styles.editModalContent}>
          <GlassInput
            label={t('admin.users.name', { defaultValue: 'Name' })}
            value={editForm.name}
            onChangeText={(text) => setEditForm({ ...editForm, name: text })}
            placeholder={t('admin.users.name', { defaultValue: 'Name' })}
          />
          <GlassInput
            label={t('admin.users.email', { defaultValue: 'Email' })}
            value={editForm.email}
            onChangeText={(text) => setEditForm({ ...editForm, email: text })}
            placeholder={t('admin.users.email', { defaultValue: 'Email' })}
          />
          <GlassView style={styles.formRow}>
            <Text style={styles.formLabel}>{t('admin.users.columns.role', { defaultValue: 'Role' })}</Text>
            <GlassView style={styles.roleButtons}>
              {['viewer', 'subscriber', 'editor', 'admin', 'super_admin'].map((role) => (
                <GlassButton
                  key={role}
                  title={role.replace('_', ' ')}
                  onPress={() => setEditForm({ ...editForm, role })}
                  variant={editForm.role === role ? 'primary' : 'secondary'}
                  style={styles.roleButton}
                  textStyle={styles.roleButtonText}
                />
              ))}
            </GlassView>
          </GlassView>
          <GlassToggle
            value={editForm.is_active}
            onValueChange={(value) => setEditForm({ ...editForm, is_active: value })}
            label={t('admin.users.active', { defaultValue: 'Active' })}
            description={t('admin.users.activeDesc', { defaultValue: 'User can log in and access the platform' })}
            isRTL={isRTL}
          />
        </GlassView>
        <GlassView className="flex flex-row gap-4 mt-6">
          <GlassButton
            title={t('common.cancel')}
            onPress={() => setEditModalOpen(false)}
            variant="secondary"
          />
          <GlassButton
            title={t('common.save', { defaultValue: 'Save' })}
            onPress={handleSaveEdit}
            variant="primary"
          />
        </GlassView>
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
  },
  mainContent: {
    gap: spacing.lg,
  },
  profileCard: {
    padding: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  banReason: {
    fontSize: 13,
    color: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
  detailsSection: {
    gap: spacing.lg,
  },
  infoCard: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    minWidth: 120,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  activityCard: {
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  activityItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
  },
  activityAction: {
    fontSize: 13,
    color: colors.text,
    textTransform: 'capitalize',
    flex: 1,
  },
  activityDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  billingCard: {
    padding: spacing.lg,
  },
  billingItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingType: {
    fontSize: 13,
    color: colors.text,
    textTransform: 'capitalize',
  },
  billingDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  billingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  modalText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  okButton: {
    flex: 1,
  },
  modalInput: {
    marginTop: spacing.sm,
  },
  editModalContent: {
    gap: spacing.md,
  },
  formRow: {
    gap: spacing.sm,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleButton: {
    flex: 1,
    minWidth: 100,
  },
  roleButtonText: {
    fontSize: 12,
  },
});

