/**
 * Admin Constants
 * Centralized constants for admin dashboard icons, colors, and mappings
 */

import { colors } from '../theme';

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
  active: colors.success,
  inactive: colors.textMuted,
  pending: colors.warning,

  // Campaign statuses
  draft: colors.textMuted,
  scheduled: colors.warning,
  ended: colors.error,
  paused: colors.secondary,

  // Transaction statuses
  completed: colors.success,
  failed: colors.error,
  refunded: colors.warning,

  // Refund statuses
  approved: colors.success,
  processed: colors.success,
  rejected: colors.error,

  // Marketing statuses
  sending: colors.warning,
  sent: colors.success,
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
  super_admin: colors.error,
  admin: colors.warning,
  content_manager: colors.primary,
  billing_admin: colors.success,
  support: colors.secondary,
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
  basic: colors.secondary,
  premium: colors.primary,
  family: colors.success,
};

export const getPlanColor = (plan: string): string => {
  return PLAN_COLORS[plan.toLowerCase()] || colors.primary;
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
