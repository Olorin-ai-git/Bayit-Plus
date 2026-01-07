import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, useWindowDimensions } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, CreditCard, Bell, LogOut, ChevronLeft, Shield, Sunrise, Star, Download } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import RitualSettings from '@/components/settings/RitualSettings';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView } from '@bayit/shared/ui';

type TabId = 'profile' | 'ritual' | 'subscription' | 'notifications' | 'security';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  const menuItems = [
    { id: 'profile' as TabId, icon: User, labelKey: 'profile.tabs.personal' },
    { id: 'ritual' as TabId, icon: Sunrise, labelKey: 'profile.morningRitual' },
    { id: 'subscription' as TabId, icon: CreditCard, labelKey: 'profile.tabs.subscription' },
    { id: 'notifications' as TabId, icon: Bell, labelKey: 'profile.tabs.notifications' },
    { id: 'security' as TabId, icon: Shield, labelKey: 'profile.tabs.security' },
  ];

  const notificationSettings = [
    { id: 'newContent', labelKey: 'profile.notifications.newContent', descKey: 'profile.notifications.newContentDesc' },
    { id: 'liveEvents', labelKey: 'profile.notifications.liveEvents', descKey: 'profile.notifications.liveEventsDesc' },
    { id: 'recommendations', labelKey: 'profile.notifications.recommendations', descKey: 'profile.notifications.recommendationsDesc' },
    { id: 'updates', labelKey: 'profile.notifications.updates', descKey: 'profile.notifications.updatesDesc' },
  ];
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
      <Text style={styles.pageTitle}>{t('profile.title')}</Text>

      <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
        {/* Sidebar */}
        <View style={[styles.sidebar, !isDesktop && styles.sidebarMobile]}>
          <GlassCard style={styles.menuCard}>
            {/* Quick Links */}
            <Link to="/favorites" style={{ textDecoration: 'none' }}>
              <View style={styles.menuLink}>
                <Star size={20} color={colors.warning} />
                <Text style={styles.menuLinkText}>{t('nav.favorites')}</Text>
              </View>
            </Link>
            <Link to="/downloads" style={{ textDecoration: 'none' }}>
              <View style={styles.menuLink}>
                <Download size={20} color={colors.primary} />
                <Text style={styles.menuLinkText}>{t('nav.downloads')}</Text>
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
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            ))}

            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <LogOut size={20} color={colors.error} />
              <Text style={styles.logoutText}>{t('account.logout')}</Text>
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
              <Text style={styles.sectionTitle}>{t('profile.profileDetails')}</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.name')}</Text>
                <GlassView style={styles.readOnlyInput}>
                  <Text style={styles.inputText}>{user?.name || t('profile.notSet')}</Text>
                </GlassView>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.email')}</Text>
                <GlassView style={styles.readOnlyInput}>
                  <Text style={styles.inputText}>{user?.email}</Text>
                </GlassView>
              </View>
              <GlassButton title={t('profile.editProfile')} variant="primary" />
            </GlassCard>
          )}

          {activeTab === 'subscription' && (
            <GlassCard style={styles.contentCard}>
              <Text style={styles.sectionTitle}>{t('profile.subscription.currentPlan')}</Text>
              {user?.subscription ? (
                <>
                  <GlassView style={styles.subscriptionCard}>
                    <View style={styles.subscriptionHeader}>
                      <Text style={styles.planName}>{user.subscription.plan}</Text>
                      <Text style={styles.planPrice}>{user.subscription.price}/{t('admin.plans.mo')}</Text>
                    </View>
                    <Text style={styles.billingDate}>{t('profile.subscription.renewsOn')} {user.subscription.nextBilling}</Text>
                  </GlassView>
                  <View style={styles.buttonRow}>
                    <Link to="/subscribe" style={{ textDecoration: 'none' }}>
                      <GlassButton title={t('profile.subscription.manageSubscription')} variant="primary" />
                    </Link>
                    <GlassButton title={t('profile.subscription.cancelSubscription')} variant="danger" />
                  </View>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <CreditCard size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>{t('profile.subscription.noActivePlan')}</Text>
                  <Link to="/subscribe" style={{ textDecoration: 'none' }}>
                    <GlassButton title={t('profile.subscription.selectPlan')} variant="primary" />
                  </Link>
                </View>
              )}
            </GlassCard>
          )}

          {activeTab === 'notifications' && (
            <GlassCard style={styles.contentCard}>
              <Text style={styles.sectionTitle}>{t('profile.notificationSettings')}</Text>
              {notificationSettings.map((item) => (
                <View key={item.id} style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationLabel}>{t(item.labelKey)}</Text>
                    <Text style={styles.notificationDesc}>{t(item.descKey)}</Text>
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
              <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
              <Pressable style={styles.securityItem}>
                <View>
                  <Text style={styles.securityLabel}>{t('profile.changePassword')}</Text>
                  <Text style={styles.securityDesc}>{t('profile.updatePassword')}</Text>
                </View>
                <ChevronLeft size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable style={styles.securityItem}>
                <View>
                  <Text style={styles.securityLabel}>{t('profile.connectedDevices')}</Text>
                  <Text style={styles.securityDesc}>{t('profile.manageDevices')}</Text>
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
