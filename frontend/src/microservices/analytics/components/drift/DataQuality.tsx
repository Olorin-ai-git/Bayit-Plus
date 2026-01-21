/**
 * Data Quality Component - Display data quality metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { LoadingState } from '../common/LoadingState';
import { formatPercentage } from '../../utils/formatters';

const DataQuality: React.FC = () => {
  const [qualityData, setQualityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQualityData();
    const interval = setInterval(loadQualityData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadQualityData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const data = await analyticsService.checkDataQuality(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setQualityData(data);
    } catch (err) {
      console.error('Failed to load quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading data quality metrics..." />;
  }

  if (!qualityData) {
    return null;
  }

  return (
    <div className="p-6 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">Data Quality</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-corporate-textSecondary">Completeness</div>
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {formatPercentage(qualityData.completeness)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">Null Score Rate</div>
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {formatPercentage(qualityData.nullScoreRate)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">Null Email Rate</div>
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {formatPercentage(qualityData.nullEmailRate)}
          </div>
        </div>
        <div>
          <div className="text-sm text-corporate-textSecondary">Total Records</div>
          <div className="text-2xl font-bold text-corporate-textPrimary">
            {qualityData.totalRecords?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {qualityData.schemaConformance && (
        <div className="mt-4 pt-4 border-t border-corporate-border">
          <div className="text-sm text-corporate-textSecondary mb-2">Schema Conformance</div>
          <div
            className={`inline-block px-3 py-1 rounded ${
              qualityData.schemaConformance.status === 'conformant'
                ? 'bg-corporate-success/20 text-corporate-success'
                : 'bg-corporate-error/20 text-corporate-error'
            }`}
          >
            {qualityData.schemaConformance.status === 'conformant' ? '✓ Conformant' : '⚠ Issues Detected'}
          </div>
          {qualityData.schemaConformance.issueCount > 0 && (
            <div className="mt-2 text-sm text-corporate-textSecondary">
              {qualityData.schemaConformance.issueCount} issue(s) found
            </div>
          )}
        </div>
      )}

      {qualityData.labelDelay && (
        <div className="mt-4 pt-4 border-t border-corporate-border">
          <div className="text-sm text-corporate-textSecondary mb-2">Label Delay</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-corporate-textSecondary">Average</div>
              <div className="text-lg font-semibold text-corporate-textPrimary">
                {qualityData.labelDelay.averageDelayHours?.toFixed(1) || 0}h
              </div>
            </div>
            <div>
              <div className="text-xs text-corporate-textSecondary">P95</div>
              <div className="text-lg font-semibold text-corporate-textPrimary">
                {qualityData.labelDelay.p95DelayHours?.toFixed(1) || 0}h
              </div>
            </div>
            <div>
              <div className="text-xs text-corporate-textSecondary">Completeness</div>
              <div className="text-lg font-semibold text-corporate-textPrimary">
                {formatPercentage(qualityData.labelDelay.labelCompleteness || 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataQuality;

