/**
 * Role-Based Access Control (RBAC) Types
 * Defines roles, permissions, and admin-related interfaces
 */

// Available roles in the system
export type Role =
  | 'super_admin'    // Full system access
  | 'admin'          // Administrative access (most features)
  | 'content_manager' // Content operations
  | 'billing_admin'  // Financial operations
  | 'support'        // Customer support
  | 'viewer'         // Unverified user (browse only)
  | 'user';          // Regular subscriber (verified)

// Granular permissions
export type Permission =
  // Users
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  // Content
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:delete'
  // Campaigns
  | 'campaigns:read'
  | 'campaigns:create'
  | 'campaigns:update'
  | 'campaigns:delete'
  // Billing
  | 'billing:read'
  | 'billing:refund'
  | 'billing:export'
  // Subscriptions
  | 'subscriptions:read'
  | 'subscriptions:update'
  | 'subscriptions:cancel'
  // Marketing
  | 'marketing:read'
  | 'marketing:create'
  | 'marketing:send'
  // Analytics
  | 'analytics:read'
  | 'analytics:export'
  // System
  | 'system:config'
  | 'system:logs';

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    'users:read', 'users:create', 'users:update', 'users:delete',
    'content:read', 'content:create', 'content:update', 'content:delete',
    'campaigns:read', 'campaigns:create', 'campaigns:update', 'campaigns:delete',
    'billing:read', 'billing:refund', 'billing:export',
    'subscriptions:read', 'subscriptions:update', 'subscriptions:cancel',
    'marketing:read', 'marketing:create', 'marketing:send',
    'analytics:read', 'analytics:export',
    'system:config', 'system:logs',
  ],
  admin: [
    'users:read', 'users:create', 'users:update',
    'content:read', 'content:create', 'content:update', 'content:delete',
    'campaigns:read', 'campaigns:create', 'campaigns:update', 'campaigns:delete',
    'billing:read', 'billing:refund', 'billing:export',
    'subscriptions:read', 'subscriptions:update', 'subscriptions:cancel',
    'marketing:read', 'marketing:create', 'marketing:send',
    'analytics:read', 'analytics:export',
    'system:logs',
  ],
  content_manager: [
    'content:read', 'content:create', 'content:update', 'content:delete',
    'campaigns:read', 'campaigns:create', 'campaigns:update',
    'analytics:read',
  ],
  billing_admin: [
    'users:read',
    'billing:read', 'billing:refund', 'billing:export',
    'subscriptions:read', 'subscriptions:update', 'subscriptions:cancel',
    'analytics:read', 'analytics:export',
  ],
  support: [
    'users:read',
    'content:read',
    'billing:read',
    'subscriptions:read',
    'analytics:read',
  ],
  viewer: [],  // Unverified users - browse only
  user: [],    // Verified users with subscription
};

// Subscription interface
export interface Subscription {
  id: string;
  plan: 'basic' | 'premium' | 'family' | 'free' | string;
  status: 'active' | 'canceled' | 'cancelled' | 'expired' | 'trial' | 'paused';
  start_date: string;
  end_date?: string;
  auto_renew?: boolean;
  price?: number;
  currency?: string;
  interval?: string;
}

// Extended User interface with RBAC
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  is_active: boolean;
  role: Role;
  permissions?: Permission[];  // Custom permission overrides
  subscription?: Subscription;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  metadata?: Record<string, any>;
}

// Admin dashboard stats
export interface DashboardStats {
  total_users: number;
  active_users: number;
  active_subscriptions: number;
  monthly_revenue: number;
  daily_active_users: number;
  new_users_today: number;
  new_users_this_week: number;
  total_revenue: number;
  revenue_today: number;
  revenue_this_month: number;
  avg_revenue_per_user: number;
  churn_rate: number;
}

// Chart data point
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Campaign types
export type CampaignType = 'promotional' | 'discount' | 'trial' | 'referral';
export type CampaignStatus = 'draft' | 'active' | 'scheduled' | 'ended' | 'paused';
export type DiscountType = 'percentage' | 'fixed' | 'free_trial' | 'trial_days';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  start_date: string;
  end_date?: string;
  promo_code?: string;
  discount_type: DiscountType;
  discount_value: number;  // Percentage (0-100) or fixed amount or trial days
  usage_limit?: number;
  usage_count: number;
  target_audience: {
    all_users?: boolean;
    plans?: string[];
    new_users_only?: boolean;
    registered_before?: string;
    registered_after?: string;
  };
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// Transaction types
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'card' | 'paypal' | 'apple_pay' | 'google_pay';

export interface Transaction {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  description?: string;
  created_at: string;
}

export interface Refund {
  id: string;
  transaction_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed' | 'rejected' | 'approved';
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

// Marketing types
export type MarketingCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  audience_filter: AudienceFilter;
  status: MarketingCampaignStatus;
  scheduled_at?: string;
  sent_at?: string;
  sent_count?: number;
  open_count?: number;
  click_count?: number;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
  created_by?: string;
  created_at: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  image_url?: string;
  deep_link?: string;
  audience_filter: AudienceFilter;
  status: MarketingCampaignStatus;
  scheduled_at?: string;
  sent_at?: string;
  sent_count?: number;
  open_count?: number;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
  };
  created_by?: string;
  created_at: string;
}

export interface AudienceFilter {
  all_users?: boolean;
  plans?: string[];
  active_only?: boolean;
  inactive_days?: number;
  registered_before?: string;
  registered_after?: string;
  location?: string[];
  language?: string[];
  segment?: string;
}

// Audit log
export type AuditAction =
  | 'user_created' | 'user_updated' | 'user_deleted' | 'user_role_changed'
  | 'user.created' | 'user.updated' | 'user.deleted'
  | 'profile.updated'
  | 'campaign_created' | 'campaign_updated' | 'campaign_deleted'
  | 'campaign.created' | 'campaign.activated'
  | 'subscription_updated' | 'subscription_canceled'
  | 'subscription.created' | 'subscription.upgraded' | 'subscription.renewed'
  | 'refund_processed' | 'refund.processed'
  | 'payment.received' | 'payment.failed'
  | 'settings_updated' | 'settings.updated'
  | 'login' | 'logout';

export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

// System settings
export interface SystemSettings {
  default_plan: string;
  trial_duration_days?: number;
  trial_days?: number;
  max_devices?: number;
  enable_google_auth?: boolean;
  enable_apple_auth?: boolean;
  maintenance_mode: boolean;
  support_email?: string;
  terms_url?: string;
  privacy_url?: string;
  feature_flags?: Record<string, boolean>;
}

// Admin navigation item
export interface AdminNavItem {
  id: string;
  label: string;
  labelKey: string;  // i18n key
  icon: string;
  route: string;
  permissions: Permission[];
  children?: AdminNavItem[];
}

// Table column definition for DataTable
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  labelKey?: string;  // i18n key
  sortable?: boolean;
  width?: number | string;
  render?: (value: any, item: T) => React.ReactNode;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Filter options
export interface FilterOption {
  value: string;
  label: string;
  labelKey?: string;
}
