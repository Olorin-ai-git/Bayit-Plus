/**
 * ProfileScreen - Main profile settings screen with tabbed navigation.
 * Orchestrates profile, billing, subscription, notifications, and security tabs.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../../components';
import { useAuthStore } from '../../stores/authStore';
import { subscriptionService } from '../../services/api';
import { isTV } from '../../utils/platform';
import { TABS, TabId, PaymentMethod, BillingHistoryItem } from './types';
import { ProfileTab } from './ProfileTab';
import { BillingTab } from './BillingTab';
import { SubscriptionTab } from './SubscriptionTab';
import { NotificationsTab } from './NotificationsTab';
import { SecurityTab } from './SecurityTab';

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

  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab as TabId);
    }
  }, [route.params?.tab]);

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
    setNotifications(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab user={user} />;
      case 'billing':
        return (
          <BillingTab
            user={user}
            paymentMethods={paymentMethods}
            billingHistory={billingHistory}
            isLoading={billingLoading}
          />
        );
      case 'subscription':
        return <SubscriptionTab user={user} />;
      case 'notifications':
        return <NotificationsTab notifications={notifications} onToggle={toggleNotification} />;
      case 'security':
        return <SecurityTab />;
      default:
        return <ProfileTab user={user} />;
    }
  };

  return (
    <View className="flex-1 bg-[#0f0a1a]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-4">
        <View className="w-[60px] h-[60px] rounded-full bg-[rgba(138,43,226,0.2)] justify-center items-center ml-4">
          <Text className="text-[28px]">⚙️</Text>
        </View>
        <View>
          <Text className="text-[42px] font-bold text-white text-right">{t('profile.title')}</Text>
          <Text className="text-[18px] text-[rgba(255,255,255,0.6)] mt-0.5 text-right">{user?.name}</Text>
        </View>
      </View>

      <View className="flex-1 flex-row px-12">
        {/* Sidebar */}
        <View className={isTV ? "w-[280px]" : "w-[200px]"} style={{ marginLeft: 24 }}>
          <GlassView className="p-2">
            {TABS.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-row items-center py-3 px-3 rounded-lg mb-1 ${activeTab === tab.id ? 'bg-[rgba(107,33,168,0.3)]' : ''}`}
                // @ts-ignore
                hasTVPreferredFocus={index === 0 && isTV}
              >
                <Text className="text-[20px] ml-2">{tab.icon}</Text>
                <Text className={`text-[16px] ${activeTab === tab.id ? 'text-[#6b21a8] font-semibold' : 'text-[rgba(255,255,255,0.6)]'}`}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}

            <View className="h-[1px] bg-[rgba(255,255,255,0.1)] my-3" />

            <TouchableOpacity onPress={handleLogout} className="flex-row items-center py-3 px-3 rounded-lg">
              <Text className="text-[20px] ml-2">🚪</Text>
              <Text className="text-[16px] text-[#ef4444]">{t('account.logout')}</Text>
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
