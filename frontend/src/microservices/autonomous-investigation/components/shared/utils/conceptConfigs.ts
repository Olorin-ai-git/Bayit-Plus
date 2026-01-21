/**
 * Concept Configurations
 *
 * Configuration data for UI concepts used in the ConceptSwitcher component.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

export type ConceptType = 'power-grid' | 'command-center' | 'evidence-trail' | 'network-explorer';

export interface ConceptConfig {
  id: ConceptType;
  label: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  shortcut?: string;
}

export const defaultConcepts: ConceptConfig[] = [
  {
    id: 'power-grid',
    label: 'Power Grid',
    description: 'Monitor system health and performance metrics',
    icon: '⚡',
    color: 'blue',
    features: ['Real-time monitoring', 'System metrics', 'Performance dashboards'],
    shortcut: '1',
  },
  {
    id: 'command-center',
    label: 'Command Center',
    description: 'Control and orchestrate investigation operations',
    icon: '🎛️',
    color: 'purple',
    features: ['Agent control', 'Task orchestration', 'Workflow management'],
    shortcut: '2',
  },
  {
    id: 'evidence-trail',
    label: 'Evidence Trail',
    description: 'Track and analyze investigation evidence',
    icon: '🔍',
    color: 'green',
    features: ['Evidence tracking', 'Timeline analysis', 'Chain of custody'],
    shortcut: '3',
  },
  {
    id: 'network-explorer',
    label: 'Network Explorer',
    description: 'Visualize and explore entity relationships',
    icon: '🌐',
    color: 'orange',
    features: ['Relationship mapping', 'Graph visualization', 'Network analysis'],
    shortcut: '4',
  },
];

export const getConceptConfig = (conceptId: ConceptType): ConceptConfig | undefined => {
  return defaultConcepts.find(concept => concept.id === conceptId);
};

export const getConceptsByColor = (color: string): ConceptConfig[] => {
  return defaultConcepts.filter(concept => concept.color === color);
};

export const getConceptsByFeature = (feature: string): ConceptConfig[] => {
  return defaultConcepts.filter(concept =>
    concept.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
  );
};

export const validateConceptId = (id: string): id is ConceptType => {
  return defaultConcepts.some(concept => concept.id === id);
};