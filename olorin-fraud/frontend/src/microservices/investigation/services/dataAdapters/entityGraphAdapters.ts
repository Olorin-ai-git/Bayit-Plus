/**
 * Entity Graph Adapters
 * Feature: 007-progress-wizard-page (T052)
 *
 * Transforms InvestigationProgress to entity graph format for LiveRelationshipGraph.
 * Maps entities and relationships to vis-network compatible structures.
 */

import { InvestigationProgress, InvestigationEntity } from '../../../../shared/types/investigation';
import { EntityRelationship } from '../../../../shared/types/relationshipTypes';
import { GraphEntity } from '../../../../shared/components/LiveRelationshipGraph';

/**
 * Entity Graph Props Interface
 * Props required by EntityGraphSection component
 */
export interface EntityGraphProps {
  graphEntities: GraphEntity[];
  relationships: EntityRelationship[];
  onNodeClick: (entityId: string) => void;
  onRelationshipClick: (relationshipId: string) => void;
}

/**
 * Maps InvestigationEntity to GraphEntity format
 *
 * @param entity - Investigation entity from backend
 * @returns GraphEntity compatible with LiveRelationshipGraph
 */
function mapEntityToGraphEntity(entity: InvestigationEntity): GraphEntity {
  return {
    id: entity.id,
    displayLabel: entity.label || `${entity.type}: ${entity.value}`,
    value: entity.value
  };
}

/**
 * Default node click handler (logs to console)
 * Production implementation should navigate to entity detail view
 */
const defaultNodeClickHandler = (entityId: string): void => {
  console.log('[EntityGraphAdapter] Entity node clicked:', entityId);
};

/**
 * Default relationship click handler (logs to console)
 * Production implementation should show relationship evidence modal
 */
const defaultRelationshipClickHandler = (relationshipId: string): void => {
  console.log('[EntityGraphAdapter] Relationship clicked:', relationshipId);
};

/**
 * Adapts InvestigationProgress to EntityGraphProps
 *
 * Feature: 007-progress-wizard-page (T052)
 * Transforms backend investigation data to entity graph visualization format.
 * Returns empty graph if no entities or null progress.
 *
 * @param progress - Olorin investigation progress with entities and relationships
 * @param isPolling - Current polling state (unused but kept for consistency)
 * @returns EntityGraphProps for EntityGraphSection component
 */
export function adaptToEntityGraph(
  progress: InvestigationProgress | null,
  isPolling: boolean
): EntityGraphProps {
  // Return empty graph if no progress data
  if (!progress || !progress.entities || progress.entities.length === 0) {
    return {
      graphEntities: [],
      relationships: [],
      onNodeClick: defaultNodeClickHandler,
      onRelationshipClick: defaultRelationshipClickHandler
    };
  }

  // Map entities to graph format
  const graphEntities: GraphEntity[] = progress.entities.map(mapEntityToGraphEntity);

  // Extract relationships (already in correct format from backend)
  const relationships: EntityRelationship[] = progress.relationships || [];

  return {
    graphEntities,
    relationships,
    onNodeClick: defaultNodeClickHandler,
    onRelationshipClick: defaultRelationshipClickHandler
  };
}

/**
 * Filters relationships by minimum strength threshold
 *
 * @param relationships - All entity relationships
 * @param minStrength - Minimum strength threshold (0.0 to 1.0)
 * @returns Filtered relationships above threshold
 */
export function filterRelationshipsByStrength(
  relationships: EntityRelationship[],
  minStrength: number
): EntityRelationship[] {
  return relationships.filter(rel => rel.strength >= minStrength);
}

/**
 * Gets unique entity IDs involved in relationships
 * Useful for highlighting connected entities
 *
 * @param relationships - Entity relationships
 * @returns Set of entity IDs with relationships
 */
export function getConnectedEntityIds(relationships: EntityRelationship[]): Set<string> {
  const entityIds = new Set<string>();
  relationships.forEach(rel => {
    entityIds.add(rel.sourceEntityId);
    entityIds.add(rel.targetEntityId);
  });
  return entityIds;
}

/**
 * Calculates relationship statistics
 *
 * @param relationships - Entity relationships
 * @returns Statistics object with counts by type and strength
 */
export function calculateRelationshipStats(relationships: EntityRelationship[]) {
  const stats = {
    total: relationships.length,
    byType: {} as Record<string, number>,
    averageStrength: 0,
    strongConnections: 0 // strength >= 0.7
  };

  if (relationships.length === 0) return stats;

  let totalStrength = 0;

  relationships.forEach(rel => {
    // Count by type
    stats.byType[rel.relationshipType] = (stats.byType[rel.relationshipType] || 0) + 1;

    // Sum strength
    totalStrength += rel.strength;

    // Count strong connections
    if (rel.strength >= 0.7) {
      stats.strongConnections++;
    }
  });

  stats.averageStrength = totalStrength / relationships.length;

  return stats;
}
