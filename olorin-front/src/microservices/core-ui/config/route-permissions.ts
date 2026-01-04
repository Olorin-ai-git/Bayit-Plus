/**
 * Route Permissions Configuration
 * Defines role-based access for application routes
 */

import type { UserRole } from '@shared/types/core/user.types';

/**
 * Route permission mappings.
 * Each route pattern maps to the roles that can access it.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Admin-only routes
  '/admin/*': ['admin'],
  '/settings/users': ['admin'],
  '/settings/roles': ['admin'],

  // Investigation routes - Admin and Investigator
  '/investigation/*': ['admin', 'investigator'],
  '/investigations/*': ['admin', 'investigator'],
  '/parallel/*': ['admin', 'investigator'],
  '/structured/*': ['admin', 'investigator'],

  // Analytics routes - Admin, Investigator, and Analyst
  '/analytics/*': ['admin', 'investigator', 'analyst'],
  '/agent-analytics/*': ['admin', 'investigator', 'analyst'],

  // Reports - Read access for all authenticated users
  '/reports/*': ['admin', 'investigator', 'analyst', 'viewer'],

  // Demo mode routes - All authenticated users
  '/demo/*': ['admin', 'investigator', 'analyst', 'viewer'],

  // Profile and settings - All authenticated users
  '/profile': ['admin', 'investigator', 'analyst', 'viewer'],
  '/settings': ['admin', 'investigator', 'analyst', 'viewer'],
};

/**
 * Get the default route for a user based on their role.
 * Used when redirecting after login or unauthorized access.
 */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/investigations';
    case 'investigator':
      return '/investigations';
    case 'analyst':
      return '/analytics';
    case 'viewer':
      return '/demo';
    default:
      return '/demo';
  }
}

/**
 * Check if a role can access a specific route.
 */
export function canAccessRoute(role: UserRole, path: string): boolean {
  // Find matching route pattern
  for (const [pattern, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (matchRoutePattern(pattern, path)) {
      return allowedRoles.includes(role);
    }
  }
  // Default: allow access if no specific rule exists
  return true;
}

/**
 * Match a route path against a pattern with wildcard support.
 */
function matchRoutePattern(pattern: string, path: string): boolean {
  // Handle wildcard patterns
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return path.startsWith(prefix);
  }
  return path === pattern;
}

/**
 * Get all accessible routes for a role.
 */
export function getAccessibleRoutes(role: UserRole): string[] {
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(role))
    .map(([pattern]) => pattern);
}
