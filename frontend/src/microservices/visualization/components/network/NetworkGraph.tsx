import React, { useRef, useEffect, useState } from 'react';
import { Network } from 'vis-network';
import { useVisNetwork } from '../../hooks/useVisNetwork';
import { useEventBus } from '../../hooks/useEventBus';
import { eventBus } from '@/shared/events/EventBus';
import { getEntityColor, getRiskColor } from '../../utils/colorPalettes';
import { NetworkControls } from './NetworkControls';
import { NetworkStats } from './NetworkStats';
import type { NetworkNode, NetworkEdge, EntityDiscoveredEvent } from '../../types/events.types';

interface NetworkGraphProps {
  investigationId: string;
  className?: string;
}

export function NetworkGraph({ investigationId, className = '' }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  // Initialize vis-network
  const { network, loading, error, fit, zoomIn, zoomOut, togglePhysics } = useVisNetwork({
    container: containerRef.current,
    nodes,
    edges,
    onNodeClick: handleNodeClick,
    onEdgeClick: handleEdgeClick
  });

  const [physicsEnabled, setPhysicsEnabled] = useState(true);

  function handleTogglePhysics() {
    togglePhysics();
    setPhysicsEnabled(prev => !prev);
  }

  // Subscribe to entity-discovered events
  useEventBus<EntityDiscoveredEvent>('investigation:entity-discovered', (event) => {
    if (event.investigationId === investigationId) {
      addNode(event.entity);
    }
  });

  function addNode(entity: any) {
    const newNode: NetworkNode = {
      id: entity.id,
      label: entity.name || entity.id,
      type: entity.type,
      riskScore: entity.riskScore || 0,
      color: getNodeColor(entity),
      metadata: entity
    };

    setNodes(prev => {
      // Check if node already exists
      if (prev.some(n => n.id === newNode.id)) {
        return prev;
      }
      return [...prev, newNode];
    });

    // Add edge if parent entity exists
    if (entity.parentId) {
      const newEdge: NetworkEdge = {
        id: `${entity.parentId}-${entity.id}`,
        from: entity.parentId,
        to: entity.id,
        type: entity.relationshipType || 'connected'
      };

      setEdges(prev => {
        if (prev.some(e => e.id === newEdge.id)) {
          return prev;
        }
        return [...prev, newEdge];
      });
    }
  }

  function getNodeColor(entity: any): string {
    // Color by risk score if available
    if (entity.riskScore !== undefined) {
      return getRiskColor(entity.riskScore);
    }

    // Otherwise color by entity type
    return getEntityColor(entity.type);
  }

  function handleNodeClick(nodeId: string) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);

      // Publish event
      eventBus.publish('visualization:node-selected', {
        nodeId,
        node,
        investigationId
      });
    }
  }

  function handleEdgeClick(edgeId: string) {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      // Publish event
      eventBus.publish('visualization:edge-selected', {
        edgeId,
        edge,
        investigationId
      });
    }
  }

  if (loading) {
    return (
      <div className={`network-graph-loading ${className}`}>
        <div className="animate-pulse text-center">
          <div className="text-lg text-gray-400">Initializing network graph...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`network-graph-error ${className}`}>
        <div className="text-center text-red-400">
          <div className="text-lg font-semibold mb-2">Failed to initialize network</div>
          <div className="text-sm">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`network-graph-container relative ${className}`}>
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-900 rounded-lg"
        style={{ minHeight: '400px' }}
      />

      {/* Network Controls Overlay */}
      <div className="absolute top-4 right-4">
        <NetworkControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fit}
          onTogglePhysics={handleTogglePhysics}
          physicsEnabled={physicsEnabled}
        />
      </div>

      {/* Network Statistics Overlay */}
      <div className="absolute top-4 left-4">
        <NetworkStats nodes={nodes} edges={edges} />
      </div>

      {/* Selected Node Info Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-sm">
          <div className="text-sm font-semibold text-gray-200 mb-2">
            Selected Node
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">ID:</span>
              <span className="text-gray-200 font-mono">{selectedNode.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-gray-200">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Score:</span>
              <span className="text-gray-200">{selectedNode.riskScore}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
