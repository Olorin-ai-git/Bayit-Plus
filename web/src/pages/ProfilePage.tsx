import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, CreditCard, Bell, LogOut, Shield, Sparkles, Mic, Star, Download,
  ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AISettings from '@/components/settings/AISettings';
import VoiceSettings from '@/components/settings/VoiceSettings';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassButton } from '@bayit/shared/ui';

type TabId = 'profile' | 'subscription' | 'notifications' | 'security' | 'ai' | 'voice' | 'favorites' | 'downloads';

const SIDEBAR_WIDTH = 300;

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const quickLinks = [
    { id: 'favorites' as TabId, icon: Star, labelKey: 'nav.favorites', color: colors.warning },
    { id: 'downloads' as TabId, icon: Download, labelKey: 'nav.downloads', color: colors.primary },
  ];

  const settingsItems = [
    { id: 'profile' as TabId, icon: User, labelKey: 'profile.tabs.personal' },
    { id: 'subscription' as TabId, icon: CreditCard, labelKey: 'profile.tabs.subscription' },
    { id: 'notifications' as TabId, icon: Bell, labelKey: 'profile.tabs.notifications' },
    { id: 'security' as TabId, icon: Shield, labelKey: 'profile.tabs.security' },
    { id: 'ai' as TabId, icon: Sparkles, labelKey: 'profile.tabs.ai' },
    { id: 'voice' as TabId, icon: Mic, labelKey: 'profile.tabs.voice' },
  ];

  const notificationSettings = [
    { id: 'newContent', labelKey: 'profile.notifications.newContent', descKey: 'profile.notifications.newContentDesc' },
    { id: 'liveEvents', labelKey: 'profile.notifications.liveEvents', descKey: 'profile.notifications.liveEventsDesc' },
    { id: 'recommendations', labelKey: 'profile.notifications.recommendations', descKey: 'profile.notifications.recommendationsDesc' },
    { id: 'updates', labelKey: 'profile.notifications.updates', descKey: 'profile.notifications.updatesDesc' },
  ];

  if (!isAuthenticated) {
    navigate('/login', { state: { from: '/profile' } });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Get title for current tab
  const getTabTitle = () => {
    switch (activeTab) {
      case 'favorites': return t('nav.favorites');
      case 'downloads': return t('nav.downloads');
      case 'profile': return t('profile.profileDetails');
      case 'subscription': return t('profile.tabs.subscription');
      case 'notifications': return t('profile.notificationSettings');
      case 'security': return t('profile.security');
      case 'ai': return t('profile.tabs.ai');
      case 'voice': return t('profile.tabs.voice');
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <ScrollView
        style={[
          styles.main,
          sidebarOpen && !isMobile && (isRTL ? { marginRight: SIDEBAR_WIDTH } : { marginLeft: SIDEBAR_WIDTH }),
        ]}
        contentContainerStyle={styles.mainInner}
      >
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <Pressable
            style={[styles.menuBtn, isRTL && styles.menuBtnRTL]}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} color={colors.text} />
          </Pressable>
        )}

        {/* Page Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t('profile.title')}</Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{getTabTitle()}</Text>
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          {activeTab === 'profile' && (
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.profileDetails')}
              </Text>
              <View style={styles.formGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('profile.name')}</Text>
                <GlassView style={styles.readOnlyInput}>
                  <Text style={[styles.inputText, isRTL && styles.textRTL]}>
                    {user?.name || t('profile.notSet')}
                  </Text>
                </GlassView>
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('profile.email')}</Text>
                <GlassView style={styles.readOnlyInput}>
                  <Text style={[styles.inputText, isRTL && styles.textRTL]}>{user?.email}</Text>
                </GlassView>
              </View>
              <GlassButton title={t('profile.editProfile')} variant="primary" />
            </GlassView>
          )}

          {activeTab === 'subscription' && (
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.subscription.currentPlan')}
              </Text>
              {user?.subscription ? (
                <>
                  <GlassView style={styles.subscriptionCard}>
                    <View style={[styles.subscriptionHeader, isRTL && styles.subscriptionHeaderRTL]}>
                      <Text style={styles.planName}>{user.subscription.plan}</Text>
                      <Text style={styles.planPrice}>{user.subscription.price}/{t('admin.plans.mo')}</Text>
                    </View>
                    <Text style={[styles.billingDate, isRTL && styles.textRTL]}>
                      {t('profile.subscription.renewsOn')} {user.subscription.nextBilling}
                    </Text>
                  </GlassView>
                  <View style={[styles.buttonRow, isRTL && styles.buttonRowRTL]}>
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
            </GlassView>
          )}

          {activeTab === 'notifications' && (
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.notificationSettings')}
              </Text>
              {notificationSettings.map((item) => (
                <View key={item.id} style={[styles.settingRow, isRTL && styles.settingRowRTL]}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t(item.labelKey)}</Text>
                    <Text style={[styles.settingDesc, isRTL && styles.textRTL]}>{t(item.descKey)}</Text>
                  </View>
                  <Switch
                    value={true}
                    trackColor={{ false: colors.glass, true: colors.primary }}
                    thumbColor={colors.text}
                  />
                </View>
              ))}
            </GlassView>
          )}

          {activeTab === 'security' && (
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.security')}
              </Text>
              <Pressable style={[styles.securityItem, isRTL && styles.securityItemRTL]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t('profile.changePassword')}</Text>
                  <Text style={[styles.settingDesc, isRTL && styles.textRTL]}>{t('profile.updatePassword')}</Text>
                </View>
                {isRTL ? <ChevronRight size={20} color={colors.textMuted} /> : <ChevronLeft size={20} color={colors.textMuted} />}
              </Pressable>
              <Pressable style={[styles.securityItem, isRTL && styles.securityItemRTL]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t('profile.connectedDevices')}</Text>
                  <Text style={[styles.settingDesc, isRTL && styles.textRTL]}>{t('profile.manageDevices')}</Text>
                </View>
                {isRTL ? <ChevronRight size={20} color={colors.textMuted} /> : <ChevronLeft size={20} color={colors.textMuted} />}
              </Pressable>
            </GlassView>
          )}

          {activeTab === 'ai' && <AISettings />}

          {activeTab === 'voice' && <VoiceSettings />}

          {activeTab === 'favorites' && (
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('nav.favorites')}
              </Text>
              <View style={styles.emptyState}>
                <Star size={48} color={colors.warning} />
                <Text style={styles.emptyText}>{t('favorites.empty', 'No favorites yet')}</Text>
                <Text style={styles.emptySubtext}>
                  {t('favorites.emptyHint', 'Add content to your favorites to see them here')}
                </Text>
              </View>
            </GlassView>
          )}

          {activeTab === 'downloads' && (
            <GlassView style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('nav.downloads')}
              </Text>
              <View style={styles.emptyState}>
                <Download size={48} color={colors.primary} />
                <Text style={styles.emptyText}>{t('downloads.empty', 'No downloads yet')}</Text>
                <Text style={styles.emptySubtext}>
                  {t('downloads.emptyHint', 'Download content to watch offline')}
                </Text>
              </View>
            </GlassView>
          )}
        </View>
      </ScrollView>

      {/* Sidebar Toggle Button */}
      {!isMobile && (
        <Pressable
          style={[
            styles.sidebarToggle,
            isRTL && styles.sidebarToggleRTL,
            sidebarOpen && (isRTL ? { right: SIDEBAR_WIDTH - 44 } : { left: SIDEBAR_WIDTH - 44 }),
          ]}
          onPress={() => setSidebarOpen(!sidebarOpen)}
        >
          <GlassView style={styles.toggleInner} intensity="medium">
            {isRTL
              ? (sidebarOpen ? <ChevronRight size={18} color={colors.text} /> : <ChevronLeft size={18} color={colors.text} />)
              : (sidebarOpen ? <ChevronLeft size={18} color={colors.text} /> : <ChevronRight size={18} color={colors.text} />)}
          </GlassView>
        </Pressable>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <GlassView
          style={[
            styles.sidebar,
            { width: SIDEBAR_WIDTH },
            isRTL && styles.sidebarRTL,
            isMobile && styles.sidebarMobile,
          ]}
          intensity="high"
        >
          <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarContent}>
            {/* User Info */}
            <View style={[styles.userInfo, isRTL && styles.userInfoRTL]}>
              <View style={styles.avatar}>
                <User size={24} color={colors.text} />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, isRTL && styles.textRTL]}>{user?.name || t('profile.guest')}</Text>
                <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{user?.email}</Text>
              </View>
            </View>

            {/* Quick Links */}
            <Text style={[styles.sidebarTitle, isRTL && styles.textRTL]}>
              {t('profile.quickLinks', 'Quick Links')}
            </Text>
            {quickLinks.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleTabChange(item.id)}
                style={[styles.menuAction, isRTL && styles.menuActionRTL, activeTab === item.id && styles.menuActionActive]}
              >
                <View style={[styles.menuActionIcon, { backgroundColor: `${item.color}20` }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <Text style={[styles.menuActionText, isRTL && styles.textRTL, activeTab === item.id && styles.menuActionTextActive]}>
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            ))}

            <View style={styles.divider} />

            {/* Settings */}
            <Text style={[styles.sidebarTitle, isRTL && styles.textRTL]}>
              {t('profile.settings', 'Settings')}
            </Text>
            {settingsItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleTabChange(item.id)}
                style={[styles.menuAction, isRTL && styles.menuActionRTL, activeTab === item.id && styles.menuActionActive]}
              >
                <View style={styles.menuActionIcon}>
                  <item.icon size={20} color={activeTab === item.id ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={[styles.menuActionText, isRTL && styles.textRTL, activeTab === item.id && styles.menuActionTextActive]}>
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            ))}

            <View style={styles.divider} />

            {/* Logout */}
            <Pressable onPress={handleLogout} style={[styles.menuAction, isRTL && styles.menuActionRTL]}>
              <View style={[styles.menuActionIcon, styles.logoutIcon]}>
                <LogOut size={20} color={colors.error} />
              </View>
              <Text style={[styles.menuActionText, styles.logoutText, isRTL && styles.textRTL]}>
                {t('account.logout')}
              </Text>
            </Pressable>
          </ScrollView>
        </GlassView>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <Pressable style={styles.overlay} onPress={() => setSidebarOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  main: {
    flex: 1,
    transition: 'margin 0.3s ease' as any,
  },
  mainInner: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
    maxWidth: 900,
    marginHorizontal: 'auto',
    width: '100%',
    position: 'relative',
  },
  menuBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuBtnRTL: {
    right: 'auto' as any,
    left: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textMuted,
    lineHeight: 26,
  },
  content: {
    gap: spacing.lg,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
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
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subscriptionHeaderRTL: {
    flexDirection: 'row-reverse',
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
  buttonRowRTL: {
    flexDirection: 'row-reverse',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityItemRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  // Sidebar
  sidebar: {
    position: 'fixed' as any,
    top: 64,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    transition: 'width 0.3s ease, opacity 0.3s ease' as any,
    overflow: 'hidden',
  },
  sidebarRTL: {
    left: 'auto' as any,
    right: 0,
    borderRightWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarMobile: {
    width: '85%',
    maxWidth: 320,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfoRTL: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  menuActionRTL: {
    flexDirection: 'row-reverse',
  },
  menuActionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  menuActionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  menuActionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  logoutIcon: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  logoutText: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.lg,
  },
  // Sidebar Toggle
  sidebarToggle: {
    position: 'fixed' as any,
    top: 80,
    left: spacing.md,
    zIndex: 150,
    transition: 'left 0.3s ease, right 0.3s ease' as any,
  },
  sidebarToggleRTL: {
    left: 'auto' as any,
    right: spacing.md,
  },
  toggleInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 99,
  },
});
