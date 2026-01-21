/**
 * Graph Data Transformers
 * Utilities for converting investigation data to various graph visualization formats
 */

import { Evidence, Investigation, Domain } from '../types';

// Base graph node and edge interfaces
export interface BaseGraphNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
}

export interface BaseGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data: Record<string, unknown>;
}

// D3.js specific interfaces
export interface D3Node extends BaseGraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
  size: number;
  color: string;
  group: number;
  riskScore?: number;
  evidenceCount?: number;
}

export interface D3Edge extends BaseGraphEdge {
  weight: number;
  color: string;
  width: number;
  distance?: number;
}

// React Flow specific interfaces
export interface ReactFlowNode extends BaseGraphNode {
  position: { x: number; y: number };
  style?: React.CSSProperties;
  className?: string;
  dragHandle?: string;
  targetPosition?: 'top' | 'bottom' | 'left' | 'right';
  sourcePosition?: 'top' | 'bottom' | 'left' | 'right';
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
  resizing?: boolean;
  width?: number;
  height?: number;
}

export interface ReactFlowEdge extends BaseGraphEdge {
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  hidden?: boolean;
  selected?: boolean;
  style?: React.CSSProperties;
  className?: string;
  label?: string;
  labelStyle?: React.CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: React.CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  markerStart?: string;
  markerEnd?: string;
}

// Layout algorithm types
export type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular' | 'grid' | 'timeline';

// Layout configuration
export interface LayoutConfig {
  algorithm: LayoutAlgorithm;
  width: number;
  height: number;
  nodeSpacing: number;
  levelSpacing?: number;
  centerX?: number;
  centerY?: number;
  animate?: boolean;
}

// Color scheme for different node types
const NODE_COLORS = {
  entity: '#3B82F6',      // Blue
  evidence: '#EF4444',    // Red
  domain: '#10B981',      // Green
  connection: '#8B5CF6',  // Purple
  timestamp: '#F59E0B',   // Amber
  location: '#EC4899',    // Pink
  device: '#6B7280',      // Gray
  network: '#06B6D4',     // Cyan
  default: '#9CA3AF',     // Light gray
} as const;

// Edge colors based on relationship type
const EDGE_COLORS = {
  contains: '#10B981',
  connects_to: '#3B82F6',
  related_to: '#8B5CF6',
  temporal: '#F59E0B',
  causal: '#EF4444',
  default: '#6B7280',
} as const;

/**
 * Transform investigation data to D3.js format
 */
export class D3Transformer {
  static transform(
    investigation: Investigation,
    evidence: Evidence[],
    domains: Domain[]
  ): { nodes: D3Node[]; edges: D3Edge[] } {
    const nodes: D3Node[] = [];
    const edges: D3Edge[] = [];
    const nodeMap = new Map<string, D3Node>();

    // Create central entity node
    const entityNode: D3Node = {
      id: investigation.id,
      type: 'entity',
      label: `${investigation.entity.type}: ${investigation.entity.value}`,
      data: {
        investigation,
        riskScore: investigation.risk_score,
        priority: investigation.priority,
      },
      size: 30,
      color: NODE_COLORS.entity,
      group: 0,
      riskScore: investigation.risk_score,
      evidenceCount: evidence.length,
    };
    nodes.push(entityNode);
    nodeMap.set(entityNode.id, entityNode);

    // Create domain nodes
    domains.forEach((domain, index) => {
      const domainNode: D3Node = {
        id: `domain-${domain.name}`,
        type: 'domain',
        label: domain.name,
        data: { domain },
        size: 20,
        color: NODE_COLORS.domain,
        group: 1,
        riskScore: domain.risk_score,
        evidenceCount: domain.evidence_items?.length || 0,
      };
      nodes.push(domainNode);
      nodeMap.set(domainNode.id, domainNode);

      // Connect domain to entity
      edges.push({
        id: `edge-${investigation.id}-${domainNode.id}`,
        source: investigation.id,
        target: domainNode.id,
        type: 'contains',
        data: { relationship: 'analyzes' },
        weight: domain.risk_score || 0.5,
        color: EDGE_COLORS.contains,
        width: Math.max(1, (domain.risk_score || 0.5) * 5),
      });
    });

    // Create evidence nodes
    evidence.forEach((evidenceItem, index) => {
      const evidenceNode: D3Node = {
        id: `evidence-${evidenceItem.id}`,
        type: 'evidence',
        label: evidenceItem.summary || `Evidence ${index + 1}`,
        data: { evidence: evidenceItem },
        size: Math.max(8, Math.min(25, (evidenceItem.strength || 0.5) * 30)),
        color: this.getEvidenceColor(evidenceItem.strength || 0.5),
        group: 2,
        riskScore: evidenceItem.strength,
      };
      nodes.push(evidenceNode);
      nodeMap.set(evidenceNode.id, evidenceNode);

      // Connect evidence to its domain
      const domainNode = nodeMap.get(`domain-${evidenceItem.domain}`);
      if (domainNode) {
        edges.push({
          id: `edge-${domainNode.id}-${evidenceNode.id}`,
          source: domainNode.id,
          target: evidenceNode.id,
          type: 'contains',
          data: { relationship: 'contains_evidence' },
          weight: evidenceItem.strength || 0.5,
          color: EDGE_COLORS.contains,
          width: Math.max(1, (evidenceItem.strength || 0.5) * 3),
        });
      }
    });

    return { nodes, edges };
  }

  private static getEvidenceColor(strength: number): string {
    if (strength >= 0.8) return '#DC2626'; // High strength - red
    if (strength >= 0.6) return '#F59E0B'; // Medium strength - amber
    if (strength >= 0.4) return '#10B981'; // Low strength - green
    return '#6B7280'; // Very low strength - gray
  }

  /**
   * Apply force-directed layout
   */
  static applyForceLayout(
    nodes: D3Node[],
    edges: D3Edge[],
    config: LayoutConfig
  ): { nodes: D3Node[]; edges: D3Edge[] } {
    // Basic force simulation positioning (simplified)
    const centerX = config.centerX || config.width / 2;
    const centerY = config.centerY || config.height / 2;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = Math.min(config.width, config.height) * 0.3;

      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });

    return { nodes, edges };
  }

  /**
   * Apply hierarchical layout
   */
  static applyHierarchicalLayout(
    nodes: D3Node[],
    edges: D3Edge[],
    config: LayoutConfig
  ): { nodes: D3Node[]; edges: D3Edge[] } {
    const levels: D3Node[][] = [[], [], []]; // Entity, domains, evidence

    nodes.forEach((node) => {
      levels[node.group]?.push(node);
    });

    const levelHeight = config.height / levels.length;
    const levelSpacing = config.levelSpacing || 100;

    levels.forEach((levelNodes, levelIndex) => {
      const y = levelIndex * levelHeight + levelHeight / 2;
      const nodeSpacing = config.width / (levelNodes.length + 1);

      levelNodes.forEach((node, nodeIndex) => {
        node.x = (nodeIndex + 1) * nodeSpacing;
        node.y = y;
      });
    });

    return { nodes, edges };
  }
}

/**
 * Transform investigation data to React Flow format
 */
export class ReactFlowTransformer {
  static transform(
    investigation: Investigation,
    evidence: Evidence[],
    domains: Domain[]
  ): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    const nodes: ReactFlowNode[] = [];
    const edges: ReactFlowEdge[] = [];

    // Create central entity node
    const entityNode: ReactFlowNode = {
      id: investigation.id,
      type: 'entityNode',
      label: `${investigation.entity.type}: ${investigation.entity.value}`,
      position: { x: 250, y: 50 },
      data: {
        investigation,
        riskScore: investigation.risk_score,
        priority: investigation.priority,
      },
      style: {
        background: NODE_COLORS.entity,
        color: 'white',
        border: '2px solid #1E40AF',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '10px',
        width: 200,
        height: 60,
      },
      sourcePosition: 'bottom',
      targetPosition: 'top',
    };
    nodes.push(entityNode);

    // Create domain nodes
    domains.forEach((domain, index) => {
      const domainNode: ReactFlowNode = {
        id: `domain-${domain.name}`,
        type: 'domainNode',
        label: domain.name,
        position: {
          x: 50 + (index * 250),
          y: 200
        },
        data: { domain },
        style: {
          background: NODE_COLORS.domain,
          color: 'white',
          border: '2px solid #059669',
          borderRadius: '6px',
          fontSize: '12px',
          padding: '8px',
          width: 150,
          height: 50,
        },
        sourcePosition: 'bottom',
        targetPosition: 'top',
      };
      nodes.push(domainNode);

      // Connect domain to entity
      edges.push({
        id: `edge-${investigation.id}-${domainNode.id}`,
        source: investigation.id,
        target: domainNode.id,
        type: 'smoothstep',
        data: { relationship: 'analyzes' },
        style: {
          stroke: EDGE_COLORS.contains,
          strokeWidth: Math.max(2, (domain.risk_score || 0.5) * 5),
        },
        markerEnd: 'arrowclosed',
        label: 'analyzes',
        labelStyle: { fontSize: '10px', fill: '#6B7280' },
      });
    });

    // Create evidence nodes
    evidence.forEach((evidenceItem, index) => {
      const domainIndex = domains.findIndex(d => d.name === evidenceItem.domain);
      const baseX = 50 + (domainIndex >= 0 ? domainIndex * 250 : 0);

      const evidenceNode: ReactFlowNode = {
        id: `evidence-${evidenceItem.id}`,
        type: 'evidenceNode',
        label: evidenceItem.summary || `Evidence ${index + 1}`,
        position: {
          x: baseX + (index % 3) * 80 - 80,
          y: 350 + Math.floor(index / 3) * 80
        },
        data: { evidence: evidenceItem },
        style: {
          background: this.getEvidenceColor(evidenceItem.strength || 0.5),
          color: 'white',
          border: '1px solid #374151',
          borderRadius: '4px',
          fontSize: '10px',
          padding: '6px',
          width: 120,
          height: 40,
        },
        targetPosition: 'top',
      };
      nodes.push(evidenceNode);

      // Connect evidence to its domain
      const domainNodeId = `domain-${evidenceItem.domain}`;
      edges.push({
        id: `edge-${domainNodeId}-${evidenceNode.id}`,
        source: domainNodeId,
        target: evidenceNode.id,
        type: 'straight',
        data: { relationship: 'contains_evidence' },
        style: {
          stroke: EDGE_COLORS.contains,
          strokeWidth: Math.max(1, (evidenceItem.strength || 0.5) * 3),
          strokeOpacity: 0.7,
        },
      });
    });

    return { nodes, edges };
  }

  private static getEvidenceColor(strength: number): string {
    if (strength >= 0.8) return '#DC2626';
    if (strength >= 0.6) return '#F59E0B';
    if (strength >= 0.4) return '#10B981';
    return '#6B7280';
  }

  /**
   * Apply auto-layout to React Flow nodes
   */
  static applyAutoLayout(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    algorithm: LayoutAlgorithm = 'hierarchical'
  ): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    switch (algorithm) {
      case 'hierarchical':
        return this.applyHierarchicalLayout(nodes, edges);
      case 'force':
        return this.applyForceLayout(nodes, edges);
      case 'circular':
        return this.applyCircularLayout(nodes, edges);
      case 'grid':
        return this.applyGridLayout(nodes, edges);
      default:
        return { nodes, edges };
    }
  }

  private static applyHierarchicalLayout(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    // Group nodes by type
    const entityNodes = nodes.filter(n => n.type === 'entityNode');
    const domainNodes = nodes.filter(n => n.type === 'domainNode');
    const evidenceNodes = nodes.filter(n => n.type === 'evidenceNode');

    // Position entity nodes at top
    entityNodes.forEach((node, index) => {
      node.position = { x: 300 + index * 250, y: 50 };
    });

    // Position domain nodes in middle
    domainNodes.forEach((node, index) => {
      node.position = { x: 150 + index * 200, y: 200 };
    });

    // Position evidence nodes at bottom
    evidenceNodes.forEach((node, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      node.position = { x: 100 + col * 180, y: 350 + row * 80 };
    });

    return { nodes, edges };
  }

  private static applyForceLayout(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    // Simple force-like positioning
    const centerX = 400;
    const centerY = 300;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = 150 + (index % 3) * 100;

      node.position = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    return { nodes, edges };
  }

  private static applyCircularLayout(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      node.position = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    return { nodes, edges };
  }

  private static applyGridLayout(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[]
  ): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const cellWidth = 200;
    const cellHeight = 150;

    nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      node.position = {
        x: 50 + col * cellWidth,
        y: 50 + row * cellHeight,
      };
    });

    return { nodes, edges };
  }
}

/**
 * Performance optimization utilities
 */
export class GraphOptimizer {
  /**
   * Filter nodes and edges based on viewport and performance constraints
   */
  static filterForPerformance(
    nodes: BaseGraphNode[],
    edges: BaseGraphEdge[],
    maxNodes: number = 500,
    maxEdges: number = 1000
  ): { nodes: BaseGraphNode[]; edges: BaseGraphEdge[] } {
    let filteredNodes = nodes;
    let filteredEdges = edges;

    // Limit nodes by importance (risk score, evidence count, etc.)
    if (nodes.length > maxNodes) {
      filteredNodes = nodes
        .sort((a, b) => {
          const aScore = (a.data.riskScore as number) || 0;
          const bScore = (b.data.riskScore as number) || 0;
          return bScore - aScore;
        })
        .slice(0, maxNodes);
    }

    // Filter edges to only include those connecting visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    filteredEdges = edges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    // Limit edges if still too many
    if (filteredEdges.length > maxEdges) {
      filteredEdges = filteredEdges
        .sort((a, b) => {
          const aWeight = (a.data.weight as number) || 0;
          const bWeight = (b.data.weight as number) || 0;
          return bWeight - aWeight;
        })
        .slice(0, maxEdges);
    }

    return { nodes: filteredNodes, edges: filteredEdges };
  }

  /**
   * Cluster nodes to reduce complexity
   */
  static clusterNodes(
    nodes: BaseGraphNode[],
    edges: BaseGraphEdge[],
    maxClusters: number = 20
  ): { nodes: BaseGraphNode[]; edges: BaseGraphEdge[] } {
    // Simple clustering by node type
    const clusters = new Map<string, BaseGraphNode[]>();

    nodes.forEach(node => {
      const clusterKey = node.type;
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(node);
    });

    const clusteredNodes: BaseGraphNode[] = [];
    const clusteredEdges: BaseGraphEdge[] = [];

    clusters.forEach((clusterNodes, clusterType) => {
      if (clusterNodes.length <= 5) {
        // Keep small clusters as individual nodes
        clusteredNodes.push(...clusterNodes);
      } else {
        // Create cluster node
        const clusterNode: BaseGraphNode = {
          id: `cluster-${clusterType}`,
          type: `${clusterType}-cluster`,
          label: `${clusterType} (${clusterNodes.length})`,
          data: {
            clusteredNodes: clusterNodes,
            nodeCount: clusterNodes.length,
          },
        };
        clusteredNodes.push(clusterNode);
      }
    });

    // Recreate edges for clustered graph
    // This is a simplified implementation
    edges.forEach(edge => {
      const sourceCluster = this.findNodeCluster(edge.source, clusters);
      const targetCluster = this.findNodeCluster(edge.target, clusters);

      if (sourceCluster && targetCluster && sourceCluster !== targetCluster) {
        const clusteredEdgeId = `cluster-edge-${sourceCluster}-${targetCluster}`;
        if (!clusteredEdges.find(e => e.id === clusteredEdgeId)) {
          clusteredEdges.push({
            id: clusteredEdgeId,
            source: `cluster-${sourceCluster}`,
            target: `cluster-${targetCluster}`,
            type: 'cluster-connection',
            data: { clustered: true },
          });
        }
      }
    });

    return { nodes: clusteredNodes, edges: clusteredEdges };
  }

  private static findNodeCluster(
    nodeId: string,
    clusters: Map<string, BaseGraphNode[]>
  ): string | null {
    for (const [clusterType, nodes] of clusters) {
      if (nodes.find(n => n.id === nodeId)) {
        return clusterType;
      }
    }
    return null;
  }
}