import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail, Key, Ban, UserCheck, Edit2, Trash2, Clock } from 'lucide-react';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassModal, GlassInput, GlassToggle, GlassView } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { useModal } from '@/contexts/ModalContext';
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
  const { showConfirm } = useModal();
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
    showConfirm(
      t('admin.users.confirmResetPassword', { email: user.email }),
      async () => {
        try {
          await usersService.resetPassword(user.id);
          setSuccessMessage(t('admin.users.resetPasswordSent'));
          setSuccessModalOpen(true);
        } catch (error) {
          logger.error('Failed to reset password', 'UserDetailPage', error);
        }
      },
      { confirmText: t('common.send', 'Send') }
    );
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
    showConfirm(
      t('admin.users.confirmUnban', { defaultValue: 'Unban user?' }),
      async () => {
        try {
          await usersService.unbanUser(user.id);
          loadUserData();
        } catch (error) {
          logger.error('Failed to unban user', 'UserDetailPage', error);
        }
      },
      { confirmText: t('common.unban', 'Unban') }
    );
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
    showConfirm(
      t('admin.users.confirmDelete', { defaultValue: `Are you sure you want to delete ${user.name}? This action cannot be undone.` }),
      async () => {
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
      { confirmText: t('common.delete', 'Delete'), variant: 'danger' }
    );
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
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text className="flex-1 text-red-500 text-sm">{error || t('admin.users.notFound', { defaultValue: 'User not found' })}</Text>
        <GlassButton title={t('common.back')} onPress={() => navigate('/admin/users')} variant="primary" />
      </GlassView>
    );
  }

  const statusStyle = statusColors[user.status] || statusColors.inactive;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
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

