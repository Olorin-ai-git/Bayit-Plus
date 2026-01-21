/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission, Role } from '@/types/rbac';
import { colors, spacing } from '@bayit/shared/theme';

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
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedIcon}>🔒</Text>
        <Text style={styles.deniedText}>Access Denied</Text>
        <Text style={styles.deniedSubtext}>
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

const styles = StyleSheet.create({
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  deniedIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  deniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  deniedSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default PermissionGate;
