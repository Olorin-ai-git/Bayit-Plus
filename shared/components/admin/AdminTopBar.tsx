/**
 * AdminTopBar Component
 * Header component for admin pages with breadcrumbs and actions
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { spacing } from '@olorin/design-tokens';

interface Breadcrumb {
  label: string;
  route?: string;
}

interface AdminTopBarProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

// Route to breadcrumb mapping
const ROUTE_BREADCRUMBS: Record<string, Breadcrumb[]> = {
  AdminDashboard: [{ label: 'admin.nav.dashboard' }],
  UsersList: [{ label: 'admin.nav.users' }],
  UserDetail: [
    { label: 'admin.nav.users', route: 'UsersList' },
    { label: 'admin.breadcrumbs.userDetail' },
  ],
  CampaignsList: [{ label: 'admin.nav.campaigns' }],
  CampaignDetail: [
    { label: 'admin.nav.campaigns', route: 'CampaignsList' },
    { label: 'admin.breadcrumbs.campaignDetail' },
  ],
  BillingOverview: [
    { label: 'admin.nav.billing' },
    { label: 'admin.nav.billingOverview' },
  ],
  Transactions: [
    { label: 'admin.nav.billing' },
    { label: 'admin.nav.transactions' },
  ],
  Refunds: [
    { label: 'admin.nav.billing' },
    { label: 'admin.nav.refunds' },
  ],
  Subscriptions: [
    { label: 'admin.nav.subscriptions' },
    { label: 'admin.nav.subscriptionsList' },
  ],
  PlanManagement: [
    { label: 'admin.nav.subscriptions' },
    { label: 'admin.nav.plans' },
  ],
  MarketingDashboard: [
    { label: 'admin.nav.marketing' },
    { label: 'admin.nav.marketingDashboard' },
  ],
  EmailCampaigns: [
    { label: 'admin.nav.marketing' },
    { label: 'admin.nav.emailCampaigns' },
  ],
  PushNotifications: [
    { label: 'admin.nav.marketing' },
    { label: 'admin.nav.pushNotifications' },
  ],
  Settings: [{ label: 'admin.nav.settings' }],
  AuditLogs: [{ label: 'admin.nav.auditLogs' }],
};

// Route to title mapping
const ROUTE_TITLES: Record<string, string> = {
  AdminDashboard: 'admin.titles.dashboard',
  UsersList: 'admin.titles.users',
  UserDetail: 'admin.titles.userDetail',
  CampaignsList: 'admin.titles.campaigns',
  CampaignDetail: 'admin.titles.campaignDetail',
  BillingOverview: 'admin.titles.billingOverview',
  Transactions: 'admin.titles.transactions',
  Refunds: 'admin.titles.refunds',
  Subscriptions: 'admin.titles.subscriptions',
  PlanManagement: 'admin.titles.planManagement',
  MarketingDashboard: 'admin.titles.marketingDashboard',
  EmailCampaigns: 'admin.titles.emailCampaigns',
  PushNotifications: 'admin.titles.pushNotifications',
  Settings: 'admin.titles.settings',
  AuditLogs: 'admin.titles.auditLogs',
};

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  title: customTitle,
  breadcrumbs: customBreadcrumbs,
  actions,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { flexDirection, textAlign } = useDirection();

  const routeName = route.name;
  const breadcrumbs = customBreadcrumbs || ROUTE_BREADCRUMBS[routeName] || [];
  const title = customTitle || t(ROUTE_TITLES[routeName] || routeName, routeName);

  const handleBreadcrumbPress = (breadcrumb: Breadcrumb) => {
    if (breadcrumb.route) {
      navigation.navigate(breadcrumb.route);
    }
  };

  return (
    <View className="flex justify-between items-center px-4 py-4 bg-backgroundLight border-b border-glassBorder min-h-[70px]" style={{ flexDirection }}>
      <View className="flex-1">
        {/* Breadcrumbs */}
        <View className="flex items-center mb-1" style={{ flexDirection }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminDashboard')}
            className="flex items-center"
            style={{ flexDirection }}
          >
            <Text className="text-sm">🏠</Text>
          </TouchableOpacity>

          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <Text className="text-sm text-textMuted mx-1" style={{ textAlign }}>/</Text>
              {crumb.route ? (
                <TouchableOpacity
                  onPress={() => handleBreadcrumbPress(crumb)}
                  className="flex items-center"
                  style={{ flexDirection }}
                >
                  <Text className="text-sm text-primary" style={{ textAlign }}>
                    {t(crumb.label, crumb.label)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-sm text-textSecondary" style={{ textAlign }}>
                  {t(crumb.label, crumb.label)}
                </Text>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Page Title */}
        <Text className="text-xl font-bold text-text" style={{ textAlign }}>{title}</Text>
      </View>

      {/* Actions */}
      <View className="flex items-center gap-2" style={{ flexDirection }}>
        {actions}

        {/* Quick Actions */}
        <TouchableOpacity className="w-10 h-10 rounded-lg bg-glass justify-center items-center border border-glassBorder">
          <Text className="text-lg">🔔</Text>
        </TouchableOpacity>

        <TouchableOpacity className="w-10 h-10 rounded-lg bg-glass justify-center items-center border border-glassBorder">
          <Text className="text-lg">❓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AdminTopBar;
