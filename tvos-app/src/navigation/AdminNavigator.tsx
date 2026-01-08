/**
 * Admin Navigator for tvOS
 * Stack navigator for all admin screens
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

// Admin Screens from tv-app
import AdminDashboardScreen from '@bayit/admin-screens/AdminDashboardScreen';
import UsersListScreen from '@bayit/admin-screens/UsersListScreen';
import UserDetailScreen from '@bayit/admin-screens/UserDetailScreen';
import CampaignsListScreen from '@bayit/admin-screens/CampaignsListScreen';
import CampaignDetailScreen from '@bayit/admin-screens/CampaignDetailScreen';
import BillingOverviewScreen from '@bayit/admin-screens/BillingOverviewScreen';
import TransactionsScreen from '@bayit/admin-screens/TransactionsScreen';
import RefundsScreen from '@bayit/admin-screens/RefundsScreen';
import SubscriptionsScreen from '@bayit/admin-screens/SubscriptionsScreen';
import PlanManagementScreen from '@bayit/admin-screens/PlanManagementScreen';
import MarketingDashboardScreen from '@bayit/admin-screens/MarketingDashboardScreen';
import EmailCampaignsScreen from '@bayit/admin-screens/EmailCampaignsScreen';
import PushNotificationsScreen from '@bayit/admin-screens/PushNotificationsScreen';
import SettingsScreen from '@bayit/admin-screens/SettingsScreen';
import AuditLogsScreen from '@bayit/admin-screens/AuditLogsScreen';

import { PermissionGate } from '@bayit/shared/admin';
import { colors } from '@bayit/shared/theme';

// Define admin route param types
export type AdminStackParamList = {
  AdminDashboard: undefined;
  UsersList: undefined;
  UserDetail: { userId: string };
  CampaignsList: undefined;
  CampaignDetail: { campaignId?: string };
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

const Stack = createStackNavigator<AdminStackParamList>();

// Screen options for admin screens
const screenOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: colors.background,
  },
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
