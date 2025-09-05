import React, { useCallback, useMemo } from 'react';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { InteractiveGraphProps, GraphNodeData, GraphEdgeData, GraphInteraction } from '../../../../types/AutonomousDisplayTypes';

export const InteractiveInvestigationGraph: React.FC<InteractiveGraphProps> = ({
  investigationFlow,
  onGraphInteraction,
  layout = 'standard',
  showProgress = true,
  className = ''
}) => {
  const { nodes, edges, currentPhase, progress = 0 } = investigationFlow;

  // Create a map for quick node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNodeData>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Handle graph interactions
  const handleGraphInteraction = useCallback((interaction: GraphInteraction) => {
    if (onGraphInteraction) {
      onGraphInteraction(interaction);
    }
  }, [onGraphInteraction]);

  // Handle node interactions
  const handleNodeClick = useCallback((nodeId: string, nodeData: GraphNodeData) => {
    handleGraphInteraction({
      type: 'node_click',
      nodeId,
      data: nodeData
    });
  }, [handleGraphInteraction]);

  const handleNodeHover = useCallback((nodeId: string, nodeData: GraphNodeData) => {
    handleGraphInteraction({
      type: 'node_hover',
      nodeId,
      data: nodeData
    });
  }, [handleGraphInteraction]);

  // Handle edge interactions
  const handleEdgeClick = useCallback((edgeId: string, edgeData: GraphEdgeData) => {
    handleGraphInteraction({
      type: 'edge_click',
      edgeId,
      data: edgeData
    });
  }, [handleGraphInteraction]);

  // Calculate layout spacing based on layout type
  const layoutConfig = useMemo(() => {
    switch (layout) {
      case 'compact':
        return { nodeSize: 'small', spacing: 0.8 };
      case 'expanded':
        return { nodeSize: 'large', spacing: 1.2 };
      default:
        return { nodeSize: 'medium', spacing: 1.0 };
    }
  }, [layout]);

  // Calculate progress visualization
  const progressNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      progress: node.status === 'completed' ? 100 : 
                node.status === 'active' ? 50 : 0
    }));
  }, [nodes]);

  return (
    <div 
      className={`interactive-graph-container relative w-full h-full rounded-xl overflow-hidden ${className}`}
      style={{
        background: 'radial-gradient(circle at 30% 70%, rgba(26, 29, 35, 1) 0%, rgba(10, 11, 13, 1) 100%)'
      }}
    >
      {/* Background pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20px 20px, rgba(255, 107, 53, 0.2) 2px, transparent 2px),
            radial-gradient(circle at 60px 60px, rgba(255, 107, 53, 0.1) 2px, transparent 2px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Graph edges (rendered behind nodes) */}
      <div className="absolute inset-0">
        {edges.map(edge => {
          const fromNode = nodeMap.get(edge.fromNodeId);
          const toNode = nodeMap.get(edge.toNodeId);
          
          if (!fromNode || !toNode) return null;
          
          return (
            <GraphEdge
              key={edge.id}
              edge={edge}
              fromNode={fromNode}
              toNode={toNode}
              onClick={handleEdgeClick}
              className={`layout-${layout}`}
            />
          );
        })}
      </div>

      {/* Graph nodes */}
      <div className="absolute inset-0">
        {progressNodes.map(node => (
          <GraphNode
            key={node.id}
            node={node}
            onClick={handleNodeClick}
            onHover={handleNodeHover}
            className={`layout-${layout} size-${layoutConfig.nodeSize}`}
          />
        ))}
      </div>

      {/* Progress indicator */}
      {showProgress && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded-lg p-3">
          <div className="text-orange-400 text-sm font-bold mb-2">Investigation Progress</div>
          <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 to-purple-400 transition-all duration-1000 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {Math.round(progress * 100)}% Complete
          </div>
          {currentPhase && (
            <div className="text-xs text-orange-300 mt-1">
              Current: {currentPhase.replace('_', ' ').toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Graph statistics */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 rounded-lg p-3 text-xs font-mono">
        <div className="text-orange-400 mb-1">GRAPH STATUS</div>
        <div className="space-y-1 text-gray-300">
          <div>Nodes: {nodes.length}</div>
          <div>Edges: {edges.length}</div>
          <div>Active: {nodes.filter(n => n.status === 'active').length}</div>
          <div>Completed: {nodes.filter(n => n.status === 'completed').length}</div>
          <div>Layout: {layout.toUpperCase()}</div>
        </div>
      </div>

      {/* Flow direction indicator */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-full px-3 py-1">
        <div className="flex items-center space-x-2">
          <i className="fas fa-arrow-right text-orange-400 animate-pulse"></i>
          <span className="text-orange-400 text-xs font-mono">FLOW</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 text-xs">
        <div className="text-orange-400 mb-2 font-bold">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-500/30"></div>
            <span className="text-gray-300">Start/Control</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-green-400 bg-green-500/30"></div>
            <span className="text-gray-300">Active Agent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-purple-400 bg-purple-500/30"></div>
            <span className="text-gray-300">Decision Point</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-red-400 bg-red-500/30"></div>
            <span className="text-gray-300">Risk Assessment</span>
          </div>
        </div>
      </div>

      {/* Interactive instructions */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="text-center text-gray-500 text-sm opacity-30 font-mono">
          <i className="fas fa-mouse-pointer mb-2 text-lg"></i>
          <div>Click nodes and edges</div>
          <div>for detailed information</div>
        </div>
      </div>
    </div>
  );
};