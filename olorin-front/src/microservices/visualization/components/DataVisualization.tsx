import React, { useState, useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, Map, Download, Filter, RefreshCw, Eye } from 'lucide-react';
import LocationMap from './LocationMap';
import RiskScoreDisplay from './RiskScoreDisplay';
import OverallRiskScore from './OverallRiskScore';

interface ChartData {
  id: string;
  name: string;
  value: number;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  category?: string;
}

interface DataVisualizationProps {
  className?: string;
  investigationId?: string;
  realTime?: boolean;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({
  className = '',
  investigationId,
  realTime = false,
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'risk' | 'geographic' | 'trends'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for visualization - in production, this would come from props or API
  const mockRiskMetrics = {
    overallScore: 74,
    behavioralRisk: 65,
    technicalRisk: 82,
    locationRisk: 45,
    deviceRisk: 78,
    networkRisk: 71,
    accountAge: 32,
    transactionVolume: 15420,
    anomalyCount: 8,
    lastUpdated: new Date().toISOString(),
  };

  const mockRiskFactors = [
    {
      id: '1',
      name: 'Multiple Device Access',
      score: 85,
      weight: 2.5,
      description: 'Account accessed from multiple devices in short timeframe',
      category: 'device' as const,
      status: 'critical' as const,
    },
    {
      id: '2',
      name: 'Unusual Location Pattern',
      score: 72,
      weight: 2.0,
      description: 'Login from geographically impossible location',
      category: 'location' as const,
      status: 'warning' as const,
    },
    {
      id: '3',
      name: 'High Transaction Velocity',
      score: 68,
      weight: 1.8,
      description: 'Rapid succession of transactions',
      category: 'behavioral' as const,
      status: 'warning' as const,
    },
  ];

  const mockLocations = [
    {
      id: '1',
      lat: 40.7128,
      lng: -74.0060,
      type: 'risk' as const,
      title: 'Suspicious Login - New York',
      description: 'High-risk login detected',
      timestamp: new Date().toISOString(),
      riskLevel: 'high' as const,
    },
    {
      id: '2',
      lat: 34.0522,
      lng: -118.2437,
      type: 'transaction' as const,
      title: 'Large Transaction - Los Angeles',
      description: '$5,000 wire transfer',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      riskLevel: 'medium' as const,
    },
  ];

  const fraudTrendsData: ChartData[] = [
    { id: '1', name: 'Account Takeover', value: 34, color: 'bg-red-500', trend: 'up', change: 12 },
    { id: '2', name: 'Payment Fraud', value: 28, color: 'bg-orange-500', trend: 'down', change: -5 },
    { id: '3', name: 'Identity Theft', value: 22, color: 'bg-yellow-500', trend: 'up', change: 8 },
    { id: '4', name: 'Synthetic ID', value: 16, color: 'bg-purple-500', trend: 'stable', change: 0 },
  ];

  const timeSeriesData: TimeSeriesPoint[] = useMemo(() => {
    const now = new Date();
    const points: TimeSeriesPoint[] = [];
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;

    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const baseValue = 50 + Math.sin(i * 0.1) * 20;
      const noise = (Math.random() - 0.5) * 10;
      points.push({
        timestamp: timestamp.toISOString(),
        value: Math.max(0, Math.min(100, baseValue + noise)),
      });
    }
    return points;
  }, [timeRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // In production, this would export the current visualization data
    console.log('Exporting visualization data...');
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-green-500 transform rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OverallRiskScore
            metrics={mockRiskMetrics}
            size="md"
            showDetails={true}
            animated={true}
          />
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Fraud Types</h3>
            <div className="space-y-3">
              {fraudTrendsData.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                    {getTrendIcon(item.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Risk Score Trend</h3>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Risk trend visualization would appear here</p>
            <p className="text-sm text-gray-500 mt-1">{timeSeriesData.length} data points over {timeRange}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRiskView = () => (
    <div className="space-y-6">
      <RiskScoreDisplay
        overallScore={mockRiskMetrics.overallScore}
        riskFactors={mockRiskFactors}
        size="lg"
        showDetails={true}
        animated={true}
      />
    </div>
  );

  const renderGeographicView = () => (
    <div className="space-y-6">
      <LocationMap
        locations={mockLocations}
        height="500px"
        showControls={true}
        showFilters={true}
        clustered={true}
        onLocationClick={(location) => console.log('Location clicked:', location)}
      />
    </div>
  );

  const renderTrendsView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Fraud Detection Trends</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {fraudTrendsData.map((item) => (
            <div key={item.id} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`w-16 h-16 ${item.color} rounded-full mx-auto mb-3 flex items-center justify-center`}>
                <span className="text-white font-bold text-lg">{item.value}%</span>
              </div>
              <h4 className="font-medium text-gray-900">{item.name}</h4>
              <div className="flex items-center justify-center mt-2">
                {getTrendIcon(item.trend)}
                <span className={`text-sm ml-1 ${
                  item.trend === 'up' ? 'text-red-600' :
                  item.trend === 'down' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {item.change !== 0 ? `${item.change > 0 ? '+' : ''}${item.change}%` : 'No change'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Visualization</h1>
              <p className="text-sm text-gray-600 mt-1">
                {investigationId ? `Investigation ${investigationId}` : 'Real-time fraud detection analytics'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-4">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'risk', label: 'Risk Analysis', icon: TrendingUp },
              { id: 'geographic', label: 'Geographic', icon: Map },
              { id: 'trends', label: 'Trends', icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeView === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'overview' && renderOverview()}
        {activeView === 'risk' && renderRiskView()}
        {activeView === 'geographic' && renderGeographicView()}
        {activeView === 'trends' && renderTrendsView()}
      </div>

      {/* Real-time indicator */}
      {realTime && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-300 text-green-800 px-3 py-2 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Live Data</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization;