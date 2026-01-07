/**
 * Admin Navigator
 * Stack navigator for all admin screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

// Admin Screens (will be created)
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UsersListScreen from '../screens/admin/UsersListScreen';
import UserDetailScreen from '../screens/admin/UserDetailScreen';
import CampaignsListScreen from '../screens/admin/CampaignsListScreen';
import CampaignDetailScreen from '../screens/admin/CampaignDetailScreen';
import BillingOverviewScreen from '../screens/admin/BillingOverviewScreen';
import TransactionsScreen from '../screens/admin/TransactionsScreen';
import RefundsScreen from '../screens/admin/RefundsScreen';
import SubscriptionsScreen from '../screens/admin/SubscriptionsScreen';
import PlanManagementScreen from '../screens/admin/PlanManagementScreen';
import MarketingDashboardScreen from '../screens/admin/MarketingDashboardScreen';
import EmailCampaignsScreen from '../screens/admin/EmailCampaignsScreen';
import PushNotificationsScreen from '../screens/admin/PushNotificationsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import AuditLogsScreen from '../screens/admin/AuditLogsScreen';

import { PermissionGate } from '@bayit/shared/admin';
import { colors } from '@bayit/shared/theme';

// Define admin route param types
export type AdminStackParamList = {
  AdminDashboard: undefined;
  UsersList: undefined;
  UserDetail: { userId: string };
  CampaignsList: undefined;
  CampaignDetail: { campaignId?: string };  // undefined for new campaign
  BillingOverview: undefined;
  Transactions: undefined;
  Refunds: undefined;
  Subscriptions: undefined;
  PlanManagement: undefined;
  MarketingDashboard: undefined;
  EmailCampaigns: undefined;
  PushNotifications: undefined;
  Settings: undefined;
  AuditLogs: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

// Screen options for admin screens
const screenOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: colors.background,
  },
  animation: 'fade' as const,
};

export const AdminNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PermissionGate requireAdmin showDenied>
      <Stack.Navigator
        initialRouteName="AdminDashboard"
        screenOptions={screenOptions}
      >
        {/* Dashboard */}
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
        />

        {/* Users Management */}
        <Stack.Screen
          name="UsersList"
          component={UsersListScreen}
        />
        <Stack.Screen
          name="UserDetail"
          component={UserDetailScreen}
        />

        {/* Campaigns */}
        <Stack.Screen
          name="CampaignsList"
          component={CampaignsListScreen}
        />
        <Stack.Screen
          name="CampaignDetail"
          component={CampaignDetailScreen}
        />

        {/* Billing */}
        <Stack.Screen
          name="BillingOverview"
          component={BillingOverviewScreen}
        />
        <Stack.Screen
          name="Transactions"
          component={TransactionsScreen}
        />
        <Stack.Screen
          name="Refunds"
          component={RefundsScreen}
        />

        {/* Subscriptions */}
        <Stack.Screen
          name="Subscriptions"
          component={SubscriptionsScreen}
        />
        <Stack.Screen
          name="PlanManagement"
          component={PlanManagementScreen}
        />

        {/* Marketing */}
        <Stack.Screen
          name="MarketingDashboard"
          component={MarketingDashboardScreen}
        />
        <Stack.Screen
          name="EmailCampaigns"
          component={EmailCampaignsScreen}
        />
        <Stack.Screen
          name="PushNotifications"
          component={PushNotificationsScreen}
        />

        {/* Settings & Logs */}
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
        />
        <Stack.Screen
          name="AuditLogs"
          component={AuditLogsScreen}
        />
      </Stack.Navigator>
    </PermissionGate>
  );
};

export default AdminNavigator;
