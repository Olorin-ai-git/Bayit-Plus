/**
 * Audit Log Component - Display audit logs for queries and exports.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';

interface AuditLogProps {
  startDate?: string;
  endDate?: string;
  actionType?: string;
  userId?: string;
}

const AuditLog: React.FC<AuditLogProps> = ({ startDate, endDate, actionType, userId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadLogs();
  }, [startDate, endDate, actionType, userId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getAuditLogs({
        startDate,
        endDate,
        actionType,
        userId,
        limit: 100,
      });
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load audit logs'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading audit logs..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Audit Logs"
        message={error.message}
        actionLabel="Retry"
        onAction={loadLogs}
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No Audit Logs"
        message="No audit logs found for the selected filters."
      />
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'query':
        return 'bg-corporate-info/20 text-corporate-info';
      case 'export':
        return 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary';
      case 'create':
        return 'bg-corporate-success/20 text-corporate-success';
      case 'update':
        return 'bg-corporate-warning/20 text-corporate-warning';
      case 'delete':
        return 'bg-corporate-error/20 text-corporate-error';
      default:
        return 'bg-corporate-textSecondary/20 text-corporate-textSecondary';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Audit Logs</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3 rounded-lg bg-corporate-bgTertiary border border-corporate-border"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(
                    log.actionType || 'read'
                  )}`}
                >
                  {log.actionType?.toUpperCase() || 'READ'}
                </span>
                <span className="text-sm text-corporate-textPrimary">{log.resourceType}</span>
                {log.resourceId && (
                  <span className="text-xs text-corporate-textSecondary">{log.resourceId}</span>
                )}
              </div>
              <span className="text-xs text-corporate-textSecondary">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
              </span>
            </div>
            {log.endpoint && (
              <div className="text-xs text-corporate-textSecondary">
                {log.method} {log.endpoint}
              </div>
            )}
            {log.userEmail && (
              <div className="text-xs text-corporate-textSecondary mt-1">
                User: {log.userEmail}
              </div>
            )}
            {log.statusCode && (
              <div className="text-xs text-corporate-textSecondary mt-1">
                Status: {log.statusCode}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditLog;

