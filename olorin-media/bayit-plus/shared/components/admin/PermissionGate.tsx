/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 */

import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission, Role } from '../../types/rbac';

interface PermissionGateProps {
  // Single permission required
  permission?: Permission;
  // Any of these permissions (OR logic)
  anyPermissions?: Permission[];
  // All of these permissions required (AND logic)
  allPermissions?: Permission[];
  // Role required
  role?: Role;
  // Any of these roles (OR logic)
  anyRoles?: Role[];
  // Require admin access
  requireAdmin?: boolean;
  // Require super admin access
  requireSuperAdmin?: boolean;
  // Children to render if permission granted
  children: ReactNode;
  // Optional fallback content if permission denied
  fallback?: ReactNode;
  // Show access denied message instead of nothing
  showDenied?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  anyPermissions,
  allPermissions,
  role,
  anyRoles,
  requireAdmin,
  requireSuperAdmin,
  children,
  fallback,
  showDenied = false,
}) => {
  const { can, canAny, canAll, hasRole, hasAnyRole, isAdmin, isSuperAdmin } = usePermissions();

  // Check all conditions
  const hasAccess = (() => {
    // Check super admin requirement
    if (requireSuperAdmin && !isSuperAdmin) return false;

    // Check admin requirement
    if (requireAdmin && !isAdmin) return false;

    // Check specific role
    if (role && !hasRole(role)) return false;

    // Check any roles
    if (anyRoles && anyRoles.length > 0 && !hasAnyRole(anyRoles)) return false;

    // Check single permission
    if (permission && !can(permission)) return false;

    // Check any permissions
    if (anyPermissions && anyPermissions.length > 0 && !canAny(anyPermissions)) return false;

    // Check all permissions
    if (allPermissions && allPermissions.length > 0 && !canAll(allPermissions)) return false;

    return true;
  })();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showDenied) {
    return (
      <View className="flex-1 justify-center items-center p-8 bg-black">
        <View className="w-20 h-20 rounded-full bg-white/10 justify-center items-center mb-4">
          <Text style={{ fontSize: 64 }}>🔒</Text>
        </View>
        <Text className="text-white text-2xl font-bold mb-2">Access Denied</Text>
        <Text className="text-gray-400 text-base text-center">
          You don't have permission to view this content
        </Text>
      </View>
    );
  }

  return null;
};

/**
 * AdminGate - Shorthand for requiring any admin role
 */
export const AdminGate: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  showDenied?: boolean;
}> = ({ children, fallback, showDenied }) => (
  <PermissionGate requireAdmin fallback={fallback} showDenied={showDenied}>
    {children}
  </PermissionGate>
);

/**
 * SuperAdminGate - Shorthand for requiring super admin role
 */
export const SuperAdminGate: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  showDenied?: boolean;
}> = ({ children, fallback, showDenied }) => (
  <PermissionGate requireSuperAdmin fallback={fallback} showDenied={showDenied}>
    {children}
  </PermissionGate>
);

export default PermissionGate;
