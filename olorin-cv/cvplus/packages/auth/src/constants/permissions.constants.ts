/**
 * Permissions Constants
 * 
 * Role definitions and permission matrices for the CVPlus platform.
  */

import type { 
  Role, 
  Permission, 
  PermissionMatrix, 
  StandardRole,
  PermissionGroup
} from '../types';

// ============================================================================
// STANDARD ROLES DEFINITION
// ============================================================================
export const STANDARD_ROLES: Record<StandardRole, Role> = {
  guest: {
    id: 'guest',
    name: 'Guest User',
    description: 'Unauthenticated users with limited access',
    permissions: ['cv:preview', 'templates:view_public'],
    isSystem: true,
    isDefault: false,
    hierarchy: 1000
  },
  
  user: {
    id: 'user',
    name: 'Authenticated User',
    description: 'Basic authenticated users with standard features',
    permissions: [
      'cv:create',
      'cv:read',
      'cv:update',
      'cv:delete',
      'cv:export',
      'templates:view',
      'templates:use',
      'features:basic',
      'profile:read',
      'profile:update'
    ],
    isSystem: true,
    isDefault: true,
    hierarchy: 100
  },
  
  premium: {
    id: 'premium',
    name: 'Premium User',
    description: 'Premium subscribers with advanced features',
    permissions: [
      // All user permissions plus premium features
      'cv:create',
      'cv:read',
      'cv:update',
      'cv:delete',
      'cv:export',
      'cv:share',
      'templates:view',
      'templates:use',
      'features:basic',
      'features:premium',
      'features:web_portal',
      'features:ai_chat',
      'features:podcast',
      'features:video',
      'features:analytics',
      'media:generate',
      'media:upload',
      'analytics:view',
      'analytics:export',
      'profile:read',
      'profile:update',
      'calendar:integrate'
    ],
    isSystem: true,
    isDefault: false,
    hierarchy: 50
  },
  
  moderator: {
    id: 'moderator',
    name: 'Moderator',
    description: 'Content moderators with review permissions',
    permissions: [
      // All premium permissions plus moderation
      'cv:create',
      'cv:read',
      'cv:update',
      'cv:delete',
      'cv:export',
      'cv:share',
      'cv:moderate',
      'templates:view',
      'templates:use',
      'templates:moderate',
      'features:basic',
      'features:premium',
      'features:web_portal',
      'features:ai_chat',
      'features:podcast',
      'features:video',
      'features:analytics',
      'media:generate',
      'media:upload',
      'media:moderate',
      'analytics:view',
      'analytics:export',
      'profile:read',
      'profile:update',
      'users:view',
      'users:moderate',
      'calendar:integrate'
    ],
    isSystem: false,
    isDefault: false,
    hierarchy: 25
  },
  
  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Platform administrators with management permissions',
    permissions: [
      // All moderator permissions plus admin features
      'cv:*',
      'templates:*',
      'features:*',
      'media:*',
      'analytics:*',
      'users:*',
      'roles:*',
      'system:manage',
      'billing:view',
      'profile:*',
      'calendar:*'
    ],
    isSystem: false,
    isDefault: false,
    hierarchy: 10
  },
  
  super_admin: {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'System administrators with full access',
    permissions: ['*'],
    isSystem: true,
    isDefault: false,
    hierarchy: 1
  }
};

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================
export const STANDARD_PERMISSIONS: Permission[] = [
  // CV Management Permissions
  {
    id: 'cv:create',
    name: 'Create CV',
    description: 'Create new CVs',
    resource: 'cv',
    action: 'create',
    scope: 'self'
  },
  {
    id: 'cv:read',
    name: 'Read CV',
    description: 'View own CVs',
    resource: 'cv',
    action: 'read',
    scope: 'self'
  },
  {
    id: 'cv:update',
    name: 'Update CV',
    description: 'Edit own CVs',
    resource: 'cv',
    action: 'update',
    scope: 'self'
  },
  {
    id: 'cv:delete',
    name: 'Delete CV',
    description: 'Delete own CVs',
    resource: 'cv',
    action: 'delete',
    scope: 'self'
  },
  {
    id: 'cv:export',
    name: 'Export CV',
    description: 'Export CVs in various formats',
    resource: 'cv',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'cv:share',
    name: 'Share CV',
    description: 'Share CVs with others',
    resource: 'cv',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'cv:moderate',
    name: 'Moderate CV',
    description: 'Review and moderate CVs',
    resource: 'cv',
    action: 'moderate',
    scope: 'global'
  },
  
  // Template Permissions
  {
    id: 'templates:view',
    name: 'View Templates',
    description: 'View available templates',
    resource: 'templates',
    action: 'view',
    scope: 'global'
  },
  {
    id: 'templates:use',
    name: 'Use Templates',
    description: 'Use templates for CV creation',
    resource: 'templates',
    action: 'execute',
    scope: 'global'
  },
  {
    id: 'templates:create',
    name: 'Create Templates',
    description: 'Create new templates',
    resource: 'templates',
    action: 'create',
    scope: 'global'
  },
  {
    id: 'templates:manage',
    name: 'Manage Templates',
    description: 'Full template management',
    resource: 'templates',
    action: 'manage',
    scope: 'global'
  },
  
  // Feature Access Permissions
  {
    id: 'features:basic',
    name: 'Basic Features',
    description: 'Access to basic platform features',
    resource: 'features',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'features:premium',
    name: 'Premium Features',
    description: 'Access to premium features',
    resource: 'features',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'features:web_portal',
    name: 'Web Portal',
    description: 'Generate web portals',
    resource: 'features',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'features:ai_chat',
    name: 'AI Chat',
    description: 'Access AI chat features',
    resource: 'features',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'features:podcast',
    name: 'Podcast Generation',
    description: 'Generate podcasts',
    resource: 'features',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'features:video',
    name: 'Video Introduction',
    description: 'Generate video introductions',
    resource: 'features',
    action: 'execute',
    scope: 'self'
  },
  {
    id: 'features:analytics',
    name: 'Advanced Analytics',
    description: 'Access advanced analytics',
    resource: 'features',
    action: 'execute',
    scope: 'self'
  },
  
  // Media Management Permissions
  {
    id: 'media:generate',
    name: 'Generate Media',
    description: 'Generate media content',
    resource: 'media',
    action: 'create',
    scope: 'self'
  },
  {
    id: 'media:upload',
    name: 'Upload Media',
    description: 'Upload media files',
    resource: 'media',
    action: 'create',
    scope: 'self'
  },
  {
    id: 'media:manage',
    name: 'Manage Media',
    description: 'Full media management',
    resource: 'media',
    action: 'manage',
    scope: 'self'
  },
  
  // Analytics Permissions
  {
    id: 'analytics:view',
    name: 'View Analytics',
    description: 'View analytics data',
    resource: 'analytics',
    action: 'view',
    scope: 'self'
  },
  {
    id: 'analytics:export',
    name: 'Export Analytics',
    description: 'Export analytics reports',
    resource: 'analytics',
    action: 'execute',
    scope: 'self'
  },
  
  // User Management Permissions
  {
    id: 'users:view',
    name: 'View Users',
    description: 'View user information',
    resource: 'users',
    action: 'view',
    scope: 'global'
  },
  {
    id: 'users:manage',
    name: 'Manage Users',
    description: 'Full user management',
    resource: 'users',
    action: 'manage',
    scope: 'global'
  },
  
  // System Administration
  {
    id: 'system:manage',
    name: 'System Management',
    description: 'System administration',
    resource: 'system',
    action: 'admin',
    scope: 'global'
  },
  
  // Profile Management
  {
    id: 'profile:read',
    name: 'Read Profile',
    description: 'View own profile',
    resource: 'settings',
    action: 'read',
    scope: 'self'
  },
  {
    id: 'profile:update',
    name: 'Update Profile',
    description: 'Update own profile',
    resource: 'settings',
    action: 'update',
    scope: 'self'
  },
  
  // Calendar Integration
  {
    id: 'calendar:integrate',
    name: 'Calendar Integration',
    description: 'Integrate with calendar services',
    resource: 'calendar',
    action: 'execute',
    scope: 'self'
  }
];

// ============================================================================
// PERMISSION GROUPS
// ============================================================================
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'cv_management',
    name: 'CV Management',
    description: 'CV creation, editing, and management',
    permissions: [
      'cv:create',
      'cv:read',
      'cv:update',
      'cv:delete',
      'cv:export',
      'cv:share'
    ],
    color: '#3B82F6',
    icon: 'document'
  },
  {
    id: 'premium_features',
    name: 'Premium Features',
    description: 'Advanced premium functionality',
    permissions: [
      'features:premium',
      'features:web_portal',
      'features:ai_chat',
      'features:podcast',
      'features:video',
      'features:analytics'
    ],
    color: '#F59E0B',
    icon: 'star'
  },
  {
    id: 'media_generation',
    name: 'Media Generation',
    description: 'Media creation and management',
    permissions: [
      'media:generate',
      'media:upload',
      'media:manage'
    ],
    color: '#10B981',
    icon: 'photo'
  },
  {
    id: 'administration',
    name: 'Administration',
    description: 'System and user administration',
    permissions: [
      'users:view',
      'users:manage',
      'system:manage',
      'templates:manage'
    ],
    color: '#EF4444',
    icon: 'shield'
  }
];

// ============================================================================
// PERMISSION MATRIX
// ============================================================================
export const PERMISSION_MATRIX: PermissionMatrix = {
  guest: {
    cv: { preview: true },
    templates: { view_public: true }
  },
  
  user: {
    cv: { 
      create: true, 
      read: true, 
      update: true, 
      delete: true, 
      export: true 
    },
    templates: { 
      view: true, 
      use: true 
    },
    features: { 
      basic: true 
    },
    profile: { 
      read: true, 
      update: true 
    }
  },
  
  premium: {
    cv: { 
      create: true, 
      read: true, 
      update: true, 
      delete: true, 
      export: true, 
      share: true 
    },
    templates: { 
      view: true, 
      use: true 
    },
    features: { 
      basic: true, 
      premium: true, 
      web_portal: true, 
      ai_chat: true, 
      podcast: true, 
      video: true, 
      analytics: true 
    },
    media: { 
      generate: true, 
      upload: true 
    },
    analytics: { 
      view: true, 
      export: true 
    },
    profile: { 
      read: true, 
      update: true 
    },
    calendar: { 
      integrate: true 
    }
  },
  
  moderator: {
    cv: { 
      create: true, 
      read: true, 
      update: true, 
      delete: true, 
      export: true, 
      share: true, 
      moderate: true 
    },
    templates: { 
      view: true, 
      use: true, 
      moderate: true 
    },
    features: { 
      basic: true, 
      premium: true, 
      web_portal: true, 
      ai_chat: true, 
      podcast: true, 
      video: true, 
      analytics: true 
    },
    media: { 
      generate: true, 
      upload: true, 
      moderate: true 
    },
    analytics: { 
      view: true, 
      export: true 
    },
    users: { 
      view: true, 
      moderate: true 
    },
    profile: { 
      read: true, 
      update: true 
    },
    calendar: { 
      integrate: true 
    }
  },
  
  admin: {
    cv: { '*': true },
    templates: { '*': true },
    features: { '*': true },
    media: { '*': true },
    analytics: { '*': true },
    users: { '*': true },
    roles: { '*': true },
    system: { manage: true },
    billing: { view: true },
    profile: { '*': true },
    calendar: { '*': true }
  },
  
  super_admin: {
    '*': { '*': true }
  }
};

// ============================================================================
// ROLE HIERARCHY
// ============================================================================
export const ROLE_HIERARCHY = [
  'super_admin',
  'admin',
  'moderator',
  'premium',
  'user',
  'guest'
];

// ============================================================================
// FEATURE GATES
// ============================================================================
export const FEATURE_GATES = {
  'web_portal': {
    roles: ['premium', 'moderator', 'admin', 'super_admin'],
    fallbackMessage: 'Web Portal generation requires a Premium subscription'
  },
  'ai_chat': {
    roles: ['premium', 'moderator', 'admin', 'super_admin'],
    fallbackMessage: 'AI Chat feature requires a Premium subscription'
  },
  'podcast': {
    roles: ['premium', 'moderator', 'admin', 'super_admin'],
    fallbackMessage: 'Podcast generation requires a Premium subscription'
  },
  'video': {
    roles: ['premium', 'moderator', 'admin', 'super_admin'],
    fallbackMessage: 'Video introduction requires a Premium subscription'
  },
  'advanced_analytics': {
    roles: ['premium', 'moderator', 'admin', 'super_admin'],
    fallbackMessage: 'Advanced analytics requires a Premium subscription'
  },
  'user_management': {
    roles: ['moderator', 'admin', 'super_admin'],
    fallbackMessage: 'User management requires administrative privileges'
  },
  'system_administration': {
    roles: ['admin', 'super_admin'],
    fallbackMessage: 'System administration requires admin privileges'
  }
} as const;