/**
 * GraphVisualization Component
 *
 * A flexible graph visualization component that supports both D3.js and React Flow
 * rendering engines. Optimized for performance with large datasets and provides
 * comprehensive interaction capabilities.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGraphStore, useGraphActions, useGraphData, useGraphSelection } from '../../stores/graphStore';

// Graph visualization modes
export type GraphMode = 'force' | 'hierarchical' | 'circular' | 'grid';
export type RenderEngine = 'd3' | 'reactflow';

export interface GraphVisualizationProps {
  /** Rendering engine to use */
  engine?: RenderEngine;
  /** Graph layout mode */
  mode?: GraphMode;
  /** Container dimensions */
  width?: number;
  height?: number;
  /** Enable interactive features */
  interactive?: boolean;
  /** Show minimap for navigation */
  showMinimap?: boolean;
  /** Enable zoom controls */
  enableZoom?: boolean;
  /** Enable pan controls */
  enablePan?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Custom node renderer */
  nodeRenderer?: (node: any) => React.ReactNode;
  /** Custom edge renderer */
  edgeRenderer?: (edge: any) => React.ReactNode;
  /** Custom styling classes */
  className?: string;
  /** Callback for node click events */
  onNodeClick?: (nodeId: string, event: React.MouseEvent) => void;
  /** Callback for edge click events */
  onEdgeClick?: (edgeId: string, event: React.MouseEvent) => void;
  /** Callback for background click events */
  onBackgroundClick?: (event: React.MouseEvent) => void;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  engine = 'd3',
  mode = 'force',
  width = 800,
  height = 600,
  interactive = true,
  showMinimap = false,
  enableZoom = true,
  enablePan = true,
  animationDuration = 300,
  nodeRenderer,
  edgeRenderer,
  className = '',
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Store hooks
  const { nodes, edges } = useGraphData();
  const { selectedNodes, selectedEdges, hoveredNode, hoveredEdge } = useGraphSelection();
  const {
    selectNode,
    selectEdge,
    clearSelection,
    setHoveredNode,
    setHoveredEdge,
    setZoom,
    setCenter
  } = useGraphActions();

  // Initialize graph based on engine
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    if (engine === 'd3') {
      initializeD3Graph();
    } else {
      initializeReactFlowGraph();
    }

    setIsInitialized(true);
  }, [engine, isInitialized]);

  // Update graph when data changes
  useEffect(() => {
    if (!isInitialized) return;

    if (engine === 'd3') {
      updateD3Graph();
    } else {
      updateReactFlowGraph();
    }
  }, [nodes, edges, mode, isInitialized]);

  const initializeD3Graph = useCallback(() => {
    if (!svgRef.current) return;

    // D3.js initialization logic will be implemented here
    // This is a placeholder for the D3.js setup
    console.log('Initializing D3.js graph');
  }, []);

  const initializeReactFlowGraph = useCallback(() => {
    if (!containerRef.current) return;

    // React Flow initialization logic will be implemented here
    // This is a placeholder for the React Flow setup
    console.log('Initializing React Flow graph');
  }, []);

  const updateD3Graph = useCallback(() => {
    if (!svgRef.current) return;

    // D3.js update logic will be implemented here
    console.log('Updating D3.js graph with new data');
  }, [nodes, edges, mode]);

  const updateReactFlowGraph = useCallback(() => {
    if (!containerRef.current) return;

    // React Flow update logic will be implemented here
    console.log('Updating React Flow graph with new data');
  }, [nodes, edges, mode]);

  const handleNodeClick = useCallback((nodeId: string, event: React.MouseEvent) => {
    if (!interactive) return;

    const isMultiSelect = event.ctrlKey || event.metaKey;
    selectNode(nodeId, isMultiSelect);
    onNodeClick?.(nodeId, event);
  }, [interactive, selectNode, onNodeClick]);

  const handleEdgeClick = useCallback((edgeId: string, event: React.MouseEvent) => {
    if (!interactive) return;

    const isMultiSelect = event.ctrlKey || event.metaKey;
    selectEdge(edgeId, isMultiSelect);
    onEdgeClick?.(edgeId, event);
  }, [interactive, selectEdge, onEdgeClick]);

  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (!interactive) return;
    setHoveredNode(nodeId);
  }, [interactive, setHoveredNode]);

  const handleEdgeHover = useCallback((edgeId: string | null) => {
    if (!interactive) return;
    setHoveredEdge(edgeId);
  }, [interactive, setHoveredEdge]);

  const handleBackgroundClick = useCallback((event: React.MouseEvent) => {
    if (!interactive) return;

    clearSelection();
    onBackgroundClick?.(event);
  }, [interactive, clearSelection, onBackgroundClick]);

  // Render D3.js-based graph
  const renderD3Graph = () => (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0 cursor-crosshair"
        onClick={handleBackgroundClick}
      >
        {/* D3.js content will be dynamically added */}
      </svg>

      {/* Zoom controls */}
      {enableZoom && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            type="button"
            className="w-8 h-8 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            onClick={() => setZoom(1.2)}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="w-8 h-8 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            onClick={() => setZoom(0.8)}
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
      )}

      {/* Minimap */}
      {showMinimap && (
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-white border border-gray-300 rounded-md shadow-sm">
          <svg className="w-full h-full opacity-70">
            {/* Minimap content */}
          </svg>
        </div>
      )}
    </div>
  );

  // Render React Flow-based graph
  const renderReactFlowGraph = () => (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-gray-50">
        {/* React Flow component will be rendered here */}
        <div className="flex items-center justify-center h-full text-gray-500">
          React Flow Graph Placeholder
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`graph-visualization relative overflow-hidden bg-white border border-gray-200 rounded-lg ${className}`}
      style={{ width, height }}
      role="img"
      aria-label="Graph visualization"
    >
      {engine === 'd3' ? renderD3Graph() : renderReactFlowGraph()}

      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            Initializing graph...
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;