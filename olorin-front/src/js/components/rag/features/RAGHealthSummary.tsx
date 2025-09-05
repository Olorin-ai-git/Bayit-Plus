import React from 'react';
import { RAGHealthStatus } from '../../../types/RAGTypes';

interface RAGHealthSummaryProps {
  healthStatus: RAGHealthStatus;
}

/**
 * RAG Health Summary Component
 * Overall system status summary with key metrics
 */
const RAGHealthSummary: React.FC<RAGHealthSummaryProps> = ({ healthStatus }) => {
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

  const unresolvedAlerts = healthStatus.alerts.filter(alert => !alert.resolved);

  return (
    <div className={`rounded-lg p-4 border ${
      healthStatus.overall === 'healthy' ? 'bg-green-50 border-green-200' :
      healthStatus.overall === 'warning' ? 'bg-yellow-50 border-yellow-200' :
      'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center space-x-3 mb-3">
        <span className="text-2xl">{getHealthIcon(healthStatus.overall)}</span>
        <div>
          <h4 className={`text-lg font-semibold ${
            healthStatus.overall === 'healthy' ? 'text-green-900' :
            healthStatus.overall === 'warning' ? 'text-yellow-900' :
            'text-red-900'
          }`}>
            System Status: {healthStatus.overall.toUpperCase()}
          </h4>
          <p className={`text-sm ${
            healthStatus.overall === 'healthy' ? 'text-green-700' :
            healthStatus.overall === 'warning' ? 'text-yellow-700' :
            'text-red-700'
          }`}>
            {healthStatus.overall === 'healthy' && 'All systems operational'}
            {healthStatus.overall === 'warning' && 'Some systems require attention'}
            {healthStatus.overall === 'critical' && 'Critical issues detected - immediate action required'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className={`font-bold text-lg ${
            healthStatus.overall === 'healthy' ? 'text-green-900' :
            healthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
          }`}>
            {formatUptime(healthStatus.uptime)}
          </div>
          <div className={`${
            healthStatus.overall === 'healthy' ? 'text-green-700' :
            healthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
          }`}>
            Uptime
          </div>
        </div>
        <div className="text-center">
          <div className={`font-bold text-lg ${
            healthStatus.overall === 'healthy' ? 'text-green-900' :
            healthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
          }`}>
            {unresolvedAlerts.length}
          </div>
          <div className={`${
            healthStatus.overall === 'healthy' ? 'text-green-700' :
            healthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
          }`}>
            Active Alerts
          </div>
        </div>
        <div className="text-center">
          <div className={`font-bold text-lg ${
            healthStatus.overall === 'healthy' ? 'text-green-900' :
            healthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
          }`}>
            {formatResponseTime(healthStatus.responseTime)}
          </div>
          <div className={`${
            healthStatus.overall === 'healthy' ? 'text-green-700' :
            healthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
          }`}>
            Response Time
          </div>
        </div>
        <div className="text-center">
          <div className={`font-bold text-lg ${
            healthStatus.overall === 'healthy' ? 'text-green-900' :
            healthStatus.overall === 'warning' ? 'text-yellow-900' : 'text-red-900'
          }`}>
            {healthStatus.systemLoad.toFixed(0)}%
          </div>
          <div className={`${
            healthStatus.overall === 'healthy' ? 'text-green-700' :
            healthStatus.overall === 'warning' ? 'text-yellow-700' : 'text-red-700'
          }`}>
            System Load
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGHealthSummary;
