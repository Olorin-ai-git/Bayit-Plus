/**
 * KPI Dashboard Tiles Component
 * Feature: KPI Dashboard Microservice
 * 
 * Displays top-level KPI tiles (recall, FPR, precision, net savings, latency, error rate)
 */

import React from 'react';
import type { KPIDashboardResponse } from './types/kpi.types';

interface KPIDashboardTilesProps {
  data: KPIDashboardResponse;
}

const KPIDashboardTiles: React.FC<KPIDashboardTilesProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Recall</h3>
        <div className="text-2xl font-bold text-corporate-info">
          {data.recall !== null ? `${(data.recall * 100).toFixed(2)}%` : 'N/A'}
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">FPR</h3>
        <div className="text-2xl font-bold text-corporate-warning">
          {data.fpr !== null ? `${(data.fpr * 100).toFixed(2)}%` : 'N/A'}
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Precision</h3>
        <div className="text-2xl font-bold text-corporate-success">
          {data.precision !== null ? `${(data.precision * 100).toFixed(2)}%` : 'N/A'}
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Net Savings</h3>
        <div className="text-2xl font-bold text-corporate-accentSecondary">
          {data.net_savings !== null ? `$${data.net_savings.toFixed(2)}` : 'N/A'}
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Latency P95</h3>
        <div className="text-2xl font-bold text-corporate-accentPrimary">
          {data.latency_p95 !== null ? `${data.latency_p95.toFixed(2)}ms` : 'N/A'}
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Error Rate</h3>
        <div className="text-2xl font-bold text-corporate-error">
          {data.error_rate !== null ? `${(data.error_rate * 100).toFixed(2)}%` : 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default KPIDashboardTiles;





