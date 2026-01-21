import React from 'react';
import { DashboardLayout } from '../../types/chart.types';

interface DashboardGridProps {
  layout: DashboardLayout;
  charts: Map<string, React.ReactNode>;
  className?: string;
}

export function DashboardGrid({ layout, charts, className = '' }: DashboardGridProps) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
    gap: `${layout.gap}px`,
    width: '100%',
    height: '100%'
  };

  return (
    <div className={`dashboard-grid bg-gray-950 p-6 rounded-lg ${className}`}>
      {/* Dashboard Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-100">{layout.name}</h2>
        {layout.description && (
          <p className="text-sm text-gray-400 mt-2">{layout.description}</p>
        )}
      </div>

      {/* Chart Grid */}
      <div style={gridStyle}>
        {layout.charts.map((chartPosition) => {
          const chart = charts.get(chartPosition.chartId);
          if (!chart) return null;

          const itemStyle: React.CSSProperties = {
            gridRow: `${chartPosition.position.row} / span ${chartPosition.position.rowSpan}`,
            gridColumn: `${chartPosition.position.col} / span ${chartPosition.position.colSpan}`
          };

          return (
            <div
              key={chartPosition.id}
              style={itemStyle}
              className="dashboard-grid-item"
            >
              {chart}
            </div>
          );
        })}
      </div>

      {/* Dashboard Footer */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Dashboard: {layout.name}</span>
          <span>{layout.charts.length} charts | Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
