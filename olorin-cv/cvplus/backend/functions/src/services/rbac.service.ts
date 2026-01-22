/**
 * Role-Based Access Control (RBAC) Service
 * Implements 4 user roles with 10+ granular permissions
 */

/**
 * User roles in the system
 */
export enum UserRole {
  FREE_USER = 'FREE_USER',
  PREMIUM_USER = 'PREMIUM_USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * System permissions
 */
export enum Permission {
  // CV Operations
  CV_CREATE = 'cv:create',
  CV_READ = 'cv:read',
  CV_UPDATE = 'cv:update',
  CV_DELETE = 'cv:delete',
  CV_EXPORT = 'cv:export',

  // Premium Features
  PREMIUM_AI_ENHANCE = 'premium:ai_enhance',
  PREMIUM_PUBLIC_PROFILE = 'premium:public_profile',
  PREMIUM_ANALYTICS = 'premium:analytics',
  PREMIUM_CUSTOM_BRANDING = 'premium:custom_branding',
  PREMIUM_VIDEO_INTRO = 'premium:video_intro',
  PREMIUM_RAG_CHAT = 'premium:rag_chat',

  // User Management
  USER_LIST = 'user:list',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_SUSPEND = 'user:suspend',

  // Admin Operations
  ADMIN_ACCESS = 'admin:access',
  ADMIN_ANALYTICS = 'admin:analytics',
  ADMIN_SETTINGS = 'admin:settings',
  ADMIN_BILLING = 'admin:billing',

  // Super Admin Operations
  SUPERADMIN_ALL = 'superadmin:all',
}

/**
 * Role-Permission mapping
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.FREE_USER]: [
    Permission.CV_CREATE,
    Permission.CV_READ,
    Permission.CV_UPDATE,
    Permission.CV_DELETE,
    Permission.CV_EXPORT,
  ],

  [UserRole.PREMIUM_USER]: [
    // All FREE_USER permissions
    Permission.CV_CREATE,
    Permission.CV_READ,
    Permission.CV_UPDATE,
    Permission.CV_DELETE,
    Permission.CV_EXPORT,

    // Premium features
    Permission.PREMIUM_AI_ENHANCE,
    Permission.PREMIUM_PUBLIC_PROFILE,
    Permission.PREMIUM_ANALYTICS,
    Permission.PREMIUM_CUSTOM_BRANDING,
    Permission.PREMIUM_VIDEO_INTRO,
    Permission.PREMIUM_RAG_CHAT,
  ],

  [UserRole.ADMIN]: [
    // All PREMIUM_USER permissions
    Permission.CV_CREATE,
    Permission.CV_READ,
    Permission.CV_UPDATE,
    Permission.CV_DELETE,
    Permission.CV_EXPORT,
    Permission.PREMIUM_AI_ENHANCE,
    Permission.PREMIUM_PUBLIC_PROFILE,
    Permission.PREMIUM_ANALYTICS,
    Permission.PREMIUM_CUSTOM_BRANDING,
    Permission.PREMIUM_VIDEO_INTRO,
    Permission.PREMIUM_RAG_CHAT,

    // User management
    Permission.USER_LIST,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_SUSPEND,

    // Admin operations
    Permission.ADMIN_ACCESS,
    Permission.ADMIN_ANALYTICS,
    Permission.ADMIN_SETTINGS,
    Permission.ADMIN_BILLING,
  ],

  [UserRole.SUPER_ADMIN]: [
    // All permissions
    Permission.CV_CREATE,
    Permission.CV_READ,
    Permission.CV_UPDATE,
    Permission.CV_DELETE,
    Permission.CV_EXPORT,
    Permission.PREMIUM_AI_ENHANCE,
    Permission.PREMIUM_PUBLIC_PROFILE,
    Permission.PREMIUM_ANALYTICS,
    Permission.PREMIUM_CUSTOM_BRANDING,
    Permission.PREMIUM_VIDEO_INTRO,
    Permission.PREMIUM_RAG_CHAT,
    Permission.USER_LIST,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_SUSPEND,
    Permission.ADMIN_ACCESS,
    Permission.ADMIN_ANALYTICS,
    Permission.ADMIN_SETTINGS,
    Permission.ADMIN_BILLING,
    Permission.SUPERADMIN_ALL,
  ],
};

export class RBACService {
  /**
   * Get permissions for a role
   */
  getRolePermissions(role: UserRole): Permission[] {
    return rolePermissions[role] || [];
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = this.getRolePermissions(role);
    return permissions.includes(permission) || permissions.includes(Permission.SUPERADMIN_ALL);
  }

  /**
   * Check if a role has all required permissions
   */
  hasAllPermissions(role: UserRole, requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(permission => this.hasPermission(role, permission));
  }

  /**
   * Check if a role has any of the required permissions
   */
  hasAnyPermission(role: UserRole, requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(role, permission));
  }

  /**
   * Get user's effective permissions (from role + custom permissions)
   */
  getUserPermissions(role: UserRole, customPermissions: Permission[] = []): Permission[] {
    const rolePerms = this.getRolePermissions(role);
    const allPerms = [...rolePerms, ...customPermissions];
    return Array.from(new Set(allPerms)); // Remove duplicates
  }

  /**
   * Check if user can perform an action on a resource
   */
  canPerform(
    userRole: UserRole,
    permission: Permission,
    customPermissions: Permission[] = []
  ): boolean {
    const userPermissions = this.getUserPermissions(userRole, customPermissions);
    return userPermissions.includes(permission) || userPermissions.includes(Permission.SUPERADMIN_ALL);
  }

  /**
   * Validate role
   */
  isValidRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole);
  }

  /**
   * Get role hierarchy level (higher number = more permissions)
   */
  getRoleLevel(role: UserRole): number {
    const levels: Record<UserRole, number> = {
      [UserRole.FREE_USER]: 1,
      [UserRole.PREMIUM_USER]: 2,
      [UserRole.ADMIN]: 3,
      [UserRole.SUPER_ADMIN]: 4,
    };
    return levels[role] || 0;
  }

  /**
   * Check if one role is higher than another
   */
  isRoleHigherThan(role1: UserRole, role2: UserRole): boolean {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }

  /**
   * Can user modify another user (based on role hierarchy)
   */
  canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
    // Super admins can modify anyone
    if (actorRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Admins can modify users below them
    if (actorRole === UserRole.ADMIN && this.getRoleLevel(targetRole) < this.getRoleLevel(actorRole)) {
      return true;
    }

    return false;
  }
}

export const rbacService = new RBACService();
