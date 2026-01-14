import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared/hooks';
import { GlassView, GlassButton } from '../components';
import { useAuthStore } from '../stores/authStore';
import { subscriptionService } from '../services/api';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { isTV } from '../utils/platform';

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  is_default: boolean;
}

interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
}

type TabId = 'profile' | 'billing' | 'subscription' | 'notifications' | 'security';

interface Tab {
  id: TabId;
  icon: string;
  labelKey: string;
}

const TABS: Tab[] = [
  { id: 'profile', icon: '👤', labelKey: 'profile.tabs.personal' },
  { id: 'billing', icon: '💳', labelKey: 'profile.tabs.billing' },
  { id: 'subscription', icon: '⭐', labelKey: 'profile.tabs.subscription' },
  { id: 'notifications', icon: '🔔', labelKey: 'profile.tabs.notifications' },
  { id: 'security', icon: '🛡️', labelKey: 'profile.tabs.security' },
];

// Subscription plans
const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    nameKey: 'profile.plans.basic.name',
    priceKey: 'profile.plans.basic.price',
    features: [
      'profile.plans.basic.feature1',
      'profile.plans.basic.feature2',
      'profile.plans.basic.feature3',
    ],
    recommended: false,
  },
  {
    id: 'premium',
    nameKey: 'profile.plans.premium.name',
    priceKey: 'profile.plans.premium.price',
    features: [
      'profile.plans.premium.feature1',
      'profile.plans.premium.feature2',
      'profile.plans.premium.feature3',
      'profile.plans.premium.feature4',
    ],
    recommended: true,
  },
  {
    id: 'family',
    nameKey: 'profile.plans.family.name',
    priceKey: 'profile.plans.family.price',
    features: [
      'profile.plans.family.feature1',
      'profile.plans.family.feature2',
      'profile.plans.family.feature3',
      'profile.plans.family.feature4',
      'profile.plans.family.feature5',
    ],
    recommended: false,
  },
];

const NOTIFICATION_SETTINGS = [
  { id: 'newContent', labelKey: 'profile.notifications.newContent', descKey: 'profile.notifications.newContentDesc' },
  { id: 'recommendations', labelKey: 'profile.notifications.recommendations', descKey: 'profile.notifications.recommendationsDesc' },
  { id: 'updates', labelKey: 'profile.notifications.updates', descKey: 'profile.notifications.updatesDesc' },
];

export const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    newContent: true,
    liveEvents: true,
    recommendations: false,
    updates: true,
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  // Handle deep linking to specific tab
  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab as TabId);
    }
  }, [route.params?.tab]);

  // Fetch billing data when billing tab is active
  useEffect(() => {
    if (activeTab === 'billing' && isAuthenticated) {
      loadBillingData();
    }
  }, [activeTab, isAuthenticated]);

  const loadBillingData = async () => {
    setBillingLoading(true);
    try {
      const [methodsRes, invoicesRes] = await Promise.all([
        subscriptionService.getPaymentMethods(),
        subscriptionService.getInvoices(),
      ]) as [any, any];
      setPaymentMethods(methodsRes.payment_methods || []);
      setBillingHistory(invoicesRes.invoices || []);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setBillingLoading(false);
    }
  };

  if (!isAuthenticated) {
    navigation.navigate('Login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigation.navigate('Home');
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderProfileTab = () => (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{t('profile.profileDetails')}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('profile.name')}</Text>
        <View style={styles.fieldValue}>
          <Text style={styles.fieldValueText}>{user?.name || t('profile.notSet')}</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('profile.email')}</Text>
        <View style={styles.fieldValue}>
          <Text style={[styles.fieldValueText, styles.ltrText]}>{user?.email}</Text>
        </View>
      </View>

      <GlassButton
        title={t('profile.editProfile')}
        onPress={() => {}}
        variant="primary"
        style={styles.editButton}
      />
    </GlassView>
  );

  const renderBillingTab = () => {
    if (billingLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Payment Methods */}
        <GlassView style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.billing.paymentMethods')}</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+ {t('profile.billing.addCard')}</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <Text style={styles.emptyText}>{t('profile.billing.noPaymentMethods')}</Text>
          ) : (
            paymentMethods.map((method) => (
              <View key={method.id} style={styles.paymentMethod}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardIcon}>
                    {method.type === 'visa' ? '💳' : '💳'}
                  </Text>
                  <View style={styles.cardDetails}>
                    <Text style={styles.cardType}>
                      {method.type.toUpperCase()} •••• {method.last4}
                    </Text>
                    <Text style={styles.cardExpiry}>
                      {t('profile.billing.expires')} {method.expiry}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {method.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>{t('profile.billing.default')}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.cardActionButton}>
                    <Text style={styles.cardActionText}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </GlassView>

        {/* Billing History */}
        <GlassView style={styles.contentCard}>
          <Text style={styles.sectionTitle}>{t('profile.billing.history')}</Text>

          {billingHistory.length === 0 ? (
            <Text style={styles.emptyText}>{t('profile.billing.noHistory')}</Text>
          ) : (
            <View style={styles.billingTable}>
              <View style={styles.billingHeader}>
                <Text style={styles.billingHeaderText}>{t('profile.billing.date')}</Text>
                <Text style={styles.billingHeaderText}>{t('profile.billing.description')}</Text>
                <Text style={styles.billingHeaderText}>{t('profile.billing.amount')}</Text>
                <Text style={styles.billingHeaderText}>{t('profile.billing.status')}</Text>
              </View>
              {billingHistory.map((item) => (
                <View key={item.id} style={styles.billingRow}>
                  <Text style={styles.billingCell}>{item.date}</Text>
                  <Text style={styles.billingCell}>{item.description}</Text>
                  <Text style={styles.billingCell}>₪{item.amount.toFixed(2)}</Text>
                  <View style={[styles.statusBadge, item.status === 'paid' && styles.statusPaid]}>
                    <Text style={styles.statusText}>
                      {item.status === 'paid' ? t('profile.billing.paid') : t('profile.billing.pending')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.downloadInvoice}>
            <Text style={styles.downloadInvoiceText}>📄 {t('profile.billing.downloadInvoices')}</Text>
          </TouchableOpacity>
        </GlassView>

        {/* Billing Address */}
        <GlassView style={styles.contentCard}>
          <Text style={styles.sectionTitle}>{t('profile.billing.billingAddress')}</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressText}>{user?.name}</Text>
            <Text style={styles.addressText}>{t('profile.address.line1')}</Text>
            <Text style={styles.addressText}>{t('profile.address.line2')}</Text>
          </View>
          <GlassButton
            title={t('profile.billing.editAddress')}
            onPress={() => {}}
            variant="secondary"
            style={styles.editAddressButton}
          />
        </GlassView>
      </ScrollView>
    );
  };

  const renderSubscriptionTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Current Plan */}
      <GlassView style={styles.contentCard}>
        <Text style={styles.sectionTitle}>{t('profile.subscription.currentPlan')}</Text>

        {user?.subscription ? (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <View>
                <Text style={styles.currentPlanName}>{user.subscription.plan}</Text>
                <Text style={styles.currentPlanStatus}>
                  {t('profile.subscription.status')}: {user.subscription.status}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{t('profile.subscription.active')}</Text>
              </View>
            </View>
            {user.subscription.end_date && (
              <Text style={styles.renewalDate}>
                {t('profile.subscription.renewsOn')} {user.subscription.end_date}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noPlanCard}>
            <Text style={styles.noPlanIcon}>📺</Text>
            <Text style={styles.noPlanText}>{t('profile.subscription.noActivePlan')}</Text>
          </View>
        )}
      </GlassView>

      {/* Upgrade Options */}
      <GlassView style={styles.contentCard}>
        <Text style={styles.sectionTitle}>{t('profile.subscription.availablePlans')}</Text>
        <Text style={styles.upgradeSubtitle}>{t('profile.subscription.choosePlan')}</Text>

        <View style={styles.plansGrid}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = user?.subscription?.plan?.toLowerCase() === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.recommended && styles.planCardRecommended,
                  isCurrentPlan && styles.planCardCurrent,
                ]}
              >
                {plan.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{t('profile.subscription.recommended')}</Text>
                  </View>
                )}
                <Text style={styles.planCardName}>{t(plan.nameKey)}</Text>
                <Text style={styles.planCardPrice}>{t(plan.priceKey)}</Text>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Text style={styles.featureCheck}>✓</Text>
                      <Text style={styles.featureText}>{t(feature)}</Text>
                    </View>
                  ))}
                </View>
                <GlassButton
                  title={isCurrentPlan ? t('profile.subscription.currentPlan') : t('profile.subscription.selectPlan')}
                  onPress={() => !isCurrentPlan && navigation.navigate('Subscribe', { plan: plan.id })}
                  variant={plan.recommended ? 'primary' : 'secondary'}
                  disabled={isCurrentPlan}
                  style={styles.selectPlanButton}
                />
              </View>
            );
          })}
        </View>
      </GlassView>

      {/* Cancel Subscription */}
      {user?.subscription && (
        <GlassView style={styles.contentCard}>
          <Text style={styles.sectionTitle}>{t('profile.subscription.manageSubscription')}</Text>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>{t('profile.subscription.cancelSubscription')}</Text>
          </TouchableOpacity>
          <Text style={styles.cancelNote}>{t('profile.subscription.cancelNote')}</Text>
        </GlassView>
      )}
    </ScrollView>
  );

  const renderNotificationsTab = () => (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{t('profile.notificationSettings')}</Text>

      {NOTIFICATION_SETTINGS.map((item) => (
        <View key={item.id} style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>{t(item.labelKey)}</Text>
            <Text style={styles.notificationDesc}>{t(item.descKey)}</Text>
          </View>
          <Switch
            value={notifications[item.id]}
            onValueChange={() => toggleNotification(item.id)}
            trackColor={{ false: colors.backgroundLight, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      ))}
    </GlassView>
  );

  const renderSecurityTab = () => (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{t('profile.security')}</Text>

      <TouchableOpacity style={styles.securityItem}>
        <View style={styles.securityInfo}>
          <Text style={styles.securityLabel}>{t('profile.changePassword')}</Text>
          <Text style={styles.securityDesc}>{t('profile.updatePassword')}</Text>
        </View>
        <Text style={styles.chevron}>◀</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.securityItem}>
        <View style={styles.securityInfo}>
          <Text style={styles.securityLabel}>{t('profile.connectedDevices')}</Text>
          <Text style={styles.securityDesc}>{t('profile.manageDevices')}</Text>
        </View>
        <Text style={styles.chevron}>◀</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.securityItem}>
        <View style={styles.securityInfo}>
          <Text style={styles.securityLabel}>{t('profile.twoFactorAuth')}</Text>
          <Text style={styles.securityDesc}>{t('profile.addExtraSecurity')}</Text>
        </View>
        <Text style={styles.chevron}>◀</Text>
      </TouchableOpacity>
    </GlassView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'billing':
        return renderBillingTab();
      case 'subscription':
        return renderSubscriptionTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'security':
        return renderSecurityTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>⚙️</Text>
        </View>
        <View>
          <Text style={styles.title}>{t('profile.title')}</Text>
          <Text style={styles.subtitle}>{user?.name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <GlassView style={styles.sidebarCard}>
            {TABS.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.tabButtonActive,
                ]}
                // @ts-ignore
                hasTVPreferredFocus={index === 0 && isTV}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.id && styles.tabLabelActive,
                  ]}
                >
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Text style={styles.tabIcon}>🚪</Text>
              <Text style={styles.logoutLabel}>{t('account.logout')}</Text>
            </TouchableOpacity>
          </GlassView>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
  },
  sidebar: {
    width: isTV ? 280 : 200,
    marginLeft: spacing.xl,
  },
  sidebarCard: {
    padding: spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  tabIcon: {
    fontSize: 20,
    marginLeft: spacing.sm,
  },
  tabLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  logoutLabel: {
    fontSize: 16,
    color: colors.error,
  },
  mainContent: {
    flex: 1,
  },
  contentCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  fieldValue: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fieldValueText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
  editButton: {
    marginTop: spacing.md,
  },
  subscriptionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  planPrice: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '500',
  },
  subscriptionInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  subscriptionActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noSubscription: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  noSubIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  noSubText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  notificationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  notificationDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityInfo: {
    flex: 1,
  },
  securityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  securityDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  // Billing styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 28,
    marginLeft: spacing.md,
  },
  cardDetails: {
    marginLeft: spacing.sm,
  },
  cardType: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  cardExpiry: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defaultBadge: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cardActionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  billingTable: {
    marginBottom: spacing.lg,
  },
  billingHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  billingHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'right',
  },
  billingRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  billingCell: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  statusBadge: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusPaid: {},
  statusText: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 12,
    fontWeight: '500',
    overflow: 'hidden',
  },
  downloadInvoice: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  downloadInvoiceText: {
    color: colors.primary,
    fontSize: 14,
  },
  addressCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  editAddressButton: {
    alignSelf: 'flex-start',
  },
  // Subscription upgrade styles
  currentPlanCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  currentPlanStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  activeBadgeText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  renewalDate: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'right',
  },
  noPlanCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  noPlanIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  noPlanText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.lg,
    marginTop: -spacing.md,
  },
  plansGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  planCard: {
    flex: 1,
    minWidth: 250,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planCardRecommended: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
  },
  planCardCurrent: {
    borderColor: colors.success,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  recommendedText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planCardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  planCardPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  planFeatures: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureCheck: {
    fontSize: 16,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  selectPlanButton: {
    marginTop: 'auto',
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
  },
  cancelNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'right',
  },
});

export default ProfileScreen;
