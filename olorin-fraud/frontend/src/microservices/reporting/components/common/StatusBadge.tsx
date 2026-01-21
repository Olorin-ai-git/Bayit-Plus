/**
 * StatusBadge Component - Display report status with color coding
 */

import React from 'react';
import { ReportStatus } from '../../types/reports';

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const statusStyles: Record<ReportStatus, string> = {
    Published: 'text-corporate-success border-corporate-success/40 bg-black/30 backdrop-blur',
    Draft: 'text-corporate-warning border-corporate-warning/40 bg-black/30 backdrop-blur',
    Archived: 'text-corporate-textSecondary border-corporate-borderPrimary/40 bg-black/30 backdrop-blur',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border-2 ${statusStyles[status]} ${className}`}
    >
      {status}
    </span>
  );
};

