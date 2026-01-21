/**
 * useRoleAccess Hook
 * Provides role-based access control utilities
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { canAccessRoute, getDefaultRouteForRole } from '../config/route-permissions';
import type { UserRole } from '@shared/types/core/user.types';

interface RoleAccessResult {
  /** Current user's role */
  role: UserRole;
  /** Whether user can access investigation features */
  canAccessInvestigation: boolean;
  /** Whether user can access admin features */
  canAccessAdmin: boolean;
  /** Whether user can access analytics features */
  canAccessAnalytics: boolean;
  /** Whether user is in viewer/demo mode */
  isViewerMode: boolean;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user can access a specific route */
  canAccess: (path: string) => boolean;
  /** Get the default route for the current user */
  defaultRoute: string;
}

/**
 * Hook for role-based access control.
 * Provides convenient methods to check user permissions and access rights.
 */
export function useRoleAccess(): RoleAccessResult {
  const { user, hasPermission, hasRole } = useAuth();

  const role = user?.role || 'viewer';

  const canAccessInvestigation = useMemo(
    () => hasRole(['admin', 'investigator']),
    [hasRole]
  );

  const canAccessAdmin = useMemo(
    () => hasRole('admin'),
    [hasRole]
  );

  const canAccessAnalytics = useMemo(
    () => hasRole(['admin', 'investigator', 'analyst']),
    [hasRole]
  );

  const isViewerMode = useMemo(
    () => role === 'viewer',
    [role]
  );

  const canAccess = useCallback(
    (path: string): boolean => canAccessRoute(role, path),
    [role]
  );

  const defaultRoute = useMemo(
    () => getDefaultRouteForRole(role),
    [role]
  );

  return {
    role,
    canAccessInvestigation,
    canAccessAdmin,
    canAccessAnalytics,
    isViewerMode,
    hasPermission,
    canAccess,
    defaultRoute,
  };
}

export default useRoleAccess;
