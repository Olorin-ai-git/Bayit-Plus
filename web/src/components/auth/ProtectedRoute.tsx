/**
 * ProtectedRoute - Authentication guard for protected routes
 *
 * This component wraps routes that require authentication.
 * Redirects unauthenticated users to the login page.
 *
 * Features:
 * - Waits for auth hydration before making decisions
 * - Redirects to login with return URL for post-login navigation
 * - Shows loading state during auth check
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { logger } from '@/utils/logger'

const authLogger = logger.scope('ProtectedRoute')

interface Props {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isHydrated, isLoading, user } = useAuthStore()
  const location = useLocation()

  // Wait for auth hydration to complete
  if (!isHydrated || isLoading) {
    authLogger.debug('Waiting for auth hydration', {
      isHydrated,
      isLoading,
      pathname: location.pathname,
    })

    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  // Redirect unauthenticated users to login with return URL
  if (!isAuthenticated) {
    authLogger.info('Unauthenticated access blocked - redirecting to login', {
      pathname: location.pathname,
      userExists: !!user,
    })

    // Preserve current location for post-login redirect
    const returnUrl = encodeURIComponent(
      location.pathname + location.search + location.hash
    )

    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />
  }

  authLogger.debug('Authentication check passed', {
    userId: user?.id,
    pathname: location.pathname,
  })

  return <>{children}</>
}
