import React, { useState, useEffect } from 'react';
import {
  AgentMetrics,
  AgentAlert,
  AnalyticsSummary,
  AnalyticsFilter,
  RealtimeMetrics
} from '../types/agentAnalytics';

interface AgentAnalyticsDashboardProps {
  agents: AgentMetrics[];
  alerts: AgentAlert[];
  summary: AnalyticsSummary;
  realtimeMetrics: RealtimeMetrics;
  onFilterChange: (filters: AnalyticsFilter) => void;
  onRefresh: () => void;
  onExport: (format: 'csv' | 'json' | 'pdf' | 'excel') => void;
  onAlertAcknowledge: (alertId: string) => void;
  onAgentToggle: (agentId: string, enabled: boolean) => void;
  isLoading?: boolean;
}

export const AgentAnalyticsDashboard: React.FC<AgentAnalyticsDashboardProps> = ({
  agents,
  alerts,
  summary,
  realtimeMetrics,
  onFilterChange,
  onRefresh,
  onExport,
  onAlertAcknowledge,
  onAgentToggle,
  isLoading = false
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedAgentTypes, setSelectedAgentTypes] = useState<string[]>(['autonomous', 'manual', 'hybrid']);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'cost' | 'usage'>('performance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAlerts, setShowAlerts] = useState(true);

  // Filter agents based on current filters
  const filteredAgents = agents
    .filter(agent => {
      const typeMatch = selectedAgentTypes.includes(agent.agentType);
      const statusMatch = !showOnlyActive || agent.status === 'active';
      return typeMatch && statusMatch;
    })
    .sort((a, b) => {
      let valueA: number, valueB: number;

      switch (sortBy) {
        case 'name':
          return sortOrder === 'asc'
            ? a.agentName.localeCompare(b.agentName)
            : b.agentName.localeCompare(a.agentName);
        case 'performance':
          valueA = a.performance.successRate;
          valueB = b.performance.successRate;
          break;
        case 'cost':
          valueA = a.cost.totalCost;
          valueB = b.cost.totalCost;
          break;
        case 'usage':
          valueA = a.usage.totalCalls;
          valueB = b.usage.totalCalls;
          break;
        default:
          valueA = a.performance.successRate;
          valueB = b.performance.successRate;
      }

      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });

  // Get unacknowledged alerts
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(alert => alert.severity === 'critical');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '📈';
    if (trend < 0) return '📉';
    return '➡️';
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  useEffect(() => {
    const filters: AnalyticsFilter = {
      agentTypes: selectedAgentTypes,
      dateRange: {
        start: new Date(Date.now() - getTimeRangeMs(selectedTimeRange)).toISOString(),
        end: new Date().toISOString()
      },
      granularity: selectedTimeRange === '1h' ? 'hour' : selectedTimeRange === '24h' ? 'hour' : 'day'
    };

    onFilterChange(filters);
  }, [selectedTimeRange, selectedAgentTypes, onFilterChange]);

  function getTimeRangeMs(range: string): number {
    switch (range) {
      case '1h':
        return 60 * 60 * 1000;
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Analytics</h1>
            <p className="text-gray-600 mt-1">Monitor and optimize AI agent performance</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🔄 Refresh
            </button>

            <div className="relative">
              <select
                onChange={(e) => onExport(e.target.value as any)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                defaultValue=""
              >
                <option value="" disabled>Export</option>
                <option value="csv">Export CSV</option>
                <option value="json">Export JSON</option>
                <option value="pdf">Export PDF</option>
                <option value="excel">Export Excel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real-time Status Bar */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">Live Data</span>
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {new Date(realtimeMetrics.timestamp).toLocaleTimeString()}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500">Active Agents:</span>
                <span className="ml-1 font-medium">{realtimeMetrics.activeAgents}</span>
              </div>
              <div>
                <span className="text-gray-500">Current Load:</span>
                <span className="ml-1 font-medium">{formatPercentage(realtimeMetrics.systemLoad)}</span>
              </div>
              <div>
                <span className="text-gray-500">Response Time:</span>
                <span className="ml-1 font-medium">{realtimeMetrics.responseTime}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-red-900">Critical Alerts</h3>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                {criticalAlerts.length}
              </span>
            </div>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between bg-white rounded p-3 border border-red-200">
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">Agent: {alert.agentName}</p>
                  </div>
                  <button
                    onClick={() => onAlertAcknowledge(alert.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-3xl font-bold text-gray-900">{summary.totalAgents}</p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.activeAgents} active
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              🤖
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900">{formatPercentage(summary.averageSuccessRate)}</p>
              <div className={`text-sm mt-1 flex items-center gap-1 ${getTrendColor(summary.performanceTrend)}`}>
                <span>{getTrendIcon(summary.performanceTrend)}</span>
                <span>{Math.abs(summary.performanceTrend).toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalCost)}</p>
              <div className={`text-sm mt-1 flex items-center gap-1 ${getTrendColor(summary.costTrend)}`}>
                <span>{getTrendIcon(summary.costTrend)}</span>
                <span>{Math.abs(summary.costTrend).toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              💰
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Investigations</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(summary.totalInvestigations)}</p>
              <div className={`text-sm mt-1 flex items-center gap-1 ${getTrendColor(summary.usageTrend)}`}>
                <span>{getTrendIcon(summary.usageTrend)}</span>
                <span>{Math.abs(summary.usageTrend).toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              📊
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Agent Types:</label>
            <div className="flex gap-2">
              {['autonomous', 'manual', 'hybrid'].map(type => (
                <label key={type} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedAgentTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAgentTypes([...selectedAgentTypes, type]);
                      } else {
                        setSelectedAgentTypes(selectedAgentTypes.filter(t => t !== type));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => setShowOnlyActive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Active Only</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="performance">Performance</option>
              <option value="cost">Cost</option>
              <option value="usage">Usage</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Agent Performance ({filteredAgents.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(agent.status)}`}>
                            {agent.status}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium capitalize">
                            {agent.agentType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Success: {formatPercentage(agent.performance.successRate)}</div>
                      <div>Avg Time: {agent.performance.averageCompletionTime}m</div>
                      <div>Accuracy: {formatPercentage(agent.performance.averageAccuracy)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Total: {formatNumber(agent.usage.totalCalls)}</div>
                      <div>Today: {formatNumber(agent.usage.callsToday)}</div>
                      <div>Avg/Day: {formatNumber(agent.usage.averageCallsPerDay)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Total: {formatCurrency(agent.cost.totalCost)}</div>
                      <div>Today: {formatCurrency(agent.cost.costToday)}</div>
                      <div>Per Call: {formatCurrency(agent.cost.averageCostPerCall)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>Satisfaction: {agent.quality.userSatisfactionScore.toFixed(1)}/5</div>
                      <div>F1 Score: {formatPercentage(agent.quality.f1Score)}</div>
                      <div>Confidence: {formatPercentage(agent.quality.confidenceScore)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onAgentToggle(agent.id, agent.status !== 'active')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          agent.status === 'active'
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {agent.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button className="text-blue-600 hover:text-blue-900 text-xs font-medium">
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
            <p className="text-gray-600">Try adjusting your filters to see more agents.</p>
          </div>
        )}
      </div>
    </div>
  );
};