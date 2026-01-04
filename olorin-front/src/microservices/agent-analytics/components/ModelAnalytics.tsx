import React, { useState, useMemo } from 'react';
import {
  ModelUsageData,
  CostBreakdown,
  AnalyticsFilter
} from '../types/agentAnalytics';

interface ModelAnalyticsProps {
  models: ModelUsageData[];
  costBreakdown: CostBreakdown[];
  onFilterChange?: (filter: Partial<AnalyticsFilter>) => void;
  onModelSelect?: (modelName: string) => void;
  isLoading?: boolean;
  className?: string;
}

interface ModelPerformanceMetric {
  modelName: string;
  provider: string;
  totalCalls: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  costPerCall: number;
  efficiency: number;
}

export const ModelAnalytics: React.FC<ModelAnalyticsProps> = ({
  models,
  costBreakdown,
  onFilterChange,
  onModelSelect,
  isLoading = false,
  className = ''
}) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'usage' | 'cost' | 'performance' | 'efficiency'>('usage');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  // Calculate model performance metrics
  const modelMetrics = useMemo((): ModelPerformanceMetric[] => {
    return models.map(model => {
      const costPerCall = model.totalCost / Math.max(model.totalCalls, 1);
      const efficiency = model.totalCalls / Math.max(model.averageResponseTime, 1);

      return {
        modelName: model.modelName,
        provider: model.provider,
        totalCalls: model.totalCalls,
        totalCost: model.totalCost,
        averageResponseTime: model.averageResponseTime,
        errorRate: model.errorRate,
        costPerCall,
        efficiency
      };
    }).filter(model =>
      selectedProvider === 'all' || model.provider === selectedProvider
    ).sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.totalCalls - a.totalCalls;
        case 'cost':
          return b.totalCost - a.totalCost;
        case 'performance':
          return a.averageResponseTime - b.averageResponseTime;
        case 'efficiency':
          return b.efficiency - a.efficiency;
        default:
          return 0;
      }
    });
  }, [models, selectedProvider, sortBy]);

  // Calculate provider statistics
  const providerStats = useMemo(() => {
    const stats = new Map<string, {
      totalCalls: number;
      totalCost: number;
      averageResponseTime: number;
      modelCount: number;
    }>();

    models.forEach(model => {
      const existing = stats.get(model.provider) || {
        totalCalls: 0,
        totalCost: 0,
        averageResponseTime: 0,
        modelCount: 0
      };

      stats.set(model.provider, {
        totalCalls: existing.totalCalls + model.totalCalls,
        totalCost: existing.totalCost + model.totalCost,
        averageResponseTime: existing.averageResponseTime + model.averageResponseTime,
        modelCount: existing.modelCount + 1
      });
    });

    return Array.from(stats.entries()).map(([provider, data]) => ({
      provider,
      ...data,
      averageResponseTime: data.averageResponseTime / data.modelCount
    }));
  }, [models]);

  // Get top performing models
  const topModels = useMemo(() => {
    const sorted = [...modelMetrics].sort((a, b) => b.efficiency - a.efficiency);
    return {
      mostUsed: sorted.sort((a, b) => b.totalCalls - a.totalCalls)[0],
      mostEfficient: sorted[0],
      mostCostEffective: sorted.sort((a, b) => a.costPerCall - b.costPerCall)[0],
      fastest: sorted.sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0]
    };
  }, [modelMetrics]);

  const handleModelClick = (modelName: string) => {
    setSelectedModel(selectedModel === modelName ? null : modelName);
    onModelSelect?.(modelName);
  };

  const handleTimeRangeChange = (range: '24h' | '7d' | '30d' | '90d') => {
    setTimeRange(range);
    const now = new Date();
    const start = new Date(now);

    switch (range) {
      case '24h':
        start.setHours(now.getHours() - 24);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
    }

    onFilterChange?.({
      dateRange: {
        start: start.toISOString(),
        end: now.toISOString()
      }
    });
  };

  const renderProviderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {providerStats.map(provider => (
        <div key={provider.provider} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900 capitalize">
              {provider.provider}
            </h3>
            <span className="text-xs text-gray-500">{provider.modelCount} models</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-600">Total Calls:</span>
              <span className="text-xs font-medium">{provider.totalCalls.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-600">Total Cost:</span>
              <span className="text-xs font-medium">${provider.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-600">Avg Response:</span>
              <span className="text-xs font-medium">{provider.averageResponseTime.toFixed(0)}ms</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTopModels = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Models</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-sm font-medium text-gray-900">Most Used</div>
          <div className="text-xs text-gray-600">{topModels.mostUsed?.modelName || 'N/A'}</div>
          <div className="text-xs text-gray-500">
            {topModels.mostUsed?.totalCalls.toLocaleString() || 0} calls
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">⚡</div>
          <div className="text-sm font-medium text-gray-900">Most Efficient</div>
          <div className="text-xs text-gray-600">{topModels.mostEfficient?.modelName || 'N/A'}</div>
          <div className="text-xs text-gray-500">
            {topModels.mostEfficient?.efficiency.toFixed(1) || 0} calls/ms
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-sm font-medium text-gray-900">Most Cost-Effective</div>
          <div className="text-xs text-gray-600">{topModels.mostCostEffective?.modelName || 'N/A'}</div>
          <div className="text-xs text-gray-500">
            ${topModels.mostCostEffective?.costPerCall.toFixed(4) || 0}/call
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">🚀</div>
          <div className="text-sm font-medium text-gray-900">Fastest</div>
          <div className="text-xs text-gray-600">{topModels.fastest?.modelName || 'N/A'}</div>
          <div className="text-xs text-gray-500">
            {topModels.fastest?.averageResponseTime.toFixed(0) || 0}ms avg
          </div>
        </div>
      </div>
    </div>
  );

  const renderModelTable = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Model Performance</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Providers</option>
              {Array.from(new Set(models.map(m => m.provider))).map(provider => (
                <option key={provider} value={provider} className="capitalize">
                  {provider}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="usage">Sort by Usage</option>
              <option value="cost">Sort by Cost</option>
              <option value="performance">Sort by Performance</option>
              <option value="efficiency">Sort by Efficiency</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Efficiency
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {modelMetrics.map((model) => (
              <tr
                key={`${model.provider}-${model.modelName}`}
                onClick={() => handleModelClick(model.modelName)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedModel === model.modelName ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{model.modelName}</div>
                    <div className="text-sm text-gray-500 capitalize">{model.provider}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{model.totalCalls.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">calls</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">${model.totalCost.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">${model.costPerCall.toFixed(4)}/call</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{model.averageResponseTime.toFixed(0)}ms</div>
                  <div className="text-xs text-gray-500">avg response</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    model.errorRate <= 1 ? 'bg-green-100 text-green-800' :
                    model.errorRate <= 5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {model.errorRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{model.efficiency.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">calls/ms</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderModelDetails = () => {
    if (!selectedModel) return null;

    const model = models.find(m => m.modelName === selectedModel);
    if (!model) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {model.modelName} - Detailed Usage
          </h3>
          <button
            onClick={() => setSelectedModel(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Usage Timeline</h4>
            <div className="space-y-2">
              {model.usage.slice(-7).map((usage, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">
                    {new Date(usage.timestamp).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm">{usage.calls} calls</span>
                    <span className="text-sm">${usage.cost.toFixed(2)}</span>
                    <span className="text-sm">{usage.responseTime.toFixed(0)}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h4>
            <div className="space-y-2">
              {costBreakdown
                .filter(cost => cost.subcategory.includes(model.modelName))
                .map((cost, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{cost.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">${cost.cost.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">({cost.percentage.toFixed(1)}%)</span>
                      <span className={`text-xs ${
                        cost.trend > 0 ? 'text-red-500' : cost.trend < 0 ? 'text-green-500' : 'text-gray-500'
                      }`}>
                        {cost.trend > 0 ? '↗' : cost.trend < 0 ? '↘' : '→'} {Math.abs(cost.trend).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24" />
          ))}
        </div>
        <div className="bg-gray-200 rounded-lg h-32" />
        <div className="bg-gray-200 rounded-lg h-64" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Range Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Model Analytics</h2>
        <div className="flex space-x-2">
          {(['24h', '7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Overview */}
      {renderProviderOverview()}

      {/* Top Models */}
      {renderTopModels()}

      {/* Model Performance Table */}
      {renderModelTable()}

      {/* Model Details */}
      {renderModelDetails()}
    </div>
  );
};

export default ModelAnalytics;