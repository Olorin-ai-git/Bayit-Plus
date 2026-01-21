import React, { useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface RiskMetric {
  category: string;
  value: number;
  threshold: number;
  status: 'low' | 'medium' | 'high' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface AgentResult {
  agentId: string;
  agentName: string;
  agentType: string;
  executionTime: number;
  status: 'completed' | 'failed' | 'timeout' | 'cancelled';
  riskScore: number;
  confidence: number;
  findings: string[];
  recommendations: string[];
  metrics: RiskMetric[];
  timestamp: string;
}

interface AgentResultsAnalyzerProps {
  results: AgentResult[];
  onRefresh?: () => void;
  onExport?: (format: 'csv' | 'json' | 'pdf') => void;
  className?: string;
}

const AgentResultsAnalyzer: React.FC<AgentResultsAnalyzerProps> = ({
  results,
  onRefresh,
  onExport,
  className = ""
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Calculate summary statistics
  const getSummaryStats = useCallback(() => {
    const filteredResults = selectedAgent === 'all'
      ? results
      : results.filter(r => r.agentId === selectedAgent);

    const total = filteredResults.length;
    const completed = filteredResults.filter(r => r.status === 'completed').length;
    const failed = filteredResults.filter(r => r.status === 'failed').length;
    const avgRiskScore = total > 0
      ? filteredResults.reduce((sum, r) => sum + r.riskScore, 0) / total
      : 0;
    const avgConfidence = total > 0
      ? filteredResults.reduce((sum, r) => sum + r.confidence, 0) / total
      : 0;
    const avgExecutionTime = total > 0
      ? filteredResults.reduce((sum, r) => sum + r.executionTime, 0) / total
      : 0;

    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      avgRiskScore,
      avgConfidence,
      avgExecutionTime
    };
  }, [results, selectedAgent]);

  // Get risk status color
  const getRiskStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'timeout':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-green-500" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  // Toggle result details
  const toggleDetails = (resultId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [resultId]: !prev[resultId]
    }));
  };

  const stats = getSummaryStats();
  const uniqueAgents = Array.from(new Set(results.map(r => r.agentName)));

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header with filters and actions */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Agent Results Analysis
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {onExport && (
              <div className="relative group">
                <button className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 mt-2 w-24 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button onClick={() => onExport('csv')} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">CSV</button>
                  <button onClick={() => onExport('json')} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">JSON</button>
                  <button onClick={() => onExport('pdf')} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">PDF</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Agents</option>
              {uniqueAgents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Executions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.avgRiskScore.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg Risk Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.avgExecutionTime.toFixed(1)}s</div>
            <div className="text-sm text-gray-600">Avg Execution Time</div>
          </div>
        </div>
      </div>

      {/* Results list */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No agent results available</p>
          </div>
        ) : (
          results.map((result) => (
            <div key={`${result.agentId}-${result.timestamp}`} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {result.agentName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Risk: {result.riskScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Confidence: {result.confidence.toFixed(1)}%
                    </div>
                  </div>

                  <button
                    onClick={() => toggleDetails(`${result.agentId}-${result.timestamp}`)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showDetails[`${result.agentId}-${result.timestamp}`] ? 'Hide' : 'Show'} Details
                  </button>
                </div>
              </div>

              {/* Detailed view */}
              {showDetails[`${result.agentId}-${result.timestamp}`] && (
                <div className="mt-4 space-y-4">
                  {/* Findings */}
                  {result.findings.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Findings</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {result.findings.map((finding, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-blue-600">•</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {result.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-green-600">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risk metrics */}
                  {result.metrics.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Risk Metrics</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.metrics.map((metric, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-700">{metric.category}</span>
                              {getTrendIcon(metric.trend)}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{metric.value}</span>
                              <span className={`px-2 py-1 text-xs rounded ${getRiskStatusColor(metric.status)}`}>
                                {metric.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AgentResultsAnalyzer;