/**
 * vis-network Integration Hook
 * Feature: 005-polling-and-persistence
 *
 * React hook for managing vis-network graph instances in Olorin.
 * Adapted from Olorin web plugin with Olorin patterns.
 */

import { useState, useCallback, useEffect } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data/esnext';
import type { Options, Node, Edge } from 'vis-network';

/**
 * Network data structure for nodes and edges
 */
export interface NetworkData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Return type for useVisNetwork hook
 */
export interface UseVisNetworkReturn {
  network: Network | null;
  initializeNetwork: (options?: Options) => void;
  updateData: (data: NetworkData) => void;
  destroy: () => void;
  fit: () => void;
  focus: (nodeId: string) => void;
}

/**
 * Custom hook for managing vis-network lifecycle and interactions
 *
 * @param containerRef - React ref to the container div element
 * @returns Network instance and control functions
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { network, initializeNetwork, updateData } = useVisNetwork(containerRef);
 *
 * useEffect(() => {
 *   initializeNetwork({
 *     physics: { enabled: true },
 *     nodes: { shape: 'box' }
 *   });
 * }, [initializeNetwork]);
 * ```
 */
export function useVisNetwork(
  containerRef: React.RefObject<HTMLDivElement>,
): UseVisNetworkReturn {
  const [network, setNetwork] = useState<Network | null>(null);
  const [nodesDataSet] = useState(() => new DataSet<Node>([]));
  const [edgesDataSet] = useState(() => new DataSet<Edge>([]));

  /**
   * Initialize the vis-network instance with optional configuration
   * Default configuration uses forceAtlas2Based physics solver
   */
  const initializeNetwork = useCallback(
    (options?: Options) => {
      if (!containerRef.current || network) return;

      const defaultOptions: Options = {
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
        },
        nodes: {
          shape: 'box',
        },
        edges: {
          smooth: true,
        },
        ...options,
      };

      const newNetwork = new Network(
        containerRef.current,
        {
          nodes: nodesDataSet,
          edges: edgesDataSet,
        },
        defaultOptions,
      );

      setNetwork(newNetwork);
    },
    [containerRef, network, nodesDataSet, edgesDataSet],
  );

  /**
   * Update network data (nodes and edges)
   * Efficiently updates existing items and adds new ones
   */
  const updateData = useCallback(
    (data: NetworkData) => {
      // Update nodes: remove obsolete, update existing, add new
      const existingNodeIds = nodesDataSet.getIds();
      const newNodeIds = data.nodes.map((n) => n.id as string);

      const nodesToRemove = existingNodeIds.filter(
        (id: any) => !newNodeIds.includes(id as string),
      );
      if (nodesToRemove.length > 0) {
        nodesDataSet.remove(nodesToRemove);
      }

      data.nodes.forEach((node) => {
        if (nodesDataSet.get(node.id as string)) {
          nodesDataSet.update(node);
        } else {
          nodesDataSet.add(node);
        }
      });

      // Update edges: remove obsolete, update existing, add new
      const existingEdgeIds = edgesDataSet.getIds();
      const newEdgeIds = data.edges.map((e) => e.id as string);

      const edgesToRemove = existingEdgeIds.filter(
        (id: any) => !newEdgeIds.includes(id as string),
      );
      if (edgesToRemove.length > 0) {
        edgesDataSet.remove(edgesToRemove);
      }

      data.edges.forEach((edge) => {
        if (edgesDataSet.get(edge.id as string)) {
          edgesDataSet.update(edge);
        } else {
          edgesDataSet.add(edge);
        }
      });
    },
    [nodesDataSet, edgesDataSet],
  );

  /**
   * Destroy the network instance and clean up resources
   */
  const destroy = useCallback(() => {
    if (network) {
      network.destroy();
      setNetwork(null);
    }
  }, [network]);

  /**
   * Fit the network to show all nodes with smooth animation
   */
  const fit = useCallback(() => {
    if (network) {
      network.fit({
        animation: { duration: 500, easingFunction: 'easeInOutQuad' },
      });
    }
  }, [network]);

  /**
   * Focus on a specific node with zoom and animation
   *
   * @param nodeId - ID of the node to focus on
   */
  const focus = useCallback(
    (nodeId: string) => {
      if (network) {
        network.focus(nodeId, {
          scale: 1.5,
          animation: { duration: 500, easingFunction: 'easeInOutQuad' },
        });
      }
    },
    [network],
  );

  /**
   * Cleanup network on unmount
   */
  useEffect(() => {
    return () => {
      destroy();
    };
  }, []);

  return {
    network,
    initializeNetwork,
    updateData,
    destroy,
    fit,
    focus,
  };
}
