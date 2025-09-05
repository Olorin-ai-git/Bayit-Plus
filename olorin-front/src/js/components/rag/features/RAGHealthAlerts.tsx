import React, { useState } from 'react';
import { RAGHealthStatus } from '../../../types/RAGTypes';

interface RAGHealthAlertsProps {
  alerts: RAGHealthStatus['alerts'];
  showAlerts?: boolean;
}

/**
 * RAG Health Alerts Component
 * System alerts display with expandable details
 */
const RAGHealthAlerts: React.FC<RAGHealthAlertsProps> = ({ alerts, showAlerts = true }) => {
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

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

  const toggleAlertExpansion = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const unresolvedAlerts = alerts.filter(alert => !alert.resolved);
  const recentAlerts = alerts.slice(0, 10);

  if (!showAlerts || alerts.length === 0) {
    return null;
  }

  return (
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
  );
};

export default RAGHealthAlerts;
