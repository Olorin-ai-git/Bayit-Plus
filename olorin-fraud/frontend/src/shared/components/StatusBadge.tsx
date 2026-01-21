/**
 * Unified Status Badge Component
 *
 * Consolidates all status badge variants into a single, type-safe component.
 * Replaces: StatusBadge, InvestigationStatusBadge, AgentStatusBadge, RiskScoreBadge
 *
 * @module shared/components/StatusBadge
 */

import React from 'react';
import {
  InvestigationStatus,
  AgentStatus,
  RiskLevel,
  PriorityLevel
} from '../validation/schemas';

// ============================================================================
// Types
// ============================================================================

export type BadgeType = 'investigation' | 'agent' | 'risk' | 'priority' | 'generic';

export type BadgeStatus =
  | InvestigationStatus
  | AgentStatus
  | RiskLevel
  | PriorityLevel
  | string;

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  /** Type of badge (determines color scheme) */
  type: BadgeType;
  /** Status value */
  status: BadgeStatus;
  /** Size variant */
  size?: BadgeSize;
  /** Show icon */
  showIcon?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Custom className */
  className?: string;
  /** Custom label (overrides default) */
  label?: string;
}

// ============================================================================
// Configuration
// ============================================================================

interface BadgeConfig {
  label: string;
  icon: string;
  className: string;
  description?: string;
}

type BadgeConfigs = {
  [K in BadgeType]: {
    [status: string]: BadgeConfig;
  };
};

/**
 * Badge configuration with Tailwind CSS classes and icons
 */
const badgeConfigs: BadgeConfigs = {
  investigation: {
    pending: {
      label: 'Pending',
      icon: '⏳',
      className: 'bg-gray-800/50 text-gray-400 border-gray-600',
      description: 'Investigation queued and waiting to start'
    },
    in_progress: {
      label: 'In Progress',
      icon: '▶️',
      className: 'bg-blue-900/30 text-blue-400 border-blue-500',
      description: 'Investigation currently running'
    },
    completed: {
      label: 'Completed',
      icon: '✓',
      className: 'bg-green-900/30 text-green-400 border-green-500',
      description: 'Investigation finished successfully'
    },
    failed: {
      label: 'Failed',
      icon: '✕',
      className: 'bg-red-900/30 text-red-400 border-red-500',
      description: 'Investigation encountered an error'
    },
    cancelled: {
      label: 'Cancelled',
      icon: '⊘',
      className: 'bg-gray-800/50 text-gray-400 border-gray-600',
      description: 'Investigation was cancelled by user'
    }
  },

  agent: {
    idle: {
      label: 'Idle',
      icon: '○',
      className: 'bg-gray-800/50 text-gray-400 border-gray-600',
      description: 'Agent ready to execute'
    },
    running: {
      label: 'Running',
      icon: '⚙️',
      className: 'bg-cyan-900/30 text-cyan-400 border-cyan-500',
      description: 'Agent currently executing'
    },
    completed: {
      label: 'Completed',
      icon: '✓',
      className: 'bg-green-900/30 text-green-400 border-green-500',
      description: 'Agent finished successfully'
    },
    error: {
      label: 'Error',
      icon: '⚠',
      className: 'bg-red-900/30 text-red-400 border-red-500',
      description: 'Agent encountered an error'
    },
    timeout: {
      label: 'Timeout',
      icon: '⏱',
      className: 'bg-amber-900/20 text-amber-400 border-amber-500',
      description: 'Agent execution timed out'
    }
  },

  risk: {
    low: {
      label: 'Low Risk',
      icon: '◉',
      className: 'bg-gray-800/50 text-gray-400 border-gray-600',
      description: 'Risk score: 0-39'
    },
    medium: {
      label: 'Medium Risk',
      icon: '◉',
      className: 'bg-cyan-900/30 text-cyan-400 border-cyan-500',
      description: 'Risk score: 40-59'
    },
    high: {
      label: 'High Risk',
      icon: '◉',
      className: 'bg-amber-900/20 text-amber-400 border-amber-500',
      description: 'Risk score: 60-79'
    },
    critical: {
      label: 'Critical Risk',
      icon: '◉',
      className: 'bg-red-900/30 text-red-400 border-red-500',
      description: 'Risk score: 80-100'
    }
  },

  priority: {
    low: {
      label: 'Low',
      icon: '▽',
      className: 'bg-gray-800/50 text-gray-400 border-gray-600',
      description: 'Low priority'
    },
    medium: {
      label: 'Medium',
      icon: '▼',
      className: 'bg-blue-900/30 text-blue-400 border-blue-500',
      description: 'Medium priority'
    },
    high: {
      label: 'High',
      icon: '▲',
      className: 'bg-amber-900/20 text-amber-400 border-amber-500',
      description: 'High priority'
    },
    critical: {
      label: 'Critical',
      icon: '⬆',
      className: 'bg-red-900/30 text-red-400 border-red-500',
      description: 'Critical priority'
    }
  },

  generic: {
    default: {
      label: 'Status',
      icon: '●',
      className: 'bg-gray-800/50 text-gray-400 border-gray-600',
      description: 'Generic status'
    }
  }
};

/**
 * Size class mappings
 */
const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-xs',
  sm: 'px-2.5 py-1 text-sm',
  md: 'px-3 py-1.5 text-base',
  lg: 'px-4 py-2 text-lg'
};

// ============================================================================
// Component
// ============================================================================

/**
 * Unified status badge component
 *
 * @example
 * ```tsx
 * // Investigation status
 * <StatusBadge type="investigation" status="in_progress" />
 *
 * // Agent status with custom size
 * <StatusBadge type="agent" status="running" size="lg" />
 *
 * // Risk level without icon
 * <StatusBadge type="risk" status="critical" showIcon={false} />
 *
 * // Custom label
 * <StatusBadge type="generic" status="custom" label="Custom Status" />
 * ```
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  status,
  size = 'md',
  showIcon = true,
  showTooltip = true,
  className = '',
  label
}) => {
  // Get configuration for this status
  const config = badgeConfigs[type]?.[status] || badgeConfigs.generic.default;

  // Build className
  const badgeClassName = [
    'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all',
    config.className,
    sizeClasses[size],
    className
  ]
    .filter(Boolean)
    .join(' ');

  // Render badge
  const badge = (
    <span className={badgeClassName} role="status" aria-label={config.label}>
      {showIcon && <span className="leading-none">{config.icon}</span>}
      <span className="leading-none">{label || config.label}</span>
    </span>
  );

  // Wrap with tooltip if enabled
  if (showTooltip && config.description) {
    return (
      <div className="relative inline-flex group">
        {badge}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-gray-200 text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-50 shadow-lg border border-gray-700">
          {config.description}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    );
  }

  return badge;
};

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Investigation status badge
 */
export const InvestigationStatusBadge: React.FC<
  Omit<StatusBadgeProps, 'type'> & { status: InvestigationStatus }
> = (props) => <StatusBadge type="investigation" {...props} />;

/**
 * Agent status badge
 */
export const AgentStatusBadge: React.FC<
  Omit<StatusBadgeProps, 'type'> & { status: AgentStatus }
> = (props) => <StatusBadge type="agent" {...props} />;

/**
 * Risk level badge
 */
export const RiskBadge: React.FC<
  Omit<StatusBadgeProps, 'type'> & { status: RiskLevel }
> = (props) => <StatusBadge type="risk" {...props} />;

/**
 * Priority badge
 */
export const PriorityBadge: React.FC<
  Omit<StatusBadgeProps, 'type'> & { status: PriorityLevel }
> = (props) => <StatusBadge type="priority" {...props} />;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get risk level from score (0-100)
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Get badge configuration for a status
 */
export function getBadgeConfig(
  type: BadgeType,
  status: BadgeStatus
): BadgeConfig {
  return badgeConfigs[type]?.[status] || badgeConfigs.generic.default;
}
