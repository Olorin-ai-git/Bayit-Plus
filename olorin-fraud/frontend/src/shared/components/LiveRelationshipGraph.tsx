/**
 * Live Relationship Graph Component
 * Feature: 005-polling-and-persistence
 *
 * Real-time entity relationship visualization using vis-network.
 * Adapted from Olorin web plugin with Olorin corporate styling.
 */

import React, { useEffect, useRef } from 'react';
import { useVisNetwork } from '@shared/hooks/useVisNetwork';
import {
  EntityRelationship,
  formatRelationshipType,
  getRelationshipColor,
} from '@shared/types/relationshipTypes';

/**
 * Entity interface for relationship graph
 * Matches Entity from wizard.schemas.base.ts
 */
export interface GraphEntity {
  id: string;
  displayLabel: string;
  value: string;
}

export interface LiveRelationshipGraphProps {
  entities: GraphEntity[];
  relationships: EntityRelationship[];
  onNodeClick?: (entityId: string) => void;
  onRelationshipClick?: (relationshipId: string) => void;
}

/**
 * Live Relationship Graph Component
 * Visualizes entity relationships in an interactive network diagram
 */
export function LiveRelationshipGraph({
  entities,
  relationships,
  onNodeClick,
  onRelationshipClick,
}: LiveRelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { network, initializeNetwork, updateData } =
    useVisNetwork(containerRef);

  /**
   * Initialize network with Olorin corporate styling and physics configuration
   */
  useEffect(() => {
    if (!containerRef.current) return;

    initializeNetwork({
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.08,
        },
        stabilization: {
          enabled: true,
          iterations: 200,
        },
      },
      nodes: {
        shape: 'box',
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        font: {
          color: '#F9FAFB', // corporate-textPrimary
          size: 14,
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5,
        },
        arrows: {
          to: {
            enabled: false,
          },
        },
      },
    });
  }, [initializeNetwork]);

  /**
   * Update network data when entities or relationships change
   */
  useEffect(() => {
    if (!network) return;

    const nodes = entities.map((entity) => ({
      id: entity.id,
      label: entity.displayLabel || entity.value,
      color: {
        background: '#1A0B2E', // corporate-bgPrimary
        border: '#A855F7', // corporate-accentPrimary (purple)
        hover: {
          background: '#2D1B4E', // corporate-bgSecondary
          border: '#9333EA', // corporate-accentPrimaryHover
        },
      },
      font: { color: '#F9FAFB' }, // corporate-textPrimary
    }));

    const edges = relationships.map((rel) => ({
      id: rel.id,
      from: rel.sourceEntityId,
      to: rel.targetEntityId,
      label: formatRelationshipType(rel.relationshipType),
      color: getRelationshipColor(rel.relationshipType),
      width: rel.strength * 3,
      arrows: rel.bidirectional ? undefined : { to: true },
    }));

    updateData({ nodes, edges });

    /**
     * Handle node click events
     */
    if (onNodeClick) {
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          onNodeClick(params.nodes[0] as string);
        }
      });
    }

    /**
     * Handle relationship click events
     */
    if (onRelationshipClick) {
      network.on('click', (params) => {
        if (params.edges.length > 0) {
          onRelationshipClick(params.edges[0] as string);
        }
      });
    }

    return () => {
      network.off('click');
    };
  }, [
    network,
    entities,
    relationships,
    onNodeClick,
    onRelationshipClick,
    updateData,
  ]);

  /**
   * Empty state when no entities are present
   */
  if (entities.length === 0) {
    return (
      <div className="w-full h-80 bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-borderPrimary/40 flex items-center justify-center">
        <div className="text-center text-corporate-textTertiary">
          <div className="text-lg mb-2 text-corporate-textSecondary">
            No entities to display
          </div>
          <div className="text-sm">
            Add entities in settings to see the relationship graph
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black/40 backdrop-blur-md rounded-xl border-2 border-corporate-borderPrimary/40 overflow-hidden">
      {/* Header with title and live indicator */}
      <div className="px-4 py-3 bg-black/30 backdrop-blur border-b border-corporate-borderPrimary">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-corporate-textPrimary">
              Entity Relationship Graph
            </h3>
            <div className="text-xs text-corporate-textTertiary mt-1">
              {entities.length} {entities.length === 1 ? 'entity' : 'entities'}{' '}
              • {relationships.length}{' '}
              {relationships.length === 1 ? 'relationship' : 'relationships'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-corporate-success animate-pulse" />
            <span className="text-xs text-corporate-success">Live</span>
          </div>
        </div>
      </div>

      {/* Network visualization container */}
      <div
        ref={containerRef}
        className="h-96 bg-black"
        data-testid="relationship-graph"
        aria-label="Entity relationship graph visualization"
      />

      {/* Legend footer */}
      <div className="px-4 py-2 bg-black/30 backdrop-blur border-t border-corporate-borderPrimary">
        <div className="flex items-center gap-4 text-xs text-corporate-textTertiary">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-corporate-accentPrimary" />
            <span>Entity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-corporate-textTertiary" />
            <span>Relationship</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveRelationshipGraph;
