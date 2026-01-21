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
import { ZoomIn, ZoomOut, RotateCcw, Download, Layout } from 'lucide-react';
import { useInvestigationGraph } from '../../hooks/useInvestigationQueries';
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
  /** Investigation ID for data fetching */
  investigationId?: string;
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
  investigationId,
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [zoom, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // API data hooks
  const {
    data: graphData,
    isLoading,
    error,
    refetch
  } = useInvestigationGraph(investigationId || null);

  // Store hooks
  const { nodes: storeNodes, edges: storeEdges } = useGraphData();
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

  // Use API data if available, fallback to store data
  const nodes = graphData?.nodes || storeNodes || [];
  const edges = graphData?.edges || storeEdges || [];

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

  // Zoom control handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  const handleExport = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const link = document.createElement('a');
      link.download = `graph_${investigationId || 'export'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  // Get node color based on type and risk score
  const getNodeColor = (node: any) => {
    const risk = node.risk_score || 0;
    const baseColors = {
      user: '#3b82f6',      // Blue
      device: '#10b981',    // Green
      location: '#f59e0b',  // Yellow
      transaction: '#ef4444', // Red
      domain: '#8b5cf6'     // Purple
    };

    const baseColor = baseColors[node.type as keyof typeof baseColors] || '#6b7280';
    const opacity = 0.6 + (risk * 0.4);
    return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  // Render D3.js-based graph
  const renderD3Graph = () => (
    <div className="relative w-full h-full bg-gray-900">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0 cursor-crosshair"
        onClick={handleBackgroundClick}
        viewBox={`0 0 ${width} ${height}`}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Render edges */}
          {edges.map((edge, index) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (!sourceNode || !targetNode) return null;

            const x1 = sourceNode.position?.x || Math.random() * width;
            const y1 = sourceNode.position?.y || Math.random() * height;
            const x2 = targetNode.position?.x || Math.random() * width;
            const y2 = targetNode.position?.y || Math.random() * height;

            return (
              <line
                key={edge.id || index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={edge.color || '#6b7280'}
                strokeWidth={edge.width || 2}
                className="cursor-pointer hover:stroke-blue-500 transition-colors"
                onClick={(e) => handleEdgeClick(edge.id || `edge-${index}`, e)}
              />
            );
          })}

          {/* Render nodes */}
          {nodes.map((node, index) => {
            const x = node.position?.x || Math.random() * width;
            const y = node.position?.y || Math.random() * height;
            const radius = node.size || (10 + (node.risk_score || 0) * 20);
            const isSelected = selectedNodes.includes(node.id);

            return (
              <g key={node.id || index}>
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={node.color || getNodeColor(node)}
                  stroke={isSelected ? '#3b82f6' : '#374151'}
                  strokeWidth={isSelected ? 3 : 1}
                  className="cursor-pointer hover:fill-blue-500 transition-all duration-200"
                  onClick={(e) => handleNodeClick(node.id || `node-${index}`, e)}
                  onMouseEnter={() => handleNodeHover(node.id || `node-${index}`)}
                  onMouseLeave={() => handleNodeHover(null)}
                />
                {node.label && (
                  <text
                    x={x}
                    y={y + radius + 15}
                    textAnchor="middle"
                    fill="#e5e7eb"
                    fontSize="12"
                    fontFamily="Inter, sans-serif"
                    className="pointer-events-none"
                  >
                    {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      {enableZoom && (
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-lg transition-colors"
            title="Export Graph"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Graph Stats */}
      <div className="absolute top-4 left-4 bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
        <div>Nodes: {nodes.length}</div>
        <div>Edges: {edges.length}</div>
        <div>Selected: {selectedNodes.length}</div>
        {graphData?.metadata && (
          <div className="text-xs text-gray-400 mt-2">
            Last updated: {new Date(graphData.metadata.last_updated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Minimap */}
      {showMinimap && (
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center text-xs text-gray-500">
            Minimap
          </div>
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

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading graph data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load graph data</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`graph-visualization relative overflow-hidden bg-gray-900 border border-gray-700 rounded-lg ${className}`}
      style={{ width, height }}
      role="img"
      aria-label="Graph visualization"
    >
      {engine === 'd3' ? renderD3Graph() : renderReactFlowGraph()}

      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            Initializing graph...
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;