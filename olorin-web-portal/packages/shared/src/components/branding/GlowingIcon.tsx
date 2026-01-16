import React from 'react';

export interface GlowingIconProps {
  icon: React.ReactNode;
  className?: string;
  color?: 'purple' | 'pink' | 'cyan';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

/**
 * GlowingIcon Component
 *
 * Wrapper component that adds neon glow effect to icons.
 * Supports multiple color variants and sizes.
 *
 * @example
 * import { Shield } from 'lucide-react';
 *
 * <GlowingIcon icon={<Shield />} color="purple" size="lg" animate />
 */
export const GlowingIcon: React.FC<GlowingIconProps> = ({
  icon,
  className = '',
  color = 'purple',
  size = 'md',
  animate = false,
}) => {
  const colorClasses = {
    purple: 'text-wizard-accent-purple glow-purple',
    pink: 'text-wizard-accent-pink glow-pink',
    cyan: 'text-wizard-accent-cyan glow-cyan',
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const animateClass = animate ? 'glow-pulse' : '';

  const iconClass = `glow-icon ${colorClasses[color]} ${sizeClasses[size]} ${animateClass} ${className}`;

  return (
    <div className={iconClass}>
      {icon}
    </div>
  );
};

export default GlowingIcon;
