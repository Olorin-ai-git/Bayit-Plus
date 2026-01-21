/**
 * KPI Dashboard Breakdowns Component
 * Feature: KPI Dashboard Microservice
 * 
 * Displays breakdowns table by merchant/segment/method/model
 */

import React from 'react';
import type { KPIDashboardResponse } from './types/kpi.types';

interface KPIDashboardBreakdownsProps {
  data: KPIDashboardResponse;
}

const KPIDashboardBreakdowns: React.FC<KPIDashboardBreakdownsProps> = ({ data }) => {
  if (data.breakdowns.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
        Breakdowns
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-corporate-textSecondary">
          <thead>
            <tr className="border-b border-corporate-borderPrimary/30">
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Value</th>
              <th className="text-right p-2">Precision</th>
              <th className="text-right p-2">Recall</th>
              <th className="text-right p-2">FPR</th>
              <th className="text-right p-2">Total Events</th>
            </tr>
          </thead>
          <tbody>
            {data.breakdowns.map((breakdown) => (
              <tr key={breakdown.id} className="border-b border-corporate-borderPrimary/20">
                <td className="p-2">{breakdown.breakdown_type}</td>
                <td className="p-2">{breakdown.breakdown_value}</td>
                <td className="text-right p-2">
                  {breakdown.precision !== null ? `${(breakdown.precision * 100).toFixed(2)}%` : 'N/A'}
                </td>
                <td className="text-right p-2">
                  {breakdown.recall !== null ? `${(breakdown.recall * 100).toFixed(2)}%` : 'N/A'}
                </td>
                <td className="text-right p-2">
                  {breakdown.fpr !== null ? `${(breakdown.fpr * 100).toFixed(2)}%` : 'N/A'}
                </td>
                <td className="text-right p-2">{breakdown.total_events}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KPIDashboardBreakdowns;





