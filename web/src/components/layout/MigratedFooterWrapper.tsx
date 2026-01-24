/**
 * Migrated Footer Wrapper with Feature Flag
 *
 * Gradually rolls out the new StyleSheet-based Footer to users.
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
import { View, StyleSheet, Animated } from 'react-native';
import { useFeature } from '@/providers/FeatureFlagProvider';
import { ErrorBoundary } from 'react-error-boundary';
import logger from '@/utils/logger';

// Lazy load components for code splitting
const LegacyFooter = lazy(() => import('./Footer.legacy'));
const MigratedFooter = lazy(() => import('./Footer/Footer'));

/**
 * Error Fallback Component
 *
 * If the migrated Footer crashes, show legacy Footer
 */
function ErrorFallback({ error, resetErrorBoundary }: any) {
  logger.error('Error occurred, falling back to legacy', 'MigratedFooter', error);

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
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View
      style={styles.skeleton}
      role="status"
      aria-label="Loading footer"
    >
      <Animated.View
        style={[
          styles.skeletonPulse,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            }),
          },
        ]}
      />
    </View>
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
    logger.debug('Version', 'MigratedFooterWrapper', migratedFooterEnabled ? 'Migrated (StyleSheet)' : 'Legacy (StyleSheet)');
  }, [migratedFooterEnabled]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset app state if needed
        logger.debug('Error boundary reset', 'MigratedFooterWrapper');
      }}
    >
      <Suspense fallback={<FooterSkeleton />}>
        {migratedFooterEnabled ? <MigratedFooter /> : <LegacyFooter />}
      </Suspense>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(20px)',
  } as any,
  skeletonPulse: {
    height: '100%',
  },
});
