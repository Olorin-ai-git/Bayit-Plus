/**
 * StatusBadge Component
 *
 * A flexible status badge component for displaying various states, progress,
 * and categorization with consistent styling and accessibility.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React from 'react';

export interface StatusBadgeProps {
  /** Status label */
  label: string;
  /** Status variant */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'processing' | 'custom';
  /** Badge size */
  size?: 'small' | 'medium' | 'large';
  /** Badge style */
  style?: 'filled' | 'outlined' | 'soft' | 'minimal';
  /** Show status icon */
  showIcon?: boolean;
  /** Custom icon */
  icon?: string | React.ReactNode;
  /** Show pulse animation for processing states */
  animated?: boolean;
  /** Custom color override (for variant: 'custom') */
  customColor?: {
    background?: string;
    text?: string;
    border?: string;
  };
  /** Additional information tooltip */
  tooltip?: string;
  /** Click handler */
  onClick?: () => void;
  /** Custom styling classes */
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'medium',
  style = 'soft',
  showIcon = true,
  icon,
  animated = false,
  customColor,
  tooltip,
  onClick,
  className = '',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-0.5 text-xs';
      case 'large':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const getVariantConfig = () => {
    if (variant === 'custom' && customColor) {
      return {
        icon: icon || '●',
        styles: {
          filled: `bg-[${customColor.background || '#6b7280'}] text-[${customColor.text || '#ffffff'}] border-[${customColor.border || 'transparent'}]`,
          outlined: `bg-transparent text-[${customColor.text || '#6b7280'}] border-[${customColor.border || customColor.text || '#6b7280'}]`,
          soft: `bg-[${customColor.background || '#f3f4f6'}] text-[${customColor.text || '#6b7280'}] border-transparent`,
          minimal: `bg-transparent text-[${customColor.text || '#6b7280'}] border-transparent`,
        },
      };
    }

    switch (variant) {
      case 'success':
        return {
          icon: icon || '✓',
          styles: {
            filled: 'bg-green-600 text-white border-green-600',
            outlined: 'bg-transparent text-green-600 border-green-600',
            soft: 'bg-green-100 text-green-800 border-transparent',
            minimal: 'bg-transparent text-green-600 border-transparent',
          },
        };
      case 'warning':
        return {
          icon: icon || '⚠',
          styles: {
            filled: 'bg-yellow-600 text-white border-yellow-600',
            outlined: 'bg-transparent text-yellow-600 border-yellow-600',
            soft: 'bg-yellow-100 text-yellow-800 border-transparent',
            minimal: 'bg-transparent text-yellow-600 border-transparent',
          },
        };
      case 'error':
        return {
          icon: icon || '✕',
          styles: {
            filled: 'bg-red-600 text-white border-red-600',
            outlined: 'bg-transparent text-red-600 border-red-600',
            soft: 'bg-red-100 text-red-800 border-transparent',
            minimal: 'bg-transparent text-red-600 border-transparent',
          },
        };
      case 'info':
        return {
          icon: icon || 'ℹ',
          styles: {
            filled: 'bg-blue-600 text-white border-blue-600',
            outlined: 'bg-transparent text-blue-600 border-blue-600',
            soft: 'bg-blue-100 text-blue-800 border-transparent',
            minimal: 'bg-transparent text-blue-600 border-transparent',
          },
        };
      case 'processing':
        return {
          icon: icon || '⟳',
          styles: {
            filled: 'bg-purple-600 text-white border-purple-600',
            outlined: 'bg-transparent text-purple-600 border-purple-600',
            soft: 'bg-purple-100 text-purple-800 border-transparent',
            minimal: 'bg-transparent text-purple-600 border-transparent',
          },
        };
      default: // neutral
        return {
          icon: icon || '●',
          styles: {
            filled: 'bg-gray-600 text-white border-gray-600',
            outlined: 'bg-transparent text-gray-600 border-gray-600',
            soft: 'bg-gray-100 text-gray-800 border-transparent',
            minimal: 'bg-transparent text-gray-600 border-transparent',
          },
        };
    }
  };

  const config = getVariantConfig();

  const getBaseClasses = () => {
    const baseClasses = [
      'inline-flex items-center gap-1.5',
      'font-medium rounded-full border',
      'transition-all duration-200',
      getSizeClasses(),
      config.styles[style],
    ];

    if (onClick) {
      baseClasses.push('cursor-pointer hover:opacity-80 focus:ring-2 focus:ring-blue-500 focus:outline-none');
    }

    if (animated) {
      baseClasses.push('animate-pulse');
    }

    return baseClasses.join(' ');
  };

  const renderIcon = () => {
    if (!showIcon) return null;

    if (React.isValidElement(config.icon)) {
      return config.icon;
    }

    const iconSizeClass = size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm';

    return (
      <span
        className={`flex-shrink-0 ${iconSizeClass} ${animated && variant === 'processing' ? 'animate-spin' : ''}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>
    );
  };

  const badgeElement = (
    <span
      className={`status-badge ${getBaseClasses()} ${className}`}
      role={onClick ? 'button' : 'status'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={tooltip || `Status: ${label}`}
      title={tooltip}
    >
      {renderIcon()}
      <span className="truncate">{label}</span>
    </span>
  );

  return badgeElement;
};

// Predefined status badge components for common use cases
export const SuccessBadge: React.FC<Omit<StatusBadgeProps, 'variant'>> = (props) => (
  <StatusBadge {...props} variant="success" />
);

export const WarningBadge: React.FC<Omit<StatusBadgeProps, 'variant'>> = (props) => (
  <StatusBadge {...props} variant="warning" />
);

export const ErrorBadge: React.FC<Omit<StatusBadgeProps, 'variant'>> = (props) => (
  <StatusBadge {...props} variant="error" />
);

export const InfoBadge: React.FC<Omit<StatusBadgeProps, 'variant'>> = (props) => (
  <StatusBadge {...props} variant="info" />
);

export const ProcessingBadge: React.FC<Omit<StatusBadgeProps, 'variant'>> = (props) => (
  <StatusBadge {...props} variant="processing" animated={props.animated ?? true} />
);

// Investigation-specific status badges
export const InvestigationStatusBadge: React.FC<{
  status: 'active' | 'pending' | 'completed' | 'failed' | 'cancelled';
  size?: StatusBadgeProps['size'];
  style?: StatusBadgeProps['style'];
  onClick?: () => void;
}> = ({ status, size, style, onClick }) => {
  const statusConfig = {
    active: { variant: 'processing' as const, label: 'Active', animated: true },
    pending: { variant: 'warning' as const, label: 'Pending', animated: false },
    completed: { variant: 'success' as const, label: 'Completed', animated: false },
    failed: { variant: 'error' as const, label: 'Failed', animated: false },
    cancelled: { variant: 'neutral' as const, label: 'Cancelled', animated: false },
  };

  const config = statusConfig[status];

  return (
    <StatusBadge
      variant={config.variant}
      label={config.label}
      animated={config.animated}
      size={size}
      style={style}
      onClick={onClick}
    />
  );
};

export const RiskLevelBadge: React.FC<{
  riskScore: number; // 0-1
  size?: StatusBadgeProps['size'];
  style?: StatusBadgeProps['style'];
  showScore?: boolean;
  onClick?: () => void;
}> = ({ riskScore, size, style, showScore = true, onClick }) => {
  const getRiskLevel = (score: number) => {
    if (score >= 0.8) return { level: 'Critical', variant: 'error' as const };
    if (score >= 0.6) return { level: 'High', variant: 'warning' as const };
    if (score >= 0.4) return { level: 'Medium', variant: 'info' as const };
    return { level: 'Low', variant: 'success' as const };
  };

  const { level, variant } = getRiskLevel(riskScore);
  const scorePercent = Math.round(riskScore * 100);
  const label = showScore ? `${level} (${scorePercent}%)` : level;

  return (
    <StatusBadge
      variant={variant}
      label={label}
      size={size}
      style={style}
      onClick={onClick}
      tooltip={`Risk Score: ${scorePercent}%`}
    />
  );
};

export default StatusBadge;