/**
 * KPIWidget Component - Display KPI metrics (total, completed, success rate)
 */

import React from 'react';
import { InvestigationStatistics } from '../../types/reports';

interface KPIWidgetProps {
  type: 'total' | 'completed' | 'success';
  data: InvestigationStatistics | null;
  loading?: boolean;
}

export const KPIWidget: React.FC<KPIWidgetProps> = ({ type, data, loading = false }) => {
  if (loading) {
    return (
      <div className="widget my-6 p-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-corporate-accentPrimary animate-pulse"></div>
          <div className="text-sm text-corporate-textSecondary">Loading investigation statistics...</div>
        </div>
        <div className="text-4xl font-bold text-corporate-textTertiary animate-pulse ml-4">—</div>
      </div>
    );
  }

  // Render widget only if data exists - no fallback values
  if (!data) {
    return (
      <div className="widget my-6 p-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-corporate-borderPrimary/50"></div>
          <div className="text-sm font-medium text-corporate-textPrimary">No investigation data available</div>
        </div>
        <div className="text-xs text-corporate-textSecondary ml-4">Statistics will display when investigations are created</div>
      </div>
    );
  }
  
  const stats = data;

  let label = 'Total investigations';
  let value: string | number = stats.total;
  let iconColor = 'text-purple-400';

  if (type === 'completed') {
    label = 'Completed';
    value = stats.completed;
    iconColor = 'text-green-400';
  } else if (type === 'success') {
    label = 'Success rate';
    value = `${Math.round(stats.success_rate)}%`;
    iconColor = 'text-blue-400';
  }

  const bgColorMap: Record<string, string> = {
    'text-purple-400': 'bg-corporate-accentPrimary',
    'text-green-400': 'bg-corporate-success',
    'text-blue-400': 'bg-corporate-info',
  };

  return (
    <div className="widget my-6 p-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg hover:border-corporate-accentPrimary/60 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${bgColorMap[iconColor] || 'bg-corporate-accentPrimary'} opacity-80`}></div>
        <div className="text-sm font-semibold text-corporate-textSecondary uppercase tracking-wide">{label}</div>
      </div>
      <div className={`text-5xl font-bold ${iconColor} ml-4`}>{value}</div>
    </div>
  );
};

