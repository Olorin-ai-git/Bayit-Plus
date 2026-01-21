/**
 * Demo Progress Component
 *
 * Displays real-time progress of the demo investigation
 * with agent timeline and current status.
 */

import React from 'react';
import { DemoStatusResponse } from '../../services/demoApiService';
import { DemoAgentTimeline } from './DemoAgentTimeline';

interface DemoProgressProps {
  status: DemoStatusResponse;
  agents: string[];
}

const getStatusMessage = (status: string, currentAgent: string | null): string => {
  switch (status) {
    case 'starting':
      return 'Initializing investigation...';
    case 'running':
      return currentAgent ? `${currentAgent} analyzing data...` : 'Processing...';
    case 'completed':
      return 'Investigation complete!';
    case 'error':
      return 'Investigation failed';
    default:
      return 'Preparing...';
  }
};

const getStatusIndicator = (status: string): React.ReactNode => {
  switch (status) {
    case 'starting':
    case 'running':
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-corporate-accentPrimary animate-pulse" />
          <span className="text-corporate-accentPrimary">In Progress</span>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-corporate-success" />
          <span className="text-corporate-success">Completed</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-corporate-error" />
          <span className="text-corporate-error">Error</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-corporate-textMuted" />
          <span className="text-corporate-textMuted">Idle</span>
        </div>
      );
  }
};

export const DemoProgress: React.FC<DemoProgressProps> = ({ status, agents }) => {
  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">Investigation Progress</h3>
        {getStatusIndicator(status.status)}
      </div>

      <p className="text-corporate-textSecondary mb-6">
        {getStatusMessage(status.status, status.current_agent)}
      </p>

      <DemoAgentTimeline
        agents={agents}
        currentAgent={status.current_agent}
        agentResults={status.agent_results}
        progress={status.progress}
      />

      {status.current_agent && (
        <div className="mt-6 p-4 bg-corporate-accentPrimary/10 rounded-lg border border-corporate-accentPrimary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-corporate-accentPrimary/20 flex items-center justify-center">
              <span className="text-xl">🔍</span>
            </div>
            <div>
              <p className="text-corporate-textPrimary font-medium">{status.current_agent}</p>
              <p className="text-sm text-corporate-accentTertiary">Analyzing signals and patterns...</p>
            </div>
          </div>
        </div>
      )}

      {status.error && (
        <div className="mt-4 p-4 bg-corporate-error/10 rounded-lg border border-corporate-error/20">
          <p className="text-corporate-error text-sm">{status.error}</p>
        </div>
      )}
    </div>
  );
};

export default DemoProgress;
