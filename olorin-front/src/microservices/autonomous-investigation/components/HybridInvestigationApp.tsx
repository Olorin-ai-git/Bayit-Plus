/**
 * HybridInvestigationApp Component
 *
 * Main application component that orchestrates the different UI concepts
 * and manages concept switching with smooth transitions.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { Suspense, useCallback, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  useActiveConcept,
  useTransitionState,
  useActiveConfiguration,
} from '../stores/conceptStore';
import { ConceptSwitcher } from './shared/ConceptSwitcher';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorAlert } from './shared/ErrorAlert';

// Lazy load concept components for better performance
const PowerGridView = React.lazy(() => import('./concepts/power-grid/PowerGridView'));
const CommandCenterView = React.lazy(() => import('./concepts/command-center/CommandCenterView'));
const EvidenceTrailView = React.lazy(() => import('./concepts/evidence-trail/EvidenceTrailView'));
const NetworkExplorerView = React.lazy(() => import('./concepts/network-explorer/NetworkExplorerView'));

interface HybridInvestigationAppProps {
  /** Investigation ID */
  investigationId?: string;
  /** Enable concept preview mode */
  enablePreview?: boolean;
  /** Show concept switcher */
  showConceptSwitcher?: boolean;
  /** Concept switcher layout */
  switcherLayout?: 'floating' | 'top' | 'sidebar';
  /** Custom styling classes */
  className?: string;
}

interface ConceptTransitionProps {
  isTransitioning: boolean;
  transitionProgress: number;
  children: React.ReactNode;
}

const ConceptTransition: React.FC<ConceptTransitionProps> = ({
  isTransitioning,
  transitionProgress,
  children,
}) => {
  if (!isTransitioning) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Transition overlay */}
      <div
        className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40 transition-opacity duration-300"
        style={{ opacity: isTransitioning ? 1 : 0 }}
      >
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Switching UI Concept
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Transitioning to new investigation interface...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${transitionProgress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {Math.round(transitionProgress)}% complete
            </div>
          </div>
        </div>
      </div>

      {/* Main content with reduced opacity during transition */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: isTransitioning ? 0.3 : 1 }}
      >
        {children}
      </div>
    </div>
  );
};

const ConceptErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({
  error,
  resetError,
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full">
      <ErrorAlert
        title="Concept Loading Error"
        message={`Failed to load the requested UI concept: ${error.message}`}
        onRetry={resetError}
        showDetails={true}
        className="mb-4"
      />
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Try switching to a different concept or refreshing the page.
        </p>
      </div>
    </div>
  </div>
);

export const HybridInvestigationApp: React.FC<HybridInvestigationAppProps> = ({
  investigationId,
  enablePreview = false,
  showConceptSwitcher = true,
  switcherLayout = 'floating',
  className = '',
}) => {
  const [previewConcept, setPreviewConcept] = useState<string | null>(null);

  const activeConcept = useActiveConcept();
  const { isTransitioning, transitionProgress } = useTransitionState();
  const activeConfig = useActiveConfiguration();

  const handleConceptPreview = useCallback((concept: string | null) => {
    if (enablePreview) {
      setPreviewConcept(concept);
    }
  }, [enablePreview]);

  const renderConceptView = () => {
    const commonProps = {
      investigationId,
      className: "w-full h-full",
    };

    switch (activeConcept) {
      case 'power-grid':
        return <PowerGridView {...commonProps} />;
      case 'command-center':
        return <CommandCenterView {...commonProps} />;
      case 'evidence-trail':
        return <EvidenceTrailView {...commonProps} />;
      case 'network-explorer':
        return <NetworkExplorerView {...commonProps} />;
      default:
        return <PowerGridView {...commonProps} />;
    }
  };

  const getSwitcherConfig = () => {
    switch (switcherLayout) {
      case 'top':
        return {
          layout: 'horizontal' as const,
          position: 'top-right' as const,
          className: 'absolute top-4 right-4 z-30',
        };
      case 'sidebar':
        return {
          layout: 'vertical' as const,
          position: 'top-left' as const,
          className: 'fixed left-4 top-1/2 transform -translate-y-1/2 z-30',
        };
      default:
        return {
          layout: 'floating' as const,
          position: 'top-right' as const,
          showAnalytics: true,
        };
    }
  };

  return (
    <div className={`hybrid-investigation-app relative w-full h-screen bg-gray-50 ${className}`}>
      {/* Concept Switcher */}
      {showConceptSwitcher && (
        <ConceptSwitcher
          {...getSwitcherConfig()}
          showDescriptions={true}
          showShortcuts={true}
          enablePreview={enablePreview}
          onConceptPreview={handleConceptPreview}
        />
      )}

      {/* Preview Indicator */}
      {enablePreview && previewConcept && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Previewing: {previewConcept?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active Concept Indicator */}
      <div className="fixed bottom-4 left-4 z-30">
        <div className={`
          px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200
          ${activeConcept === 'power-grid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            activeConcept === 'command-center' ? 'bg-green-50 text-green-700 border-green-200' :
            activeConcept === 'evidence-trail' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-purple-50 text-purple-700 border-purple-200'}
        `}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-current rounded-full" />
            <span>{activeConfig.name}</span>
            {isTransitioning && (
              <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <ConceptTransition isTransitioning={isTransitioning} transitionProgress={transitionProgress}>
        <ErrorBoundary
          FallbackComponent={ConceptErrorFallback}
          onReset={() => window.location.reload()}
        >
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <LoadingSpinner
                  size="large"
                  message={`Loading ${activeConfig.name}...`}
                  className="text-center"
                />
              </div>
            }
          >
            <div className="w-full h-full">
              {renderConceptView()}
            </div>
          </Suspense>
        </ErrorBoundary>
      </ConceptTransition>

      {/* Keyboard shortcuts help */}
      <div className="fixed bottom-4 right-4 z-30">
        <details className="relative">
          <summary className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-gray-700 transition-colors">
            Shortcuts
          </summary>
          <div className="absolute bottom-full right-0 mb-2 bg-gray-800 text-white p-3 rounded-lg shadow-xl text-xs min-w-max">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">⌘1</kbd>
                <span>Power Grid</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">⌘2</kbd>
                <span>Command Center</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">⌘3</kbd>
                <span>Evidence Trail</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">⌘4</kbd>
                <span>Network Explorer</span>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default HybridInvestigationApp;