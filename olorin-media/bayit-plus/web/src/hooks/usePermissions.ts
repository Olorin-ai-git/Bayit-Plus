/**
 * usePermissions Hook
 * Provides permission checking utilities for RBAC
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Permission, Role, ROLE_PERMISSIONS } from '@/types/rbac';

interface UsePermissionsReturn {
  role: Role | null;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuthStore();

  const role = (user?.role as Role) || null;

  const permissions = useMemo(() => {
    if (!role) return [];
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    const customPerms = (user?.permissions as Permission[]) || [];
    return [...new Set([...rolePerms, ...customPerms])];
  }, [role, user?.permissions]);

  const can = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const canAny = (perms: Permission[]): boolean => {
    return perms.some(p => permissions.includes(p));
  };

  const canAll = (perms: Permission[]): boolean => {
    return perms.every(p => permissions.includes(p));
  };

  const isAdmin = useMemo(() => {
    const adminRoles: Role[] = ['super_admin', 'admin', 'content_manager', 'billing_admin'];
    return role ? adminRoles.includes(role) : false;
  }, [role]);

  const isSuperAdmin = useMemo(() => role === 'super_admin', [role]);

  const hasRole = (checkRole: Role): boolean => {
    return role === checkRole;
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  return {
    role,
    permissions,
    can,
    canAny,
    canAll,
    isAdmin,
    isSuperAdmin,
    hasRole,
    hasAnyRole,
  };
};

export const useCanAccess = (permission: Permission): boolean => {
  const { can } = usePermissions();
  return can(permission);
};

export const useCanAccessAny = (permissions: Permission[]): boolean => {
  const { canAny } = usePermissions();
  return canAny(permissions);
};

export const useIsAdmin = (): boolean => {
  const { isAdmin } = usePermissions();
  return isAdmin;
};

export const useRole = (): Role | null => {
  const { role } = usePermissions();
  return role;
};

export default usePermissions;
