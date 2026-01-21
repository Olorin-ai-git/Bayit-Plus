import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ClockIcon,
  FunnelIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Investigation } from '../types/investigation';
import { useEventBus } from '../../shared/services/EventBus';

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  investigationId?: string;
  agentId?: string;
  acknowledged: boolean;
  persistent: boolean;
  metadata?: Record<string, any>;
}

interface AlertCenterProps {
  investigations: Investigation[];
  maxAlerts?: number;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  investigations,
  maxAlerts = 100
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: [] as string[],
    acknowledged: 'all' as 'all' | 'acknowledged' | 'unacknowledged',
    investigationId: ''
  });

  const eventBus = useEventBus();

  useEffect(() => {
    if (!eventBus) return;

    const createAlert = (type: Alert['type'], title: string, message: string, metadata?: any): Alert => ({
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      investigationId: metadata?.investigationId,
      agentId: metadata?.agentId,
      acknowledged: false,
      persistent: type === 'error',
      metadata
    });

    const addAlert = (alert: Alert) => {
      setAlerts(prev => {
        const newAlerts = [alert, ...prev].slice(0, maxAlerts);
        return newAlerts;
      });
    };

    // Investigation events
    const handleInvestigationStarted = (event: any) => {
      addAlert(createAlert(
        'info',
        'Investigation Started',
        `Investigation "${event.id}" has started with ${event.agents?.length || 0} agents`,
        { investigationId: event.id }
      ));
    };

    const handleInvestigationCompleted = (event: any) => {
      addAlert(createAlert(
        'success',
        'Investigation Completed',
        `Investigation "${event.id}" completed successfully`,
        { investigationId: event.id }
      ));
    };

    const handleInvestigationFailed = (event: any) => {
      addAlert(createAlert(
        'error',
        'Investigation Failed',
        `Investigation "${event.id}" failed: ${event.error}`,
        { investigationId: event.id }
      ));
    };

    const handleInvestigationPaused = (event: any) => {
      addAlert(createAlert(
        'warning',
        'Investigation Paused',
        `Investigation "${event.id}" has been paused`,
        { investigationId: event.id }
      ));
    };

    const handleInvestigationStopped = (event: any) => {
      addAlert(createAlert(
        'warning',
        'Investigation Stopped',
        `Investigation "${event.id}" has been stopped: ${event.reason}`,
        { investigationId: event.id }
      ));
    };

    // Agent events
    const handleAgentStarted = (event: any) => {
      addAlert(createAlert(
        'info',
        'Agent Started',
        `Agent "${event.agentId}" started for investigation "${event.investigationId}"`,
        { investigationId: event.investigationId, agentId: event.agentId }
      ));
    };

    const handleAgentCompleted = (event: any) => {
      addAlert(createAlert(
        'success',
        'Agent Completed',
        `Agent "${event.agentId}" completed successfully`,
        { investigationId: event.investigationId, agentId: event.agentId }
      ));
    };

    const handleAgentFailed = (event: any) => {
      const retryText = event.retriesLeft > 0 ? ` (${event.retriesLeft} retries left)` : '';
      addAlert(createAlert(
        'error',
        'Agent Failed',
        `Agent "${event.agentId}" failed: ${event.error}${retryText}`,
        { investigationId: event.investigationId, agentId: event.agentId }
      ));
    };

    const handleAgentTimeout = (event: any) => {
      addAlert(createAlert(
        'warning',
        'Agent Timeout',
        `Agent "${event.agentId}" timed out and was stopped`,
        { investigationId: event.investigationId, agentId: event.agentId }
      ));
    };

    // System events
    const handleSystemNotification = (event: any) => {
      addAlert(createAlert(
        event.type || 'info',
        event.title || 'System Notification',
        event.message,
        event.metadata
      ));
    };

    const handleWebSocketDisconnect = () => {
      addAlert(createAlert(
        'error',
        'Connection Lost',
        'Lost connection to the investigation system. Attempting to reconnect...',
        { persistent: true }
      ));
    };

    const handleWebSocketReconnect = () => {
      addAlert(createAlert(
        'success',
        'Connection Restored',
        'Successfully reconnected to the investigation system',
        { persistent: false }
      ));
    };

    // Register event listeners
    eventBus.on('investigation:started', handleInvestigationStarted);
    eventBus.on('investigation:completed', handleInvestigationCompleted);
    eventBus.on('investigation:error', handleInvestigationFailed);
    eventBus.on('investigation:paused', handleInvestigationPaused);
    eventBus.on('investigation:stopped', handleInvestigationStopped);

    eventBus.on('agent:started', handleAgentStarted);
    eventBus.on('agent:completed', handleAgentCompleted);
    eventBus.on('agent:failed', handleAgentFailed);
    eventBus.on('agent:timeout', handleAgentTimeout);

    eventBus.on('system:notification', handleSystemNotification);
    eventBus.on('websocket:disconnected', handleWebSocketDisconnect);
    eventBus.on('websocket:reconnected', handleWebSocketReconnect);

    // Cleanup
    return () => {
      eventBus.off('investigation:started', handleInvestigationStarted);
      eventBus.off('investigation:completed', handleInvestigationCompleted);
      eventBus.off('investigation:error', handleInvestigationFailed);
      eventBus.off('investigation:paused', handleInvestigationPaused);
      eventBus.off('investigation:stopped', handleInvestigationStopped);

      eventBus.off('agent:started', handleAgentStarted);
      eventBus.off('agent:completed', handleAgentCompleted);
      eventBus.off('agent:failed', handleAgentFailed);
      eventBus.off('agent:timeout', handleAgentTimeout);

      eventBus.off('system:notification', handleSystemNotification);
      eventBus.off('websocket:disconnected', handleWebSocketDisconnect);
      eventBus.off('websocket:reconnected', handleWebSocketReconnect);
    };
  }, [eventBus, maxAlerts]);

  // Auto-dismiss non-persistent alerts
  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts(prev => prev.filter(alert => {
        if (alert.persistent || alert.acknowledged) return true;

        const age = Date.now() - new Date(alert.timestamp).getTime();
        const maxAge = alert.type === 'error' ? 30000 : alert.type === 'warning' ? 15000 : 10000;

        return age < maxAge;
      }));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    // Type filter
    if (filters.type.length > 0 && !filters.type.includes(alert.type)) {
      return false;
    }

    // Acknowledged filter
    if (filters.acknowledged === 'acknowledged' && !alert.acknowledged) {
      return false;
    }
    if (filters.acknowledged === 'unacknowledged' && alert.acknowledged) {
      return false;
    }

    // Investigation filter
    if (filters.investigationId && alert.investigationId !== filters.investigationId) {
      return false;
    }

    return true;
  });

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;
  const criticalCount = alerts.filter(alert => alert.type === 'error' && !alert.acknowledged).length;

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBorderColor = (type: Alert['type']) => {
    switch (type) {
      case 'error': return 'border-l-red-500';
      case 'warning': return 'border-l-yellow-500';
      case 'success': return 'border-l-green-500';
      default: return 'border-l-blue-500';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const acknowledgeAll = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })));
  };

  const clearAll = () => {
    setAlerts([]);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BellIcon className="h-6 w-6 text-gray-700" />
          <h3 className="text-lg font-medium text-gray-900">Alert Center</h3>
          {unacknowledgedCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {unacknowledgedCount} new
            </span>
          )}
          {criticalCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white animate-pulse">
              {criticalCount} critical
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>

          {unacknowledgedCount > 0 && (
            <button
              onClick={acknowledgeAll}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Acknowledge All
            </button>
          )}

          <button
            onClick={clearAll}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alert Type</label>
              <div className="space-y-2">
                {['info', 'warning', 'error', 'success'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, type: [...prev.type, type] }));
                        } else {
                          setFilters(prev => ({ ...prev, type: prev.type.filter(t => t !== type) }));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.acknowledged}
                onChange={(e) => setFilters(prev => ({ ...prev, acknowledged: e.target.value as any }))}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Alerts</option>
                <option value="unacknowledged">Unacknowledged</option>
                <option value="acknowledged">Acknowledged</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investigation</label>
              <select
                value={filters.investigationId}
                onChange={(e) => setFilters(prev => ({ ...prev, investigationId: e.target.value }))}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Investigations</option>
                {investigations.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-2">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-white border-l-4 ${getAlertBorderColor(alert.type)} rounded-lg shadow-sm p-4 ${
                alert.acknowledged ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      {alert.acknowledged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Acknowledged
                        </span>
                      )}
                      {alert.persistent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Persistent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-3 w-3" />
                        <span>{formatTimestamp(alert.timestamp)}</span>
                      </div>
                      {alert.investigationId && (
                        <span>Investigation: {alert.investigationId}</span>
                      )}
                      {alert.agentId && (
                        <span>Agent: {alert.agentId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600"
                      title="Acknowledge"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600"
                    title="Dismiss"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts</h3>
            <p className="text-gray-600">
              {alerts.length === 0
                ? 'All systems are running smoothly.'
                : 'No alerts match your current filters.'
              }
            </p>
          </div>
        )}
      </div>

      {filteredAlerts.length > 0 && alerts.length > filteredAlerts.length && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      )}
    </div>
  );
};