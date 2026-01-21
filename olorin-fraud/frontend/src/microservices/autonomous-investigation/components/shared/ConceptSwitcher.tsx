/**
 * ConceptSwitcher Component
 *
 * A navigation component for switching between different UI concepts
 * (Power Grid, Command Center, Evidence Trail, Network Explorer) with
 * smooth transitions and context preservation. Integrated with Zustand store.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useState } from 'react';
import {
  Zap,
  Shield,
  Clock,
  Network,
  ChevronDown,
  Activity,
  Settings,
  History
} from 'lucide-react';
import {
  useActiveConcept,
  useActiveConfiguration,
  useTransitionState,
  useConceptActions,
  useConceptHistory,
  type UIConcept
} from '../../stores/conceptStore';

export interface ConceptSwitcherProps {
  /** Switcher layout style */
  layout?: 'horizontal' | 'vertical' | 'grid' | 'dropdown' | 'floating';
  /** Switcher size */
  size?: 'small' | 'medium' | 'large';
  /** Position when using floating layout */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Show concept descriptions */
  showDescriptions?: boolean;
  /** Show concept features */
  showFeatures?: boolean;
  /** Show keyboard shortcuts */
  showShortcuts?: boolean;
  /** Show usage analytics */
  showAnalytics?: boolean;
  /** Enable concept preview on hover */
  enablePreview?: boolean;
  /** Animation style */
  animation?: 'none' | 'slide' | 'fade' | 'scale';
  /** Custom styling classes */
  className?: string;
  /** Callback for concept preview */
  onConceptPreview?: (concept: UIConcept | null) => void;
}

const conceptIcons: Record<UIConcept, React.ComponentType<{ className?: string }>> = {
  'power-grid': Zap,
  'command-center': Shield,
  'evidence-trail': Clock,
  'network-explorer': Network,
};

const conceptShortcuts: Record<UIConcept, string> = {
  'power-grid': '1',
  'command-center': '2',
  'evidence-trail': '3',
  'network-explorer': '4',
};

const conceptColors: Record<UIConcept, { active: string; hover: string; default: string }> = {
  'power-grid': {
    active: 'bg-blue-600 text-white border-blue-600',
    hover: 'bg-blue-50 text-blue-700 border-blue-300',
    default: 'bg-white text-blue-600 border-blue-200',
  },
  'command-center': {
    active: 'bg-green-600 text-white border-green-600',
    hover: 'bg-green-50 text-green-700 border-green-300',
    default: 'bg-white text-green-600 border-green-200',
  },
  'evidence-trail': {
    active: 'bg-red-600 text-white border-red-600',
    hover: 'bg-red-50 text-red-700 border-red-300',
    default: 'bg-white text-red-600 border-red-200',
  },
  'network-explorer': {
    active: 'bg-purple-600 text-white border-purple-600',
    hover: 'bg-purple-50 text-purple-700 border-purple-300',
    default: 'bg-white text-purple-600 border-purple-200',
  },
};

export const ConceptSwitcher: React.FC<ConceptSwitcherProps> = ({
  layout = 'horizontal',
  size = 'medium',
  position = 'top-right',
  showDescriptions = true,
  showFeatures = false,
  showShortcuts = true,
  showAnalytics = false,
  enablePreview = true,
  animation = 'slide',
  className = '',
  onConceptPreview,
}) => {
  const [hoveredConcept, setHoveredConcept] = useState<UIConcept | null>(null);
  const [previewTimeout, setPreviewTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Get state from Zustand store
  const activeConcept = useActiveConcept();
  const activeConfig = useActiveConfiguration();
  const { isTransitioning, transitionProgress } = useTransitionState();
  const { switchConcept } = useConceptActions();
  const { mostRecentConcepts, previousConcept } = useConceptHistory();

  const concepts: UIConcept[] = ['power-grid', 'command-center', 'evidence-trail', 'network-explorer'];

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const shortcut = event.key;
        const concept = concepts.find(c => conceptShortcuts[c] === shortcut);
        if (concept && concept !== activeConcept) {
          event.preventDefault();
          switchConcept(concept);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeConcept, switchConcept]);

  const handleConceptClick = useCallback((conceptId: UIConcept) => {
    if (conceptId !== activeConcept && !isTransitioning) {
      switchConcept(conceptId);
      setIsExpanded(false);
    }
  }, [activeConcept, isTransitioning, switchConcept]);

  const handleConceptHover = useCallback((conceptId: UIConcept | null) => {
    setHoveredConcept(conceptId);

    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }

    if (enablePreview && conceptId && conceptId !== activeConcept) {
      const timeout = setTimeout(() => {
        onConceptPreview?.(conceptId);
      }, 500); // 500ms delay for preview
      setPreviewTimeout(timeout);
    } else {
      onConceptPreview?.(null);
    }
  }, [enablePreview, activeConcept, onConceptPreview, previewTimeout]);

  const getColorClasses = (concept: UIConcept, isActive: boolean, isHovered: boolean) => {
    const colors = conceptColors[concept];
    if (isActive) return colors.active;
    if (isHovered) return colors.hover;
    return colors.default;
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-2 text-sm';
      case 'large':
        return 'px-6 py-4 text-lg';
      default:
        return 'px-4 py-3 text-base';
    }
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'vertical':
        return 'flex flex-col gap-2';
      case 'grid':
        return 'grid grid-cols-2 gap-2';
      case 'dropdown':
        return 'relative';
      case 'floating':
        return getFloatingPositionClasses();
      default:
        return 'flex flex-wrap gap-2';
    }
  };

  const getFloatingPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'fixed top-4 left-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'fade':
        return 'transition-opacity duration-300';
      case 'scale':
        return 'transition-transform duration-300 hover:scale-105';
      case 'slide':
        return 'transition-all duration-300';
      default:
        return '';
    }
  };

  const renderConcept = (concept: UIConcept) => {
    const isActive = concept === activeConcept;
    const isHovered = concept === hoveredConcept;
    const Icon = conceptIcons[concept];
    const isRecent = mostRecentConcepts.includes(concept);
    const isPrevious = concept === previousConcept;

    return (
      <button
        key={concept}
        onClick={() => handleConceptClick(concept)}
        onMouseEnter={() => handleConceptHover(concept)}
        onMouseLeave={() => handleConceptHover(null)}
        disabled={isTransitioning}
        className={`
          concept-button relative border rounded-lg transition-all duration-200 text-left
          ${getSizeClasses()}
          ${getColorClasses(concept, isActive, isHovered)}
          ${getAnimationClasses()}
          ${isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:ring-2 focus:ring-blue-500 focus:outline-none
        `}
        role="tab"
        aria-selected={isActive}
        aria-controls={`concept-panel-${concept}`}
        title={activeConfig.description}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {concept.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </h3>
              {showShortcuts && conceptShortcuts[concept] && (
                <kbd className={`px-1.5 py-0.5 text-xs rounded border font-mono ${
                  isActive
                    ? 'bg-white bg-opacity-20 border-white border-opacity-30 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}>
                  ⌘{conceptShortcuts[concept]}
                </kbd>
              )}
            </div>

            {showDescriptions && (
              <p className={`text-sm mt-1 opacity-90 line-clamp-2 ${
                size === 'small' ? 'text-xs' : ''
              }`}>
                {concept === activeConcept ? activeConfig.description :
                 concept === 'power-grid' ? 'Energy/power metaphor interface' :
                 concept === 'command-center' ? 'Mission control interface' :
                 concept === 'evidence-trail' ? 'Timeline-first interface' :
                 'Graph-first interface'}
              </p>
            )}

            {showFeatures && activeConfig.features && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(activeConfig.features).slice(0, 3).map(([key, value], index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full ${
                      isActive
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {key}: {value ? 'on' : 'off'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isPrevious && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                Previous
              </span>
            )}
            {isRecent && !isPrevious && (
              <History className="w-3 h-3 text-gray-400" title="Recently used" />
            )}
          </div>
        </div>

        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        )}

        {/* Transition indicator */}
        {isTransitioning && isActive && (
          <div className="absolute inset-0 rounded-lg border-2 border-current animate-pulse bg-black bg-opacity-10" />
        )}
      </button>
    );
  };

  const renderFloatingCompact = () => {
    const ActiveIcon = conceptIcons[activeConcept];

    if (!isExpanded) {
      return (
        <div className={getFloatingPositionClasses()}>
          <button
            onClick={() => setIsExpanded(true)}
            className={`
              p-3 rounded-full border-2 transition-all duration-200 shadow-lg
              ${getColorClasses(activeConcept, true, false)}
              ${isTransitioning ? 'animate-pulse' : ''}
            `}
            title={`Current: ${activeConfig.name}`}
            aria-label={`Switch from ${activeConfig.name}`}
          >
            <ActiveIcon className="w-5 h-5" />
            {isTransitioning && (
              <div className="absolute inset-0 rounded-full border-2 border-current animate-spin" />
            )}
          </button>
        </div>
      );
    }

    return (
      <div className={`${getFloatingPositionClasses()} w-80`}>
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">UI Concept</span>
              </div>
              <div className="flex items-center gap-1">
                {showAnalytics && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    title="Analytics & Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                  title="Collapse"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Transition Progress */}
          {isTransitioning && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full" />
                <span>Switching concepts...</span>
              </div>
              <div className="mt-1 w-full bg-blue-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-100"
                  style={{ width: `${transitionProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Current Concept */}
          <div className="p-4">
            <div className={`
              flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200
              ${getColorClasses(activeConcept, true, false)}
            `}>
              <ActiveIcon className="w-6 h-6 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {activeConfig.name}
                </div>
                {showDescriptions && (
                  <div className="text-xs opacity-75 mt-1 line-clamp-2">
                    {activeConfig.description}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Concept Options */}
          <div className="border-t border-gray-200">
            <div className="p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Switch to
              </div>
              <div className="space-y-2">
                {concepts
                  .filter(concept => concept !== activeConcept)
                  .map((concept) => {
                    const Icon = conceptIcons[concept];
                    const isRecent = mostRecentConcepts.includes(concept);
                    const isPrevious = concept === previousConcept;

                    return (
                      <button
                        key={concept}
                        onClick={() => handleConceptClick(concept)}
                        disabled={isTransitioning}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
                          bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm
                          disabled:opacity-50 disabled:cursor-not-allowed
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                        `}
                        title={`Switch to ${concept.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
                      >
                        <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {concept.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </div>
                          {showDescriptions && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {concept === 'power-grid' && 'Energy/power metaphor interface'}
                              {concept === 'command-center' && 'Mission control interface'}
                              {concept === 'evidence-trail' && 'Timeline-first interface'}
                              {concept === 'network-explorer' && 'Graph-first interface'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isPrevious && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              Previous
                            </span>
                          )}
                          {isRecent && !isPrevious && (
                            <History className="w-3 h-3 text-gray-400" title="Recently used" />
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Analytics Panel */}
          {showAnalytics && showSettings && (
            <div className="border-t border-gray-200 bg-gray-50">
              <div className="p-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Usage Analytics
                </div>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-gray-600 mb-1">Most Used Concepts</div>
                    <div className="space-y-1">
                      {mostRecentConcepts.slice(0, 3).map((concept, index) => {
                        const Icon = conceptIcons[concept];
                        return (
                          <div key={concept} className="flex items-center gap-2 text-xs">
                            <span className="w-4 text-gray-400">#{index + 1}</span>
                            <Icon className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-700">
                              {concept.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (layout === 'floating') {
    return renderFloatingCompact();
  }

  return (
    <div className={`concept-switcher ${getLayoutClasses()} ${className}`} role="tablist">
      {concepts.map(renderConcept)}
    </div>
  );
};

export default ConceptSwitcher;