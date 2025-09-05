import React, { useState } from 'react';
import { RAGToolPerformanceProps, RAGToolPerformanceMetrics } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';
import RAGToolPerformanceOverview from './RAGToolPerformanceOverview';
import RAGToolPerformanceTrends from './RAGToolPerformanceTrends';
import RAGToolPerformanceDetailed from './RAGToolPerformanceDetailed';

/**
 * Utility function to get performance color classes based on metric type and value
 */
const getPerformanceColor = (value: number, type: 'success' | 'time' | 'error' | 'satisfaction'): string => {
  switch (type) {
    case 'success':
      if (value >= 0.9) return 'bg-green-100 text-green-800';
      if (value >= 0.7) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    case 'time':
      if (value <= 1000) return 'bg-green-100 text-green-800';
      if (value <= 3000) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    case 'error':
      if (value <= 0.05) return 'bg-green-100 text-green-800';
      if (value <= 0.1) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    case 'satisfaction':
      if (value >= 4.5) return 'bg-green-100 text-green-800';
      if (value >= 3.5) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Utility function to format duration in milliseconds to human-readable format
 */
const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};

/**
 * RAG Tool Performance Component
 * Historical tool effectiveness and performance tracking
 */
const RAGToolPerformance: React.FC<RAGToolPerformanceProps> = ({
  investigationId,
  performanceData = [],
  selectedTool,
  timeRange = '24h',
}) => {
  const [livePerformanceData, setLivePerformanceData] = useState<RAGToolPerformanceMetrics[]>(performanceData);
  const [selectedToolName, setSelectedToolName] = useState<string>(selectedTool || performanceData[0]?.toolName || '');
  const [viewMode, setViewMode] = useState<'overview' | 'trends' | 'detailed'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onToolPerformanceUpdate: (data) => {
      if (data.toolMetrics) {
        setLivePerformanceData(data.toolMetrics);
      }
    },
    onRAGEvent: (event) => {
      // Update tool performance based on tool usage events
      if (event.type === 'rag_tool_execution' && event.data.tool_name) {
        const toolName = event.data.tool_name;
        const success = event.data.success || false;
        const executionTime = event.data.execution_time || 0;
        
        setLivePerformanceData(prev => 
          prev.map(tool => 
            tool.toolName === toolName 
              ? {
                  ...tool,
                  usageCount: tool.usageCount + 1,
                  successRate: success 
                    ? ((tool.successRate * tool.usageCount) + 1) / (tool.usageCount + 1)
                    : (tool.successRate * tool.usageCount) / (tool.usageCount + 1),
                  avgExecutionTime: ((tool.avgExecutionTime * tool.usageCount) + executionTime) / (tool.usageCount + 1),
                  trendsData: [...tool.trendsData, {
                    timestamp: event.timestamp,
                    successRate: success ? 1 : 0,
                    executionTime: executionTime,
                  }].slice(-50), // Keep last 50 data points
                }
              : tool
          )
        );
      }
    },
  });

  const selectedToolData = livePerformanceData.find(tool => tool.toolName === selectedToolName);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tool Performance</h3>
            <p className="text-sm text-gray-500">
              {livePerformanceData.length} tools tracked • Performance analytics and trends
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <div className="flex items-center space-x-1 border rounded-md">
              {['overview', 'trends', 'detailed'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === mode 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {mode === 'overview' && '📊'}
                  {mode === 'trends' && '📈'}
                  {mode === 'detailed' && '🔍'}
                  <span className="ml-1 capitalize">{mode}</span>
                </button>
              ))}
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span>{isConnected ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {livePerformanceData.length > 0 ? (
          <div>
            {viewMode === 'overview' && (
              <RAGToolPerformanceOverview 
                performanceData={livePerformanceData}
                selectedToolName={selectedToolName}
                onToolSelect={setSelectedToolName}
              />
            )}
            {viewMode === 'trends' && selectedToolData && (
              <RAGToolPerformanceTrends selectedToolData={selectedToolData} />
            )}
            {viewMode === 'detailed' && (
              <RAGToolPerformanceDetailed selectedToolData={selectedToolData} />
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📈</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h4>
            <p className="text-sm text-gray-500">
              Tool performance metrics will appear here as tools are used in investigations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGToolPerformance;