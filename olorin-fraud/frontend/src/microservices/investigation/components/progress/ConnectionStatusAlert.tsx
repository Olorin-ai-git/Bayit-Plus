/**
 * Connection Status Alert
 * Feature: 004-new-olorin-frontend
 *
 * Displays polling connection status and errors.
 */

import React from 'react';

interface ConnectionStatusAlertProps {
  isConnected: boolean;
  connectionError: string | null;
}

export const ConnectionStatusAlert: React.FC<ConnectionStatusAlertProps> = ({
  isConnected,
  connectionError
}) => {
  if (connectionError) {
    return (
      <div className="mb-6 bg-amber-900/20 border border-amber-500 rounded-lg p-4">
        <p className="text-amber-400 text-sm">
          ⚠️ Polling connection error: Unable to fetch investigation updates
        </p>
        <p className="text-amber-300 text-xs mt-2">
          Real-time updates may not be available. Please check your connection and refresh the page.
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mb-6 bg-blue-900/20 border border-blue-500 rounded-lg p-4">
        <p className="text-blue-400 text-sm">Establishing polling connection for updates...</p>
      </div>
    );
  }

  return null;
};
