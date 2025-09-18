import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  NetworkNode,
  NetworkEdge,
  NetworkGraphData,
  NetworkGraphOptions,
  VisualizationTheme,
  VisualizationEvent,
  ExportOptions,
  VisualizationError
} from '../types/visualization';

// Props interface
interface NetworkGraphProps {
  data: NetworkGraphData;
  options?: NetworkGraphOptions;
  theme?: VisualizationTheme;
  width?: string | number;
  height?: string | number;
  className?: string;
  enablePhysics?: boolean;
  enableInteraction?: boolean;
  enableManipulation?: boolean;
  selectedNodes?: string[];
  selectedEdges?: string[];
  highlightedNodes?: string[];
  highlightedEdges?: string[];
  loading?: boolean;
  error?: VisualizationError | null;
  onNodeClick?: (event: VisualizationEvent) => void;
  onNodeDoubleClick?: (event: VisualizationEvent) => void;
  onNodeHover?: (event: VisualizationEvent) => void;
  onEdgeClick?: (event: VisualizationEvent) => void;
  onSelectionChange?: (selection: { nodes: string[]; edges: string[] }) => void;
  onStabilizationProgress?: (progress: { iterations: number; total: number }) => void;
  onStabilized?: () => void;
  onError?: (error: VisualizationError) => void;
  onExport?: (options: ExportOptions) => Promise<void>;
}

// Network statistics interface
interface NetworkStatistics {
  nodes: {
    total: number;
    byGroup: Record<string, number>;
    isolated: number;
    connected: number;
  };
  edges: {
    total: number;
    bidirectional: number;
    selfLoops: number;
  };
  connectivity: {
    avgDegree: number;
    maxDegree: number;
    density: number;
    components: number;
  };
}

// Layout algorithms
const layoutAlgorithms = {
  hierarchical: {
    enabled: true,
    levelSeparation: 150,
    nodeSpacing: 100,
    treeSpacing: 200,
    blockShifting: true,
    edgeMinimization: true,
    parentCentralization: true,
    direction: 'UD' as const,
    sortMethod: 'hubsize' as const
  },
  force: {
    enabled: true,
    stabilization: { iterations: 1000 },
    barnesHut: {
      gravitationalConstant: -2000,
      centralGravity: 0.3,
      springLength: 95,
      springConstant: 0.04,
      damping: 0.09
    }
  }
};

// Network controls component
const NetworkControls: React.FC<{
  onFitToView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetLayout: () => void;
  onTogglePhysics: () => void;
  onExport?: () => void;
  physicsEnabled: boolean;
  isStabilizing: boolean;
}> = ({
  onFitToView,
  onZoomIn,
  onZoomOut,
  onResetLayout,
  onTogglePhysics,
  onExport,
  physicsEnabled,
  isStabilizing
}) => (
  <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md border p-2 space-y-1">
    <button
      onClick={onFitToView}
      title="Fit to View"
      className="w-full p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
    >
      🔍
    </button>
    <button
      onClick={onZoomIn}
      title="Zoom In"
      className="w-full p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
    >
      ➕
    </button>
    <button
      onClick={onZoomOut}
      title="Zoom Out"
      className="w-full p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
    >
      ➖
    </button>
    <button
      onClick={onResetLayout}
      title="Reset Layout"
      className="w-full p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
    >
      🔄
    </button>
    <button
      onClick={onTogglePhysics}
      title={physicsEnabled ? 'Disable Physics' : 'Enable Physics'}
      className={`w-full p-2 rounded transition-colors flex items-center justify-center ${
        physicsEnabled
          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
      }`}
      disabled={isStabilizing}
    >
      ⚡
    </button>
    {onExport && (
      <button
        onClick={onExport}
        title="Export"
        className="w-full p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
      >
        📊
      </button>
    )}
  </div>
);

// Network statistics panel
const NetworkStatsPanel: React.FC<{
  statistics: NetworkStatistics;
  isVisible: boolean;
  onToggle: () => void;
}> = ({ statistics, isVisible, onToggle }) => (
  <div className="absolute bottom-4 left-4">
    <button
      onClick={onToggle}
      className="bg-white rounded-lg shadow-md border p-2 text-gray-600 hover:text-gray-800 transition-colors"
      title="Toggle Statistics"
    >
      📊
    </button>

    {isVisible && (
      <div className="bg-white rounded-lg shadow-md border p-4 mt-2 min-w-64">
        <h3 className="font-semibold text-gray-900 mb-3">Network Statistics</h3>

        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Nodes</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">{statistics.nodes.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Connected:</span>
                <span className="font-medium">{statistics.nodes.connected}</span>
              </div>
              <div className="flex justify-between">
                <span>Isolated:</span>
                <span className="font-medium">{statistics.nodes.isolated}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-1">Edges</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">{statistics.edges.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Bidirectional:</span>
                <span className="font-medium">{statistics.edges.bidirectional}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-1">Connectivity</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Avg Degree:</span>
                <span className="font-medium">{statistics.connectivity.avgDegree.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Degree:</span>
                <span className="font-medium">{statistics.connectivity.maxDegree}</span>
              </div>
              <div className="flex justify-between">
                <span>Density:</span>
                <span className="font-medium">{(statistics.connectivity.density * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {Object.keys(statistics.nodes.byGroup).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Groups</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {Object.entries(statistics.nodes.byGroup).map(([group, count]) => (
                  <div key={group} className="flex justify-between">
                    <span className="capitalize">{group}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

// Loading overlay
const LoadingOverlay: React.FC<{ progress?: { iterations: number; total: number } }> = ({ progress }) => (
  <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <div className="text-gray-700 mb-2">
        {progress ? 'Stabilizing Network...' : 'Loading Network...'}
      </div>
      {progress && (
        <div className="text-sm text-gray-500">
          {progress.iterations} / {progress.total} iterations
        </div>
      )}
    </div>
  </div>
);

// Mock implementation for vis-network (would be replaced with actual vis-network)
const MockNetwork = {
  fit: () => {},
  getScale: () => 1,
  moveTo: () => {},
  on: () => {},
  off: () => {},
  setData: () => {},
  setOptions: () => {},
  destroy: () => {},
  stabilize: () => {},
  stopSimulation: () => {},
  startSimulation: () => {},
  getSelectedNodes: () => [],
  getSelectedEdges: () => [],
  selectNodes: () => {},
  selectEdges: () => {},
  unselectAll: () => {},
  canvasToDOM: (position: any) => position,
  DOMtoCanvas: (position: any) => position
};

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  options = {},
  theme,
  width = '100%',
  height = '500px',
  className = '',
  enablePhysics = true,
  enableInteraction = true,
  enableManipulation = false,
  selectedNodes = [],
  selectedEdges = [],
  highlightedNodes = [],
  highlightedEdges = [],
  loading = false,
  error = null,
  onNodeClick,
  onNodeDoubleClick,
  onNodeHover,
  onEdgeClick,
  onSelectionChange,
  onStabilizationProgress,
  onStabilized,
  onError,
  onExport
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  // State
  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(enablePhysics);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [stabilizationProgress, setStabilizationProgress] = useState<{ iterations: number; total: number } | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [networkInstance, setNetworkInstance] = useState<any>(null);

  // Calculate network statistics
  const statistics = useMemo((): NetworkStatistics => {
    const nodeGroups = data.nodes.reduce((acc, node) => {
      const group = node.group || 'default';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const degrees = new Map<string, number>();
    data.edges.forEach(edge => {
      degrees.set(edge.from, (degrees.get(edge.from) || 0) + 1);
      degrees.set(edge.to, (degrees.get(edge.to) || 0) + 1);
    });

    const connectedNodes = new Set<string>();
    data.edges.forEach(edge => {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    });

    const totalDegree = Array.from(degrees.values()).reduce((sum, degree) => sum + degree, 0);
    const maxDegree = Math.max(...Array.from(degrees.values()), 0);
    const avgDegree = data.nodes.length > 0 ? totalDegree / data.nodes.length : 0;

    const maxPossibleEdges = data.nodes.length * (data.nodes.length - 1) / 2;
    const density = maxPossibleEdges > 0 ? data.edges.length / maxPossibleEdges : 0;

    const bidirectionalEdges = data.edges.filter(edge =>
      data.edges.some(other => other.from === edge.to && other.to === edge.from)
    ).length / 2;

    const selfLoops = data.edges.filter(edge => edge.from === edge.to).length;

    return {
      nodes: {
        total: data.nodes.length,
        byGroup: nodeGroups,
        isolated: data.nodes.length - connectedNodes.size,
        connected: connectedNodes.size
      },
      edges: {
        total: data.edges.length,
        bidirectional: Math.floor(bidirectionalEdges),
        selfLoops
      },
      connectivity: {
        avgDegree,
        maxDegree,
        density,
        components: 1 // Simplified - would need graph traversal for actual count
      }
    };
  }, [data]);

  // Apply theme to network data
  const themedData = useMemo(() => {
    if (!theme) return data;

    const themedNodes = data.nodes.map(node => ({
      ...node,
      color: node.color || (node.group && theme.colors.primary[
        Object.keys(data.groups || {}).indexOf(node.group) % theme.colors.primary.length
      ]) || theme.colors.primary[0],
      font: {
        color: theme.text.primary,
        ...node.font
      }
    }));

    const themedEdges = data.edges.map(edge => ({
      ...edge,
      color: typeof edge.color === 'string'
        ? edge.color
        : {
            color: theme.colors.neutral[2],
            highlight: theme.colors.primary[0],
            hover: theme.colors.primary[1],
            ...edge.color
          },
      font: {
        color: theme.text.secondary,
        ...edge.font
      }
    }));

    return {
      ...data,
      nodes: themedNodes,
      edges: themedEdges
    };
  }, [data, theme]);

  // Network options with theme
  const networkOptions = useMemo(() => {
    const defaultOptions: NetworkGraphOptions = {
      width: typeof width === 'string' ? width : `${width}px`,
      height: typeof height === 'string' ? height : `${height}px`,
      physics: {
        enabled: isPhysicsEnabled,
        stabilization: {
          enabled: true,
          iterations: 1000
        },
        barnesHut: layoutAlgorithms.force.barnesHut
      },
      layout: {
        randomSeed: 42,
        improvedLayout: true,
        hierarchical: options.layout?.hierarchical || layoutAlgorithms.hierarchical
      },
      interaction: {
        dragNodes: enableInteraction,
        dragView: enableInteraction,
        hideEdgesOnDrag: true,
        hideNodesOnDrag: false,
        hover: true,
        hoverConnectedEdges: true,
        multiselect: true,
        navigationButtons: false,
        selectable: true,
        selectConnectedEdges: true,
        tooltipDelay: 300,
        zoomView: enableInteraction
      },
      manipulation: {
        enabled: enableManipulation
      }
    };

    return {
      ...defaultOptions,
      ...options
    };
  }, [width, height, isPhysicsEnabled, enableInteraction, enableManipulation, options]);

  // Initialize network
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // In a real implementation, this would use vis-network:
      // import { Network } from 'vis-network';
      // const network = new Network(containerRef.current, themedData, networkOptions);

      // Mock implementation for now
      const network = MockNetwork;
      networkRef.current = network;
      setNetworkInstance(network);

      // Set up event listeners
      if (enableInteraction) {
        // Mock event setup - in real implementation would be:
        // network.on('click', handleNetworkClick);
        // network.on('doubleClick', handleNetworkDoubleClick);
        // etc.
      }

      if (onStabilizationProgress) {
        // Mock stabilization progress
        setIsStabilizing(true);
        let iterations = 0;
        const total = 100;

        const progressInterval = setInterval(() => {
          iterations += Math.random() * 10;
          setStabilizationProgress({ iterations: Math.floor(iterations), total });
          onStabilizationProgress({ iterations: Math.floor(iterations), total });

          if (iterations >= total) {
            clearInterval(progressInterval);
            setIsStabilizing(false);
            setStabilizationProgress(null);
            onStabilized?.();
          }
        }, 100);

        return () => clearInterval(progressInterval);
      }

    } catch (error) {
      const vizError: VisualizationError = {
        type: 'render',
        message: 'Failed to initialize network graph',
        details: error,
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: [
          'Check if vis-network is properly installed',
          'Verify data format is correct',
          'Try refreshing the component'
        ]
      };
      onError?.(vizError);
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [themedData, networkOptions, enableInteraction, onStabilizationProgress, onStabilized, onError]);

  // Handle selection changes
  useEffect(() => {
    if (!networkInstance) return;

    // Mock selection - in real implementation would be:
    // networkInstance.selectNodes(selectedNodes);
    // networkInstance.selectEdges(selectedEdges);
  }, [networkInstance, selectedNodes, selectedEdges]);

  // Control handlers
  const handleFitToView = useCallback(() => {
    networkRef.current?.fit();
  }, []);

  const handleZoomIn = useCallback(() => {
    const scale = networkRef.current?.getScale() || 1;
    networkRef.current?.moveTo({ scale: scale * 1.2 });
  }, []);

  const handleZoomOut = useCallback(() => {
    const scale = networkRef.current?.getScale() || 1;
    networkRef.current?.moveTo({ scale: scale * 0.8 });
  }, []);

  const handleResetLayout = useCallback(() => {
    networkRef.current?.stabilize();
  }, []);

  const handleTogglePhysics = useCallback(() => {
    setIsPhysicsEnabled(prev => {
      const newState = !prev;
      if (networkRef.current) {
        // Mock physics toggle - in real implementation:
        // networkRef.current.setOptions({ physics: { enabled: newState } });
        if (newState) {
          networkRef.current.startSimulation();
        } else {
          networkRef.current.stopSimulation();
        }
      }
      return newState;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (!onExport || !containerRef.current) return;

    try {
      const exportOptions: ExportOptions = {
        format: 'png',
        quality: 1,
        dimensions: {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        },
        backgroundColor: theme?.background.surface || '#ffffff',
        title: 'Network Graph'
      };

      await onExport(exportOptions);
    } catch (error) {
      const vizError: VisualizationError = {
        type: 'render',
        message: 'Failed to export network graph',
        details: error,
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Try again', 'Check if network is fully loaded']
      };

      onError?.(vizError);
    }
  }, [onExport, theme, onError]);

  // Render error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Network Graph Error</h3>
          <p className="text-red-700 mb-4">{error.message}</p>
          {error.recoverable && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border relative ${className}`}>
      {/* Network Container */}
      <div
        ref={containerRef}
        style={{
          width: typeof width === 'string' ? width : `${width}px`,
          height: typeof height === 'string' ? height : `${height}px`
        }}
        className="rounded-lg overflow-hidden"
      >
        {/* Mock network visualization */}
        <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
          <div className="text-center">
            <div className="text-4xl mb-4">🕸️</div>
            <p className="text-gray-600 mb-2">Network Graph</p>
            <div className="text-sm text-gray-500">
              {data.nodes.length} nodes • {data.edges.length} edges
            </div>
          </div>

          {/* Sample network nodes visualization */}
          <div className="absolute inset-0 pointer-events-none">
            {data.nodes.slice(0, 10).map((node, index) => (
              <div
                key={node.id}
                className="absolute w-4 h-4 bg-blue-500 rounded-full"
                style={{
                  left: `${20 + (index % 5) * 15}%`,
                  top: `${20 + Math.floor(index / 5) * 20}%`,
                  backgroundColor: node.color || '#3B82F6'
                }}
                title={node.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {(loading || isStabilizing) && (
        <LoadingOverlay progress={stabilizationProgress} />
      )}

      {/* Controls */}
      <NetworkControls
        onFitToView={handleFitToView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetLayout={handleResetLayout}
        onTogglePhysics={handleTogglePhysics}
        onExport={onExport ? handleExport : undefined}
        physicsEnabled={isPhysicsEnabled}
        isStabilizing={isStabilizing}
      />

      {/* Statistics Panel */}
      <NetworkStatsPanel
        statistics={statistics}
        isVisible={showStatistics}
        onToggle={() => setShowStatistics(!showStatistics)}
      />

      {/* Legend */}
      {data.groups && Object.keys(data.groups).length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md border p-3">
          <h4 className="font-medium text-gray-900 mb-2">Legend</h4>
          <div className="space-y-2">
            {Object.entries(data.groups).map(([groupId, group]) => (
              <div key={groupId} className="flex items-center space-x-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-gray-700 capitalize">{groupId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;