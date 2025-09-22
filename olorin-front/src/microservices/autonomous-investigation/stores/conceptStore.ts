/**
 * Concept Store
 * Manages active UI concept switching and concept-specific state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// UI Concept types based on the specification
export type UIConcept = 'power-grid' | 'command-center' | 'evidence-trail' | 'network-explorer';

interface ConceptConfiguration {
  name: string;
  description: string;
  primaryColor: string;
  layout: {
    panelArrangement: string[];
    defaultPanelsOpen: string[];
    graphVisualization: 'network' | 'hierarchy' | 'timeline' | 'grid';
  };
  features: {
    realTimeUpdates: boolean;
    multiSelection: boolean;
    filteringEnabled: boolean;
    exportEnabled: boolean;
  };
}

interface ConceptState {
  // Current concept
  activeConcept: UIConcept;
  previousConcept: UIConcept | null;

  // Concept configurations
  configurations: Record<UIConcept, ConceptConfiguration>;

  // Concept-specific state
  conceptStates: Record<UIConcept, {
    lastUsed: number;
    preferences: Record<string, unknown>;
    customSettings: Record<string, unknown>;
  }>;

  // Transition state
  isTransitioning: boolean;
  transitionProgress: number;

  // Actions
  switchConcept: (concept: UIConcept) => void;
  updateConceptPreferences: (concept: UIConcept, preferences: Record<string, unknown>) => void;
  updateConceptSettings: (concept: UIConcept, settings: Record<string, unknown>) => void;
  setTransitioning: (transitioning: boolean, progress?: number) => void;

  // Getters
  getActiveConfiguration: () => ConceptConfiguration;
  getConceptState: (concept: UIConcept) => typeof conceptStates[UIConcept];
}

const conceptConfigurations: Record<UIConcept, ConceptConfiguration> = {
  'power-grid': {
    name: 'Power Grid Control',
    description: 'Monitor investigation flow like an electrical grid with real-time status updates',
    primaryColor: '#3B82F6', // Blue
    layout: {
      panelArrangement: ['status-grid', 'metrics-panel', 'alerts-panel'],
      defaultPanelsOpen: ['sidebar', 'status-grid', 'metrics-panel'],
      graphVisualization: 'network',
    },
    features: {
      realTimeUpdates: true,
      multiSelection: true,
      filteringEnabled: true,
      exportEnabled: true,
    },
  },
  'command-center': {
    name: 'Command Center',
    description: 'Central command interface for managing multiple investigations simultaneously',
    primaryColor: '#059669', // Green
    layout: {
      panelArrangement: ['investigation-list', 'active-investigations', 'resource-monitor'],
      defaultPanelsOpen: ['sidebar', 'investigation-list', 'active-investigations'],
      graphVisualization: 'hierarchy',
    },
    features: {
      realTimeUpdates: true,
      multiSelection: true,
      filteringEnabled: true,
      exportEnabled: true,
    },
  },
  'evidence-trail': {
    name: 'Evidence Trail',
    description: 'Follow the chronological trail of evidence with timeline-based visualization',
    primaryColor: '#DC2626', // Red
    layout: {
      panelArrangement: ['timeline-panel', 'evidence-details', 'connections-panel'],
      defaultPanelsOpen: ['sidebar', 'timeline-panel', 'evidence-details'],
      graphVisualization: 'timeline',
    },
    features: {
      realTimeUpdates: false,
      multiSelection: false,
      filteringEnabled: true,
      exportEnabled: true,
    },
  },
  'network-explorer': {
    name: 'Network Explorer',
    description: 'Explore complex network relationships with advanced graph navigation',
    primaryColor: '#7C3AED', // Purple
    layout: {
      panelArrangement: ['graph-controls', 'node-details', 'network-stats'],
      defaultPanelsOpen: ['sidebar', 'graph-controls'],
      graphVisualization: 'network',
    },
    features: {
      realTimeUpdates: false,
      multiSelection: true,
      filteringEnabled: true,
      exportEnabled: true,
    },
  },
};

export const useConceptStore = create<ConceptState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeConcept: 'power-grid',
        previousConcept: null,
        configurations: conceptConfigurations,
        conceptStates: {
          'power-grid': {
            lastUsed: Date.now(),
            preferences: {},
            customSettings: {},
          },
          'command-center': {
            lastUsed: 0,
            preferences: {},
            customSettings: {},
          },
          'evidence-trail': {
            lastUsed: 0,
            preferences: {},
            customSettings: {},
          },
          'network-explorer': {
            lastUsed: 0,
            preferences: {},
            customSettings: {},
          },
        },
        isTransitioning: false,
        transitionProgress: 0,

        // Actions
        switchConcept: (concept) => {
          const currentConcept = get().activeConcept;
          if (currentConcept === concept) return;

          set({ isTransitioning: true, transitionProgress: 0 });

          // Simulate transition progress
          const progressInterval = setInterval(() => {
            set((state) => {
              const newProgress = state.transitionProgress + 10;
              if (newProgress >= 100) {
                clearInterval(progressInterval);
                return {
                  activeConcept: concept,
                  previousConcept: currentConcept,
                  isTransitioning: false,
                  transitionProgress: 0,
                  conceptStates: {
                    ...state.conceptStates,
                    [concept]: {
                      ...state.conceptStates[concept],
                      lastUsed: Date.now(),
                    },
                  },
                };
              }
              return { transitionProgress: newProgress };
            });
          }, 50);
        },

        updateConceptPreferences: (concept, preferences) =>
          set((state) => ({
            conceptStates: {
              ...state.conceptStates,
              [concept]: {
                ...state.conceptStates[concept],
                preferences: {
                  ...state.conceptStates[concept].preferences,
                  ...preferences,
                },
              },
            },
          })),

        updateConceptSettings: (concept, settings) =>
          set((state) => ({
            conceptStates: {
              ...state.conceptStates,
              [concept]: {
                ...state.conceptStates[concept],
                customSettings: {
                  ...state.conceptStates[concept].customSettings,
                  ...settings,
                },
              },
            },
          })),

        setTransitioning: (transitioning, progress = 0) =>
          set({ isTransitioning: transitioning, transitionProgress: progress }),

        // Getters
        getActiveConfiguration: () => {
          const { activeConcept, configurations } = get();
          return configurations[activeConcept];
        },

        getConceptState: (concept) => {
          const { conceptStates } = get();
          return conceptStates[concept];
        },
      }),
      {
        name: 'concept-store',
        partialize: (state) => ({
          activeConcept: state.activeConcept,
          conceptStates: state.conceptStates,
        }),
      }
    ),
    {
      name: 'concept-store',
    }
  )
);

// Computed selectors
export const useActiveConcept = () => useConceptStore((state) => state.activeConcept);
export const useActiveConfiguration = () => useConceptStore((state) => state.getActiveConfiguration());
export const useTransitionState = () =>
  useConceptStore((state) => ({
    isTransitioning: state.isTransitioning,
    transitionProgress: state.transitionProgress,
  }));

export const useConceptHistory = () =>
  useConceptStore((state) => {
    const sortedConcepts = Object.entries(state.conceptStates)
      .sort(([, a], [, b]) => b.lastUsed - a.lastUsed)
      .map(([concept]) => concept as UIConcept);

    return {
      mostRecentConcepts: sortedConcepts.slice(0, 3),
      previousConcept: state.previousConcept,
    };
  });

// Individual concept selectors
export const usePowerGridConfig = () =>
  useConceptStore((state) => state.configurations['power-grid']);
export const useCommandCenterConfig = () =>
  useConceptStore((state) => state.configurations['command-center']);
export const useEvidenceTrailConfig = () =>
  useConceptStore((state) => state.configurations['evidence-trail']);
export const useNetworkExplorerConfig = () =>
  useConceptStore((state) => state.configurations['network-explorer']);

// Action selectors
export const useConceptActions = () =>
  useConceptStore((state) => ({
    switchConcept: state.switchConcept,
    updateConceptPreferences: state.updateConceptPreferences,
    updateConceptSettings: state.updateConceptSettings,
    setTransitioning: state.setTransitioning,
  }));

// Utility hooks
export const useIsConceptActive = (concept: UIConcept) =>
  useConceptStore((state) => state.activeConcept === concept);

export const useConceptPreferences = (concept: UIConcept) =>
  useConceptStore((state) => state.conceptStates[concept].preferences);

export const useConceptSettings = (concept: UIConcept) =>
  useConceptStore((state) => state.conceptStates[concept].customSettings);