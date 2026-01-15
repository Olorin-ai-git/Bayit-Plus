/**
 * AdminSidebar Component
 * Navigation sidebar for admin dashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { rtlSpacing, rtlMargin } from '../../utils/rtlHelpers';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

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
          style={[
            styles.navItem,
            isChild && styles.navItemChild,
            isActive && styles.navItemActive,
            { flexDirection },
          ]}
          onPress={() => {
            if (hasChildren) {
              toggleExpand(item.key);
            } else if (item.route) {
              navigation.navigate(item.route);
            }
          }}
        >
          <Text style={styles.navIcon}>{item.icon}</Text>
          <Text style={[styles.navLabel, isActive && styles.navLabelActive, { textAlign }]}>
            {t(item.labelKey, item.key)}
          </Text>
          {hasChildren && (
            <Text style={styles.expandIcon}>
              {isExpanded ? (isRTL ? '◀' : '▶') : (isRTL ? '▶' : '◀')}
            </Text>
          )}
        </TouchableOpacity>

        {hasChildren && isExpanded && (
          <View style={[styles.childrenContainer, rtlMargin(isRTL, { left: spacing.sm })]}>
            {item.children!.map(child => renderNavItem(child, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header - Brand & User Info Combined */}
      <View style={styles.headerContainer}>
        {/* Brand Title */}
        <View style={styles.brandTitleContainer}>
          <Text style={[styles.brandTitle, { textAlign }]}>
            {t('admin.brand.title', 'Bayit+ Admin')}
          </Text>
          <Text style={[styles.brandSubtitle, { textAlign }]}>
            {t('admin.brand.subtitle', 'System Management')}
          </Text>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map(item => renderNavItem(item))}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={[styles.footerButton, { flexDirection }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.footerIcon}>🏠</Text>
          <Text style={[styles.footerText, { textAlign }]}>{t('admin.nav.backToApp', 'Back to App')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerButton, styles.logoutButton, { flexDirection }]}
          onPress={logout}
        >
          <Text style={styles.footerIcon}>🚪</Text>
          <Text style={[styles.footerText, { textAlign }]}>{t('admin.nav.logout', 'Logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: colors.backgroundLight,
    borderRightWidth: 1,
    borderRightColor: colors.glassBorder,
    height: '100%',
  },
  headerContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
  },
  brandTitleContainer: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  brandTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  brandSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  navContainer: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    marginVertical: 2,
    borderRadius: borderRadius.sm,
  },
  navItemChild: {
    paddingLeft: spacing.xl,
  },
  navItemActive: {
    backgroundColor: colors.secondary + '30',
  },
  navIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
    width: 24,
    textAlign: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 10,
    color: colors.textMuted,
  },
  childrenContainer: {
    marginLeft: spacing.sm,
  },
  footerContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  logoutButton: {
    backgroundColor: colors.error + '20',
  },
  footerIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default AdminSidebar;
