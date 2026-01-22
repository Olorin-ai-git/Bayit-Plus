/**
 * Migrated Footer Wrapper with Feature Flag
 *
 * Gradually rolls out the new Tailwind-based Footer to users.
 * Falls back to legacy Footer if flag is off or if errors occur.
 *
 * Rollout stages:
 * - 5%: Internal team only
 * - 25%: Beta users
 * - 50%: Half of production traffic
 * - 75%: Most users
 * - 100%: All users
 *
 * @module MigratedFooterWrapper
 */

import React, { Suspense, lazy } from 'react';
import { useFeature } from '@/providers/FeatureFlagProvider';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load components for code splitting
const LegacyFooter = lazy(() => import('./Footer.legacy'));
const MigratedFooter = lazy(() => import('./Footer/Footer'));

/**
 * Error Fallback Component
 *
 * If the migrated Footer crashes, show legacy Footer
 */
function ErrorFallback({ error, resetErrorBoundary }: any) {
  console.error('[MigratedFooter] Error occurred, falling back to legacy:', error);

  // Report to Sentry
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, {
      tags: {
        component: 'MigratedFooter',
        fallback: 'legacy',
      },
    });
  }

  return (
    <Suspense fallback={<FooterSkeleton />}>
      <LegacyFooter />
    </Suspense>
  );
}

/**
 * Loading Skeleton for Footer
 *
 * Shows while Footer is being lazy-loaded
 */
function FooterSkeleton() {
  return (
    <div
      className="mt-auto border-t border-white/[0.08] h-12 bg-black/30 backdrop-blur-xl"
      role="status"
      aria-label="Loading footer"
    >
      <div className="animate-pulse h-full" />
    </div>
  );
}

/**
 * Migrated Footer Wrapper
 *
 * Controls rollout of new Footer via feature flag.
 *
 * Usage:
 * ```tsx
 * import { MigratedFooterWrapper as Footer } from '@/components/layout/MigratedFooterWrapper';
 *
 * function App() {
 *   return (
 *     <div>
 *       <Content />
 *       <Footer />
 *     </div>
 *   );
 * }
 * ```
 */
export default function MigratedFooterWrapper() {
  // Check feature flag
  const migratedFooterEnabled = useFeature('migrated-footer').on;

  // Log which version is being used (for debugging)
  React.useEffect(() => {
    console.log('[Footer] Version:', migratedFooterEnabled ? 'Migrated (Tailwind)' : 'Legacy (StyleSheet)');
  }, [migratedFooterEnabled]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset app state if needed
        console.log('[MigratedFooter] Error boundary reset');
      }}
    >
      <Suspense fallback={<FooterSkeleton />}>
        {migratedFooterEnabled ? <MigratedFooter /> : <LegacyFooter />}
      </Suspense>
    </ErrorBoundary>
  );
}
