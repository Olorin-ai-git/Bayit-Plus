/**
 * Entity Graph Section
 * Feature: 004-new-olorin-frontend
 *
 * Collapsible entity relationship graph panel.
 */

import React from 'react';
import { CollapsiblePanel } from '@shared/components';
import { LiveRelationshipGraph } from '@shared/components/LiveRelationshipGraph';
import type { GraphEntity } from '@shared/components/LiveRelationshipGraph';
import type { EntityRelationship } from '@shared/types/relationshipTypes';

interface EntityGraphSectionProps {
  graphEntities: GraphEntity[];
  relationships: EntityRelationship[];
  onNodeClick: (entityId: string) => void;
  onRelationshipClick: (relationshipId: string) => void;
}

export const EntityGraphSection: React.FC<EntityGraphSectionProps> = React.memo(({
  graphEntities,
  relationships,
  onNodeClick,
  onRelationshipClick
}) => {
  if (graphEntities.length < 2) {
    return null;
  }

  return (
    <CollapsiblePanel
      title="Entity Relationship Graph"
      defaultExpanded={true}
      badges={[
        <span key="entities" className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
          {graphEntities.length} Entities
        </span>,
        <span key="relationships" className="text-xs px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
          {relationships.length} Relationships
        </span>
      ]}
      className="mb-6"
    >
      <LiveRelationshipGraph
        entities={graphEntities}
        relationships={relationships}
        onNodeClick={onNodeClick}
        onRelationshipClick={onRelationshipClick}
      />
    </CollapsiblePanel>
  );
});
