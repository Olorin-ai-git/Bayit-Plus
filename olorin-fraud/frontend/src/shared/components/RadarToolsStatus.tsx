/**
 * RadarToolsStatus Component
 * Feature: 004-new-olorin-frontend
 *
 * Tool execution status panel showing active tools per agent.
 * Groups tools by agent with status indicators and execution metrics.
 */

import React from 'react';
import type { RadarAgentRing } from '@shared/types/radar.types';
import { getAgentDisplayName, getAgentIcon } from '@shared/types/agent.types';

export interface RadarToolsStatusProps {
  agents: RadarAgentRing[];
  className?: string;
}

/**
 * Tool execution status panel
 */
export const RadarToolsStatus: React.FC<RadarToolsStatusProps> = ({
  agents,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {/* Agent Tool Groups */}
      <div className="flex-1 overflow-y-auto max-h-96 space-y-3">
        {agents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-gray-500">
              No agents active...
            </span>
          </div>
        ) : (
          agents.map((agent) => (
            <AgentToolGroup key={agent.agentIndex} agent={agent} />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Agent tool group component
 */
const AgentToolGroup: React.FC<{ agent: RadarAgentRing }> = ({ agent }) => {
  const statusColors = {
    running: 'text-corporate-success',
    completed: 'text-gray-400',
    failed: 'text-corporate-error',
    pending: 'text-gray-500'
  };

  const statusIcons = {
    running: '▶',
    completed: '✓',
    failed: '✗',
    pending: '○'
  };

  return (
    <div className="bg-gray-900/30 border border-purple-600/30 rounded-lg overflow-hidden">
      {/* Agent Header */}
      <div
        className="px-3 py-2 border-b border-purple-600/30"
        style={{ backgroundColor: `${agent.color}15` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getAgentIcon(agent.name)}</span>
            <span className="font-semibold text-gray-200">
              {getAgentDisplayName(agent.name)}
            </span>
            <span
              className={`ml-2 text-xs font-bold uppercase ${
                statusColors[agent.status]
              }`}
            >
              {statusIcons[agent.status]} {agent.status}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {agent.executionTime !== undefined && (
              <span className="text-gray-400">
                {(agent.executionTime / 1000).toFixed(2)}s
              </span>
            )}
            {agent.riskScore !== undefined && (
              <span
                className={`font-bold ${
                  agent.riskScore > 80
                    ? 'text-corporate-error'
                    : agent.riskScore > 60
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                }`}
              >
                Risk: {agent.riskScore}
              </span>
            )}
            <span className="text-gray-400">
              {agent.tools.length} tools
            </span>
          </div>
        </div>
      </div>

      {/* Tool List */}
      <div className="p-2 space-y-1">
        {agent.tools.length === 0 ? (
          <div className="px-2 py-1 text-xs text-gray-500">
            No tools configured
          </div>
        ) : (
          agent.tools.map((tool) => (
            <div
              key={tool.toolIndex}
              className="px-2 py-1 bg-black rounded flex items-center justify-between hover:brightness-110 transition-all duration-150"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold ${
                    statusColors[tool.status]
                  }`}
                >
                  {statusIcons[tool.status]}
                </span>
                <span className="text-sm text-gray-300">
                  {tool.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {tool.anomalyCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-corporate-error/20 text-corporate-error rounded">
                    {tool.anomalyCount}
                  </span>
                )}
                {tool.executionTime !== undefined && (
                  <span className="text-xs text-gray-400">
                    {tool.executionTime}ms
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Agent Summary Footer */}
      {agent.anomalyCount > 0 && (
        <div className="px-3 py-2 border-t border-purple-600/30 bg-gray-900/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              Total Anomalies:
            </span>
            <span className="font-bold text-corporate-error">
              {agent.anomalyCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarToolsStatus;
