import React, { useState } from 'react';
import { Agent } from '../types';

interface AgentResult {
  id: string;
  agent_id: string;
  step_id: string;
  data: Record<string, any>;
  findings: string[];
  risk_score: number;
  confidence: number;
  execution_time: number;
  created_at: string;
}

interface AgentResultsViewerProps {
  agentResults: AgentResult[];
  agents: Agent[];
  className?: string;
}

export const AgentResultsViewer: React.FC<AgentResultsViewerProps> = ({
  agentResults,
  agents,
  className = ''
}) => {
  const [selectedResult, setSelectedResult] = useState<AgentResult | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const getAgentInfo = (agentId: string) => {
    return agents.find(agent => agent.id === agentId);
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return 'text-red-600 bg-red-100';
    if (riskScore >= 60) return 'text-orange-600 bg-orange-100';
    if (riskScore >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (agentResults.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Agent Results</h3>
        <p className="mt-1 text-sm text-gray-500">
          Agent analysis results will appear here when available.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {agentResults.map((result) => {
        const agent = getAgentInfo(result.agent_id);
        const isExpanded = expandedResults.has(result.id);

        return (
          <div
            key={result.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div
              className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpanded(result.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {agent?.name || 'Unknown Agent'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {agent?.type} • {formatTimestamp(result.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Risk Score */}
                  <div className="text-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(result.risk_score)}`}>
                      Risk: {result.risk_score}%
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="text-center">
                    <span className={`text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                      {result.confidence}% confidence
                    </span>
                  </div>

                  {/* Execution Time */}
                  <div className="text-center">
                    <span className="text-xs text-gray-500">
                      {formatExecutionTime(result.execution_time)}
                    </span>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-6 py-4 space-y-4">
                {/* Findings */}
                {result.findings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Key Findings</h4>
                    <ul className="space-y-1">
                      {result.findings.map((finding, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="text-blue-500 mr-2 mt-1">•</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Analysis Data */}
                {Object.keys(result.data).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Analysis Data</h4>
                    <div className="bg-gray-50 rounded-md p-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Agent Details */}
                {agent && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Agent Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          agent.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Version:</span>
                        <span className="ml-2 text-gray-900">{agent.version}</span>
                      </div>
                    </div>

                    {agent.description && (
                      <p className="mt-2 text-sm text-gray-600">{agent.description}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};