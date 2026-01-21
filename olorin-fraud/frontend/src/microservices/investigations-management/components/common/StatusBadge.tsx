/**
 * Status Badge Component
 * Displays investigation status with appropriate styling
 */

import React from 'react';
import { InvestigationStatus } from '../../types/investigations';

interface StatusBadgeProps {
  status: InvestigationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const statusStyles: Record<InvestigationStatus, string> = {
    'pending': 'bg-corporate-warning/20 text-corporate-warning border-corporate-warning/50',
    'in-progress': 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border-corporate-accentPrimary/50',
    'completed': 'bg-corporate-success/20 text-corporate-success border-corporate-success/50',
    'failed': 'bg-corporate-error/20 text-corporate-error border-corporate-error/50',
    'archived': 'bg-corporate-textSecondary/20 text-corporate-textSecondary border-corporate-textSecondary/50'
  };

  const statusLabels: Record<InvestigationStatus, string> = {
    'pending': 'Pending',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'failed': 'Failed',
    'archived': 'Archived'
  };

  const baseStyles = 'px-3 py-1 rounded-full text-xs font-semibold border-2';
  const statusStyle = statusStyles[status] || statusStyles.pending;
  const label = statusLabels[status] || status;

  return (
    <span className={`${baseStyles} ${statusStyle} ${className}`}>
      {label}
    </span>
  );
};

