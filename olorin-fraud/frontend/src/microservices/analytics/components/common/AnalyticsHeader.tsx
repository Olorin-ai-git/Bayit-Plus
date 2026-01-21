/**
 * Analytics Header Component - Shared header for all analytics pages
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface AnalyticsHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  title = 'Analytics',
  subtitle,
}) => {
  const location = useLocation();

  const navItems = [
    { path: '/analytics/anomalies', label: 'Anomaly Hub' },
    { path: '/analytics/detectors', label: 'Detector Studio' },
    { path: '/analytics/replay', label: 'Replay Studio' },
  ];

  return (
    <div className="glass-md rounded-lg border border-corporate-borderPrimary/40 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-corporate-textPrimary">
            {title}
          </h1>
          {subtitle && (
            <p className="text-corporate-textSecondary mt-1">{subtitle}</p>
          )}
        </div>
        <nav className="flex items-center gap-2" aria-label="Analytics navigation">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border border-corporate-accentPrimary/40'
                      : 'text-corporate-textSecondary hover:bg-corporate-bgTertiary/50 border border-transparent'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

