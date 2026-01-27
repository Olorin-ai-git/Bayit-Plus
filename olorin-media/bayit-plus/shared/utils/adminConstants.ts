/**
 * Admin Constants
 * Centralized constants for admin dashboard icons, colors, and mappings
 */

import { colors } from '@olorin/design-tokens';

// ============================================
// Activity Icons
// ============================================

export const ACTIVITY_ICONS: Record<string, string> = {
  'user_created': '👤',
  'user_updated': '✏️',
  'user_deleted': '🗑️',
  'user_role_changed': '🔑',
  'subscription_created': '📦',
  'subscription_updated': '📝',
  'subscription_canceled': '❌',
  'payment_received': '💳',
  'refund_processed': '↩️',
  'campaign_created': '🎯',
  'campaign_updated': '✏️',
  'campaign_deleted': '🗑️',
  'campaign_activated': '▶️',
  'settings_updated': '⚙️',
  'login': '🔑',
  'logout': '🚪',
};

export const getActivityIcon = (action: string): string => {
  return ACTIVITY_ICONS[action] || '📋';
};

// ============================================
// Campaign Icons & Colors
// ============================================

export const CAMPAIGN_TYPE_ICONS: Record<string, string> = {
  discount: '💰',
  trial: '🎁',
  referral: '👥',
  promotional: '🎯',
};

export const getCampaignTypeIcon = (type: string): string => {
  return CAMPAIGN_TYPE_ICONS[type] || '📢';
};

// ============================================
// Status Colors
// ============================================

export const STATUS_COLORS: Record<string, string> = {
  // General statuses
  active: colors.success.DEFAULT,
  inactive: colors.textMuted,
  pending: colors.warning.DEFAULT,

  // Campaign statuses
  draft: colors.textMuted,
  scheduled: colors.warning.DEFAULT,
  ended: colors.error.DEFAULT,
  paused: colors.secondary.DEFAULT,

  // Transaction statuses
  completed: colors.success.DEFAULT,
  failed: colors.error.DEFAULT,
  refunded: colors.warning.DEFAULT,

  // Refund statuses
  approved: colors.success.DEFAULT,
  processed: colors.success.DEFAULT,
  rejected: colors.error.DEFAULT,

  // Marketing statuses
  sending: colors.warning.DEFAULT,
  sent: colors.success.DEFAULT,
};

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || colors.textMuted;
};

// ============================================
// Role Mappings
// ============================================

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  content_manager: 'Content Manager',
  billing_admin: 'Billing Admin',
  support: 'Support',
  user: 'User',
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: colors.error.DEFAULT,
  admin: colors.warning.DEFAULT,
  content_manager: colors.primary.DEFAULT,
  billing_admin: colors.success.DEFAULT,
  support: colors.secondary.DEFAULT,
  user: colors.textMuted,
};

export const getRoleLabel = (role: string): string => {
  return ROLE_LABELS[role] || role;
};

export const getRoleColor = (role: string): string => {
  return ROLE_COLORS[role] || colors.textMuted;
};

// ============================================
// Subscription Plan Colors
// ============================================

export const PLAN_COLORS: Record<string, string> = {
  free: colors.textMuted,
  basic: colors.secondary.DEFAULT,
  premium: colors.primary.DEFAULT,
  family: colors.success.DEFAULT,
};

export const getPlanColor = (plan: string): string => {
  return PLAN_COLORS[plan.toLowerCase()] || colors.primary.DEFAULT;
};

// ============================================
// Payment Method Icons
// ============================================

export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  credit_card: '💳',
  card: '💳',
  paypal: '🅿️',
  apple_pay: '🍎',
  google_pay: '🔵',
};

export const getPaymentMethodIcon = (method: string): string => {
  return PAYMENT_METHOD_ICONS[method] || '💳';
};

// ============================================
// Admin Page Icon Configuration
// ============================================

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  CreditCard,
  Receipt,
  RefreshCcw,
  FileText,
  Bell,
  Mail,
  Megaphone,
  Edit3,
  FolderTree,
  FileEdit,
  Library,
  Star,
  Radio,
  Mic,
  Headphones,
  Video,
  Upload,
  Languages,
  Bot,
  Grid3x3,
  Settings,
  Layers,
  DollarSign,
  TrendingUp,
  Mic2,
} from 'lucide-react';

export interface AdminPageConfig {
  icon: LucideIcon;
  iconColor: string;
  iconBackgroundColor: string;
  category: 'dashboard' | 'content' | 'users' | 'financial' | 'marketing' | 'technical' | 'settings';
}

/**
 * Centralized admin page configuration
 * Maps page keys to icons, colors, and metadata
 * NO HARDCODED VALUES - all colors from design tokens
 */
export const ADMIN_PAGE_CONFIG: Record<string, AdminPageConfig> = {
  // Dashboard & Overview (3 pages)
  dashboard: {
    icon: LayoutDashboard,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`, // 15% opacity
    category: 'dashboard',
  },
  billing: {
    icon: DollarSign,
    iconColor: colors.error.DEFAULT,
    iconBackgroundColor: `${colors.error.DEFAULT}26`,
    category: 'financial',
  },
  'marketing-dashboard': {
    icon: TrendingUp,
    iconColor: colors.secondary.DEFAULT,
    iconBackgroundColor: `${colors.secondary.DEFAULT}26`,
    category: 'marketing',
  },

  // Content Management (8 pages)
  categories: {
    icon: FolderTree,
    iconColor: colors.info.DEFAULT,
    iconBackgroundColor: `${colors.info.DEFAULT}26`,
    category: 'content',
  },
  'content-editor': {
    icon: FileEdit,
    iconColor: colors.info.DEFAULT,
    iconBackgroundColor: `${colors.info.DEFAULT}26`,
    category: 'content',
  },
  'content-library': {
    icon: Library,
    iconColor: colors.info.DEFAULT,
    iconBackgroundColor: `${colors.info.DEFAULT}26`,
    category: 'content',
  },
  featured: {
    icon: Star,
    iconColor: colors.warning.DEFAULT,
    iconBackgroundColor: `${colors.warning.DEFAULT}26`,
    category: 'content',
  },
  'live-channels': {
    icon: Radio,
    iconColor: colors.error.DEFAULT,
    iconBackgroundColor: `${colors.error.DEFAULT}26`,
    category: 'content',
  },
  podcasts: {
    icon: Mic,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`,
    category: 'content',
  },
  audiobooks: {
    icon: Headphones,
    iconColor: colors.secondary.DEFAULT,
    iconBackgroundColor: `${colors.secondary.DEFAULT}26`,
    category: 'content',
  },
  'podcast-episodes': {
    icon: Headphones,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`,
    category: 'content',
  },
  'radio-stations': {
    icon: Radio,
    iconColor: colors.info.DEFAULT,
    iconBackgroundColor: `${colors.info.DEFAULT}26`,
    category: 'content',
  },

  // User & Subscription Management (5 pages)
  users: {
    icon: Users,
    iconColor: colors.success.DEFAULT,
    iconBackgroundColor: `${colors.success.DEFAULT}26`,
    category: 'users',
  },
  'user-detail': {
    icon: UserCircle,
    iconColor: colors.success.DEFAULT,
    iconBackgroundColor: `${colors.success.DEFAULT}26`,
    category: 'users',
  },
  subscriptions: {
    icon: CreditCard,
    iconColor: colors.error.DEFAULT,
    iconBackgroundColor: `${colors.error.DEFAULT}26`,
    category: 'users',
  },
  plans: {
    icon: Layers,
    iconColor: colors.warning.DEFAULT,
    iconBackgroundColor: `${colors.warning.DEFAULT}26`,
    category: 'users',
  },
  recordings: {
    icon: Video,
    iconColor: colors.secondary.DEFAULT,
    iconBackgroundColor: `${colors.secondary.DEFAULT}26`,
    category: 'users',
  },

  // Financial & Billing (3 pages)
  transactions: {
    icon: Receipt,
    iconColor: colors.error.DEFAULT,
    iconBackgroundColor: `${colors.error.DEFAULT}26`,
    category: 'financial',
  },
  refunds: {
    icon: RefreshCcw,
    iconColor: colors.warning.DEFAULT,
    iconBackgroundColor: `${colors.warning.DEFAULT}26`,
    category: 'financial',
  },
  'audit-logs': {
    icon: FileText,
    iconColor: colors.textMuted,
    iconBackgroundColor: `${colors.textMuted}26`,
    category: 'financial',
  },

  // Marketing & Communications (4 pages)
  notifications: {
    icon: Bell,
    iconColor: colors.secondary.DEFAULT,
    iconBackgroundColor: `${colors.secondary.DEFAULT}26`,
    category: 'marketing',
  },
  'email-campaigns': {
    icon: Mail,
    iconColor: colors.secondary.DEFAULT,
    iconBackgroundColor: `${colors.secondary.DEFAULT}26`,
    category: 'marketing',
  },
  campaigns: {
    icon: Megaphone,
    iconColor: colors.secondary.DEFAULT,
    iconBackgroundColor: `${colors.secondary.DEFAULT}26`,
    category: 'marketing',
  },
  'campaign-edit': {
    icon: Edit3,
    iconColor: colors.secondary.DEFAULT,
    iconBackgroundColor: `${colors.secondary.DEFAULT}26`,
    category: 'marketing',
  },

  // Technical & System Tools (5 pages)
  uploads: {
    icon: Upload,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`,
    category: 'technical',
  },
  voice: {
    icon: Mic2,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`,
    category: 'technical',
  },
  translation: {
    icon: Languages,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`,
    category: 'technical',
  },
  librarian: {
    icon: Bot,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`,
    category: 'technical',
  },
  widgets: {
    icon: Grid3x3,
    iconColor: colors.primary.DEFAULT,
    iconBackgroundColor: `${colors.primary.DEFAULT}26`,
    category: 'technical',
  },

  // Settings & Configuration (1 page)
  settings: {
    icon: Settings,
    iconColor: colors.textMuted,
    iconBackgroundColor: `${colors.textMuted}26`,
    category: 'settings',
  },
};

/**
 * Get admin page configuration by page key
 * Returns null if page key not found
 */
export const getAdminPageConfig = (pageKey: string): AdminPageConfig | null => {
  return ADMIN_PAGE_CONFIG[pageKey] || null;
};
