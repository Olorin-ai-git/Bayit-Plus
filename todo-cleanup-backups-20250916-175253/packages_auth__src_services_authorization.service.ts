/**
 * Authorization Service for Firebase Functions
 * 
 * Consolidated role-based access control and permission management.
 * Replaces scattered authorization patterns across Firebase Functions.
 * 
 * Author: Gil Klainert  
 * Date: August 28, 2025
  */

import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

// Types
export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  hierarchy: number; // Higher numbers have more access
  description: string;
}

export interface Permission {
  resource: string;
  action: string; // 'create', 'read', 'update', 'delete', 'execute'
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface AuthorizationContext {
  uid: string;
  roles: string[];
  customClaims: Record<string, any>;
  resourceId?: string;
  resourceData?: Record<string, any>;
}

export interface RoleCheckOptions {
  requireAll?: boolean; // Default false - require any role
  hierarchyLevel?: number; // Minimum hierarchy level required
  customMessage?: string;
}

/**
 * Firebase Functions Authorization Service
 * 
 * Provides consolidated role-based access control to eliminate scattered
 * authorization patterns across Firebase Functions.
  */
export class FirebaseAuthorizationService {
  private db: admin.firestore.Firestore;
  private roleCache = new Map<string, UserRole>();
  private userRolesCache = new Map<string, string[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Check if user has required role(s)
   * 
   * Consolidates scattered patterns like:
   * ```
   * const userData = userDoc.data();
   * if (!userData || !userData.roles.includes('admin')) {
   *   throw new Error('Insufficient permissions');
   * }
   * ```
    */
  async requireRole(
    uid: string, 
    requiredRoles: string | string[], 
    options?: RoleCheckOptions
  ): Promise<string[]> {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const userRoles = await this.getUserRoles(uid);

    // Check role requirements
    const hasRequiredRoles = options?.requireAll 
      ? roles.every(role => userRoles.includes(role))
      : roles.some(role => userRoles.includes(role));

    if (!hasRequiredRoles) {
      logger.error('Authorization failed: Insufficient roles', {
        uid,
        userRoles,
        requiredRoles: roles,
        requireAll: options?.requireAll,
        timestamp: new Date().toISOString()
      });
      
      const message = options?.customMessage || 
        `Access denied. Required role${roles.length > 1 ? 's' : ''}: ${roles.join(', ')}`;
      throw new HttpsError('permission-denied', message);
    }

    // Check hierarchy level if specified
    if (options?.hierarchyLevel !== undefined) {
      const userHierarchy = await this.getUserMaxHierarchy(uid, userRoles);
      if (userHierarchy < options.hierarchyLevel) {
        logger.error('Authorization failed: Insufficient hierarchy level', {
          uid,
          userHierarchy,
          requiredHierarchy: options.hierarchyLevel,
          timestamp: new Date().toISOString()
        });
        throw new HttpsError('permission-denied', 'Insufficient access level');
      }
    }

    logger.info('Role authorization successful', {
      uid,
      userRoles,
      requiredRoles: roles,
      timestamp: new Date().toISOString()
    });

    return userRoles;
  }

  /**
   * Check if user has permission for specific resource and action
    */
  async hasPermission(
    context: AuthorizationContext,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(context.uid);
      
      for (const roleName of userRoles) {
        const role = await this.getRole(roleName);
        if (!role) continue;

        // Check if role has the required permission
        const hasPermission = role.permissions.some(permission => {
          const [permResource, permAction] = permission.split(':');
          return (permResource === resource || permResource === '*') &&
                 (permAction === action || permAction === '*');
        });

        if (hasPermission) {
          // TODO: Implement permission conditions if needed
          logger.info('Permission granted', {
            uid: context.uid,
            role: roleName,
            resource,
            action,
            timestamp: new Date().toISOString()
          });
          return true;
        }
      }

      logger.info('Permission denied', {
        uid: context.uid,
        userRoles,
        resource,
        action,
        timestamp: new Date().toISOString()
      });
      return false;
    } catch (error) {
      logger.error('Permission check error', {
        uid: context.uid,
        resource,
        action,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Require permission for resource and action
    */
  async requirePermission(
    context: AuthorizationContext,
    resource: string,
    action: string,
    customMessage?: string
  ): Promise<void> {
    const hasPermission = await this.hasPermission(context, resource, action);
    
    if (!hasPermission) {
      const message = customMessage || 
        `Access denied. Required permission: ${resource}:${action}`;
      throw new HttpsError('permission-denied', message);
    }
  }

  /**
   * Check if user can access admin features
   * 
   * Consolidates admin access patterns found across multiple functions
    */
  async requireAdminAccess(uid: string): Promise<string[]> {
    return this.requireRole(uid, ['admin', 'superadmin'], {
      customMessage: 'Administrative access required'
    });
  }

  /**
   * Check if user can access premium features
   * 
   * Consolidates premium access patterns from enhancedPremiumGuard
    */
  async requirePremiumAccess(uid: string): Promise<string[]> {
    const userRoles = await this.getUserRoles(uid);
    const premiumRoles = ['premium', 'enterprise', 'admin', 'superadmin'];
    
    const hasPremiumAccess = premiumRoles.some(role => userRoles.includes(role));
    
    if (!hasPremiumAccess) {
      // Check subscription status as fallback
      const subscriptionStatus = await this.checkSubscriptionStatus(uid);
      if (!subscriptionStatus.hasActiveSubscription) {
        logger.error('Premium access denied', {
          uid,
          userRoles,
          subscriptionStatus,
          timestamp: new Date().toISOString()
        });
        throw new HttpsError('permission-denied', 'Premium subscription required');
      }
    }

    return userRoles;
  }

  /**
   * Check enterprise access
    */
  async requireEnterpriseAccess(uid: string): Promise<string[]> {
    return this.requireRole(uid, ['enterprise', 'admin', 'superadmin'], {
      hierarchyLevel: 80,
      customMessage: 'Enterprise access required'
    });
  }

  /**
   * Get user roles with caching
    */
  private async getUserRoles(uid: string): Promise<string[]> {
    const cacheKey = `roles:${uid}`;
    const now = Date.now();
    
    // Check cache
    if (this.userRolesCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        return this.userRolesCache.get(cacheKey) || [];
      }
    }

    try {
      // Fetch from Firestore
      const userDoc = await this.db.collection('users').doc(uid).get();
      const userData = userDoc.data();
      const roles = userData?.roles || ['user']; // Default role

      // Cache the result
      this.userRolesCache.set(cacheKey, roles);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

      return roles;
    } catch (error) {
      logger.error('Failed to fetch user roles', {
        uid,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return ['user']; // Fallback to basic user role
    }
  }

  /**
   * Get role definition
    */
  private async getRole(roleName: string): Promise<UserRole | null> {
    const cacheKey = `role:${roleName}`;
    const now = Date.now();
    
    // Check cache
    if (this.roleCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        return this.roleCache.get(cacheKey) || null;
      }
    }

    try {
      const roleDoc = await this.db.collection('roles').doc(roleName).get();
      if (!roleDoc.exists) {
        return null;
      }

      const role = roleDoc.data() as UserRole;
      
      // Cache the result
      this.roleCache.set(cacheKey, role);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

      return role;
    } catch (error) {
      logger.error('Failed to fetch role', {
        roleName,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  /**
   * Get user's maximum hierarchy level
    */
  private async getUserMaxHierarchy(uid: string, userRoles: string[]): Promise<number> {
    let maxHierarchy = 0;
    
    for (const roleName of userRoles) {
      const role = await this.getRole(roleName);
      if (role && role.hierarchy > maxHierarchy) {
        maxHierarchy = role.hierarchy;
      }
    }
    
    return maxHierarchy;
  }

  /**
   * Check subscription status as fallback for premium access
    */
  private async checkSubscriptionStatus(uid: string): Promise<{
    hasActiveSubscription: boolean;
    tier?: string;
    expiresAt?: Date;
  }> {
    try {
      const subscriptionDoc = await this.db
        .collection('subscriptions')
        .doc(uid)
        .get();
      
      if (!subscriptionDoc.exists) {
        return { hasActiveSubscription: false };
      }
      
      const subscription = subscriptionDoc.data();
      const now = new Date();
      const expiresAt = subscription?.expiresAt?.toDate();
      
      const hasActiveSubscription = 
        subscription?.status === 'active' &&
        (!expiresAt || expiresAt > now);
      
      return {
        hasActiveSubscription,
        tier: subscription?.tier,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to check subscription status', {
        uid,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return { hasActiveSubscription: false };
    }
  }

  /**
   * Clear user cache (useful after role changes)
    */
  clearUserCache(uid: string): void {
    const cacheKey = `roles:${uid}`;
    this.userRolesCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    
    logger.info('User cache cleared', { uid, timestamp: new Date().toISOString() });
  }

  /**
   * Clear all caches
    */
  clearAllCaches(): void {
    this.roleCache.clear();
    this.userRolesCache.clear();
    this.cacheExpiry.clear();
    
    logger.info('All authorization caches cleared', { 
      timestamp: new Date().toISOString() 
    });
  }
}

// Singleton instance for Firebase Functions
export const firebaseAuth = new FirebaseAuthorizationService();

// Export commonly used authorization functions
export const requireRole = (uid: string, roles: string | string[], options?: RoleCheckOptions) =>
  firebaseAuth.requireRole(uid, roles, options);

export const requireAdminAccess = (uid: string) =>
  firebaseAuth.requireAdminAccess(uid);

export const requirePremiumAccess = (uid: string) =>
  firebaseAuth.requirePremiumAccess(uid);

export const requireEnterpriseAccess = (uid: string) =>
  firebaseAuth.requireEnterpriseAccess(uid);

export const hasPermission = (context: AuthorizationContext, resource: string, action: string) =>
  firebaseAuth.hasPermission(context, resource, action);

export const requirePermission = (
  context: AuthorizationContext, 
  resource: string, 
  action: string, 
  customMessage?: string
) => firebaseAuth.requirePermission(context, resource, action, customMessage);