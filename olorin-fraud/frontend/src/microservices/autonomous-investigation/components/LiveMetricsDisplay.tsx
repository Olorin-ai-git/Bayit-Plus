import React, { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { Investigation } from '../types/investigation';
import { useEventBus } from '../../shared/services/EventBus';

interface LiveMetricsDisplayProps {
  investigations: Investigation[];
  refreshInterval?: number;
}

interface MetricValue {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  history: number[];
}

interface LiveMetrics {
  totalInvestigations: MetricValue;
  activeInvestigations: MetricValue;
  completionRate: MetricValue;
  averageExecutionTime: MetricValue;
  errorRate: MetricValue;
  throughput: MetricValue;
  systemHealth: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
  performance: {
    responseTime: number;
    agentUtilization: number;
    queueLength: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
}

export const LiveMetricsDisplay: React.FC<LiveMetricsDisplayProps> = ({
  investigations,
  refreshInterval = 5000
}) => {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const eventBus = useEventBus();

  const calculateMetrics = useCallback((): LiveMetrics => {
    const now = Date.now();
    const activeInvs = investigations.filter(inv =>
      inv.status === 'running' || inv.status === 'pending'
    );
    const completedInvs = investigations.filter(inv => inv.status === 'completed');
    const failedInvs = investigations.filter(inv => inv.status === 'failed');

    // Calculate average execution time for completed investigations
    const avgExecTime = completedInvs.length > 0
      ? completedInvs.reduce((sum, inv) => {
          if (inv.startedAt && inv.completedAt) {
            return sum + (new Date(inv.completedAt).getTime() - new Date(inv.startedAt).getTime());
          }
          return sum;
        }, 0) / completedInvs.length / 1000 / 60 // Convert to minutes
      : 0;

    // Calculate error rate
    const totalFinished = completedInvs.length + failedInvs.length;
    const errorRate = totalFinished > 0 ? (failedInvs.length / totalFinished) * 100 : 0;

    // Calculate throughput (investigations completed per hour)
    const last24h = investigations.filter(inv => {
      if (!inv.completedAt) return false;
      const completedTime = new Date(inv.completedAt).getTime();
      return now - completedTime < 24 * 60 * 60 * 1000;
    });
    const throughput = last24h.length / 24; // per hour

    // Mock previous values for trend calculation
    const prevMetrics = metrics || {
      totalInvestigations: { current: 0, previous: 0, trend: 'stable' as const, history: [] },
      activeInvestigations: { current: 0, previous: 0, trend: 'stable' as const, history: [] },
      completionRate: { current: 0, previous: 0, trend: 'stable' as const, history: [] },
      averageExecutionTime: { current: 0, previous: 0, trend: 'stable' as const, history: [] },
      errorRate: { current: 0, previous: 0, trend: 'stable' as const, history: [] },
      throughput: { current: 0, previous: 0, trend: 'stable' as const, history: [] }
    };

    const createMetricValue = (current: number, previous: number, history: number[]): MetricValue => {
      const newHistory = [...history.slice(-19), current]; // Keep last 20 values
      let trend: 'up' | 'down' | 'stable' = 'stable';

      if (current > previous * 1.05) trend = 'up';
      else if (current < previous * 0.95) trend = 'down';

      return {
        current,
        previous,
        trend,
        history: newHistory
      };
    };

    // System health calculation
    const healthScore = Math.max(0, 100 - (errorRate * 2) - (activeInvs.length > 10 ? 20 : 0));
    const healthStatus: 'healthy' | 'warning' | 'critical' =
      healthScore >= 80 ? 'healthy' :
      healthScore >= 60 ? 'warning' : 'critical';

    const healthIssues: string[] = [];
    if (errorRate > 10) healthIssues.push(`High error rate: ${errorRate.toFixed(1)}%`);
    if (activeInvs.length > 15) healthIssues.push(`High active investigation count: ${activeInvs.length}`);
    if (avgExecTime > 60) healthIssues.push(`Long average execution time: ${avgExecTime.toFixed(1)}min`);

    return {
      totalInvestigations: createMetricValue(
        investigations.length,
        prevMetrics.totalInvestigations?.current || 0,
        prevMetrics.totalInvestigations?.history || []
      ),
      activeInvestigations: createMetricValue(
        activeInvs.length,
        prevMetrics.activeInvestigations?.current || 0,
        prevMetrics.activeInvestigations?.history || []
      ),
      completionRate: createMetricValue(
        totalFinished > 0 ? (completedInvs.length / totalFinished) * 100 : 0,
        prevMetrics.completionRate?.current || 0,
        prevMetrics.completionRate?.history || []
      ),
      averageExecutionTime: createMetricValue(
        avgExecTime,
        prevMetrics.averageExecutionTime?.current || 0,
        prevMetrics.averageExecutionTime?.history || []
      ),
      errorRate: createMetricValue(
        errorRate,
        prevMetrics.errorRate?.current || 0,
        prevMetrics.errorRate?.history || []
      ),
      throughput: createMetricValue(
        throughput,
        prevMetrics.throughput?.current || 0,
        prevMetrics.throughput?.history || []
      ),
      systemHealth: {
        score: healthScore,
        status: healthStatus,
        issues: healthIssues
      },
      performance: {
        responseTime: Math.random() * 500 + 100, // Mock data
        agentUtilization: (activeInvs.length / Math.max(investigations.length, 1)) * 100,
        queueLength: activeInvs.filter(inv => inv.status === 'pending').length,
        resourceUsage: {
          cpu: Math.random() * 80 + 10, // Mock data
          memory: Math.random() * 70 + 20, // Mock data
          network: Math.random() * 60 + 15 // Mock data
        }
      }
    };
  }, [investigations, metrics]);

  useEffect(() => {
    const updateMetrics = () => {
      try {
        const newMetrics = calculateMetrics();
        setMetrics(newMetrics);
        setLastUpdate(new Date());
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to calculate metrics:', error);
        setIsConnected(false);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [calculateMetrics, refreshInterval]);

  useEffect(() => {
    if (!eventBus) return;

    const handleConnectionStatus = (event: any) => {
      setIsConnected(event.connected);
    };

    eventBus.on('websocket:status', handleConnectionStatus);
    return () => eventBus.off('websocket:status', handleConnectionStatus);
  }, [eventBus]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
        </div>;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean = true) => {
    if (trend === 'stable') return 'text-gray-600';

    const isPositive = isGoodWhenUp ? trend === 'up' : trend === 'down';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const formatValue = (value: number, type: 'number' | 'percentage' | 'time' | 'decimal') => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${value.toFixed(1)}m`;
      case 'decimal':
        return value.toFixed(2);
      default:
        return Math.round(value).toString();
    }
  };

  if (!metrics) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Live System Metrics</h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">System Health</h4>
          <div className="flex items-center space-x-2">
            {metrics.systemHealth.status === 'healthy' && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
            {metrics.systemHealth.status === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />}
            {metrics.systemHealth.status === 'critical' && <XCircleIcon className="h-5 w-5 text-red-500" />}
            <span className={`text-sm font-medium ${
              metrics.systemHealth.status === 'healthy' ? 'text-green-700' :
              metrics.systemHealth.status === 'warning' ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {metrics.systemHealth.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Health Score</span>
              <span className="text-2xl font-bold text-gray-900">{Math.round(metrics.systemHealth.score)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  metrics.systemHealth.score >= 80 ? 'bg-green-500' :
                  metrics.systemHealth.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.systemHealth.score}%` }}
              />
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Active Issues</h5>
            {metrics.systemHealth.issues.length > 0 ? (
              <ul className="space-y-1">
                {metrics.systemHealth.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-center">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600">No issues detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Total Investigations</span>
            </div>
            {getTrendIcon(metrics.totalInvestigations.trend)}
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(metrics.totalInvestigations.current, 'number')}
            </span>
            <span className={`text-sm ${getTrendColor(metrics.totalInvestigations.trend)}`}>
              {metrics.totalInvestigations.previous > 0 && (
                `${Math.abs(((metrics.totalInvestigations.current - metrics.totalInvestigations.previous) / metrics.totalInvestigations.previous * 100)).toFixed(1)}%`
              )}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <SignalIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Active Investigations</span>
            </div>
            {getTrendIcon(metrics.activeInvestigations.trend)}
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(metrics.activeInvestigations.current, 'number')}
            </span>
            <span className={`text-sm ${getTrendColor(metrics.activeInvestigations.trend, false)}`}>
              {metrics.activeInvestigations.previous > 0 && (
                `${Math.abs(((metrics.activeInvestigations.current - metrics.activeInvestigations.previous) / metrics.activeInvestigations.previous * 100)).toFixed(1)}%`
              )}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">Completion Rate</span>
            </div>
            {getTrendIcon(metrics.completionRate.trend)}
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(metrics.completionRate.current, 'percentage')}
            </span>
            <span className={`text-sm ${getTrendColor(metrics.completionRate.trend)}`}>
              {metrics.completionRate.previous > 0 && (
                `${Math.abs(metrics.completionRate.current - metrics.completionRate.previous).toFixed(1)}pp`
              )}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Avg Execution Time</span>
            </div>
            {getTrendIcon(metrics.averageExecutionTime.trend)}
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(metrics.averageExecutionTime.current, 'time')}
            </span>
            <span className={`text-sm ${getTrendColor(metrics.averageExecutionTime.trend, false)}`}>
              {metrics.averageExecutionTime.previous > 0 && (
                `${Math.abs(((metrics.averageExecutionTime.current - metrics.averageExecutionTime.previous) / metrics.averageExecutionTime.previous * 100)).toFixed(1)}%`
              )}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <XCircleIcon className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">Error Rate</span>
            </div>
            {getTrendIcon(metrics.errorRate.trend)}
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(metrics.errorRate.current, 'percentage')}
            </span>
            <span className={`text-sm ${getTrendColor(metrics.errorRate.trend, false)}`}>
              {metrics.errorRate.previous > 0 && (
                `${Math.abs(metrics.errorRate.current - metrics.errorRate.previous).toFixed(1)}pp`
              )}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Throughput</span>
            </div>
            {getTrendIcon(metrics.throughput.trend)}
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(metrics.throughput.current, 'decimal')}
            </span>
            <span className="text-sm text-gray-500">/hour</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Performance Metrics</h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Response Time</span>
                <span className="font-medium">{Math.round(metrics.performance.responseTime)}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(metrics.performance.responseTime / 10, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Agent Utilization</span>
                <span className="font-medium">{Math.round(metrics.performance.agentUtilization)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.performance.agentUtilization}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Queue Length</span>
                <span className="font-medium">{metrics.performance.queueLength}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(metrics.performance.queueLength * 10, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">CPU Usage</span>
                <span className="font-medium">{Math.round(metrics.performance.resourceUsage.cpu)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.performance.resourceUsage.cpu}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};