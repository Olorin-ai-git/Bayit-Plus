/**
 * Control Buttons Component
 * Feature: 007-progress-wizard-page
 *
 * Investigation control buttons (pause, resume, cancel)
 */

import React from 'react';
import type { ConnectionStatusHeaderProps } from '../../services/componentAdapters';

interface ControlButtonsProps {
  status: ConnectionStatusHeaderProps['investigationStatus'];
  isConnected: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export const ControlButtons: React.FC<ControlButtonsProps> = ({
  status,
  isConnected,
  onPause,
  onResume,
  onCancel
}) => {
  const canPause = status === 'running' && isConnected;
  const canResume = status === 'paused' && isConnected;
  const canCancel = ['running', 'paused', 'submitted'].includes(status) && isConnected;

  return (
    <div className="flex items-center gap-3">
      {canResume && (
        <button
          onClick={onResume}
          className="px-4 py-2 bg-corporate-success/20 border-2 border-corporate-success hover:bg-corporate-success/30 text-corporate-success text-sm font-semibold rounded-lg transition-all duration-200 backdrop-blur"
          aria-label="Resume investigation"
        >
          Resume
        </button>
      )}

      {canPause && (
        <button
          onClick={onPause}
          className="px-4 py-2 bg-corporate-warning/20 border-2 border-corporate-warning hover:bg-corporate-warning/30 text-corporate-warning text-sm font-semibold rounded-lg transition-all duration-200 backdrop-blur"
          aria-label="Pause investigation"
        >
          Pause
        </button>
      )}

      {canCancel && (
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-corporate-error/20 border-2 border-corporate-error hover:bg-corporate-error/30 text-corporate-error text-sm font-semibold rounded-lg transition-all duration-200 backdrop-blur"
          aria-label="Cancel investigation"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default ControlButtons;
