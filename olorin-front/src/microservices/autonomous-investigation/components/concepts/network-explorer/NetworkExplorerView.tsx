/**
 * Network Explorer Concept View
 *
 * Graph-first interface designed for site reliability engineers and system administrators.
 * Features advanced network analysis with interactive topology exploration.
 *
 * Target Users: Site reliability engineers, system administrators
 * Visual Metaphor: Network topology explorer
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Network,
  Search,
  Filter,
  Maximize,
  GitBranch,
  Cpu,
  Database,
  Globe,
  Server,
  Settings,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Target,
  MapPin,
  Shuffle,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Wifi,
  HardDrive,
  Monitor
} from 'lucide-react';

// Shared components
import { GraphVisualization } from '../../shared/GraphVisualization';
import { StatusBadge } from '../../shared/StatusBadge';
import { LoadingSpinner } from '../../shared/LoadingSpinner';
import { ErrorAlert } from '../../shared/ErrorAlert';

// Hooks and stores
import { useInvestigationQueries } from '../../../hooks/useInvestigationQueries';
import { useConceptStore } from '../../../stores/conceptStore';
import { useGraphStore } from '../../../stores/graphStore';
import { useWebSocket } from '../../../hooks/useWebSocket';

// Types
import type { Investigation, Domain, Evidence } from '../../../types';

interface NetworkNode {
  id: string;
  label: string;
  type: 'entity' | 'evidence' | 'agent' | 'domain' | 'cluster' | 'endpoint';
  category: 'network' | 'system' | 'application' | 'data' | 'user';
  status: 'active' | 'inactive' | 'warning' | 'critical' | 'unknown';
  properties: {
    ip?: string;
    port?: number;
    protocol?: string;
    service?: string;
    confidence: number;
    weight: number;
    depth: number;
    cluster?: string;
    lastSeen: string;
    metrics?: NetworkMetrics;
  };
  position?: { x: number; y: number };
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: 'connection' | 'dependency' | 'communication' | 'correlation' | 'causation';
  weight: number;
  confidence: number;
  bidirectional: boolean;
  properties: {
    protocol?: string;
    port?: number;
    bandwidth?: number;
    latency?: number;
    packets?: number;
    lastActivity: string;
    strength: 'weak' | 'moderate' | 'strong';
  };
}

interface NetworkMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkTraffic: number;
  errorRate: number;
  responseTime: number;
  availability: number;
}

interface ClusterInfo {
  id: string;
  name: string;
  nodeCount: number;
  centralNode: string;
  cohesion: number;
  averageConfidence: number;
  type: 'service' | 'geographical' | 'functional' | 'temporal';
}

interface PathAnalysis {
  from: string;
  to: string;
  paths: Array<{
    nodes: string[];
    length: number;
    confidence: number;
    risk: 'low' | 'medium' | 'high';
  }>;
}

export const NetworkExplorerView: React.FC = () => {
  // Store hooks
  const { getActiveConfiguration } = useConceptStore();
  const { nodes, edges, selectedNodes, selectedEdges } = useGraphStore();

  // Data hooks
  const {
    investigation,
    domains,
    evidence,
    isLoading,
    error
  } = useInvestigationQueries();

  // WebSocket for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    url: 'ws://localhost:8090/ws/network-explorer',
    enabled: true
  });

  // Local state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLayout, setSelectedLayout] = useState<string>('force');
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pathAnalysis, setPathAnalysis] = useState<PathAnalysis | null>(null);
  const [showMetrics, setShowMetrics] = useState<boolean>(true);
  const [clusteringEnabled, setClusteringEnabled] = useState<boolean>(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(50);

  // Network filters state
  const [nodeTypeFilters, setNodeTypeFilters] = useState<Set<string>>(new Set(['entity', 'evidence', 'agent', 'domain']));
  const [edgeTypeFilters, setEdgeTypeFilters] = useState<Set<string>>(new Set(['connection', 'dependency', 'communication']));
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set(['active', 'warning', 'critical']));

  // Mock network data
  const [networkNodes] = useState<NetworkNode[]>([
    {
      id: 'node-001',
      label: '95.2.1.146',
      type: 'entity',
      category: 'network',
      status: 'critical',
      properties: {
        ip: '95.2.1.146',
        confidence: 0.95,
        weight: 8,
        depth: 0,
        cluster: 'suspicious-cluster',
        lastSeen: '2025-01-22T09:45:00Z',
        metrics: { cpuUsage: 75, memoryUsage: 85, networkTraffic: 2.4, errorRate: 15, responseTime: 250, availability: 87 }
      }
    },
    {
      id: 'node-002',
      label: 'Device-FP-001',
      type: 'evidence',
      category: 'system',
      status: 'warning',
      properties: {
        confidence: 0.87,
        weight: 6,
        depth: 1,
        cluster: 'device-cluster',
        lastSeen: '2025-01-22T09:42:00Z',
        metrics: { cpuUsage: 45, memoryUsage: 60, networkTraffic: 1.2, errorRate: 5, responseTime: 120, availability: 95 }
      }
    },
    {
      id: 'node-003',
      label: 'Agent-Network',
      type: 'agent',
      category: 'application',
      status: 'active',
      properties: {
        confidence: 0.98,
        weight: 4,
        depth: 2,
        cluster: 'agent-cluster',
        lastSeen: '2025-01-22T09:45:00Z',
        metrics: { cpuUsage: 25, memoryUsage: 40, networkTraffic: 0.8, errorRate: 1, responseTime: 50, availability: 99 }
      }
    }
  ]);

  const [networkEdges] = useState<NetworkEdge[]>([
    {
      id: 'edge-001',
      source: 'node-001',
      target: 'node-002',
      type: 'connection',
      weight: 0.75,
      confidence: 0.89,
      bidirectional: false,
      properties: {
        protocol: 'TCP',
        port: 443,
        bandwidth: 1.2,
        latency: 45,
        packets: 2847,
        lastActivity: '2025-01-22T09:44:00Z',
        strength: 'strong'
      }
    },
    {
      id: 'edge-002',
      source: 'node-002',
      target: 'node-003',
      type: 'dependency',
      weight: 0.65,
      confidence: 0.92,
      bidirectional: true,
      properties: {
        protocol: 'HTTP',
        port: 8080,
        bandwidth: 0.8,
        latency: 25,
        packets: 1523,
        lastActivity: '2025-01-22T09:43:00Z',
        strength: 'moderate'
      }
    }
  ]);

  const [clusters] = useState<ClusterInfo[]>([
    {
      id: 'suspicious-cluster',
      name: 'Suspicious Activity Cluster',
      nodeCount: 5,
      centralNode: 'node-001',
      cohesion: 0.78,
      averageConfidence: 0.84,
      type: 'functional'
    },
    {
      id: 'device-cluster',
      name: 'Device Evidence Cluster',
      nodeCount: 3,
      centralNode: 'node-002',
      cohesion: 0.65,
      averageConfidence: 0.91,
      type: 'service'
    }
  ]);

  // Get concept configuration
  const config = getActiveConfiguration();

  // Calculate network statistics
  const networkStats = {
    totalNodes: networkNodes.length,
    visibleNodes: networkNodes.filter(n => nodeTypeFilters.has(n.type) && statusFilters.has(n.status)).length,
    totalEdges: networkEdges.length,
    clusters: clusters.length,
    averageConfidence: networkNodes.reduce((sum, n) => sum + n.properties.confidence, 0) / networkNodes.length,
    criticalNodes: networkNodes.filter(n => n.status === 'critical').length,
    activeConnections: networkEdges.filter(e => e.properties.lastActivity && new Date(e.properties.lastActivity) > new Date(Date.now() - 5 * 60 * 1000)).length
  };

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback((layout: string) => {
    setSelectedLayout(layout);
  }, []);

  // Handle node type filter toggle
  const handleNodeTypeFilter = useCallback((type: string) => {
    setNodeTypeFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  }, []);

  // Handle path analysis
  const handlePathAnalysis = useCallback((fromNode: string, toNode: string) => {
    // Mock path analysis - in real implementation would call graph algorithm
    setPathAnalysis({
      from: fromNode,
      to: toNode,
      paths: [
        {
          nodes: [fromNode, 'intermediate-node', toNode],
          length: 2,
          confidence: 0.87,
          risk: 'medium'
        }
      ]
    });
  }, []);

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          title="Network Explorer Error"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Network Explorer Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Network className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Network Topology Explorer
              </h1>
              <p className="text-gray-600">
                {investigation?.entity?.value || 'No investigation selected'} •
                Graph Status: {isConnected ? 'Connected' : 'Disconnected'} •
                {networkStats.visibleNodes} nodes, {networkStats.totalEdges} edges
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search nodes, IPs, services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
              />
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`px-3 py-2 text-sm rounded-md flex items-center space-x-2 ${
                showMetrics ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Metrics</span>
            </button>

            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className={`px-3 py-2 text-sm rounded-md flex items-center space-x-2 ${
                showMinimap ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span>Minimap</span>
            </button>

            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
              <Maximize className="h-4 w-4" />
              <span>Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Network KPIs */}
        <div className="mt-4 grid grid-cols-6 gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Total Nodes:</span>
            <span className="font-medium">{networkStats.totalNodes}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Visible:</span>
            <span className="font-medium">{networkStats.visibleNodes}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Clusters:</span>
            <span className="font-medium">{networkStats.clusters}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Critical:</span>
            <span className="font-medium text-red-600">{networkStats.criticalNodes}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Avg Confidence:</span>
            <span className="font-medium">{(networkStats.averageConfidence * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Active Connections:</span>
            <span className={`font-medium ${networkStats.activeConnections > 0 ? 'text-green-600' : 'text-gray-600'}`}>
              {networkStats.activeConnections}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Network Controls Panel */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            {/* Layout Controls */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Layers className="h-5 w-5 mr-2 text-purple-600" />
                Graph Layout
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {['force', 'hierarchical', 'circular', 'grid'].map((layout) => (
                  <button
                    key={layout}
                    onClick={() => handleLayoutChange(layout)}
                    className={`px-3 py-2 text-sm rounded-md capitalize ${
                      selectedLayout === layout
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            </div>

            {/* Node Filters */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2 text-purple-600" />
                Node Filters
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Node Types</span>
                  <div className="space-y-2">
                    {['entity', 'evidence', 'agent', 'domain'].map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={nodeTypeFilters.has(type)}
                          onChange={() => handleNodeTypeFilter(type)}
                          className="mr-2 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Confidence Threshold: {confidenceThreshold}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cluster Analysis */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GitBranch className="h-5 w-5 mr-2 text-purple-600" />
                Cluster Analysis
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={clusteringEnabled}
                    onChange={(e) => setClusteringEnabled(e.target.checked)}
                    className="mr-2 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Enable Clustering</span>
                </label>

                {clusters.map((cluster) => (
                  <div key={cluster.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{cluster.name}</h4>
                      <span className="text-xs text-gray-500">{cluster.nodeCount} nodes</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <div>Cohesion: {(cluster.cohesion * 100).toFixed(1)}%</div>
                      <div>Confidence: {(cluster.averageConfidence * 100).toFixed(1)}%</div>
                      <div>Type: {cluster.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Tools */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tools</h3>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Center Graph</span>
                </button>
                <button className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
                  <Shuffle className="h-4 w-4" />
                  <span>Auto Layout</span>
                </button>
                <button
                  onClick={() => handlePathAnalysis('node-001', 'node-003')}
                  className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md flex items-center space-x-2"
                >
                  <GitBranch className="h-4 w-4" />
                  <span>Path Analysis</span>
                </button>
                <button className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset View</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Graph Visualization */}
        <main className="flex-1 flex flex-col">
          {/* Graph Toolbar */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <ZoomIn className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Zoom:</span>
                  <span className="text-sm font-medium">100%</span>
                  <ZoomOut className="h-4 w-4 text-gray-600" />
                </div>

                <div className="border-l border-gray-300 h-6" />

                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Selected:</span>
                  <span className="font-medium">{selectedNodes?.size || 0} nodes</span>
                  <span className="text-gray-600">{selectedEdges?.size || 0} edges</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded">
                  Export SVG
                </button>
                <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded">
                  Save Layout
                </button>
                <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded">
                  Share View
                </button>
              </div>
            </div>
          </div>

          {/* Network Graph */}
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner text="Loading network topology..." />
              </div>
            ) : (
              <GraphVisualization
                engine="d3"
                mode={selectedLayout as any}
                interactive={true}
                enableZoom={true}
                enablePan={true}
                showMinimap={showMinimap}
                className="h-full"
                onNodeClick={(nodeId, event) => {
                  console.log('Node clicked:', nodeId);
                  handleNodeSelect(nodeId);
                }}
                onEdgeClick={(edgeId, event) => {
                  console.log('Edge clicked:', edgeId);
                }}
              />
            )}

            {/* Network Metrics Overlay */}
            {showMetrics && selectedNode && (
              <div className="absolute top-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                <NodeMetricsPanel
                  node={networkNodes.find(n => n.id === selectedNode)}
                  onClose={() => setSelectedNode(null)}
                />
              </div>
            )}

            {/* Path Analysis Overlay */}
            {pathAnalysis && (
              <div className="absolute bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                <PathAnalysisPanel
                  analysis={pathAnalysis}
                  onClose={() => setPathAnalysis(null)}
                />
              </div>
            )}
          </div>
        </main>

        {/* Network Details Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-600" />
              Network Details
            </h3>

            {selectedNode ? (
              <SelectedNodeDetails node={networkNodes.find(n => n.id === selectedNode)} />
            ) : (
              <div className="space-y-4">
                {/* Recent Activity */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-gray-600">New connection established</span>
                      <span className="text-gray-400">2m ago</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span className="text-gray-600">High latency detected</span>
                      <span className="text-gray-400">5m ago</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-gray-600">Connection timeout</span>
                      <span className="text-gray-400">8m ago</span>
                    </div>
                  </div>
                </div>

                {/* Top Nodes */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Critical Nodes</h4>
                  <div className="space-y-2">
                    {networkNodes
                      .filter(n => n.status === 'critical')
                      .map(node => (
                        <button
                          key={node.id}
                          onClick={() => handleNodeSelect(node.id)}
                          className="w-full text-left p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{node.label}</span>
                            <StatusBadge status={node.status} text={node.status} />
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Confidence: {(node.properties.confidence * 100).toFixed(1)}%
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Edge Statistics */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Edge Statistics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Edges:</span>
                      <span className="font-medium">{networkEdges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strong Connections:</span>
                      <span className="font-medium">{networkEdges.filter(e => e.properties.strength === 'strong').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bidirectional:</span>
                      <span className="font-medium">{networkEdges.filter(e => e.bidirectional).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Latency:</span>
                      <span className="font-medium">
                        {(networkEdges.reduce((sum, e) => sum + (e.properties.latency || 0), 0) / networkEdges.length).toFixed(0)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

// Node Metrics Panel Component
interface NodeMetricsPanelProps {
  node?: NetworkNode;
  onClose: () => void;
}

const NodeMetricsPanel: React.FC<NodeMetricsPanelProps> = ({ node, onClose }) => {
  if (!node) return null;

  const metrics = node.properties.metrics;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Node Metrics: {node.label}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {metrics && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>CPU Usage</span>
              <span>{metrics.cpuUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${metrics.cpuUsage > 80 ? 'bg-red-500' : metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${metrics.cpuUsage}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Memory Usage</span>
              <span>{metrics.memoryUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${metrics.memoryUsage > 80 ? 'bg-red-500' : metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${metrics.memoryUsage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Network Traffic:</span>
              <div className="font-medium">{metrics.networkTraffic} Gbps</div>
            </div>
            <div>
              <span className="text-gray-600">Error Rate:</span>
              <div className={`font-medium ${metrics.errorRate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.errorRate}%
              </div>
            </div>
            <div>
              <span className="text-gray-600">Response Time:</span>
              <div className="font-medium">{metrics.responseTime}ms</div>
            </div>
            <div>
              <span className="text-gray-600">Availability:</span>
              <div className={`font-medium ${metrics.availability > 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                {metrics.availability}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Path Analysis Panel Component
interface PathAnalysisPanelProps {
  analysis: PathAnalysis;
  onClose: () => void;
}

const PathAnalysisPanel: React.FC<PathAnalysisPanelProps> = ({ analysis, onClose }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">
          Path Analysis: {analysis.from} → {analysis.to}
        </h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="space-y-3">
        {analysis.paths.map((path, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Path {index + 1}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600">Length: {path.length}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  path.risk === 'high' ? 'bg-red-100 text-red-800' :
                  path.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {path.risk} risk
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              <div>Nodes: {path.nodes.join(' → ')}</div>
              <div>Confidence: {(path.confidence * 100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Selected Node Details Component
interface SelectedNodeDetailsProps {
  node?: NetworkNode;
}

const SelectedNodeDetails: React.FC<SelectedNodeDetailsProps> = ({ node }) => {
  if (!node) return null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">{node.label}</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium capitalize">{node.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Category:</span>
            <span className="font-medium capitalize">{node.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <StatusBadge status={node.status} text={node.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Confidence:</span>
            <span className="font-medium">{(node.properties.confidence * 100).toFixed(1)}%</span>
          </div>
          {node.properties.ip && (
            <div className="flex justify-between">
              <span className="text-gray-600">IP Address:</span>
              <span className="font-medium">{node.properties.ip}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Last Seen:</span>
            <span className="font-medium">{new Date(node.properties.lastSeen).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {node.properties.metrics && (
        <div>
          <h5 className="font-medium text-gray-900 mb-2">Performance Metrics</h5>
          <NodeMetricsPanel node={node} onClose={() => {}} />
        </div>
      )}
    </div>
  );
};
export default NetworkExplorerView;
