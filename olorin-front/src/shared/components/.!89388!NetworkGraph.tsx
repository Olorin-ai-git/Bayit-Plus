/**
 * Network Graph Component
 * Feature: 004-new-olorin-frontend
 *
 * Visualizes entity relationships as an interactive network graph.
 * Uses Olorin purple styling with force-directed layout.
 */

import React from 'react';

export interface NetworkNode {
  id: string;
  label: string;
  type: string;
  riskScore: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

export interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  height?: string;
  className?: string;
}

/**
 * Network graph visualization
 * Note: This is a placeholder for a real graph library integration (e.g., D3.js, Cytoscape.js)
 */
export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  height = 'h-96',
  className = ''
}) => {
  if (nodes.length === 0) {
    return (
      <div
        className={`${height} bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg flex items-center justify-center ${className}`}
      >
        <p className="text-sm text-corporate-textTertiary">No network data available</p>
      </div>
    );
  }

  return (
    <div className={`${height} bg-black/30 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg overflow-hidden ${className}`}>
      {/* Placeholder for graph library integration */}
      <div className="w-full h-full flex flex-col items-center justify-center p-6">
        <div className="text-center mb-6">
          <h4 className="text-lg font-semibold text-corporate-textPrimary mb-2">
            Network Visualization
          </h4>
          <p className="text-sm text-corporate-textSecondary">
            {nodes.length} nodes, {edges.length} connections
          </p>
        </div>

        {/* Simple node list representation */}
        <div className="w-full max-w-2xl bg-black/40 backdrop-blur-md rounded-lg p-4 overflow-y-auto max-h-64">
          <h5 className="text-sm font-medium text-corporate-textPrimary mb-3">Entities:</h5>
          <div className="space-y-2">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between px-3 py-2 bg-black/30 backdrop-blur rounded"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${getNodeColor(node.riskScore)}`}
                  />
                  <span className="text-sm text-corporate-textPrimary">{node.label}</span>
                  <span className="text-xs text-corporate-textTertiary">({node.type})</span>
                </div>
                <span className={`text-xs font-medium ${getRiskColor(node.riskScore)}`}>
                  Risk: {node.riskScore}
                </span>
              </div>
            ))}
          </div>

          {edges.length > 0 && (
            <>
              <h5 className="text-sm font-medium text-corporate-textPrimary mt-4 mb-3">
                Connections:
              </h5>
              <div className="space-y-1">
                {edges.map((edge, index) => (
                  <div key={index} className="text-xs text-corporate-textSecondary px-3 py-1">
