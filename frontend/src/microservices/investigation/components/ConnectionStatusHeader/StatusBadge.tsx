/**
 * Status Badge Component
 * Feature: 007-progress-wizard-page
 *
 * Displays investigation status with color-coded badge
 */

import React from 'react';
import { STATUS_COLORS, STATUS_LABELS } from './constants';
import type { ConnectionStatusHeaderProps } from '../../services/componentAdapters';

interface StatusBadgeProps {
  status: ConnectionStatusHeaderProps['investigationStatus'];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 backdrop-blur ${colors.bg} ${colors.border}`}>
      <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
    </div>
  );
};

export default StatusBadge;
