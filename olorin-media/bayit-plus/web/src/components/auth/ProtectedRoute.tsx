/**
 * ProtectedRoute Component
 *
 * Ensures users are authenticated before accessing protected routes.
 * Redirects to login page if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-white/60 text-sm">Loading...</span>
    </div>
  </div>
);

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isHydrated } = useAuthStore();
  const location = useLocation();

  // Wait for auth hydration
  if (!isHydrated || isLoading) {
    logger.debug('ProtectedRoute: Waiting for auth hydration', 'ProtectedRoute', {
      isHydrated,
      isLoading,
    });
    return <LoadingFallback />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    logger.info('ProtectedRoute: Not authenticated, redirecting to login', 'ProtectedRoute', {
      attemptedPath: location.pathname,
    });

    // Save attempted path to redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render protected content
  logger.debug('ProtectedRoute: Authentication check passed', 'ProtectedRoute');
  return <>{children}</>;
}
