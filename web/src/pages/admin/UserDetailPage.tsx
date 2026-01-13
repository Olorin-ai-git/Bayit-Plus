import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail, Key, Ban, UserCheck, Edit2 } from 'lucide-react';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassModal, GlassInput } from '@bayit/shared/ui';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || t('admin.users.notFound', { defaultValue: 'User not found' })}</Text>
        <GlassButton title={t('common.back')} onPress={() => navigate('/admin/users')} variant="primary" />
      </View>
    );
  }

  const statusStyle = statusColors[user.status] || statusColors.inactive;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate('/admin/users')} style={[styles.backButton, { flexDirection }]}>
          <ArrowRight size={20} color={colors.text} />
          <Text style={[styles.backText, { textAlign }]}>{t('admin.users.backToList', { defaultValue: 'Back to list' })}</Text>
        </Pressable>
      </View>

      <View style={[styles.mainContent, { flexDirection }]}>
        <GlassCard style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{t(statusStyle.labelKey)}</Text>
          </View>
          {user.ban_reason && (
            <Text style={styles.banReason}>{t('admin.users.banReason', { defaultValue: 'Ban reason' })}: {user.ban_reason}</Text>
          )}
          <View style={styles.actionButtons}>
            <GlassButton title={t('admin.users.resetPassword')} variant="secondary" icon={<Key size={16} color={colors.text} />} onPress={handleResetPassword} />
            {user.status === 'banned' ? (
              <GlassButton title={t('admin.users.unban', { defaultValue: 'Unban' })} variant="primary" icon={<UserCheck size={16} color={colors.text} />} onPress={handleUnban} />
            ) : (
              <GlassButton title={t('admin.users.block')} variant="secondary" icon={<Ban size={16} color={colors.error} />} onPress={handleBan} />
            )}
          </View>
        </GlassCard>

        <View style={styles.detailsSection}>
          <GlassCard style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.users.userDetails', { defaultValue: 'User Details' })}</Text>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.id', { defaultValue: 'ID' })}:</Text>
              <Text style={styles.infoValue}>{user.id}</Text>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.columns.role')}:</Text>
              <Text style={styles.infoValue}>{user.role}</Text>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.columns.subscription')}:</Text>
              <Text style={styles.infoValue}>{user.subscription?.plan || t('admin.users.columns.noSubscription')}</Text>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>{t('admin.users.registered', { defaultValue: 'Registered' })}:</Text>
              <Text style={styles.infoValue}>{formatDate(user.created_at)}</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.activityCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.users.recentActivity')}</Text>
            {activity.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.users.noActivity')}</Text>
            ) : (
              activity.map((item) => (
                <View key={item.id} style={[styles.activityItem, { flexDirection }]}>
                  <Text style={[styles.activityAction, { textAlign }]}>{item.action.replace('.', ' ').replace(/_/g, ' ')}</Text>
                  <Text style={styles.activityDate}>{formatDate(item.created_at)}</Text>
                </View>
              ))
            )}
          </GlassCard>

          <GlassCard style={styles.billingCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('admin.users.billingHistory', { defaultValue: 'Billing History' })}</Text>
            {billingHistory.length === 0 ? (
              <Text style={styles.emptyText}>{t('admin.users.noPayments', { defaultValue: 'No payments' })}</Text>
            ) : (
              billingHistory.map((tx) => (
                <View key={tx.id} style={[styles.billingItem, { flexDirection }]}>
                  <View>
                    <Text style={[styles.billingType, { textAlign }]}>{tx.type}</Text>
                    <Text style={styles.billingDate}>{formatDate(tx.created_at)}</Text>
                  </View>
                  <Text style={styles.billingAmount}>{formatCurrency(tx.amount, tx.currency)}</Text>
                </View>
              ))
            )}
          </GlassCard>
        </View>
      </View>

      {/* Success Modal */}
      <GlassModal
        visible={successModalOpen}
        title={t('common.success')}
        onClose={() => setSuccessModalOpen(false)}
        dismissable={true}
      >
        <Text style={styles.modalText}>{successMessage}</Text>
        <View style={styles.modalActions}>
          <GlassButton
            title={t('common.ok')}
            onPress={() => setSuccessModalOpen(false)}
            variant="secondary"
          />
        </View>
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
        <View style={styles.modalActions}>
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
        </View>
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
  mainContent: { flexDirection: 'row', gap: spacing.lg },
  profileCard: { width: 280, padding: spacing.lg, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.text },
  userName: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  userEmail: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginBottom: spacing.md },
  statusText: { fontSize: 12, fontWeight: '600' },
  banReason: { fontSize: 12, color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  actionButtons: { gap: spacing.sm, width: '100%' },
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
    fontSize: 14,
    color: colors.text,
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
