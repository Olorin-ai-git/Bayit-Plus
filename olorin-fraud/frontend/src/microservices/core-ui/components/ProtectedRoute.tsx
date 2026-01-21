import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { UserRole } from '@shared/types/core/user.types';
import { getDefaultRouteForRole } from '../config/route-permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
  showToast?: boolean;
}

/**
 * ProtectedRoute component for role-based access control.
 * Redirects unauthorized users to their default route with a toast message.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
  showToast = true,
}) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (!hasRole(allowedRoles)) {
    // Show toast notification for unauthorized access
    if (showToast && typeof window !== 'undefined') {
      const event = new CustomEvent('notification:show', {
        detail: {
          type: 'warning',
          title: 'Access Denied',
          message: `You don't have permission to access this page.`,
        },
      });
      window.dispatchEvent(event);
    }

    // Redirect to user's default route or specified redirect
    const defaultRoute = redirectTo || getDefaultRouteForRole(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};

/**
 * Higher-order component for protecting routes with role requirements.
 */
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[]
): React.FC<P> {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
