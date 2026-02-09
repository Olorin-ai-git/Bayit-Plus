import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassButton } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { subscriptionService } from '../services/api';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { isTV } from '../utils/platform';
import { NativeIcon } from '@olorin/shared-icons/native';

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
  { id: 'profile', icon: 'user', labelKey: 'profile.tabs.personal' },
  { id: 'billing', icon: 'creditCard', labelKey: 'profile.tabs.billing' },
  { id: 'subscription', icon: 'star', labelKey: 'profile.tabs.subscription' },
  { id: 'notifications', icon: 'bell', labelKey: 'profile.tabs.notifications' },
  { id: 'security', icon: 'shield', labelKey: 'profile.tabs.security' },
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
      logger.error('Failed to load billing data', 'ProfileScreen', error);
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
    <GlassView className="p-8 mb-6">
      <Text className="text-xl font-semibold text-white text-right mb-6">{t('profile.profileDetails')}</Text>

      <View className="mb-4">
        <Text className="text-sm text-gray-400 mb-1 text-right">{t('profile.name')}</Text>
        <View className="bg-white/10 rounded-lg p-4 border border-white/10">
          <Text className="text-base text-white text-right">{user?.name || t('profile.notSet')}</Text>
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-sm text-gray-400 mb-1 text-right">{t('profile.email')}</Text>
        <View className="bg-white/10 rounded-lg p-4 border border-white/10">
          <Text className="text-base text-white text-left">{user?.email}</Text>
        </View>
      </View>

      <GlassButton
        title={t('profile.editProfile')}
        onPress={() => {}}
        variant="primary"
        className="mt-4"
      />
    </GlassView>
  );

  const renderBillingTab = () => {
    if (billingLoading) {
      return (
        <View className="flex-1 justify-center items-center">
          <GlassLoadingSpinner size="large" />
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Payment Methods */}
        <GlassView className="p-8 mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-semibold text-white">{t('profile.billing.paymentMethods')}</Text>
            <TouchableOpacity className="bg-purple-500 px-4 py-2 rounded-lg">
              <Text className="text-white text-sm font-medium">+ {t('profile.billing.addCard')}</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <Text className="text-gray-400 text-center py-8">{t('profile.billing.noPaymentMethods')}</Text>
          ) : (
            paymentMethods.map((method) => (
              <View key={method.id} className="flex-row justify-between items-center bg-white/10 rounded-lg p-4 mb-3 border border-white/10">
                <View className="flex-row items-center flex-1">
                  <View className="mr-3">
                    <NativeIcon name="creditCard" size="lg" color="#a855f7" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium text-base">
                      {method.type.toUpperCase()} •••• {method.last4}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      {t('profile.billing.expires')} {method.expiry}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  {method.is_default && (
                    <View className="bg-purple-600/30 px-3 py-1 rounded-lg">
                      <Text className="text-purple-400 text-xs font-medium">{t('profile.billing.default')}</Text>
                    </View>
                  )}
                  <TouchableOpacity className="px-3 py-1">
                    <Text className="text-purple-500 text-sm">{t('common.edit')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </GlassView>

        {/* Billing History */}
        <GlassView className="p-8 mb-6">
          <Text className="text-xl font-semibold text-white mb-6">{t('profile.billing.history')}</Text>

          {billingHistory.length === 0 ? (
            <Text className="text-gray-400 text-center py-8">{t('profile.billing.noHistory')}</Text>
          ) : (
            <View>
              <View className="flex-row bg-white/5 p-3 rounded-lg mb-2">
                <Text className="text-gray-400 text-sm font-medium flex-1">{t('profile.billing.date')}</Text>
                <Text className="text-gray-400 text-sm font-medium flex-[2]">{t('profile.billing.description')}</Text>
                <Text className="text-gray-400 text-sm font-medium flex-1">{t('profile.billing.amount')}</Text>
                <Text className="text-gray-400 text-sm font-medium flex-1">{t('profile.billing.status')}</Text>
              </View>
              {billingHistory.map((item) => (
                <View key={item.id} className="flex-row items-center py-3 border-b border-white/10">
                  <Text className="text-white text-sm flex-1">{item.date}</Text>
                  <Text className="text-white text-sm flex-[2]">{item.description}</Text>
                  <Text className="text-white text-sm flex-1">₪{item.amount.toFixed(2)}</Text>
                  <View className={`px-3 py-1 rounded-lg flex-1 ${item.status === 'paid' ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                    <Text className={`text-xs font-medium text-center ${item.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {item.status === 'paid' ? t('profile.billing.paid') : t('profile.billing.pending')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity className="flex-row items-center justify-center bg-white/10 p-4 rounded-lg mt-6">
            <NativeIcon name="download" size="md" color="#a855f7" />
            <Text className="text-purple-500 text-base font-medium ml-2">{t('profile.billing.downloadInvoices')}</Text>
          </TouchableOpacity>
        </GlassView>

        {/* Billing Address */}
        <GlassView className="p-8 mb-6">
          <Text className="text-xl font-semibold text-white mb-6">{t('profile.billing.billingAddress')}</Text>
          <View className="bg-white/10 rounded-lg p-4 mb-4 border border-white/10">
            <Text className="text-white text-base mb-1">{user?.name}</Text>
            <Text className="text-gray-400 text-sm">{t('profile.address.line1')}</Text>
            <Text className="text-gray-400 text-sm">{t('profile.address.line2')}</Text>
          </View>
          <GlassButton
            title={t('profile.billing.editAddress')}
            onPress={() => {}}
            variant="secondary"
            className="mt-2"
          />
        </GlassView>
      </ScrollView>
    );
  };

  const renderSubscriptionTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Current Plan */}
      <GlassView className="p-8 mb-6">
        <Text className="text-xl font-semibold text-white mb-6">{t('profile.subscription.currentPlan')}</Text>

        {user?.subscription ? (
          <View className="bg-white/10 rounded-xl p-6 border border-white/10">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-2xl font-bold text-white mb-2">{user.subscription.plan}</Text>
                <Text className="text-gray-400 text-sm">
                  {t('profile.subscription.status')}: {user.subscription.status}
                </Text>
              </View>
              <View className="bg-green-500/20 px-4 py-2 rounded-lg">
                <Text className="text-green-400 text-sm font-medium">{t('profile.subscription.active')}</Text>
              </View>
            </View>
            {user.subscription.end_date && (
              <Text className="text-gray-400 text-sm">
                {t('profile.subscription.renewsOn')} {user.subscription.end_date}
              </Text>
            )}
          </View>
        ) : (
          <View className="bg-white/5 rounded-xl p-8 items-center">
            <NativeIcon name="live" size="3xl" color="#9ca3af" />
            <Text className="text-gray-400 text-base text-center mt-4">{t('profile.subscription.noActivePlan')}</Text>
          </View>
        )}
      </GlassView>

      {/* Upgrade Options */}
      <GlassView className="p-8 mb-6">
        <Text className="text-xl font-semibold text-white mb-2">{t('profile.subscription.availablePlans')}</Text>
        <Text className="text-gray-400 text-sm mb-6">{t('profile.subscription.choosePlan')}</Text>

        <View className="flex-row gap-4">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = user?.subscription?.plan?.toLowerCase() === plan.id;
            return (
              <View
                key={plan.id}
                className={`flex-1 bg-white/10 rounded-xl p-6 border-2 ${
                  plan.recommended ? 'border-purple-500' : isCurrentPlan ? 'border-green-500' : 'border-white/10'
                }`}
              >
                {plan.recommended && (
                  <View className="absolute top-4 right-4 bg-purple-500 px-3 py-1 rounded-lg">
                    <Text className="text-white text-xs font-bold">{t('profile.subscription.recommended')}</Text>
                  </View>
                )}
                <Text className="text-xl font-bold text-white mb-2">{t(plan.nameKey)}</Text>
                <Text className="text-2xl font-bold text-purple-400 mb-6">{t(plan.priceKey)}</Text>
                <View className="mb-6">
                  {plan.features.map((feature, index) => (
                    <View key={index} className="flex-row items-start mb-2">
                      <View className="mr-2">
                        <NativeIcon name="check" size="sm" color="#22c55e" />
                      </View>
                      <Text className="text-gray-300 text-sm flex-1">{t(feature)}</Text>
                    </View>
                  ))}
                </View>
                <GlassButton
                  title={isCurrentPlan ? t('profile.subscription.currentPlan') : t('profile.subscription.selectPlan')}
                  onPress={() => !isCurrentPlan && navigation.navigate('Subscribe', { plan: plan.id })}
                  variant={plan.recommended ? 'primary' : 'secondary'}
                  disabled={isCurrentPlan}
                  className="mt-auto"
                />
              </View>
            );
          })}
        </View>
      </GlassView>

      {/* Cancel Subscription */}
      {user?.subscription && (
        <GlassView className="p-8 mb-6">
          <Text className="text-xl font-semibold text-white mb-6">{t('profile.subscription.manageSubscription')}</Text>
          <TouchableOpacity className="bg-red-500/20 p-4 rounded-lg border border-red-500/30 mb-3">
            <Text className="text-red-400 text-base font-medium text-center">{t('profile.subscription.cancelSubscription')}</Text>
          </TouchableOpacity>
          <Text className="text-gray-400 text-sm text-center">{t('profile.subscription.cancelNote')}</Text>
        </GlassView>
      )}
    </ScrollView>
  );

  const renderNotificationsTab = () => (
    <GlassView className="p-8 mb-6">
      <Text className="text-xl font-semibold text-white mb-6">{t('profile.notificationSettings')}</Text>

      {NOTIFICATION_SETTINGS.map((item) => (
        <View key={item.id} className="flex-row justify-between items-center py-4 border-b border-white/10">
          <View className="flex-1 mr-4">
            <Text className="text-white text-base font-medium mb-1">{t(item.labelKey)}</Text>
            <Text className="text-gray-400 text-sm">{t(item.descKey)}</Text>
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
    <GlassView className="p-8 mb-6">
      <Text className="text-xl font-semibold text-white mb-6">{t('profile.security')}</Text>

      <TouchableOpacity className="flex-row justify-between items-center bg-white/10 rounded-lg p-4 mb-3">
        <View className="flex-1">
          <Text className="text-white text-base font-medium mb-1">{t('profile.changePassword')}</Text>
          <Text className="text-gray-400 text-sm">{t('profile.updatePassword')}</Text>
        </View>
        <NativeIcon name="chevronLeft" size="md" color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity className="flex-row justify-between items-center bg-white/10 rounded-lg p-4 mb-3">
        <View className="flex-1">
          <Text className="text-white text-base font-medium mb-1">{t('profile.connectedDevices')}</Text>
          <Text className="text-gray-400 text-sm">{t('profile.manageDevices')}</Text>
        </View>
        <NativeIcon name="chevronLeft" size="md" color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity className="flex-row justify-between items-center bg-white/10 rounded-lg p-4 mb-3">
        <View className="flex-1">
          <Text className="text-white text-base font-medium mb-1">{t('profile.twoFactorAuth')}</Text>
          <Text className="text-gray-400 text-sm">{t('profile.addExtraSecurity')}</Text>
        </View>
        <NativeIcon name="chevronLeft" size="md" color="#9ca3af" />
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
    <View className="flex-1 bg-[#0a0a14]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-6">
        <View className="w-[60px] h-[60px] rounded-full bg-purple-700/20 justify-center items-center ml-6">
          <NativeIcon name="settings" size="xl" color="#a855f7" />
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white text-right">{t('profile.title')}</Text>
          <Text className="text-lg text-gray-400 mt-0.5 text-right">{user?.name}</Text>
        </View>
      </View>

      <View className="flex-1 flex-row px-12">
        {/* Sidebar */}
        <View className={`${isTV ? 'w-70' : 'w-50'} ml-8`}>
          <GlassView className="p-2">
            {TABS.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-row items-center py-4 px-4 rounded-2xl mb-1 ${activeTab === tab.id ? 'bg-purple-600/30' : ''}`}
                // @ts-ignore
                hasTVPreferredFocus={index === 0 && isTV}
              >
                <View className="ml-2">
                  <NativeIcon name={tab.icon} size="md" color={activeTab === tab.id ? '#a855f7' : '#9ca3af'} />
                </View>
                <Text className={`text-base ml-2 ${activeTab === tab.id ? 'text-purple-500 font-semibold' : 'text-gray-400'}`}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}

            <View className="h-px bg-white/10 my-4" />

            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center py-4 px-4 rounded-2xl"
            >
              <View className="ml-2">
                <NativeIcon name="logOut" size="md" color="#ef4444" />
              </View>
              <Text className="text-base text-red-500 ml-2">{t('account.logout')}</Text>
            </TouchableOpacity>
          </GlassView>
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
};

export default ProfileScreen;
