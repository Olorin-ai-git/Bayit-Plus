/**
 * Top Drivers Component - Display top feature drivers for a cohort.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { formatPercentage } from '../../utils/formatters';

interface TopDriversProps {
  cohortId: string;
  startDate: string;
  endDate: string;
}

const TopDrivers: React.FC<TopDriversProps> = ({ cohortId, startDate, endDate }) => {
  const [drivers, setDrivers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadDrivers();
  }, [cohortId, startDate, endDate]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getCohortTopDrivers(cohortId, startDate, endDate);
      setDrivers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load top drivers'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading top drivers..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Top Drivers"
        message={error.message}
        actionLabel="Retry"
        onAction={loadDrivers}
      />
    );
  }

  if (!drivers || !drivers.topDrivers || drivers.topDrivers.length === 0) {
    return (
      <EmptyState
        title="No Drivers Found"
        message="No top drivers could be identified for this cohort."
      />
    );
  }

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">Top Drivers</h3>
        {drivers.sampleSize && (
          <span className="text-sm text-corporate-textSecondary">
            Sample: {drivers.sampleSize.toLocaleString()}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {drivers.topDrivers.map((driver: any, index: number) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-corporate-bgTertiary border border-corporate-border"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-corporate-textSecondary">#{index + 1}</span>
                <span className="font-semibold text-corporate-textPrimary">
                  {driver.feature.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              </div>
              <span className="text-lg font-bold text-corporate-accentPrimary">
                {formatPercentage(driver.impact)}
              </span>
            </div>
            <div className="h-2 bg-corporate-bgSecondary rounded-full overflow-hidden">
              <div
                className="h-full bg-corporate-accentPrimary"
                style={{ width: `${Math.min(driver.impact * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopDrivers;

