/**
 * Error Notification Component
 * Feature: 006-hybrid-graph-integration
 *
 * Displays error messages for hybrid graph investigation submissions.
 */

import React from 'react';

interface ErrorNotificationProps {
  message: string;
}

export function ErrorNotification({ message }: ErrorNotificationProps) {
  return (
    <div className="mb-4 p-4 bg-corporate-error/20 border border-corporate-error rounded-md">
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}
