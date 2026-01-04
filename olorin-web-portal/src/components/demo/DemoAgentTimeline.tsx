/**
 * Demo Agent Timeline Component
 *
 * Displays the horizontal progression of AI agents during investigation.
 */

import React from 'react';
import { AgentResult } from '../../services/demoApiService';

interface DemoAgentTimelineProps {
  agents: string[];
  currentAgent: string | null;
  agentResults: Record<string, AgentResult>;
  progress: number;
}

const getAgentIcon = (agentName: string): string => {
  const name = agentName.toLowerCase();
  if (name.includes('device')) return '🖥️';
  if (name.includes('location')) return '📍';
  if (name.includes('network')) return '🌐';
  if (name.includes('logs') || name.includes('log')) return '📋';
  if (name.includes('auth')) return '🔐';
  if (name.includes('risk')) return '⚠️';
  return '🔍';
};

const getStatusStyles = (status: 'pending' | 'running' | 'completed'): string => {
  switch (status) {
    case 'completed':
      return 'bg-corporate-success border-corporate-success/80';
    case 'running':
      return 'bg-corporate-accentPrimary border-corporate-accentPrimary/80 animate-pulse';
    default:
      return 'bg-corporate-bgTertiary border-white/20';
  }
};

export const DemoAgentTimeline: React.FC<DemoAgentTimelineProps> = ({
  agents,
  currentAgent,
  agentResults,
  progress,
}) => {
  const getAgentStatus = (agentName: string): 'pending' | 'running' | 'completed' => {
    const agentKey = agentName.toLowerCase().replace(' ', '_');
    if (agentResults[agentKey]?.status === 'completed') return 'completed';
    if (currentAgent === agentName) return 'running';
    return 'pending';
  };

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-corporate-textMuted mb-2">
          <span>Investigation Progress</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-2 bg-corporate-bgTertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Agent timeline */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-corporate-bgTertiary" />
        <div
          className="absolute top-8 left-0 h-0.5 bg-corporate-accentPrimary transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Agent nodes */}
        <div className="flex justify-between relative z-10">
          {agents.map((agent) => {
            const status = getAgentStatus(agent);
            return (
              <div key={agent} className="flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center
                    ${getStatusStyles(status)} transition-all duration-300`}
                >
                  <span className="text-2xl">{getAgentIcon(agent)}</span>
                </div>
                <span className="mt-2 text-xs text-center text-corporate-textMuted max-w-[80px]">
                  {agent}
                </span>
                {status === 'completed' && agentResults[agent.toLowerCase().replace(' ', '_')] && (
                  <span className="mt-1 text-xs text-corporate-success">
                    {agentResults[agent.toLowerCase().replace(' ', '_')].risk_level}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DemoAgentTimeline;
