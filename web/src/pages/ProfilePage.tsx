import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, useWindowDimensions } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, CreditCard, Bell, LogOut, ChevronLeft, Shield, Sunrise, Star, Download } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import RitualSettings from '@/components/settings/RitualSettings';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView } from '@bayit/shared/ui';

type TabId = 'profile' | 'ritual' | 'subscription' | 'notifications' | 'security';

const menuItems = [
  { id: 'profile' as TabId, icon: User, label: 'פרופיל' },
  { id: 'ritual' as TabId, icon: Sunrise, label: 'טקס הבוקר' },
  { id: 'subscription' as TabId, icon: CreditCard, label: 'מנוי' },
  { id: 'notifications' as TabId, icon: Bell, label: 'התראות' },
  { id: 'security' as TabId, icon: Shield, label: 'אבטחה' },
];

const notificationSettings = [
  { id: 'newContent', label: 'תוכן חדש', description: 'קבל התראות על סדרות וסרטים חדשים' },
  { id: 'liveEvents', label: 'אירועים בשידור חי', description: 'התראות על שידורים חיים מיוחדים' },
  { id: 'recommendations', label: 'המלצות', description: 'המלצות מותאמות אישית' },
  { id: 'updates', label: 'עדכוני מערכת', description: 'מידע חשוב על השירות' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (!isAuthenticated) {
    navigate('/login', { state: { from: '/profile' } });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>הגדרות חשבון</Text>

      <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
        {/* Sidebar */}
        <View style={[styles.sidebar, !isDesktop && styles.sidebarMobile]}>
          <GlassCard style={styles.menuCard}>
            {/* Quick Links */}
            <Link to="/favorites" style={{ textDecoration: 'none' }}>
              <View style={styles.menuLink}>
                <Star size={20} color={colors.warning} />
                <Text style={styles.menuLinkText}>מועדפים</Text>
              </View>
            </Link>
            <Link to="/downloads" style={{ textDecoration: 'none' }}>
              <View style={styles.menuLink}>
                <Download size={20} color={colors.primary} />
                <Text style={styles.menuLinkText}>הורדות</Text>
              </View>
            </Link>

            <View style={styles.divider} />

            {/* Settings Tabs */}
            {menuItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setActiveTab(item.id)}
                style={[styles.menuItem, activeTab === item.id && styles.menuItemActive]}
              >
                <item.icon size={20} color={activeTab === item.id ? colors.text : colors.textSecondary} />
                <Text style={[styles.menuItemText, activeTab === item.id && styles.menuItemTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}

            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <LogOut size={20} color={colors.error} />
              <Text style={styles.logoutText}>התנתקות</Text>
            </Pressable>
          </GlassCard>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'ritual' && (
            <GlassCard style={styles.contentCard}>
              <RitualSettings />
            </GlassCard>
          )}

          {activeTab === 'profile' && (
            <GlassCard style={styles.contentCard}>
              <Text style={styles.sectionTitle}>פרטי פרופיל</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>שם</Text>
                <GlassView style={styles.readOnlyInput}>
                  <Text style={styles.inputText}>{user?.name || 'לא הוגדר'}</Text>
                </GlassView>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>אימייל</Text>
                <GlassView style={styles.readOnlyInput}>
                  <Text style={styles.inputText}>{user?.email}</Text>
                </GlassView>
              </View>
              <GlassButton title="ערוך פרופיל" variant="primary" />
            </GlassCard>
          )}

          {activeTab === 'subscription' && (
            <GlassCard style={styles.contentCard}>
              <Text style={styles.sectionTitle}>פרטי מנוי</Text>
              {user?.subscription ? (
                <>
                  <GlassView style={styles.subscriptionCard}>
                    <View style={styles.subscriptionHeader}>
                      <Text style={styles.planName}>{user.subscription.plan}</Text>
                      <Text style={styles.planPrice}>{user.subscription.price}/חודש</Text>
                    </View>
                    <Text style={styles.billingDate}>מתחדש ב-{user.subscription.nextBilling}</Text>
                  </GlassView>
                  <View style={styles.buttonRow}>
                    <Link to="/subscribe" style={{ textDecoration: 'none' }}>
                      <GlassButton title="שדרג מנוי" variant="primary" />
                    </Link>
                    <GlassButton title="בטל מנוי" variant="danger" />
                  </View>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <CreditCard size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>אין לך מנוי פעיל</Text>
                  <Link to="/subscribe" style={{ textDecoration: 'none' }}>
                    <GlassButton title="הצטרף עכשיו" variant="primary" />
                  </Link>
                </View>
              )}
            </GlassCard>
          )}

          {activeTab === 'notifications' && (
            <GlassCard style={styles.contentCard}>
              <Text style={styles.sectionTitle}>הגדרות התראות</Text>
              {notificationSettings.map((item) => (
                <View key={item.id} style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationLabel}>{item.label}</Text>
                    <Text style={styles.notificationDesc}>{item.description}</Text>
                  </View>
                  <Switch
                    value={true}
                    trackColor={{ false: colors.glass, true: colors.primary }}
                    thumbColor={colors.text}
                  />
                </View>
              ))}
            </GlassCard>
          )}

          {activeTab === 'security' && (
            <GlassCard style={styles.contentCard}>
              <Text style={styles.sectionTitle}>אבטחה</Text>
              <Pressable style={styles.securityItem}>
                <View>
                  <Text style={styles.securityLabel}>שנה סיסמה</Text>
                  <Text style={styles.securityDesc}>עדכן את הסיסמה שלך</Text>
                </View>
                <ChevronLeft size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable style={styles.securityItem}>
                <View>
                  <Text style={styles.securityLabel}>מכשירים מחוברים</Text>
                  <Text style={styles.securityDesc}>נהל את המכשירים המחוברים לחשבון</Text>
                </View>
                <ChevronLeft size={20} color={colors.textMuted} />
              </Pressable>
            </GlassCard>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 280,
  },
  sidebarMobile: {
    width: '100%',
  },
  menuCard: {
    padding: spacing.sm,
  },
  menuLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  menuLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  menuItemActive: {
    backgroundColor: colors.primary,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  menuItemTextActive: {
    color: colors.text,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    fontSize: 14,
    color: colors.error,
  },
  content: {
    flex: 1,
  },
  contentCard: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  readOnlyInput: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  subscriptionCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    borderRadius: borderRadius.md,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  planPrice: {
    fontSize: 16,
    color: colors.primary,
  },
  billingDate: {
    fontSize: 14,
    color: colors.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginVertical: spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  notificationDesc: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  securityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  securityDesc: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
});
