/**
 * KPI Dashboard Charts Component
 * Feature: KPI Dashboard Microservice
 * 
 * Displays time series charts and profit curve
 */

import React from 'react';
import { TimeSeriesChart } from '../../analytics/components/common';
import type { TimeSeriesPoint } from '../../analytics/components/common/TimeSeriesChart';
import type { KPIDashboardResponse } from './types/kpi.types';

interface KPIDashboardChartsProps {
  data: KPIDashboardResponse;
}

const KPIDashboardCharts: React.FC<KPIDashboardChartsProps> = ({ data }) => {
  // Filter out null/undefined values - no fallback to 0
  const recallData: TimeSeriesPoint[] = data.daily_metrics
    .filter(m => m.recall !== null && m.recall !== undefined)
    .map(m => ({
      timestamp: new Date(m.metric_date).getTime(),
      value: m.recall!
    }));
  
  const fprData: TimeSeriesPoint[] = data.daily_metrics
    .filter(m => m.fpr !== null && m.fpr !== undefined)
    .map(m => ({
      timestamp: new Date(m.metric_date).getTime(),
      value: m.fpr!
    }));
  
  const precisionData: TimeSeriesPoint[] = data.daily_metrics
    .filter(m => m.precision !== null && m.precision !== undefined)
    .map(m => ({
      timestamp: new Date(m.metric_date).getTime(),
      value: m.precision!
    }));
  
  const profitData: TimeSeriesPoint[] = data.threshold_sweep
    .filter(s => s.profit !== null && s.profit !== undefined)
    .map(s => ({
      timestamp: s.threshold.toString(),
      value: s.profit!
    }));
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {recallData.length > 0 && (
        <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
            Recall Over Time
          </h3>
          <TimeSeriesChart data={recallData} width={600} height={300} />
        </div>
      )}
      
      {fprData.length > 0 && (
        <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
            False Positive Rate Over Time
          </h3>
          <TimeSeriesChart data={fprData} width={600} height={300} />
        </div>
      )}
      
      {precisionData.length > 0 && (
        <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
            Precision Over Time
          </h3>
          <TimeSeriesChart data={precisionData} width={600} height={300} />
        </div>
      )}
      
      {profitData.length > 0 && (
        <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
            Profit vs Threshold
          </h3>
          <TimeSeriesChart data={profitData} width={600} height={300} />
        </div>
      )}
    </div>
  );
};

export default KPIDashboardCharts;

