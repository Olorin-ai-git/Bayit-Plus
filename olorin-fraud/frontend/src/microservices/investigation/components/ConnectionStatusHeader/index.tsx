/**
 * Connection Status Header Component
 * Feature: 007-progress-wizard-page (T041, FR-001)
 *
 * Enhanced header showing comprehensive investigation status with additional metrics.
 * SYSTEM MANDATE: <200 lines - refactored into focused sub-components
 */

import React from 'react';
import { ConnectionStatusHeaderProps } from '../../services/componentAdapters';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ActivityMetrics } from './ActivityMetrics';
import { StatusBadge } from './StatusBadge';
import { ControlButtons } from './ControlButtons';
import { AdditionalInfo } from './AdditionalInfo';

interface ConnectionStatusHeaderComponentProps extends ConnectionStatusHeaderProps {
  elapsedTime?: number;
  entitiesCount?: number;
  toolsCount?: number;
  progressPercent?: number;
}

export const ConnectionStatusHeader: React.FC<ConnectionStatusHeaderComponentProps> = ({
  investigationStatus,
  isConnected,
  toolsPerSec,
  isProcessing,
  onPause,
  onCancel,
  onResume,
  elapsedTime,
  entitiesCount,
  toolsCount,
  progressPercent
}) => {
  const getStatusMessage = () => {
    if (!isConnected && investigationStatus === 'pending') {
      return 'Waiting for Connection';
    }
    if (investigationStatus === 'running' && isProcessing) {
      return 'Investigation In Progress';
    }
    const labels = {
      pending: 'Pending',
      running: 'Running',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed',
      submitted: 'Submitted',
      cancelled: 'Cancelled'
    };
    return labels[investigationStatus];
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary rounded-lg p-6 mb-6 shadow-2xl shadow-corporate-accentPrimary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <ConnectionIndicator isConnected={isConnected} />
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-corporate-textPrimary">
              {getStatusMessage()}
            </span>
            <StatusBadge status={investigationStatus} />
          </div>
          {isConnected && (
            <ActivityMetrics toolsPerSec={toolsPerSec} isProcessing={isProcessing} />
          )}
        </div>
        <ControlButtons
          status={investigationStatus}
          isConnected={isConnected}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
        />
      </div>
      <div className="border-t border-corporate-borderPrimary/20 pt-4">
        <AdditionalInfo
          elapsedTime={elapsedTime}
          entitiesCount={entitiesCount}
          toolsCount={toolsCount}
          progress={progressPercent}
        />
      </div>
    </div>
  );
};

export default ConnectionStatusHeader;
