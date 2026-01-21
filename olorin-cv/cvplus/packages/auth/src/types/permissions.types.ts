/**
 * Permissions Types
 * 
 * Type definitions for role-based access control and permissions.
  */

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: PermissionCondition[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  isSystem: boolean;
  isDefault: boolean;
  hierarchy: number; // Lower number = higher authority
  metadata?: Record<string, any>;
}

export type RoleName = 'guest' | 'user' | 'premium' | 'moderator' | 'admin' | 'super_admin';

export interface UserRole {
  userId: string;
  roleId: string;
  grantedBy: string;
  grantedAt: number;
  expiresAt?: number;
  conditions?: PermissionCondition[];
  metadata?: Record<string, any>;
}

export type PermissionAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'admin'
  | 'manage'
  | 'view'
  | 'edit'
  | 'publish'
  | 'moderate';

export type PermissionScope = 
  | 'global'
  | 'organization' 
  | 'team'
  | 'project'
  | 'resource'
  | 'self';

export interface PermissionCondition {
  type: PermissionConditionType;
  operator: PermissionOperator;
  value: any;
  metadata?: Record<string, any>;
}

export type PermissionConditionType =
  | 'time_range'
  | 'ip_address'
  | 'user_attribute'
  | 'resource_attribute'
  | 'custom_function';

export type PermissionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'matches'
  | 'exists'
  | 'not_exists';

export interface PermissionCheck {
  userId: string;
  resource: string;
  action: PermissionAction;
  context?: PermissionContext;
}

export interface PermissionContext {
  resourceId?: string;
  resourceData?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: number;
  customAttributes?: Record<string, any>;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  conditions?: PermissionCondition[];
  metadata?: Record<string, any>;
}

export interface RoleHierarchy {
  roleId: string;
  parentRoles: string[];
  childRoles: string[];
  level: number;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color?: string;
  icon?: string;
}

// Standard CVPlus Roles
export type StandardRole = 
  | 'guest'
  | 'user'
  | 'premium'
  | 'moderator'
  | 'admin'
  | 'super_admin';

// Standard CVPlus Resources
export type StandardResource =
  | 'cv'
  | 'templates'
  | 'features'
  | 'media'
  | 'analytics'
  | 'settings'
  | 'users'
  | 'billing'
  | 'system';

// Standard CVPlus Permissions
export interface StandardPermissions {
  // CV Management
  'cv:create': boolean;
  'cv:read': boolean;
  'cv:update': boolean;
  'cv:delete': boolean;
  'cv:share': boolean;
  'cv:export': boolean;
  
  // Template Access
  'templates:view': boolean;
  'templates:use': boolean;
  'templates:create': boolean;
  'templates:manage': boolean;
  
  // Feature Access
  'features:basic': boolean;
  'features:premium': boolean;
  'features:web_portal': boolean;
  'features:ai_chat': boolean;
  'features:podcast': boolean;
  'features:video': boolean;
  'features:analytics': boolean;
  
  // Media Generation
  'media:generate': boolean;
  'media:upload': boolean;
  'media:manage': boolean;
  
  // Analytics
  'analytics:view': boolean;
  'analytics:export': boolean;
  'analytics:manage': boolean;
  
  // System Administration
  'admin:users': boolean;
  'admin:roles': boolean;
  'admin:permissions': boolean;
  'admin:system': boolean;
  'admin:billing': boolean;
}

export interface PermissionMatrix {
  [roleId: string]: {
    [resource: string]: {
      [action: string]: boolean;
    };
  };
}

export interface PermissionAuditLog {
  id: string;
  userId: string;
  action: 'grant' | 'revoke' | 'check' | 'deny';
  resource: string;
  permission: string;
  result: boolean;
  timestamp: number;
  context?: PermissionContext;
  metadata?: Record<string, any>;
}