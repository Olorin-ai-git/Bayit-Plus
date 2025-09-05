import React from 'react';
import { RAGHealthStatus } from '../../../types/RAGTypes';

interface RAGHealthMetricsProps {
  healthStatus: RAGHealthStatus;
}

/**
 * RAG Health Metrics Component
 * Displays individual health metrics with visual indicators
 */
const RAGHealthMetrics: React.FC<RAGHealthMetricsProps> = ({ healthStatus }) => {
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

  const healthMetrics = [
    {
      label: 'System Uptime',
      value: healthStatus.uptime,
      format: formatUptime,
      type: 'uptime' as const,
      icon: '⏱️',
      target: '99.9%',
    },
    {
      label: 'Response Time',
      value: healthStatus.responseTime,
      format: formatResponseTime,
      type: 'responseTime' as const,
      icon: '⚡',
      target: '<1s',
    },
    {
      label: 'Error Rate',
      value: healthStatus.errorRate,
      format: (v: number) => `${v.toFixed(1)}%`,
      type: 'errorRate' as const,
      icon: '🚨',
      target: '<1%',
    },
    {
      label: 'Knowledge Freshness',
      value: healthStatus.knowledgeBaseFreshness,
      format: (v: number) => `${v.toFixed(0)}%`,
      type: 'freshness' as const,
      icon: '🌱',
      target: '>90%',
    },
    {
      label: 'System Load',
      value: healthStatus.systemLoad,
      format: (v: number) => `${v.toFixed(0)}%`,
      type: 'load' as const,
      icon: '💾',
      target: '<70%',
    },
  ];

  return (
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
  );
};

export default RAGHealthMetrics;
