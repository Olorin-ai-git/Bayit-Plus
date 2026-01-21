/**
 * Hybrid Graph Agent Status
 * Feature: 006-hybrid-graph-integration
 *
 * Displays agent execution status with progress indicators.
 * Shows Device, Location, Network, Logs, and Risk agents.
 */

import React from 'react';

interface AgentStatus {
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percentage: number;
  tools_used: number;
  findings_count: number;
  execution_time_ms?: number;
}

interface HybridGraphAgentStatusProps {
  agentStatus: Record<string, AgentStatus>;
  className?: string;
}

const AGENT_ICONS: Record<string, string> = {
  device: '📱',
  location: '🌍',
  network: '🌐',
  logs: '📋',
  risk: '⚠️',
};

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  device: 'Device Analysis',
  location: 'Location Analysis',
  network: 'Network Analysis',
  logs: 'Logs Analysis',
  risk: 'Risk Assessment',
};

export function HybridGraphAgentStatus({
  agentStatus,
  className = '',
}: HybridGraphAgentStatusProps) {
  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-black/40 backdrop-blur text-corporate-textTertiary border-2 border-corporate-borderPrimary/40/30';
      case 'running':
        return 'bg-blue-500 text-white';
      case 'completed':
        return 'bg-green-500 text-white';
      case 'failed':
        return 'bg-red-500 text-white';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress < 25) return 'bg-blue-500';
    if (progress < 75) return 'bg-cyan-500';
    return 'bg-green-500';
  };

  const formatExecutionTime = (timeMs?: number): string => {
    if (!timeMs) return 'N/A';
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(2)}s`;
  };

  const agents = Object.entries(agentStatus);

  if (agents.length === 0) {
    return (
      <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
          Agent Execution Status
        </h3>
        <p className="text-corporate-textSecondary text-center py-8">
          No agents running yet. Investigation will start shortly...
        </p>
      </div>
    );
  }

  const completedCount = agents.filter(([_, agent]) => agent.status === 'completed').length;
  const runningCount = agents.filter(([_, agent]) => agent.status === 'running').length;

  return (
    <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">
          Agent Execution Status
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-corporate-success">
            ✓ {completedCount} completed
          </span>
          {runningCount > 0 && (
            <span className="text-blue-400">
              ▶ {runningCount} running
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(([agentKey, agent]) => {
          const icon = AGENT_ICONS[agentKey.toLowerCase()] || '🤖';
          const displayName = AGENT_DISPLAY_NAMES[agentKey.toLowerCase()] || agent.agent_name;

          return (
            <div
              key={agentKey}
              className="p-4 bg-black/40 backdrop-blur border-2 border-corporate-borderSecondary/40 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h4 className="font-medium text-corporate-textPrimary text-sm">
                      {displayName}
                    </h4>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded mt-1 ${getStatusColor(agent.status)}`}
                    >
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {agent.status !== 'pending' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-corporate-textTertiary">Progress</span>
                    <span className="text-xs font-medium text-corporate-textPrimary">
                      {agent.progress_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getProgressColor(agent.progress_percentage)}`}
                      style={{ width: `${agent.progress_percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30 rounded">
                  <div className="text-corporate-textTertiary">Tools</div>
                  <div className="font-medium text-corporate-textPrimary">{agent.tools_used}</div>
                </div>
                <div className="text-center p-2 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30 rounded">
                  <div className="text-corporate-textTertiary">Findings</div>
                  <div className="font-medium text-corporate-textPrimary">{agent.findings_count}</div>
                </div>
                <div className="text-center p-2 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30 rounded">
                  <div className="text-corporate-textTertiary">Time</div>
                  <div className="font-medium text-corporate-textPrimary">
                    {formatExecutionTime(agent.execution_time_ms)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
