/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 */

import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission, Role } from '@/types/rbac';
import { colors } from '@bayit/shared/theme';

interface PermissionGateProps {
  permission?: Permission;
  anyPermissions?: Permission[];
  allPermissions?: Permission[];
  role?: Role;
  anyRoles?: Role[];
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
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

  const hasAccess = (() => {
    if (requireSuperAdmin && !isSuperAdmin) return false;
    if (requireAdmin && !isAdmin) return false;
    if (role && !hasRole(role)) return false;
    if (anyRoles && anyRoles.length > 0 && !hasAnyRole(anyRoles)) return false;
    if (permission && !can(permission)) return false;
    if (anyPermissions && anyPermissions.length > 0 && !canAny(anyPermissions)) return false;
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
      <View className="flex-1 justify-center items-center p-12" style={{ backgroundColor: colors.background }}>
        <Text className="text-6xl mb-6">🔒</Text>
        <Text className="text-2xl font-bold mb-2" style={{ color: colors.text }}>Access Denied</Text>
        <Text className="text-base text-center" style={{ color: colors.textSecondary }}>
          You don't have permission to view this content
        </Text>
      </View>
    );
  }

  return null;
};

export const AdminGate: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  showDenied?: boolean;
}> = ({ children, fallback, showDenied }) => (
  <PermissionGate requireAdmin fallback={fallback} showDenied={showDenied}>
    {children}
  </PermissionGate>
);

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
