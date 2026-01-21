import React, { useState, useEffect, useCallback } from 'react';
import { PerformanceMetric, ServiceMetrics } from './PerformanceMonitor';
import { ServicePerformanceTracker, ServiceHealthMetrics } from './ServicePerformanceTracker';

interface PerformanceDashboardProps {
  services: string[];
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
}

interface ServicePerformanceData {
  service: string;
  metrics: PerformanceMetric[];
  health: ServiceHealthMetrics | null;
  startup: any;
  isOnline: boolean;
  lastUpdate: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  services,
  refreshInterval = 5000,
  showDetailedMetrics = false
}) => {
  const [serviceData, setServiceData] = useState<Map<string, ServicePerformanceData>>(new Map());
  const [selectedService, setSelectedService] = useState<string>(services[0] || '');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);

  // Initialize service performance data
  useEffect(() => {
    const initialData = new Map<string, ServicePerformanceData>();

    services.forEach(service => {
      initialData.set(service, {
        service,
        metrics: [],
        health: null,
        startup: null,
        isOnline: false,
        lastUpdate: Date.now()
      });
    });

    setServiceData(initialData);
  }, [services]);

  // Subscribe to performance events
  useEffect(() => {
    if (!window.olorin?.eventBus) return;

    const eventHandlers = {
      'performance:metric': (data: PerformanceMetric, source: string) => {
        updateServiceData(source, (existing) => ({
          ...existing,
          metrics: [...existing.metrics.slice(-49), data], // Keep last 50 metrics
          lastUpdate: Date.now(),
          isOnline: true
        }));
      },

      'performance:service': (data: ServiceMetrics, source: string) => {
        updateServiceData(source, (existing) => ({
          ...existing,
          startup: data,
          lastUpdate: Date.now(),
          isOnline: true
        }));
      },

      'service:health': (data: ServiceHealthMetrics, source: string) => {
        updateServiceData(source, (existing) => ({
          ...existing,
          health: data,
          lastUpdate: Date.now(),
          isOnline: true
        }));

        // Check for alerts
        if (data.errorRate > 5 || data.availability < 95) {
          setAlertsCount(prev => prev + 1);
        }
      },

      'service:error': (data: any, source: string) => {
        updateServiceData(source, (existing) => ({
          ...existing,
          lastUpdate: Date.now()
        }));
      }
    };

    // Subscribe to events
    Object.entries(eventHandlers).forEach(([eventType, handler]) => {
      window.olorin.eventBus.on(eventType, handler);
    });

    // Cleanup
    return () => {
      Object.entries(eventHandlers).forEach(([eventType, handler]) => {
        window.olorin?.eventBus?.off(eventType, handler);
      });
    };
  }, []);

  const updateServiceData = useCallback((
    service: string,
    updater: (existing: ServicePerformanceData) => ServicePerformanceData
  ) => {
    setServiceData(prev => {
      const existing = prev.get(service);
      if (!existing) return prev;

      const newData = new Map(prev);
      newData.set(service, updater(existing));
      return newData;
    });
  }, []);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      // Mark services as offline if no updates for 30 seconds
      const now = Date.now();
      setServiceData(prev => {
        const newData = new Map(prev);

        prev.forEach((data, service) => {
          if (now - data.lastUpdate > 30000) {
            newData.set(service, { ...data, isOnline: false });
          }
        });

        return newData;
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getServiceStatus = (service: string): 'healthy' | 'warning' | 'critical' | 'offline' => {
    const data = serviceData.get(service);
    if (!data || !data.isOnline) return 'offline';

    const health = data.health;
    if (!health) return 'warning';

    if (health.availability < 90 || health.errorRate > 10) return 'critical';
    if (health.availability < 95 || health.errorRate > 5) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const selectedServiceData = serviceData.get(selectedService);

  const formatMetricValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return value < 1000 ? `${value.toFixed(1)}ms` : `${(value / 1000).toFixed(2)}s`;
    }
    if (unit === 'bytes') {
      if (value < 1024) return `${value}B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
      return `${(value / 1024 / 1024).toFixed(1)}MB`;
    }
    if (unit === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return `${value.toFixed(2)}${unit}`;
  };

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors relative"
          title="Show Performance Dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {alertsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {alertsCount > 9 ? '9+' : alertsCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-900">Performance Monitor</h3>
        </div>
        <div className="flex items-center space-x-2">
          {alertsCount > 0 && (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {alertsCount} alerts
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Service selector */}
      <div className="px-4 py-2 border-b border-gray-200">
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {services.map(service => (
            <option key={service} value={service}>
              {service} ({getServiceStatus(service)})
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-64">
        {selectedServiceData && (
          <div className="p-4 space-y-3">
            {/* Service status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(getServiceStatus(selectedService))}`}>
                {getServiceStatus(selectedService)}
              </span>
            </div>

            {/* Health metrics */}
            {selectedServiceData.health && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-gray-600">Availability</div>
                  <div className="font-medium">{selectedServiceData.health.availability.toFixed(1)}%</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-gray-600">Error Rate</div>
                  <div className="font-medium">{selectedServiceData.health.errorRate.toFixed(1)}%</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-gray-600">Response Time</div>
                  <div className="font-medium">{selectedServiceData.health.responseTime.toFixed(0)}ms</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-gray-600">Memory</div>
                  <div className="font-medium">{(selectedServiceData.health.memory / 1024 / 1024).toFixed(1)}MB</div>
                </div>
              </div>
            )}

            {/* Recent metrics */}
            {showDetailedMetrics && selectedServiceData.metrics.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Recent Metrics</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {selectedServiceData.metrics.slice(-5).map((metric, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate">{metric.name}</span>
                      <span className="font-medium">{formatMetricValue(metric.value, metric.unit)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Startup metrics */}
            {selectedServiceData.startup && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Startup Performance</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-blue-600">Startup Time</div>
                    <div className="font-medium">{selectedServiceData.startup.startupTime.toFixed(0)}ms</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-blue-600">Module Load</div>
                    <div className="font-medium">{selectedServiceData.startup.moduleLoadTime.toFixed(0)}ms</div>
                  </div>
                </div>
              </div>
            )}

            {/* Last update */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
              Last update: {selectedServiceData.lastUpdate ?
                new Date(selectedServiceData.lastUpdate).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        )}

        {!selectedServiceData && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No data available for {selectedService}
          </div>
        )}
      </div>

      {/* Services overview */}
      <div className="border-t border-gray-200 px-4 py-2">
        <div className="flex space-x-1">
          {services.map(service => {
            const status = getServiceStatus(service);
            return (
              <button
                key={service}
                onClick={() => setSelectedService(service)}
                className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
                  selectedService === service
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={`${service} - ${status}`}
              >
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                  status === 'healthy' ? 'bg-green-500' :
                  status === 'warning' ? 'bg-yellow-500' :
                  status === 'critical' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                {service.substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;