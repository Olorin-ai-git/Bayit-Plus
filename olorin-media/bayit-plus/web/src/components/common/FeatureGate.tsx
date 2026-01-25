/**
 * FeatureGate Component
 * Conditionally renders children based on feature flag status
 */

import React, { ReactNode } from 'react';
import { useFeatureFlag } from '../../hooks/useFeatureFlags';

interface FeatureGateProps {
  /** Feature flag name to check */
  feature: string;

  /** Content to render when feature is enabled */
  children: ReactNode;

  /** Optional content to render when feature is disabled */
  fallback?: ReactNode;

  /** Optional content to render while loading */
  loading?: ReactNode;

  /** Optional callback when feature status changes */
  onFeatureChange?: (enabled: boolean) => void;
}

/**
 * FeatureGate - Conditional rendering based on feature flags
 *
 * @example
 * <FeatureGate feature="scene_search">
 *   <SceneSearchButton />
 * </FeatureGate>
 *
 * @example
 * <FeatureGate
 *   feature="scene_search"
 *   fallback={<UpgradePrompt />}
 *   loading={<Spinner />}
 * >
 *   <SceneSearchPanel />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  loading: loadingContent = null,
  onFeatureChange,
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureFlag(feature);

  // Call callback when feature status changes
  React.useEffect(() => {
    if (enabled !== null && onFeatureChange) {
      onFeatureChange(enabled);
    }
  }, [enabled, onFeatureChange]);

  // Show loading state
  if (loading) {
    return <>{loadingContent}</>;
  }

  // Show children if feature enabled, fallback otherwise
  return <>{enabled ? children : fallback}</>;
}

/**
 * Higher-order component for feature gating
 *
 * @example
 * const SceneSearchButton = withFeatureGate('scene_search')(BaseButton);
 */
export function withFeatureGate<P extends object>(feature: string) {
  return (Component: React.ComponentType<P>) => {
    const FeatureGatedComponent = (props: P) => {
      const { enabled, loading } = useFeatureFlag(feature);

      if (loading || !enabled) {
        return null;
      }

      return <Component {...props} />;
    };

    FeatureGatedComponent.displayName = `withFeatureGate(${feature})(${
      Component.displayName || Component.name
    })`;

    return FeatureGatedComponent;
  };
}

/**
 * Hook-based feature gate for conditional logic
 *
 * @example
 * const { canRender } = useFeatureGate('scene_search');
 * if (!canRender) return null;
 */
export { useFeatureGate } from '../../hooks/useFeatureFlags';
