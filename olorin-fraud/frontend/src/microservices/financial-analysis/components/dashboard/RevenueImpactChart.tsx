/**
 * RevenueImpactChart Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays a bar chart of saved GMV vs lost revenue over time.
 */

import React, { useMemo } from 'react';
import { Card } from '@shared/components/ui/Card';
import type { InvestigationListItem } from '../../services/financialAnalysisService';

interface RevenueImpactChartProps {
  investigations: InvestigationListItem[];
  className?: string;
}

interface DayData {
  date: string;
  savedGmv: number;
  lostRevenue: number;
}

export const RevenueImpactChart: React.FC<RevenueImpactChartProps> = ({ investigations, className = '' }) => {
  const chartData = useMemo(() => {
    const map = new Map<string, DayData>();
    for (const inv of investigations) {
      const date = inv.completedAt?.split('T')[0] || 'Unknown';
      const existing = map.get(date) || { date, savedGmv: 0, lostRevenue: 0 };
      existing.savedGmv += inv.savedFraudGmv;
      existing.lostRevenue += inv.lostRevenues;
      map.set(date, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  }, [investigations]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.flatMap((d) => [d.savedGmv, d.lostRevenue]), 1);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <h3 className="text-lg font-semibold text-white mb-4">Revenue Impact (Last 7 Days)</h3>
        <div className="text-center text-corporate-textTertiary py-8">No data available</div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <h3 className="text-lg font-semibold text-white mb-4">Revenue Impact (Last 7 Days)</h3>
      <div className="flex items-end gap-2 h-40">
        {chartData.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end h-32">
              <div
                className="flex-1 bg-green-500/70 rounded-t"
                style={{ height: `${(day.savedGmv / maxValue) * 100}%`, minHeight: day.savedGmv > 0 ? '4px' : '0' }}
                title={`Saved: $${day.savedGmv.toLocaleString()}`}
              />
              <div
                className="flex-1 bg-red-500/70 rounded-t"
                style={{ height: `${(day.lostRevenue / maxValue) * 100}%`, minHeight: day.lostRevenue > 0 ? '4px' : '0' }}
                title={`Lost: $${day.lostRevenue.toLocaleString()}`}
              />
            </div>
            <div className="text-[10px] text-corporate-textTertiary">{day.date.slice(5)}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/70 rounded" />
          <span className="text-corporate-textSecondary">Saved GMV</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500/70 rounded" />
          <span className="text-corporate-textSecondary">Lost Revenue</span>
        </div>
      </div>
    </Card>
  );
};
