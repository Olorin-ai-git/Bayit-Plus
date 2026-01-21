/**
 * Permissions Service
 * 
 * Manages role-based access control and permission validation.
  */

import type {
  Permission,
  Role,
  PermissionCheck,
  PermissionResult,
  PermissionContext,
  StandardPermissions,
  StandardRole,
  AuthConfig
} from '../types';
import { createPermissionError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  STANDARD_ROLES,
  STANDARD_PERMISSIONS,
  PERMISSION_MATRIX,
  ROLE_HIERARCHY,
  FEATURE_GATES
} from '../constants/permissions.constants';

export class PermissionsService {
  private config: AuthConfig;
  private userRoles: Map<string, string[]> = new Map();
  private roleCache: Map<string, Role> = new Map();
  private permissionCache: Map<string, Permission> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
    this.initializePermissions();
  }

  private initializePermissions(): void {
    // Load standard roles into cache
    Object.values(STANDARD_ROLES).forEach(role => {
      this.roleCache.set(role.id, role);
    });

    // Load standard permissions into cache
    STANDARD_PERMISSIONS.forEach(permission => {
      this.permissionCache.set(permission.id, permission);
    });

    logger.debug('Permissions service initialized', {
      roles: this.roleCache.size,
      permissions: this.permissionCache.size
    });
  }

  /**
   * Checks if a user has a specific permission
    */
  async checkPermission(check: PermissionCheck): Promise<PermissionResult> {
    try {
      const userRoles = this.getUserRoles(check.userId);
      
      if (userRoles.length === 0) {
        // Assign default role if no roles assigned
        userRoles.push('user');
        this.userRoles.set(check.userId, userRoles);
      }

      // Check if any user role has the required permission
      for (const roleId of userRoles) {
        const role = this.roleCache.get(roleId);
        if (!role) continue;

        // Check for wildcard permission (super admin)
        if (role.permissions.includes('*')) {
          return {
            granted: true,
            reason: `Granted by role: ${role.name} (wildcard permission)`
          };
        }

        // Check for specific permission
        const permissionKey = `${check.resource}:${check.action}`;
        if (role.permissions.includes(permissionKey)) {
          return {
            granted: true,
            reason: `Granted by role: ${role.name}`
          };
        }

        // Check for resource wildcard
        if (role.permissions.includes(`${check.resource}:*`)) {
          return {
            granted: true,
            reason: `Granted by role: ${role.name} (resource wildcard)`
          };
        }
      }

      return {
        granted: false,
        reason: `No sufficient permissions. Required: ${check.resource}:${check.action}`
      };

    } catch (error) {
      logger.error('Permission check failed:', error);
      return {
        granted: false,
        reason: 'Permission check failed due to system error'
      };
    }
  }

  /**
   * Checks if a user has access to a specific feature
    */
  async checkFeatureAccess(userId: string, feature: string): Promise<PermissionResult> {
    const featureGate = FEATURE_GATES[feature as keyof typeof FEATURE_GATES];
    
    if (!featureGate) {
      return {
        granted: true,
        reason: 'Feature has no access restrictions'
      };
    }

    const userRoles = this.getUserRoles(userId);
    const hasRequiredRole = userRoles.some(role => 
      featureGate.roles.includes(role as any)
    );

    if (hasRequiredRole) {
      return {
        granted: true,
        reason: `Feature access granted by role`
      };
    }

    return {
      granted: false,
      reason: featureGate.fallbackMessage || `Feature '${feature}' requires elevated permissions`
    };
  }

  /**
   * Gets all permissions for a user
    */
  getUserPermissions(userId: string): StandardPermissions {
    const userRoles = this.getUserRoles(userId);
    const permissions: StandardPermissions = {
      'cv:create': false,
      'cv:read': false,
      'cv:update': false,
      'cv:delete': false,
      'cv:share': false,
      'cv:export': false,
      'templates:view': false,
      'templates:use': false,
      'templates:create': false,
      'templates:manage': false,
      'features:basic': false,
      'features:premium': false,
      'features:web_portal': false,
      'features:ai_chat': false,
      'features:podcast': false,
      'features:video': false,
      'features:analytics': false,
      'media:generate': false,
      'media:upload': false,
      'media:manage': false,
      'analytics:view': false,
      'analytics:export': false,
      'analytics:manage': false,
      'admin:users': false,
      'admin:roles': false,
      'admin:permissions': false,
      'admin:system': false,
      'admin:billing': false
    };

    // Apply permissions from all user roles
    for (const roleId of userRoles) {
      const rolePermissions = this.getRolePermissions(roleId);
      Object.keys(permissions).forEach(permission => {
        const key = permission as keyof StandardPermissions;
        if (rolePermissions[key]) {
          permissions[key] = true;
        }
      });
    }

    return permissions;
  }

  /**
   * Gets permissions for a specific role
    */
  private getRolePermissions(roleId: string): Partial<StandardPermissions> {
    const role = this.roleCache.get(roleId);
    if (!role) return {};

    const permissions: Partial<StandardPermissions> = {};
    
    // If role has wildcard permission, grant all
    if (role.permissions.includes('*')) {
      Object.keys(STANDARD_PERMISSIONS).forEach(permId => {
        const key = permId as keyof StandardPermissions;
        permissions[key] = true;
      });
      return permissions;
    }

    // Map role permissions to standard permissions
    role.permissions.forEach(permissionId => {
      const key = permissionId as keyof StandardPermissions;
      if (key in permissions) {
        permissions[key] = true;
      }
    });

    return permissions;
  }

  /**
   * Assigns a role to a user
    */
  assignRole(userId: string, roleId: string): boolean {
    try {
      const role = this.roleCache.get(roleId);
      if (!role) {
        logger.warn('Attempted to assign non-existent role', { userId, roleId });
        return false;
      }

      const userRoles = this.getUserRoles(userId);
      if (!userRoles.includes(roleId)) {
        userRoles.push(roleId);
        this.userRoles.set(userId, userRoles);
        
        logger.info('Role assigned to user', { userId, roleId, roleName: role.name });
        return true;
      }

      return false; // Role already assigned
    } catch (error) {
      logger.error('Failed to assign role:', error);
      return false;
    }
  }

  /**
   * Removes a role from a user
    */
  removeRole(userId: string, roleId: string): boolean {
    try {
      const userRoles = this.getUserRoles(userId);
      const index = userRoles.indexOf(roleId);
      
      if (index > -1) {
        userRoles.splice(index, 1);
        this.userRoles.set(userId, userRoles);
        
        logger.info('Role removed from user', { userId, roleId });
        return true;
      }

      return false; // Role not assigned
    } catch (error) {
      logger.error('Failed to remove role:', error);
      return false;
    }
  }

  /**
   * Gets all roles assigned to a user
    */
  getUserRoles(userId: string): string[] {
    return this.userRoles.get(userId) || ['user']; // Default to 'user' role
  }

  /**
   * Sets user roles based on premium status and admin flags
    */
  updateUserRolesFromStatus(userId: string, isPremium: boolean, isAdmin: boolean = false): void {
    const roles: string[] = ['user']; // Base role

    if (isPremium) {
      roles.push('premium');
    }

    if (isAdmin) {
      roles.push('admin');
    }

    this.userRoles.set(userId, roles);
    
    logger.debug('User roles updated from status', { userId, roles, isPremium, isAdmin });
  }

  /**
   * Checks if a user has a specific role
    */
  hasRole(userId: string, roleId: string): boolean {
    const userRoles = this.getUserRoles(userId);
    return userRoles.includes(roleId);
  }

  /**
   * Checks if a user is an admin
    */
  isAdmin(userId: string): boolean {
    const userRoles = this.getUserRoles(userId);
    return userRoles.some(role => ['admin', 'super_admin'].includes(role));
  }

  /**
   * Checks if a user is a premium user
    */
  isPremiumUser(userId: string): boolean {
    const userRoles = this.getUserRoles(userId);
    return userRoles.some(role => ['premium', 'professional', 'enterprise', 'admin', 'super_admin'].includes(role));
  }

  /**
   * Gets the highest role for a user based on hierarchy
    */
  getUserHighestRole(userId: string): string {
    const userRoles = this.getUserRoles(userId);
    
    // Find the role with the lowest hierarchy number (highest authority)
    let highestRole = 'user';
    let lowestHierarchy = Infinity;
    
    for (const roleId of userRoles) {
      const role = this.roleCache.get(roleId);
      if (role && role.hierarchy < lowestHierarchy) {
        lowestHierarchy = role.hierarchy;
        highestRole = roleId;
      }
    }
    
    return highestRole;
  }

  /**
   * Gets all available roles
    */
  getAllRoles(): Role[] {
    return Array.from(this.roleCache.values());
  }

  /**
   * Gets all available permissions
    */
  getAllPermissions(): Permission[] {
    return Array.from(this.permissionCache.values());
  }

  /**
   * Validates permission context
    */
  private validatePermissionContext(context?: PermissionContext): boolean {
    // Add context validation logic as needed
    return true;
  }

  /**
   * Clears user roles (useful for testing or user deletion)
    */
  clearUserRoles(userId: string): void {
    this.userRoles.delete(userId);
    logger.debug('User roles cleared', { userId });
  }

  /**
   * Gets permission matrix for debugging
    */
  getPermissionMatrix(): typeof PERMISSION_MATRIX {
    return PERMISSION_MATRIX;
  }
}