/**
 * Graph Visualization Types for Hybrid Graph Investigation UI
 *
 * This module defines graph-specific data models including nodes, edges,
 * layout algorithms, and graph visualization components.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

import type { ApiResponse } from './investigation.types';

// ============================================================================
// Graph Visualization Types
// ============================================================================

/**
 * Node types in the graph visualization
 */
export type NodeType = "domain" | "tool" | "evidence" | "decision" | "cluster";

/**
 * Node shapes for visual differentiation
 */
export type NodeShape = "circle" | "square" | "diamond" | "triangle";

/**
 * Node status indicators
 */
export type NodeStatus = "active" | "complete" | "error" | "pending" | "disabled";

/**
 * Edge types for relationships
 */
export type EdgeType = "causal" | "temporal" | "similarity" | "dependency";

/**
 * Edge visual styles
 */
export type EdgeStyle = "solid" | "dashed" | "dotted";

/**
 * Edge direction types
 */
export type EdgeDirection = "directed" | "undirected" | "bidirectional";

// ============================================================================
// Graph Node Interface
// ============================================================================

/**
 * Graph node interface for visualization
 */
export interface GraphNode {
  /** Core identification */
  id: string;
  type: NodeType;
  label: string;

  /** Position (for cached layouts) */
  x?: number;
  y?: number;

  /** Visual properties */
  size: number;                 // Node size
  color: string;                // Node color
  shape: NodeShape;             // Node shape

  /** Data properties */
  risk_score?: number;          // 0-1 risk score if applicable
  confidence?: number;          // 0-1 confidence if applicable
  status: NodeStatus;           // Current status

  /** Connected data */
  properties: Record<string, unknown>; // Node-specific properties
  evidence_refs: string[];      // Evidence this node represents

  /** UI state */
  selected: boolean;
  highlighted: boolean;
  clustered: boolean;           // Is this node part of a cluster
  cluster_id?: string;          // Cluster ID if clustered

  /** Accessibility */
  aria_label: string;           // Screen reader description
  keyboard_focusable: boolean;
}

// ============================================================================
// Graph Edge Interface
// ============================================================================

/**
 * Graph edge interface for relationships
 */
export interface GraphEdge {
  id: string;
  source: string;               // Source node ID
  target: string;               // Target node ID
  type: EdgeType;

  /** Visual properties */
  weight: number;               // Edge thickness (1-10)
  color: string;                // Edge color
  style: EdgeStyle;             // Solid, dashed, dotted

  /** Data properties */
  strength: number;             // 0-1 relationship strength
  direction: EdgeDirection;     // Relationship direction

  /** Temporal information */
  created_at?: string;          // When this relationship was established

  /** UI state */
  highlighted: boolean;

  /** Accessibility */
  aria_label: string;           // Screen reader description
}

// ============================================================================
// Layout Configuration Types
// ============================================================================

/**
 * Force-directed layout configuration
 */
export interface ForceLayoutData {
  strength: number;
  distance: number;
  iterations: number;
}

/**
 * Radial layout configuration
 */
export interface RadialLayoutData {
  center_node: string;
  radius: number;
  angle_step: number;
}

/**
 * Hierarchical layout configuration
 */
export interface HierarchicalLayoutData {
  root_nodes: string[];
  level_height: number;
  node_spacing: number;
}

/**
 * Graph layout options
 */
export type GraphLayoutType = "force" | "radial" | "hierarchical" | "circular" | "tree";

/**
 * Graph layout configuration union
 */
export type GraphLayoutConfig =
  | { type: "force"; config: ForceLayoutData }
  | { type: "radial"; config: RadialLayoutData }
  | { type: "hierarchical"; config: HierarchicalLayoutData }
  | { type: "circular"; config: { radius: number } }
  | { type: "tree"; config: { orientation: "vertical" | "horizontal" } };

// ============================================================================
// Complete Graph Data Structure
// ============================================================================

/**
 * Complete graph data structure
 */
export interface GraphData {
  investigation_id: string;
  last_updated: string;

  nodes: GraphNode[];
  edges: GraphEdge[];

  layout_data?: {
    force_directed?: ForceLayoutData;
    radial?: RadialLayoutData;
    hierarchical?: HierarchicalLayoutData;
  };

  performance_stats: GraphPerformanceStats;
}

/**
 * Graph performance statistics
 */
export interface GraphPerformanceStats {
  node_count: number;
  edge_count: number;
  render_time_ms: number;
  last_layout_time_ms: number;
  memory_usage_mb?: number;
  fps?: number;
}

// ============================================================================
// Graph Interaction Types
// ============================================================================

/**
 * Graph interaction events
 */
export interface GraphInteractionEvent {
  type: "node_click" | "edge_click" | "canvas_click" | "node_hover" | "zoom" | "pan";
  timestamp: string;
  target_id?: string;           // Node or edge ID if applicable
  position?: { x: number; y: number };
  modifiers?: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
  };
}

/**
 * Graph selection state
 */
export interface GraphSelection {
  nodes: string[];              // Selected node IDs
  edges: string[];              // Selected edge IDs
  mode: "single" | "multiple" | "box" | "lasso";
  last_selected?: string;       // Most recently selected item
}

/**
 * Graph viewport state
 */
export interface GraphViewport {
  zoom: number;                 // Current zoom level
  center: { x: number; y: number }; // Center position
  bounds: {                     // Visible bounds
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

// ============================================================================
// Graph Filtering and Clustering
// ============================================================================

/**
 * Graph filter criteria
 */
export interface GraphFilter {
  node_types?: NodeType[];
  edge_types?: EdgeType[];
  risk_threshold?: number;
  confidence_threshold?: number;
  date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
}

/**
 * Graph cluster configuration
 */
export interface GraphCluster {
  id: string;
  algorithm: "community" | "hierarchical" | "k_means" | "density";
  parameters: Record<string, number>;
  node_ids: string[];
  center_node?: string;
  color?: string;
  label?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export type GraphDataResponse = ApiResponse<GraphData>;
export type GraphNodeResponse = ApiResponse<GraphNode>;
export type GraphEdgeResponse = ApiResponse<GraphEdge>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a graph node object
 */
export const validateGraphNode = (node: GraphNode): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!node.id || node.id.trim().length === 0) {
    errors.push("Graph node must have an ID");
  }

  if (!node.label || node.label.trim().length === 0) {
    errors.push("Graph node must have a label");
  }

  if (node.size <= 0) {
    errors.push("Graph node size must be positive");
  }

  if (node.risk_score !== undefined && (node.risk_score < 0 || node.risk_score > 1)) {
    errors.push("Risk score must be between 0 and 1");
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates a graph edge object
 */
export const validateGraphEdge = (edge: GraphEdge): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!edge.id || edge.id.trim().length === 0) {
    errors.push("Graph edge must have an ID");
  }

  if (!edge.source || edge.source.trim().length === 0) {
    errors.push("Graph edge must have a source node ID");
  }

  if (!edge.target || edge.target.trim().length === 0) {
    errors.push("Graph edge must have a target node ID");
  }

  if (edge.weight < 1 || edge.weight > 10) {
    errors.push("Edge weight must be between 1 and 10");
  }

  if (edge.strength < 0 || edge.strength > 1) {
    errors.push("Edge strength must be between 0 and 1");
  }

  return { valid: errors.length === 0, errors };
};