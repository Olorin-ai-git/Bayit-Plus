import React, { useState, useEffect } from 'react';
import { RAGHealthMonitorProps, RAGHealthStatus } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';
import RAGHealthMetrics from './RAGHealthMetrics';
import RAGHealthSummary from './RAGHealthSummary';
import RAGHealthAlerts from './RAGHealthAlerts';

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

  const unresolvedAlerts = liveHealthStatus.alerts.filter(alert => !alert.resolved);

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
        <RAGHealthMetrics healthStatus={liveHealthStatus} />

        {/* System Status Summary */}
        <RAGHealthSummary healthStatus={liveHealthStatus} />

        {/* Alerts Section */}
        <RAGHealthAlerts 
          alerts={liveHealthStatus.alerts} 
          showAlerts={showAlerts} 
        />

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Monitoring 5 metrics • Refresh every {refreshInterval / 1000}s
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