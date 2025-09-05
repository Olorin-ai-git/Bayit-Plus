import React, { useState } from 'react';
import { RAGToolPerformanceProps, RAGToolPerformanceMetrics } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

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

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const renderToolOverview = () => {
    const sortedTools = [...livePerformanceData].sort((a, b) => b.successRate - a.successRate);
    
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
              onClick={() => setSelectedToolName(tool.toolName)}
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

  const renderTrendsView = () => {
    if (!selectedToolData || selectedToolData.trendsData.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📉</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Trend Data Available</h4>
          <p className="text-sm text-gray-500">
            Trend data will appear as the tool is used over time.
          </p>
        </div>
      );
    }

    const recentTrends = selectedToolData.trendsData.slice(-20); // Last 20 data points
    const maxExecutionTime = Math.max(...recentTrends.map(t => t.executionTime));
    
    return (
      <div className="space-y-6">
        {/* Selected Tool Header */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">{getToolIcon(selectedToolData.toolName)}</span>
            <div>
              <h4 className="text-lg font-semibold text-blue-900">{selectedToolData.toolName}</h4>
              <p className="text-sm text-blue-700">Performance trends over time</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-blue-900">{selectedToolData.usageCount}</div>
              <div className="text-blue-700">Total Uses</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-900">{(selectedToolData.successRate * 100).toFixed(0)}%</div>
              <div className="text-blue-700">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-900">{formatDuration(selectedToolData.avgExecutionTime)}</div>
              <div className="text-blue-700">Avg Time</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-900">{selectedToolData.userSatisfaction.toFixed(1)}/5</div>
              <div className="text-blue-700">Satisfaction</div>
            </div>
          </div>
        </div>

        {/* Trends Chart */}
        <div className="bg-white border rounded-lg p-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-4">Success Rate & Execution Time Trends</h5>
          <div className="space-y-2">
            {recentTrends.map((trend, index) => {
              const barWidth = (trend.executionTime / maxExecutionTime) * 100;
              const isSuccess = trend.successRate > 0;
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-20 text-xs text-gray-500">
                    {new Date(trend.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full flex items-center px-1 ${
                          isSuccess ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(5, barWidth)}%` }}
                      >
                        {barWidth > 15 && (
                          <span className="text-xs text-white font-medium">
                            {formatDuration(trend.executionTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 text-xs text-center">
                    <span className={`px-1 py-0.5 rounded ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isSuccess ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-green-800 mb-2">✅ Performance Highlights</h5>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Best execution time: {formatDuration(Math.min(...recentTrends.map(t => t.executionTime)))}</li>
              <li>• Success rate: {(selectedToolData.successRate * 100).toFixed(1)}% overall</li>
              <li>• Recent successes: {recentTrends.filter(t => t.successRate > 0).length}/{recentTrends.length}</li>
              <li>• User rating: {selectedToolData.userSatisfaction.toFixed(1)}/5 stars</li>
            </ul>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-yellow-800 mb-2">💡 Optimization Opportunities</h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              {selectedToolData.avgExecutionTime > 3000 && (
                <li>• Consider optimizing execution time (currently {formatDuration(selectedToolData.avgExecutionTime)})</li>
              )}
              {selectedToolData.errorRate > 0.1 && (
                <li>• Error rate is high ({(selectedToolData.errorRate * 100).toFixed(1)}%) - investigate failures</li>
              )}
              {selectedToolData.userSatisfaction < 4.0 && (
                <li>• User satisfaction could be improved (currently {selectedToolData.userSatisfaction.toFixed(1)}/5)</li>
              )}
              {selectedToolData.usageCount < 10 && (
                <li>• Low usage count - consider promoting or improving accessibility</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedView = () => {
    if (!selectedToolData) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Tool</h4>
          <p className="text-sm text-gray-500">
            Choose a tool from the list to view detailed performance analysis.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`border rounded-lg p-4 ${
            getPerformanceColor(selectedToolData.successRate, 'success').includes('green') ? 'bg-green-50 border-green-200' : 'bg-white'
          }`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(selectedToolData.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Success Rate</div>
              <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                getPerformanceColor(selectedToolData.successRate, 'success')
              }`}>
                {selectedToolData.successRate >= 0.9 ? 'Excellent' :
                 selectedToolData.successRate >= 0.7 ? 'Good' :
                 selectedToolData.successRate >= 0.5 ? 'Fair' : 'Poor'}
              </div>
            </div>
          </div>

          <div className={`border rounded-lg p-4 ${
            selectedToolData.avgExecutionTime <= 1000 ? 'bg-green-50 border-green-200' : 'bg-white'
          }`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatDuration(selectedToolData.avgExecutionTime)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg Execution Time</div>
              <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                getPerformanceColor(selectedToolData.avgExecutionTime, 'time')
              }`}>
                {selectedToolData.avgExecutionTime <= 1000 ? 'Fast' :
                 selectedToolData.avgExecutionTime <= 3000 ? 'Moderate' :
                 selectedToolData.avgExecutionTime <= 5000 ? 'Slow' : 'Very Slow'}
              </div>
            </div>
          </div>

          <div className={`border rounded-lg p-4 ${
            selectedToolData.errorRate <= 0.05 ? 'bg-green-50 border-green-200' : 'bg-white'
          }`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(selectedToolData.errorRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Error Rate</div>
              <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                getPerformanceColor(selectedToolData.errorRate, 'error')
              }`}>
                {selectedToolData.errorRate <= 0.05 ? 'Excellent' :
                 selectedToolData.errorRate <= 0.1 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
          </div>

          <div className={`border rounded-lg p-4 ${
            selectedToolData.userSatisfaction >= 4.5 ? 'bg-green-50 border-green-200' : 'bg-white'
          }`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {selectedToolData.userSatisfaction.toFixed(1)}/5
              </div>
              <div className="text-sm text-gray-600 mt-1">User Satisfaction</div>
              <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                getPerformanceColor(selectedToolData.userSatisfaction, 'satisfaction')
              }`}>
                {selectedToolData.userSatisfaction >= 4.5 ? 'Excellent' :
                 selectedToolData.userSatisfaction >= 3.5 ? 'Good' :
                 selectedToolData.userSatisfaction >= 2.5 ? 'Fair' : 'Poor'}
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-blue-800 mb-3">Usage Statistics</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-blue-900">{selectedToolData.usageCount}</div>
              <div className="text-blue-700">Total Executions</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-900">
                {Math.round(selectedToolData.usageCount * selectedToolData.successRate)}
              </div>
              <div className="text-blue-700">Successful Runs</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-900">
                {Math.round(selectedToolData.usageCount * selectedToolData.errorRate)}
              </div>
              <div className="text-blue-700">Failed Runs</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-900">
                {selectedToolData.trendsData.length}
              </div>
              <div className="text-blue-700">Data Points</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            {viewMode === 'overview' && renderToolOverview()}
            {viewMode === 'trends' && renderTrendsView()}
            {viewMode === 'detailed' && renderDetailedView()}
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