import React, { useMemo } from 'react';
import type { NetworkNode, NetworkEdge } from '../../types/events.types';

interface NetworkStatsProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  className?: string;
}

interface NetworkStatistics {
  totalNodes: number;
  totalEdges: number;
  averageRisk: number;
  highRiskNodes: number;
  criticalRiskNodes: number;
  entityTypeCounts: Record<string, number>;
}

export function NetworkStats({ nodes, edges, className = '' }: NetworkStatsProps) {
  const stats: NetworkStatistics = useMemo(() => {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;

    const totalRisk = nodes.reduce((sum, node) => sum + (node.riskScore || 0), 0);
    const averageRisk = totalNodes > 0 ? Math.round(totalRisk / totalNodes) : 0;

    const highRiskNodes = nodes.filter(n => n.riskScore >= 60 && n.riskScore < 80).length;
    const criticalRiskNodes = nodes.filter(n => n.riskScore >= 80).length;

    const entityTypeCounts: Record<string, number> = {};
    nodes.forEach(node => {
      const type = node.type || 'unknown';
      entityTypeCounts[type] = (entityTypeCounts[type] || 0) + 1;
    });

    return {
      totalNodes,
      totalEdges,
      averageRisk,
      highRiskNodes,
      criticalRiskNodes,
      entityTypeCounts
    };
  }, [nodes, edges]);

  function getRiskColor(score: number): string {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-cyan-400';
    return 'text-gray-400';
  }

  return (
    <div className={`network-stats ${className}`}>
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-xl">
        <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Network Statistics
        </h3>

        <div className="space-y-3">
          {/* Graph Metrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Nodes:</span>
              <span className="text-gray-200 font-mono font-semibold">{stats.totalNodes}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Edges:</span>
              <span className="text-gray-200 font-mono font-semibold">{stats.totalEdges}</span>
            </div>
          </div>

          <div className="h-px bg-gray-700" />

          {/* Risk Metrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Avg Risk:</span>
              <span className={`font-mono font-semibold ${getRiskColor(stats.averageRisk)}`}>
                {stats.averageRisk}
              </span>
            </div>
            {stats.criticalRiskNodes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">Critical:</span>
                <span className="text-red-400 font-mono font-semibold">{stats.criticalRiskNodes}</span>
              </div>
            )}
            {stats.highRiskNodes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-400">High:</span>
                <span className="text-amber-400 font-mono font-semibold">{stats.highRiskNodes}</span>
              </div>
            )}
          </div>

          {/* Entity Types */}
          {Object.keys(stats.entityTypeCounts).length > 0 && (
            <>
              <div className="h-px bg-gray-700" />
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-gray-400 mb-2">Entity Types</div>
                {Object.entries(stats.entityTypeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 capitalize">{type}:</span>
                      <span className="text-gray-300 font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
