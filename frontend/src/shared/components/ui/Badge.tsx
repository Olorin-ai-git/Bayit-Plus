import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
  dot = false
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors duration-200';

  const variantStyles = {
    default: 'bg-gray-800/50 text-gray-400 border border-gray-600',
    success: 'bg-green-900/30 text-green-400 border border-green-500',
    warning: 'bg-yellow-900/20 text-yellow-400 border border-yellow-500',
    error: 'bg-red-900/30 text-red-400 border border-red-500',
    info: 'bg-blue-900/30 text-blue-400 border border-blue-500',
    primary: 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border border-corporate-accentPrimary',
    secondary: 'bg-corporate-accentSecondary/20 text-corporate-accentSecondary border border-corporate-accentSecondary'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const dotColors = {
    default: 'bg-gray-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
    primary: 'bg-corporate-accentPrimary',
    secondary: 'bg-corporate-accentSecondary'
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {dot && (
        <span className={`w-2 h-2 rounded-full mr-1.5 ${dotColors[variant]}`} />
      )}
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </span>
  );
};
