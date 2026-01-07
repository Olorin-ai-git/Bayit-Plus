/**
 * AdminTopBar Component
 * Header component for admin pages with breadcrumbs and actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

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
    <View style={[styles.container, { flexDirection }]}>
      <View style={styles.leftSection}>
        {/* Breadcrumbs */}
        <View style={[styles.breadcrumbsContainer, { flexDirection }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminDashboard')}
            style={[styles.breadcrumbItem, { flexDirection }]}
          >
            <Text style={styles.breadcrumbIcon}>🏠</Text>
          </TouchableOpacity>

          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <Text style={[styles.breadcrumbSeparator, { textAlign }]}>/</Text>
              {crumb.route ? (
                <TouchableOpacity
                  onPress={() => handleBreadcrumbPress(crumb)}
                  style={[styles.breadcrumbItem, { flexDirection }]}
                >
                  <Text style={[styles.breadcrumbLink, { textAlign }]}>
                    {t(crumb.label, crumb.label)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.breadcrumbCurrent, { textAlign }]}>
                  {t(crumb.label, crumb.label)}
                </Text>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Page Title */}
        <Text style={[styles.title, { textAlign }]}>{title}</Text>
      </View>

      {/* Actions */}
      <View style={[styles.rightSection, { flexDirection }]}>
        {actions}

        {/* Quick Actions */}
        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconButtonText}>🔔</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconButtonText}>❓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    minHeight: 70,
  },
  leftSection: {
    flex: 1,
  },
  breadcrumbsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbIcon: {
    fontSize: 14,
  },
  breadcrumbSeparator: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  breadcrumbLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  breadcrumbCurrent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconButtonText: {
    fontSize: 18,
  },
});

export default AdminTopBar;
