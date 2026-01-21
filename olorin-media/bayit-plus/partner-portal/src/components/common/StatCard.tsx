/**
 * Stat Card Component
 *
 * KPI display card with glass styling for dashboard metrics.
 */

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
}) => {
  return (
    <div
      className={`
        relative overflow-hidden
        rounded-2xl border border-white/10
        bg-glass-card backdrop-blur-xl
        p-6
        transition-all duration-300
        hover:border-white/20 hover:shadow-lg hover:shadow-partner-primary/5
        ${className}
      `}
    >
      {/* Background gradient accent */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-partner-primary/10 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/60">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>

          {(subtitle || trend) && (
            <div className="mt-2 flex items-center gap-2">
              {trend && (
                <span
                  className={`
                    inline-flex items-center gap-1 text-xs font-medium
                    ${trend.isPositive ? 'text-green-400' : 'text-red-400'}
                  `}
                >
                  <span>{trend.isPositive ? '↑' : '↓'}</span>
                  <span>{Math.abs(trend.value)}%</span>
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-white/40">{subtitle}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-partner-primary/10 text-partner-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
