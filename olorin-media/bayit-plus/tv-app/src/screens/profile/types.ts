/**
 * Types and constants for ProfileScreen and its tab components.
 */

export interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  is_default: boolean;
}

export interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
}

export type TabId = 'profile' | 'billing' | 'subscription' | 'notifications' | 'security';

export interface Tab {
  id: TabId;
  icon: string;
  labelKey: string;
}

export const TABS: Tab[] = [
  { id: 'profile', icon: '👤', labelKey: 'profile.tabs.personal' },
  { id: 'billing', icon: '💳', labelKey: 'profile.tabs.billing' },
  { id: 'subscription', icon: '⭐', labelKey: 'profile.tabs.subscription' },
  { id: 'notifications', icon: '🔔', labelKey: 'profile.tabs.notifications' },
  { id: 'security', icon: '🛡️', labelKey: 'profile.tabs.security' },
];

export interface SubscriptionPlan {
  id: string;
  nameKey: string;
  priceKey: string;
  features: string[];
  recommended: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
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

export interface NotificationSetting {
  id: string;
  labelKey: string;
  descKey: string;
}

export const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  { id: 'newContent', labelKey: 'profile.notifications.newContent', descKey: 'profile.notifications.newContentDesc' },
  { id: 'recommendations', labelKey: 'profile.notifications.recommendations', descKey: 'profile.notifications.recommendationsDesc' },
  { id: 'updates', labelKey: 'profile.notifications.updates', descKey: 'profile.notifications.updatesDesc' },
];
