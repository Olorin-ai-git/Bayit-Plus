import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Mail, Key, Ban, UserCheck, Edit2 } from 'lucide-react';
import { usersService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
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

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', label: 'פעיל' },
  inactive: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', label: 'לא פעיל' },
  banned: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', label: 'חסום' },
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
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [billingHistory, setBillingHistory] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const handleResetPassword = async () => {
    if (!user || !window.confirm(`שלח אימייל לאיפוס סיסמה ל-${user.email}?`)) return;
    try {
      await usersService.resetPassword(user.id);
      alert('אימייל לאיפוס סיסמה נשלח');
    } catch (error) {
      logger.error('Failed to reset password', 'UserDetailPage', error);
    }
  };

  const handleBan = async () => {
    if (!user) return;
    const reason = window.prompt('סיבת החסימה:');
    if (!reason) return;
    try {
      await usersService.banUser(user.id, reason);
      loadUserData();
    } catch (error) {
      logger.error('Failed to ban user', 'UserDetailPage', error);
    }
  };

  const handleUnban = async () => {
    if (!user || !window.confirm('בטל חסימת משתמש?')) return;
    try {
      await usersService.unbanUser(user.id);
      loadUserData();
    } catch (error) {
      logger.error('Failed to unban user', 'UserDetailPage', error);
    }
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
        <Text style={styles.errorText}>{error || 'משתמש לא נמצא'}</Text>
        <GlassButton title="חזור" onPress={() => navigate('/admin/users')} variant="primary" />
      </View>
    );
  }

  const statusStyle = statusColors[user.status] || statusColors.inactive;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Pressable onPress={() => navigate('/admin/users')} style={[styles.backButton, { flexDirection }]}>
          <ArrowRight size={20} color={colors.text} />
          <Text style={[styles.backText, { textAlign }]}>חזרה לרשימה</Text>
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
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
          {user.ban_reason && (
            <Text style={styles.banReason}>סיבת חסימה: {user.ban_reason}</Text>
          )}
          <View style={styles.actionButtons}>
            <GlassButton title="איפוס סיסמה" variant="secondary" icon={<Key size={16} color={colors.text} />} onPress={handleResetPassword} />
            {user.status === 'banned' ? (
              <GlassButton title="בטל חסימה" variant="primary" icon={<UserCheck size={16} color={colors.text} />} onPress={handleUnban} />
            ) : (
              <GlassButton title="חסום" variant="secondary" icon={<Ban size={16} color={colors.error} />} onPress={handleBan} />
            )}
          </View>
        </GlassCard>

        <View style={styles.detailsSection}>
          <GlassCard style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>פרטי משתמש</Text>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>מזהה:</Text>
              <Text style={styles.infoValue}>{user.id}</Text>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>תפקיד:</Text>
              <Text style={styles.infoValue}>{user.role}</Text>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>מנוי:</Text>
              <Text style={styles.infoValue}>{user.subscription?.plan || 'ללא מנוי'}</Text>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={styles.infoLabel}>נרשם:</Text>
              <Text style={styles.infoValue}>{formatDate(user.created_at)}</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.activityCard}>
            <Text style={[styles.sectionTitle, { textAlign }]}>פעילות אחרונה</Text>
            {activity.length === 0 ? (
              <Text style={styles.emptyText}>אין פעילות</Text>
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
            <Text style={[styles.sectionTitle, { textAlign }]}>היסטוריית תשלומים</Text>
            {billingHistory.length === 0 ? (
              <Text style={styles.emptyText}>אין תשלומים</Text>
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
});
