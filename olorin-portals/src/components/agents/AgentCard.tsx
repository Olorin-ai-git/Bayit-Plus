/**
 * Agent Card Component
 *
 * Displays an individual AI agent with its capabilities and tools.
 */

import React from 'react';

export interface AgentInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  capabilities: string[];
  dataSources: string[];
  toolCount: number;
  color: string;
}

interface AgentCardProps {
  agent: AgentInfo;
  isExpanded: boolean;
  onToggle: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, isExpanded, onToggle }) => {
  return (
    <div
      className={`
        glass-card rounded-xl overflow-hidden transition-all duration-300 cursor-pointer
        ${isExpanded ? 'ring-2 ring-corporate-accentPrimary shadow-lg shadow-corporate-accentPrimary/20' : 'hover:border-corporate-accentPrimary/50'}
      `}
      onClick={onToggle}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${agent.color}20` }}
          >
            {agent.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-corporate-textPrimary mb-1">{agent.name}</h3>
            <p className="text-corporate-textSecondary text-sm">{agent.description}</p>
          </div>
          <div className="text-corporate-textMuted">
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold" style={{ color: agent.color }}>
              {agent.toolCount}+
            </span>
            <span className="text-corporate-textMuted text-sm ml-1">Tools</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-corporate-textPrimary">{agent.dataSources.length}</span>
            <span className="text-corporate-textMuted text-sm ml-1">Data Sources</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-white/10 pt-4 animate-fadeInUp">
          {/* Capabilities */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-corporate-textMuted mb-2">Key Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-3 py-1 text-sm rounded-full"
                  style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h4 className="text-sm font-medium text-corporate-textMuted mb-2">Data Sources</h4>
            <div className="grid grid-cols-2 gap-2">
              {agent.dataSources.map((source) => (
                <div key={source} className="flex items-center gap-2 text-sm text-corporate-textSecondary">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                  {source}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentCard;
