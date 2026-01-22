/**
 * RBAC Middleware
 * Enforces role-based access control on routes
 */

import { Request, Response, NextFunction } from 'express';
import { rbacService, Permission, UserRole } from '../services/rbac.service';
import { AuthenticatedUser } from './auth.middleware';

/**
 * Extend Express Request with authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware to require specific role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!rbacService.isValidRole(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid user role',
      });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRole,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const customPermissions = (req.user.permissions || []) as Permission[];

    const hasPermission = requiredPermissions.some(permission =>
      rbacService.canPerform(userRole, permission, customPermissions)
    );

    if (!hasPermission) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following permissions: ${requiredPermissions.join(', ')}`,
        userRole,
        requiredPermissions,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require all specified permissions
 */
export function requireAllPermissions(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    const customPermissions = (req.user.permissions || []) as Permission[];

    const hasAllPermissions = requiredPermissions.every(permission =>
      rbacService.canPerform(userRole, permission, customPermissions)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires all of the following permissions: ${requiredPermissions.join(', ')}`,
        userRole,
        requiredPermissions,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user is premium or admin
 */
export const requirePremium = requireRole(
  UserRole.PREMIUM_USER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN
);

/**
 * Middleware to check if user is admin or super admin
 */
export const requireAdmin = requireRole(
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN
);

/**
 * Middleware to check if user is super admin
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Middleware to check resource ownership
 * Allows access if user owns the resource OR has admin role
 */
export function requireOwnership(_resourceIdParam: string = 'id', resourceUserIdField: string = 'userId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;
    const userRole = req.user.role as UserRole;

    // Admins and super admins can access all resources
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    // Check ownership
    // const resourceId = req.params[resourceIdParam]; // Available if needed for logging
    const resource = (req as any)[resourceUserIdField]; // Resource should be loaded by previous middleware

    if (!resource) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Resource not found',
      });
      return;
    }

    const resourceUserId = typeof resource === 'object' ? resource[resourceUserIdField] : resource;

    if (resourceUserId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to log permission checks
 */
export function logPermissionCheck(req: Request, _res: Response, next: NextFunction): void {
  if (req.user) {
    const userRole = req.user.role;
    const permissions = rbacService.getRolePermissions(userRole as UserRole);

    console.log('Permission Check:', {
      userId: req.user.id,
      email: req.user.email,
      role: userRole,
      permissions: permissions,
      endpoint: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
