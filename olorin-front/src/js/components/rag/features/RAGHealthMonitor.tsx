import React, { useState, useEffect } from 'react';
import { RAGHealthMonitorProps, RAGHealthStatus } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Health Monitor Component
 * Real-time RAG system health monitoring and alerts
 */
const RAGHealthMonitor: React.FC<RAGHealthMonitorProps> = ({
  investigationId,
  healthStatus,
  refreshInterval = 30000, // 30 seconds
  showAlerts = true,
}) => {
  const [liveHealthStatus, setLiveHealthStatus] = useState<RAGHealthStatus>(healthStatus || {
    overall: 'healthy',
    uptime: 0,
    responseTime: 0,
    errorRate: 0,
    knowledgeBaseFreshness: 0,
    systemLoad: 0,
    alerts: [],
  });
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onHealthUpdate: (data) => {
      setLiveHealthStatus(data.healthStatus);
      setLastUpdate(new Date());
    },
    onSystemAlert: (alert) => {
      setLiveHealthStatus(prev => ({
        ...prev,
        alerts: [alert, ...prev.alerts].slice(0, 50), // Keep last 50 alerts
      }));
    },
  });

  // Auto-refresh health data
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate health data updates if not connected
      if (!isConnected) {
        setLastUpdate(new Date());
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isConnected]);

  const getHealthColor = (status: RAGHealthStatus['overall']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getHealthIcon = (status: RAGHealthStatus['overall']) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '🚨';
      default:
        return '❓';
    }
  };

  const getMetricColor = (value: number, type: 'uptime' | 'responseTime' | 'errorRate' | 'freshness' | 'load') => {
    switch (type) {
      case 'uptime':
        if (value >= 99) return 'text-green-600';
        if (value >= 95) return 'text-yellow-600';
        return 'text-red-600';
      case 'responseTime':
        if (value <= 1000) return 'text-green-600';
        if (value <= 3000) return 'text-yellow-600';
        return 'text-red-600';
      case 'errorRate':
        if (value <= 1) return 'text-green-600';
        if (value <= 5) return 'text-yellow-600';
        return 'text-red-600';
      case 'freshness':
        if (value >= 90) return 'text-green-600';
        if (value >= 70) return 'text-yellow-600';
        return 'text-red-600';
      case 'load':
        if (value <= 70) return 'text-green-600';
        if (value <= 85) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getAlertSeverityColor = (severity: 'info' | 'warning' | 'error' | 'critical') => {
    switch (severity) {
      case 'info':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'error':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getAlertIcon = (severity: 'info' | 'warning' | 'error' | 'critical') => {
    switch (severity) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'critical':
        return '🚨';
      default:
        return '💬';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const toggleAlertExpansion = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const unresolvedAlerts = liveHealthStatus.alerts.filter(alert => !alert.resolved);
  const recentAlerts = liveHealthStatus.alerts.slice(0, 10);

  const healthMetrics = [
    {
      label: 'System Uptime',
      value: liveHealthStatus.uptime,
      format: formatUptime,
      type: 'uptime' as const,
      icon: '⏱️',
      target: '99.9%',
    },
    {
      label: 'Response Time',
      value: liveHealthStatus.responseTime,
      format: formatResponseTime,
      type: 'responseTime' as const,
      icon: '⚡',
      target: '<1s',
    },
    {
      label: 'Error Rate',
      value: liveHealthStatus.errorRate,
      format: (v: number) => `${v.toFixed(1)}%`,
      type: 'errorRate' as const,
      icon: '🚨',
      target: '<1%',
    },
    {
      label: 'Knowledge Freshness',
      value: liveHealthStatus.knowledgeBaseFreshness,
      format: (v: number) => `${v.toFixed(0)}%`,
      type: 'freshness' as const,
      icon: '🌱',
      target: '>90%',
    },
    {
      label: 'System Load',
      value: liveHealthStatus.systemLoad,
      format: (v: number) => `${v.toFixed(0)}%`,
      type: 'load' as const,
      icon: '💾',
      target: '<70%',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">RAG System Health</h3>
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()} • {unresolvedAlerts.length} active alerts
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-full border ${
              getHealthColor(liveHealthStatus.overall)
            }`}>
              <span className="text-lg">{getHealthIcon(liveHealthStatus.overall)}</span>
              <span className="font-medium capitalize">{liveHealthStatus.overall}</span>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span>{isConnected ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Health Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {healthMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{metric.icon}</span>
                <span className="text-xs text-gray-500">{metric.target}</span>
              </div>
              <div>
                <div className={`text-xl font-bold mb-1 ${
                  getMetricColor(metric.value, metric.type)
                }`}>
                  {metric.format(metric.value)}
                </div>
                <div className="text-sm text-gray-600">{metric.label}</div>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      metric.type === 'uptime' || metric.type === 'freshness' 
                        ? (metric.value >= 90 ? 'bg-green-500' : metric.value >= 70 ? 'bg-yellow-500' : 'bg-red-500')
                        : metric.type === 'errorRate' || metric.type === 'load'
                        ? (metric.value <= 10 ? 'bg-green-500' : metric.value <= 20 ? 'bg-yellow-500' : 'bg-red-500')
                        : (metric.value <= 1000 ? 'bg-green-500' : metric.value <= 3000 ? 'bg-yellow-500' : 'bg-red-500')
                    }`}
                    style={{ 
                      width: `${Math.min(100, 
                        metric.type === 'uptime' || metric.type === 'freshness' ? metric.value :
                        metric.type === 'errorRate' || metric.type === 'load' ? Math.max(0, 100 - metric.value) :
                        Math.max(0, 100 - (metric.value / 50))
                      )}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Status Summary */}
        <div className={`rounded-lg p-4 border ${
          liveHealthStatus.overall === 'healthy' ? 'bg-green-50 border-green-200' :
          liveHealthStatus.overall === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">{getHealthIcon(liveHealthStatus.overall)}</span>
            <div>
              <h4 className={`text-lg font-semibold ${
                liveHealthStatus.overall === 'healthy' ? 'text-green-900' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-900' :
                'text-red-900'
              }`}>
                System Status: {liveHealthStatus.overall.toUpperCase()}
              </h4>
              <p className={`text-sm ${
                liveHealthStatus.overall === 'healthy' ? 'text-green-700' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {liveHealthStatus.overall === 'healthy' && 'All systems operational'}
                {liveHealthStatus.overall === 'warning' && 'Some systems require attention'}
                {liveHealthStatus.overall === 'critical' && 'Critical issues detected - immediate action required'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className={`font-bold text-lg ${
                liveHealthStatus.overall === 'healthy' ? 'text-green-900' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {formatUptime(liveHealthStatus.uptime)}
              </div>
              <div className={`${
                liveHealthStatus.overall === 'healthy' ? 'text-green-700' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                Uptime
              </div>
            </div>
            <div className="text-center">
              <div className={`font-bold text-lg ${
                liveHealthStatus.overall === 'healthy' ? 'text-green-900' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {unresolvedAlerts.length}
              </div>
              <div className={`${
                liveHealthStatus.overall === 'healthy' ? 'text-green-700' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                Active Alerts
              </div>
            </div>
            <div className="text-center">
              <div className={`font-bold text-lg ${
                liveHealthStatus.overall === 'healthy' ? 'text-green-900' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {formatResponseTime(liveHealthStatus.responseTime)}
              </div>
              <div className={`${
                liveHealthStatus.overall === 'healthy' ? 'text-green-700' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                Response Time
              </div>
            </div>
            <div className="text-center">
              <div className={`font-bold text-lg ${
                liveHealthStatus.overall === 'healthy' ? 'text-green-900' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {liveHealthStatus.systemLoad.toFixed(0)}%
              </div>
              <div className={`${
                liveHealthStatus.overall === 'healthy' ? 'text-green-700' :
                liveHealthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                System Load
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {showAlerts && liveHealthStatus.alerts.length > 0 && (
          <div className="bg-white border rounded-lg">
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">System Alerts</h4>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-500">Recent: {recentAlerts.length}</span>
                  <span className="text-red-600 font-medium">Unresolved: {unresolvedAlerts.length}</span>
                </div>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <div className="divide-y divide-gray-200">
                {recentAlerts.map((alert) => {
                  const isExpanded = expandedAlerts.has(alert.id);
                  
                  return (
                    <div key={alert.id} className="p-4 hover:bg-gray-50">
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleAlertExpansion(alert.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{getAlertIcon(alert.severity)}</span>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                getAlertSeverityColor(alert.severity)
                              }`}>
                                {alert.severity.toUpperCase()}
                              </span>
                              {alert.resolved && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  RESOLVED
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <span className={`transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}>▼</span>
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-3 pl-8 pr-4">
                          <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-700">Alert ID:</span>
                                <span className="ml-2 text-gray-600">{alert.id}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Severity:</span>
                                <span className="ml-2 text-gray-600 capitalize">{alert.severity}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Timestamp:</span>
                                <span className="ml-2 text-gray-600">
                                  {new Date(alert.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Status:</span>
                                <span className={`ml-2 ${
                                  alert.resolved ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {alert.resolved ? 'Resolved' : 'Active'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Monitoring {healthMetrics.length} metrics • Refresh every {refreshInterval / 1000}s
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors">
              🔄 Refresh Now
            </button>
            <button className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors">
              📈 View Detailed Logs
            </button>
            <button className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGHealthMonitor;