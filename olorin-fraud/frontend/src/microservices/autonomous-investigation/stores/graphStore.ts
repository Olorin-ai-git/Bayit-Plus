/**
 * Graph Store
 * Manages graph visualization state, node/edge selection, and filters
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GraphNode {
  id: string;
  type: string;
  label: string;
  position?: { x: number; y: number };
  data: Record<string, unknown>;
  risk_score?: number;
  evidence_count?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  data: Record<string, unknown>;
}

interface GraphFilter {
  nodeTypes: string[];
  edgeTypes: string[];
  riskScoreRange: [number, number];
  evidenceCountRange: [number, number];
  timeRange: {
    start: string | null;
    end: string | null;
  };
  searchTerm: string;
}

interface GraphLayoutConfig {
  algorithm: 'force' | 'hierarchical' | 'circular' | 'grid';
  spacing: number;
  iterations: number;
  animate: boolean;
}

interface GraphState {
  // Graph data
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Selection state
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  hoveredNode: string | null;
  hoveredEdge: string | null;

  // Visual state
  zoom: number;
  center: { x: number; y: number };
  layoutConfig: GraphLayoutConfig;

  // Filtering and search
  filters: GraphFilter;
  filteredNodes: Set<string>;
  filteredEdges: Set<string>;

  // UI state
  isFilterPanelOpen: boolean;
  isLegendVisible: boolean;
  showNodeLabels: boolean;
  showEdgeLabels: boolean;

  // Actions
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;

  // Selection actions
  selectNode: (nodeId: string, multiSelect?: boolean) => void;
  selectEdge: (edgeId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  setHoveredNode: (nodeId: string | null) => void;
  setHoveredEdge: (edgeId: string | null) => void;

  // Visual actions
  setZoom: (zoom: number) => void;
  setCenter: (center: { x: number; y: number }) => void;
  updateLayoutConfig: (config: Partial<GraphLayoutConfig>) => void;

  // Filter actions
  updateFilters: (filters: Partial<GraphFilter>) => void;
  clearFilters: () => void;
  applyFilters: () => void;

  // UI actions
  toggleFilterPanel: () => void;
  toggleLegend: () => void;
  toggleNodeLabels: () => void;
  toggleEdgeLabels: () => void;
}

const initialFilters: GraphFilter = {
  nodeTypes: [],
  edgeTypes: [],
  riskScoreRange: [0, 1],
  evidenceCountRange: [0, 100],
  timeRange: {
    start: null,
    end: null,
  },
  searchTerm: '',
};

const initialLayoutConfig: GraphLayoutConfig = {
  algorithm: 'force',
  spacing: 100,
  iterations: 300,
  animate: true,
};

export const useGraphStore = create<GraphState>()(
  devtools(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      selectedNodes: new Set(),
      selectedEdges: new Set(),
      hoveredNode: null,
      hoveredEdge: null,
      zoom: 1,
      center: { x: 0, y: 0 },
      layoutConfig: initialLayoutConfig,
      filters: initialFilters,
      filteredNodes: new Set(),
      filteredEdges: new Set(),
      isFilterPanelOpen: false,
      isLegendVisible: true,
      showNodeLabels: true,
      showEdgeLabels: false,

      // Graph data actions
      setGraphData: (nodes, edges) => {
        set({
          nodes,
          edges,
          selectedNodes: new Set(),
          selectedEdges: new Set(),
          hoveredNode: null,
          hoveredEdge: null,
        });
        // Apply current filters to new data
        get().applyFilters();
      },

      // Selection actions
      selectNode: (nodeId, multiSelect = false) =>
        set((state) => {
          const newSelectedNodes = new Set(multiSelect ? state.selectedNodes : []);
          if (newSelectedNodes.has(nodeId)) {
            newSelectedNodes.delete(nodeId);
          } else {
            newSelectedNodes.add(nodeId);
          }
          return { selectedNodes: newSelectedNodes };
        }),

      selectEdge: (edgeId, multiSelect = false) =>
        set((state) => {
          const newSelectedEdges = new Set(multiSelect ? state.selectedEdges : []);
          if (newSelectedEdges.has(edgeId)) {
            newSelectedEdges.delete(edgeId);
          } else {
            newSelectedEdges.add(edgeId);
          }
          return { selectedEdges: newSelectedEdges };
        }),

      clearSelection: () =>
        set({
          selectedNodes: new Set(),
          selectedEdges: new Set(),
          hoveredNode: null,
          hoveredEdge: null,
        }),

      setHoveredNode: (nodeId) => set({ hoveredNode: nodeId }),
      setHoveredEdge: (edgeId) => set({ hoveredEdge: edgeId }),

      // Visual actions
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
      setCenter: (center) => set({ center }),
      updateLayoutConfig: (config) =>
        set((state) => ({
          layoutConfig: { ...state.layoutConfig, ...config },
        })),

      // Filter actions
      updateFilters: (newFilters) =>
        set((state) => {
          const updatedFilters = { ...state.filters, ...newFilters };
          return { filters: updatedFilters };
        }),

      clearFilters: () => {
        set({ filters: initialFilters });
        get().applyFilters();
      },

      applyFilters: () => {
        const { nodes, edges, filters } = get();

        // Filter nodes
        const filteredNodes = new Set<string>();
        nodes.forEach((node) => {
          let include = true;

          // Filter by node type
          if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.type)) {
            include = false;
          }

          // Filter by risk score
          if (node.risk_score !== undefined) {
            const [min, max] = filters.riskScoreRange;
            if (node.risk_score < min || node.risk_score > max) {
              include = false;
            }
          }

          // Filter by evidence count
          if (node.evidence_count !== undefined) {
            const [min, max] = filters.evidenceCountRange;
            if (node.evidence_count < min || node.evidence_count > max) {
              include = false;
            }
          }

          // Filter by search term
          if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            if (
              !node.label.toLowerCase().includes(searchLower) &&
              !node.id.toLowerCase().includes(searchLower)
            ) {
              include = false;
            }
          }

          if (include) {
            filteredNodes.add(node.id);
          }
        });

        // Filter edges
        const filteredEdges = new Set<string>();
        edges.forEach((edge) => {
          let include = true;

          // Filter by edge type
          if (filters.edgeTypes.length > 0 && !filters.edgeTypes.includes(edge.type)) {
            include = false;
          }

          // Filter out edges where source or target nodes are filtered out
          if (!filteredNodes.has(edge.source) || !filteredNodes.has(edge.target)) {
            include = false;
          }

          if (include) {
            filteredEdges.add(edge.id);
          }
        });

        set({ filteredNodes, filteredEdges });
      },

      // UI actions
      toggleFilterPanel: () =>
        set((state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen })),
      toggleLegend: () =>
        set((state) => ({ isLegendVisible: !state.isLegendVisible })),
      toggleNodeLabels: () =>
        set((state) => ({ showNodeLabels: !state.showNodeLabels })),
      toggleEdgeLabels: () =>
        set((state) => ({ showEdgeLabels: !state.showEdgeLabels })),
    }),
    {
      name: 'graph-store',
    }
  )
);

// Computed selectors
export const useGraphData = () =>
  useGraphStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
  }));

export const useGraphSelection = () =>
  useGraphStore((state) => ({
    selectedNodes: state.selectedNodes,
    selectedEdges: state.selectedEdges,
    hoveredNode: state.hoveredNode,
    hoveredEdge: state.hoveredEdge,
  }));

export const useGraphVisualState = () =>
  useGraphStore((state) => ({
    zoom: state.zoom,
    center: state.center,
    layoutConfig: state.layoutConfig,
  }));

export const useGraphFilters = () =>
  useGraphStore((state) => ({
    filters: state.filters,
    filteredNodes: state.filteredNodes,
    filteredEdges: state.filteredEdges,
  }));

export const useGraphUI = () =>
  useGraphStore((state) => ({
    isFilterPanelOpen: state.isFilterPanelOpen,
    isLegendVisible: state.isLegendVisible,
    showNodeLabels: state.showNodeLabels,
    showEdgeLabels: state.showEdgeLabels,
  }));

// Action selectors
export const useGraphActions = () =>
  useGraphStore((state) => ({
    setGraphData: state.setGraphData,
    selectNode: state.selectNode,
    selectEdge: state.selectEdge,
    clearSelection: state.clearSelection,
    setHoveredNode: state.setHoveredNode,
    setHoveredEdge: state.setHoveredEdge,
    setZoom: state.setZoom,
    setCenter: state.setCenter,
    updateLayoutConfig: state.updateLayoutConfig,
    updateFilters: state.updateFilters,
    clearFilters: state.clearFilters,
    applyFilters: state.applyFilters,
    toggleFilterPanel: state.toggleFilterPanel,
    toggleLegend: state.toggleLegend,
    toggleNodeLabels: state.toggleNodeLabels,
    toggleEdgeLabels: state.toggleEdgeLabels,
  }));