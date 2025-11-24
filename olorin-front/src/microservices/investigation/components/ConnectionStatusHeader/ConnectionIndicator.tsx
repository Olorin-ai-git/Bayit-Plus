/**
 * Connection Status Indicator Component
 * Feature: 007-progress-wizard-page
 *
 * Shows server connection status with animated pulse
 */

import React from 'react';

export const ConnectionIndicator: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
  <div
    className={`w-3 h-3 rounded-full ${
      isConnected
        ? 'bg-corporate-success animate-pulse shadow-lg shadow-corporate-success'
        : 'bg-corporate-error shadow-lg shadow-corporate-error'
    }`}
    title={isConnected ? 'Connected to server' : 'Disconnected from server'}
  />
);

export default ConnectionIndicator;
