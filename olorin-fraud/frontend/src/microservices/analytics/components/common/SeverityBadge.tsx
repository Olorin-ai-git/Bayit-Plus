/**
 * Severity Badge Component - Badge for anomaly severity levels
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';
import type { AnomalySeverity } from '../../types/anomaly';

export interface SeverityBadgeProps {
  severity: AnomalySeverity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className = '',
}) => {
  const severityConfig = {
    critical: {
      bg: 'bg-red-900/30',
      text: 'text-red-400',
      border: 'border-red-500/40',
      label: 'Critical',
    },
    warn: {
      bg: 'bg-yellow-900/30',
      text: 'text-yellow-400',
      border: 'border-yellow-500/40',
      label: 'Warning',
    },
    info: {
      bg: 'bg-blue-900/30',
      text: 'text-blue-400',
      border: 'border-blue-500/40',
      label: 'Info',
    },
  };

  const config = severityConfig[severity];

  return (
    <span
      className={`
        inline-flex items-center px-2 py-1 rounded text-xs font-medium
        ${config.bg} ${config.text} ${config.border} border
        ${className}
      `}
      aria-label={`Severity: ${config.label}`}
    >
      {config.label}
    </span>
  );
};

