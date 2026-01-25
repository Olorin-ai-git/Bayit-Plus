/**
 * AdminSidebar Component
 * Navigation sidebar for admin dashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { rtlSpacing, rtlMargin } from '../../utils/rtlHelpers';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../stores/authStore';
import { spacing } from '@olorin/design-tokens';

interface NavItem {
  key: string;
  labelKey: string;
  icon: string;
  route?: string;
  permission?: string;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'admin.nav.dashboard',
    icon: '📊',
    route: 'AdminDashboard',
  },
  {
    key: 'users',
    labelKey: 'admin.nav.users',
    icon: '👥',
    route: 'UsersList',
    permission: 'users:read',
  },
  {
    key: 'campaigns',
    labelKey: 'admin.nav.campaigns',
    icon: '🎯',
    route: 'CampaignsList',
    permission: 'campaigns:read',
  },
  {
    key: 'billing',
    labelKey: 'admin.nav.billing',
    icon: '💳',
    permission: 'billing:read',
    children: [
      {
        key: 'billing-overview',
        labelKey: 'admin.nav.billingOverview',
        icon: '📈',
        route: 'BillingOverview',
      },
      {
        key: 'transactions',
        labelKey: 'admin.nav.transactions',
        icon: '📋',
        route: 'Transactions',
      },
      {
        key: 'refunds',
        labelKey: 'admin.nav.refunds',
        icon: '↩️',
        route: 'Refunds',
      },
    ],
  },
  {
    key: 'subscriptions',
    labelKey: 'admin.nav.subscriptions',
    icon: '📦',
    permission: 'subscriptions:read',
    children: [
      {
        key: 'subscriptions-list',
        labelKey: 'admin.nav.subscriptionsList',
        icon: '📋',
        route: 'Subscriptions',
      },
      {
        key: 'plans',
        labelKey: 'admin.nav.plans',
        icon: '⚙️',
        route: 'PlanManagement',
      },
    ],
  },
  {
    key: 'marketing',
    labelKey: 'admin.nav.marketing',
    icon: '📣',
    permission: 'marketing:read',
    children: [
      {
        key: 'marketing-dashboard',
        labelKey: 'admin.nav.marketingDashboard',
        icon: '📊',
        route: 'MarketingDashboard',
      },
      {
        key: 'email-campaigns',
        labelKey: 'admin.nav.emailCampaigns',
        icon: '✉️',
        route: 'EmailCampaigns',
      },
      {
        key: 'push-notifications',
        labelKey: 'admin.nav.pushNotifications',
        icon: '🔔',
        route: 'PushNotifications',
      },
    ],
  },
  {
    key: 'uploads',
    labelKey: 'admin.nav.uploads',
    icon: '📤',
    route: 'Uploads',
    permission: 'content:create',
  },
  {
    key: 'settings',
    labelKey: 'admin.nav.settings',
    icon: '⚙️',
    route: 'Settings',
    permission: 'system:config',
  },
  {
    key: 'logs',
    labelKey: 'admin.nav.auditLogs',
    icon: '📜',
    route: 'AuditLogs',
    permission: 'system:logs',
  },
];

export const AdminSidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const { can } = usePermissions();
  const { logout } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['billing', 'subscriptions', 'marketing']);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const isActiveRoute = (routeName?: string) => {
    if (!routeName) return false;
    return route.name === routeName;
  };

  const hasPermissionForItem = (item: NavItem): boolean => {
    if (!item.permission) return true;
    return can(item.permission as any);
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    if (!hasPermissionForItem(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.key);
    const isActive = isActiveRoute(item.route);

    return (
      <View key={item.key}>
        <TouchableOpacity
          className={`flex items-center py-2 px-4 mx-2 my-0.5 rounded ${isChild ? 'pl-6' : ''} ${isActive ? 'bg-secondary/[0.19]' : ''}`}
          style={{ flexDirection }}
          onPress={() => {
            if (hasChildren) {
              toggleExpand(item.key);
            } else if (item.route) {
              navigation.navigate(item.route);
            }
          }}
        >
          <Text className="text-lg mr-2 w-6 text-center">{item.icon}</Text>
          <Text className={`flex-1 text-sm ${isActive ? 'text-text font-semibold' : 'text-textSecondary'}`} style={{ textAlign }}>
            {t(item.labelKey, item.key)}
          </Text>
          {hasChildren && (
            <Text className="text-[10px] text-textMuted">
              {isExpanded ? (isRTL ? '◀' : '▶') : (isRTL ? '▶' : '◀')}
            </Text>
          )}
        </TouchableOpacity>

        {hasChildren && isExpanded && (
          <View style={[rtlMargin(isRTL, { left: spacing.sm })]}>
            {item.children!.map(child => renderNavItem(child, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="w-[260px] bg-backgroundLight border-r border-glassBorder h-full">
      {/* Header - Brand & User Info Combined */}
      <View className="p-4 pb-4 border-b border-glassBorder gap-4">
        {/* Brand Title */}
        <View className="pb-2 border-b border-glassBorderLight">
          <Text className="text-xl font-bold text-primary mb-1" style={{ textAlign }}>
            {t('admin.brand.title', 'Bayit+ Admin')}
          </Text>
          <Text className="text-sm text-textMuted" style={{ textAlign }}>
            {t('admin.brand.subtitle', 'System Management')}
          </Text>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView className="flex-1 py-2" showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map(item => renderNavItem(item))}
      </ScrollView>

      {/* Footer Actions */}
      <View className="p-4 border-t border-glassBorder">
        <TouchableOpacity
          className="flex items-center py-2 px-4 rounded mb-1"
          style={{ flexDirection }}
          onPress={() => navigation.navigate('Home')}
        >
          <Text className="text-base mr-2">🏠</Text>
          <Text className="text-sm text-textSecondary" style={{ textAlign }}>{t('admin.nav.backToApp', 'Back to App')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex items-center py-2 px-4 rounded mb-1 bg-error/20"
          style={{ flexDirection }}
          onPress={logout}
        >
          <Text className="text-base mr-2">🚪</Text>
          <Text className="text-sm text-textSecondary" style={{ textAlign }}>{t('admin.nav.logout', 'Logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AdminSidebar;
