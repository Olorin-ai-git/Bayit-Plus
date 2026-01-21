/**
 * Role-Based Access Control (RBAC) Types
 * Defines roles, permissions, and admin-related interfaces
 */

export type Role =
  | 'super_admin'
  | 'admin'
  | 'content_manager'
  | 'billing_admin'
  | 'support'
  | 'user';

export type Permission =
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:delete'
  | 'campaigns:read'
  | 'campaigns:create'
  | 'campaigns:update'
  | 'campaigns:delete'
  | 'billing:read'
  | 'billing:refund'
  | 'billing:export'
  | 'subscriptions:read'
  | 'subscriptions:update'
  | 'subscriptions:cancel'
  | 'marketing:read'
  | 'marketing:create'
  | 'marketing:send'
  | 'analytics:read'
  | 'analytics:export'
  | 'system:config'
  | 'system:logs';

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
  user: [],
};

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

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  is_active: boolean;
  role: Role;
  permissions?: Permission[];
  subscription?: Subscription;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  metadata?: Record<string, any>;
}
