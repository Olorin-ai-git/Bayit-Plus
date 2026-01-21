import { useState, useEffect, useRef } from 'react';
import { Network, Options, Data } from 'vis-network';
import { DataSet } from 'vis-data';
import { getNetworkOptions } from '../utils/networkLayout';
import type { NetworkNode, NetworkEdge } from '../types/events.types';

interface UseVisNetworkProps {
  container: HTMLElement | null;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  options?: Partial<Options>;
}

interface UseVisNetworkReturn {
  network: Network | null;
  loading: boolean;
  error: Error | null;
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  togglePhysics: () => void;
}

export function useVisNetwork({
  container,
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  options: customOptions
}: UseVisNetworkProps): UseVisNetworkReturn {
  const [network, setNetwork] = useState<Network | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);

  const nodesDataSetRef = useRef<DataSet<any>>(new DataSet([]));
  const edgesDataSetRef = useRef<DataSet<any>>(new DataSet([]));

  // Initialize network
  useEffect(() => {
    if (!container) {
      return;
    }

    try {
      const data: Data = {
        nodes: nodesDataSetRef.current,
        edges: edgesDataSetRef.current
      };

      const defaultOptions = getNetworkOptions();
      const options: Options = {
        ...defaultOptions,
        ...customOptions
      };

      const newNetwork = new Network(container, data, options);

      // Event listeners
      if (onNodeClick) {
        newNetwork.on('click', (params) => {
          if (params.nodes.length > 0) {
            onNodeClick(params.nodes[0] as string);
          }
        });
      }

      if (onEdgeClick) {
        newNetwork.on('click', (params) => {
          if (params.edges.length > 0) {
            onEdgeClick(params.edges[0] as string);
          }
        });
      }

      // Stabilization events
      newNetwork.once('stabilizationIterationsDone', () => {
        setLoading(false);
      });

      newNetwork.on('stabilizationProgress', (params) => {
        const progress = Math.round((params.iterations / params.total) * 100);
        console.log(`Network stabilization: ${progress}%`);
      });

      setNetwork(newNetwork);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize network'));
      setLoading(false);
    }

    return () => {
      if (network) {
        network.destroy();
      }
    };
  }, [container]);

  // Update nodes
  useEffect(() => {
    if (!network) return;

    const visNodes = nodes.map(node => ({
      id: node.id,
      label: node.label,
      color: node.color,
      title: `${node.type} - Risk: ${node.riskScore}`,
      shape: getNodeShape(node.type),
      size: getNodeSize(node.riskScore)
    }));

    nodesDataSetRef.current.clear();
    nodesDataSetRef.current.add(visNodes);
  }, [nodes, network]);

  // Update edges
  useEffect(() => {
    if (!network) return;

    const visEdges = edges.map(edge => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.type,
      arrows: 'to'
    }));

    edgesDataSetRef.current.clear();
    edgesDataSetRef.current.add(visEdges);
  }, [edges, network]);

  function fit() {
    if (network) {
      network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    }
  }

  function zoomIn() {
    if (network) {
      const scale = network.getScale() * 1.2;
      network.moveTo({ scale, animation: { duration: 200 } });
    }
  }

  function zoomOut() {
    if (network) {
      const scale = network.getScale() * 0.8;
      network.moveTo({ scale, animation: { duration: 200 } });
    }
  }

  function togglePhysics() {
    if (network) {
      const newPhysicsState = !physicsEnabled;
      network.setOptions({ physics: { enabled: newPhysicsState } });
      setPhysicsEnabled(newPhysicsState);
    }
  }

  return {
    network,
    loading,
    error,
    fit,
    zoomIn,
    zoomOut,
    togglePhysics
  };
}

function getNodeShape(type: string): string {
  const shapeMap: Record<string, string> = {
    user: 'circle',
    device: 'box',
    location: 'diamond',
    account: 'ellipse',
    network: 'hexagon',
    default: 'dot'
  };

  return shapeMap[type] || shapeMap.default;
}

function getNodeSize(riskScore: number): number {
  // Size based on risk score (20-40 pixels)
  return 20 + (riskScore / 100) * 20;
}
