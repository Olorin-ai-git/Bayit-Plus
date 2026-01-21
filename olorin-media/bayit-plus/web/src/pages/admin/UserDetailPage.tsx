import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail, Key, Ban, UserCheck, Edit2, Trash2 } from 'lucide-react';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
      <GlassView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </GlassView>
    );
  }

  if (error || !user) {
    return (
      <GlassView style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || t('admin.users.notFound', { defaultValue: 'User not found' })}</Text>
        <GlassButton title={t('common.back')} onPress={() => navigate('/admin/users')} variant="primary" />
      </GlassView>
    );
  }

  const statusStyle = statusColors[user.status] || statusColors.inactive;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassView style={styles.header}>
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
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
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
        <GlassView style={styles.modalActions}>
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
        <GlassView style={styles.modalActions}>
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
        <GlassView style={styles.modalActions}>
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
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  loadingText: { fontSize: 14, color: colors.textMuted },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorIcon: { fontSize: 48, marginBottom: spacing.md },
  errorText: { fontSize: 16, color: colors.error, marginBottom: spacing.md },
  header: { marginBottom: spacing.lg },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backText: { fontSize: 14, color: colors.text },
  mainContent: { 
    gap: spacing.lg,
    // @ts-ignore - web-only responsive styles
    '@media (min-width: 1024px)': {
      flexDirection: 'row',
    },
  },
  profileCard: { 
    padding: spacing.lg,
    // @ts-ignore - web-only responsive styles
    '@media (min-width: 1024px)': {
      maxWidth: 350,
    },
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.text },
  userName: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  userEmail: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm },
  statusBadge: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.xs, 
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  banReason: { 
    fontSize: 12, 
    color: colors.error, 
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionButtons: { 
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm, 
    width: '100%',
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
  detailsSection: { flex: 1, gap: spacing.md },
  infoCard: { padding: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { fontSize: 14, color: colors.textMuted },
  infoValue: { fontSize: 14, color: colors.text },
  activityCard: { padding: spacing.md },
  activityItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  activityAction: { fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  activityDate: { fontSize: 12, color: colors.textMuted },
  billingCard: { padding: spacing.md },
  billingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  billingType: { fontSize: 14, color: colors.text },
  billingDate: { fontSize: 12, color: colors.textMuted },
  billingAmount: { fontSize: 14, fontWeight: '600', color: colors.success },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  modalText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xl,
    lineHeight: 24,
    textAlign: 'center',
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
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  okButton: {
    minWidth: 120,
  },
  editModalContent: {
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    gap: spacing.xs,
  },
  roleButton: {
    minWidth: 100,
  },
  roleButtonText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
