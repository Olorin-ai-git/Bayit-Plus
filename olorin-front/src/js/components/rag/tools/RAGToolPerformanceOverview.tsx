import React from 'react';
import { RAGToolPerformanceMetrics } from '../../../types/RAGTypes';

interface RAGToolPerformanceOverviewProps {
  performanceData: RAGToolPerformanceMetrics[];
  selectedToolName: string;
  onToolSelect: (toolName: string) => void;
}

/**
 * RAG Tool Performance Overview Component
 * Displays performance overview cards for all tools
 */
const RAGToolPerformanceOverview: React.FC<RAGToolPerformanceOverviewProps> = ({
  performanceData,
  selectedToolName,
  onToolSelect,
}) => {
  const getToolIcon = (toolName: string) => {
    const toolIcons: Record<string, string> = {
      'splunk_search': '🔍',
      'risk_calculator': '📈',
      'device_analyzer': '📱',
      'geo_validator': '🌍',
      'fraud_detector': '🕵️',
      'network_analyzer': '🌐',
      'behavioral_model': '🧠',
      'identity_checker': '🆔',
    };
    return toolIcons[toolName.toLowerCase().replace(' ', '_')] || '🔧';
  };

  const getPerformanceColor = (score: number, type: 'success' | 'time' | 'error' | 'satisfaction') => {
    switch (type) {
      case 'success':
        if (score >= 0.9) return 'text-green-600 bg-green-100';
        if (score >= 0.7) return 'text-blue-600 bg-blue-100';
        if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      case 'time':
        if (score <= 1000) return 'text-green-600 bg-green-100';
        if (score <= 3000) return 'text-blue-600 bg-blue-100';
        if (score <= 5000) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      case 'error':
        if (score <= 0.05) return 'text-green-600 bg-green-100';
        if (score <= 0.1) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      case 'satisfaction':
        if (score >= 4.5) return 'text-green-600 bg-green-100';
        if (score >= 3.5) return 'text-blue-600 bg-blue-100';
        if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const sortedTools = [...performanceData].sort((a, b) => b.successRate - a.successRate);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedTools.map((tool) => {
        const isSelected = tool.toolName === selectedToolName;
        
        return (
          <div 
            key={tool.toolName}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => onToolSelect(tool.toolName)}
          >
            {/* Tool Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{getToolIcon(tool.toolName)}</span>
                <h4 className="text-sm font-semibold text-gray-900">{tool.toolName}</h4>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                getPerformanceColor(tool.successRate, 'success')
              }`}>
                {(tool.successRate * 100).toFixed(0)}%
              </span>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="text-center">
                <div className="font-bold text-gray-900">{tool.usageCount}</div>
                <div className="text-gray-500">Uses</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{formatDuration(tool.avgExecutionTime)}</div>
                <div className="text-gray-500">Avg Time</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{(tool.errorRate * 100).toFixed(1)}%</div>
                <div className="text-gray-500">Error Rate</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{tool.userSatisfaction.toFixed(1)}/5</div>
                <div className="text-gray-500">Rating</div>
              </div>
            </div>

            {/* Performance Bars */}
            <div className="mt-3 space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Success Rate</span>
                  <span>{(tool.successRate * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      tool.successRate >= 0.9 ? 'bg-green-500' :
                      tool.successRate >= 0.7 ? 'bg-blue-500' :
                      tool.successRate >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${tool.successRate * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>User Satisfaction</span>
                  <span>{tool.userSatisfaction.toFixed(1)}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{ width: `${(tool.userSatisfaction / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RAGToolPerformanceOverview;