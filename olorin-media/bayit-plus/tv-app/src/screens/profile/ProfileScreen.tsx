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
import { styles } from './ProfileScreen.styles';
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
                style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
                // @ts-ignore
                hasTVPreferredFocus={index === 0 && isTV}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
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

export default ProfileScreen;
