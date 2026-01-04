/**
 * Settings Page Loading State Component
 * Feature: 006-hybrid-graph-integration
 *
 * Displays loading indicator while settings are being initialized.
 */

import React from 'react';
import { LoadingSpinner } from '@shared/components';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoadingSpinner size="lg" message="Loading settings..." />
    </div>
  );
}
