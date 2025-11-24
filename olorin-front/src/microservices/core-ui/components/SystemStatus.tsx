import React, { useState, useEffect } from 'react';
// useWebSocket removed per spec 005 - using polling instead
import { useEventListener } from '@shared/events/UnifiedEventBus';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  CloudIcon,
  WifiIcon,
  CpuChipIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export interface ServiceStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  lastChecked: string;
  responseTime?: number;
  version?: string;
  uptime?: string;
  details?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  storage: number;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
}

interface SystemStatusProps {
  isOpen: boolean;
  onClose: () => void;
  compact?: boolean;
}

const StatusIcon: React.FC<{ status: 'online' | 'degraded' | 'offline'; size?: 'sm' | 'md' | 'lg' }> = ({
  status,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  switch (status) {
    case 'online':
      return <CheckCircleIcon className={`${sizeClasses[size]} text-green-500`} />;
    case 'degraded':
      return <ExclamationTriangleIcon className={`${sizeClasses[size]} text-yellow-500`} />;
    case 'offline':
      return <XCircleIcon className={`${sizeClasses[size]} text-red-500`} />;
  }
};

const StatusBadge: React.FC<{ status: 'online' | 'degraded' | 'offline' }> = ({ status }) => {
  const statusConfig = {
    online: { bg: 'bg-green-100', text: 'text-green-800', label: 'Online' },
    degraded: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Degraded' },
    offline: { bg: 'bg-red-100', text: 'text-red-800', label: 'Offline' }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export const SystemStatusIndicator: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [overallStatus, setOverallStatus] = useState<'online' | 'degraded' | 'offline'>('online');

  // Listen for backend status updates
  useEventListener('system:backend-status', (event) => {
    setOverallStatus(event.status);
  });

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-150"
      title="System Status"
    >
      <StatusIcon status={overallStatus} size="sm" />
      <span className="hidden sm:inline">
        {overallStatus === 'online' ? 'All Systems Operational' :
         overallStatus === 'degraded' ? 'Some Issues' : 'System Offline'}
      </span>
    </button>
  );
};

export const SystemStatus: React.FC<SystemStatusProps> = ({ isOpen, onClose, compact = false }) => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Backend API',
      status: 'online',
      lastChecked: new Date().toISOString(),
      responseTime: 45,
      version: '1.0.0',
      uptime: '99.9%',
    },
    {
      name: 'Polling Service',
      status: 'online',
      lastChecked: new Date().toISOString(),
      responseTime: 12,
      details: 'Polling-based updates (WebSocket removed per spec 005)'
    },
    {
      name: 'Database',
      status: 'online',
      lastChecked: new Date().toISOString(),
      responseTime: 8,
      uptime: '99.95%',
    },
    {
      name: 'AI Processing',
      status: 'degraded',
      lastChecked: new Date().toISOString(),
      responseTime: 1200,
      details: 'High latency detected',
    },
    {
      name: 'File Storage',
      status: 'online',
      lastChecked: new Date().toISOString(),
      responseTime: 25,
    },
    {
      name: 'Email Service',
      status: 'offline',
      lastChecked: new Date(Date.now() - 300000).toISOString(),
      details: 'Service unreachable',
    },
  ]);

  const [metrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 62,
    storage: 78,
    activeConnections: 127,
    requestsPerMinute: 234,
    errorRate: 0.12,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  // Polling-based connection status per spec 005 (WebSocket removed)
  const isConnected = true;

  const refreshStatus = async () => {
    setIsRefreshing(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update last checked times
    setServices(prev => prev.map(service => ({
      ...service,
      lastChecked: new Date().toISOString(),
    })));

    setIsRefreshing(false);
  };

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time updates
  useEventListener('system:backend-status', (event) => {
    setServices(prev => prev.map(service =>
      service.name === 'Backend API'
        ? { ...service, status: event.status, lastChecked: new Date().toISOString() }
        : service
    ));
  });

  // Polling service event listeners (WebSocket events removed per spec 005)
  useEventListener('system:polling-connected', () => {
    setServices(prev => prev.map(service =>
      service.name === 'Polling Service'
        ? { ...service, status: 'online', lastChecked: new Date().toISOString() }
        : service
    ));
  });

  useEventListener('system:polling-disconnected', () => {
    setServices(prev => prev.map(service =>
      service.name === 'Polling Service'
        ? { ...service, status: 'offline', lastChecked: new Date().toISOString() }
        : service
    ));
  });

  const getOverallStatus = (): 'online' | 'degraded' | 'offline' => {
    const offlineServices = services.filter(s => s.status === 'offline').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    if (offlineServices > 0) return 'offline';
    if (degradedServices > 0) return 'degraded';
    return 'online';
  };

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="bg-corporate-bgSecondary rounded-lg shadow-sm border-2 border-corporate-accentPrimary/40 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-corporate-textPrimary">System Status</h3>
          <button
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2">
          {services.slice(0, 3).map((service) => (
            <div key={service.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <StatusIcon status={service.status} size="sm" />
                <span className="text-sm text-gray-900">{service.name}</span>
              </div>
              {service.responseTime && (
                <span className="text-xs text-gray-500">{service.responseTime}ms</span>
              )}
            </div>
          ))}

          {services.length > 3 && (
            <button
              onClick={onClose}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all services →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-corporate-bgPrimary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-corporate-accentPrimary/40">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <StatusIcon status={getOverallStatus()} size="lg" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
                <p className="text-sm text-gray-600">
                  {getOverallStatus() === 'online' ? 'All systems operational' :
                   getOverallStatus() === 'degraded' ? 'Some systems experiencing issues' :
                   'Critical systems offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshStatus}
                disabled={isRefreshing}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Refresh status"
              >
                <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
            {/* System Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.cpu}%</p>
                  </div>
                  <CpuChipIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.cpu > 80 ? 'bg-red-500' : metrics.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${metrics.cpu}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Memory</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.memory}%</p>
                  </div>
                  <ServerIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.memory > 80 ? 'bg-red-500' : metrics.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${metrics.memory}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Storage</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.storage}%</p>
                  </div>
                  <CloudIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.storage > 80 ? 'bg-red-500' : metrics.storage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${metrics.storage}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Connections</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.activeConnections}</p>
                  </div>
                  <WifiIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Requests/min</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.requestsPerMinute}</p>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Error Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.errorRate}%</p>
                  </div>
                  <ExclamationTriangleIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Services Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Service Status</h3>
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.name} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusIcon status={service.status} />
                        <div>
                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                          {service.details && (
                            <p className="text-sm text-gray-600">{service.details}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {service.responseTime && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{service.responseTime}ms</p>
                            <p className="text-xs text-gray-500">Response time</p>
                          </div>
                        )}
                        {service.uptime && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{service.uptime}</p>
                            <p className="text-xs text-gray-500">Uptime</p>
                          </div>
                        )}
                        <div className="text-right">
                          <StatusBadge status={service.status} />
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {formatLastChecked(service.lastChecked)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connection Status */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <StatusIcon status={isConnected ? 'online' : 'offline'} />
                    <div>
                      <h4 className="font-medium text-gray-900">Polling Connection</h4>
                      <p className="text-sm text-gray-600">
                        {isConnected ? 'Connected - Polling-based updates active' : 'Disconnected - Attempting to reconnect'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <StatusIcon status="online" />
                    <div>
                      <h4 className="font-medium text-gray-900">API Connection</h4>
                      <p className="text-sm text-gray-600">Connected - All endpoints accessible</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};