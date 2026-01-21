/**
 * ChartWidget Component - Wrapper for chart widgets using visualization microservice
 */

import React, { useMemo } from 'react';
// Import charts directly from visualization microservice
import { LineChart } from '../../../visualization/components/charts/LineChart';
import { BarChart } from '../../../visualization/components/charts/BarChart';
import { PieChart } from '../../../visualization/components/charts/PieChart';
import { Heatmap } from '../../../visualization/components/charts/Heatmap';
import type { ChartConfig } from '../../../visualization/types/chart.types';
import type { InvestigationStatistics } from '../../types/reports';

interface ChartWidgetProps {
  type: 'timeseries' | 'success' | 'hbar' | 'heat';
  data: InvestigationStatistics | null;
  loading?: boolean;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ type, data, loading = false }) => {
  const chartConfig = useMemo<ChartConfig | null>(() => {
    if (!data) {
      console.log('[ChartWidget] No data provided');
      return null;
    }
    // Always create config - use empty arrays if no data (not a placeholder/mock)
    const investigations = data.investigations || [];
    console.log('[ChartWidget] Processing chart type:', type, 'with', investigations.length, 'investigations');
    if (investigations.length > 0) {
      console.log('[ChartWidget] Sample investigation:', {
        id: investigations[0].id,
        name: investigations[0].name,
        updated: investigations[0].updated,
        sources: investigations[0].sources,
        allKeys: Object.keys(investigations[0]),
      });
    }

    if (type === 'timeseries') {
      // Timeseries line chart - investigations created over time
      const days = 30;
      const start = new Date(Date.now() - days * 86400000);
      const dayMap = new Map<string, number>();
      
      investigations.forEach((inv) => {
        // Handle null updated timestamp
        if (!inv.updated) return;
        const date = new Date(inv.updated).toISOString().slice(0, 10);
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
      });

      const chartData = Array.from({ length: days }, (_, i) => {
        const date = new Date(start.getTime() + i * 86400000);
        const key = date.toISOString().slice(0, 10);
        return {
          x: date.toISOString().slice(0, 10),
          y: dayMap.get(key) || 0,
        };
      });

                  // Create gradient for line chart
                  const gradientColors = {
                    border: '#A855F7', // Olorin purple
                    fillStart: 'rgba(168, 85, 247, 0.3)', // Purple with opacity
                    fillEnd: 'rgba(168, 85, 247, 0.05)', // Lighter purple
                  };

                  return {
                    id: 'timeseries-chart',
                    type: 'line',
                    title: 'Investigations Over Time',
                    size: 'full',
                    datasets: [
                      {
                        label: 'Investigations',
                        data: chartData,
                        borderColor: gradientColors.border,
                        backgroundColor: gradientColors.fillStart,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#A855F7',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: '#C084FC',
                        pointHoverBorderColor: '#FFFFFF',
                        pointHoverBorderWidth: 3,
                      },
                    ],
                    options: {
                      maintainAspectRatio: false,
                      showGrid: true,
                      gridColor: 'rgba(168, 85, 247, 0.1)',
                      textColor: '#D8B4FE',
                      borderColor: 'rgba(168, 85, 247, 0.2)',
                    },
                  };
    }

    if (type === 'success') {
      // Donut chart - success rate
      // Use success_rate from backend (calculated from ALL investigations, not just recent 10)
      const successRate = data.success_rate / 100; // Backend returns 0-100, convert to 0-1

                  // Rich gradient colors for success chart
                  const successColors = [
                    'rgba(168, 85, 247, 0.9)', // Vibrant purple
                    'rgba(192, 132, 252, 0.6)', // Lighter purple
                    'rgba(139, 92, 246, 0.4)', // Medium purple
                    'rgba(124, 58, 237, 0.2)', // Dark purple
                  ];

                  return {
                    id: 'success-chart',
                    type: 'doughnut',
                    title: 'Success Rate',
                    size: 'full',
                    datasets: [
                      {
                        label: 'Success Rate',
                        data: [
                          { x: 'Success', y: Math.round(successRate * 100) },
                          { x: 'Other', y: Math.round((1 - successRate) * 100) },
                        ],
                        backgroundColor: [
                          'rgba(168, 85, 247, 0.9)', // Vibrant Olorin purple
                          'rgba(168, 85, 247, 0.15)', // Subtle purple background
                        ],
                        borderColor: [
                          '#A855F7', // Bright purple border
                          'rgba(168, 85, 247, 0.3)', // Subtle border
                        ],
                        borderWidth: 3,
                        hoverBackgroundColor: [
                          'rgba(192, 132, 252, 1)', // Lighter purple on hover
                          'rgba(168, 85, 247, 0.25)',
                        ],
                      },
                    ],
                    options: {
                      maintainAspectRatio: false,
                      showLegend: false,
                      cutout: '70%',
                    },
                  };
    }

    if (type === 'hbar') {
      // Horizontal bar chart - top sources/tools
      const sourceMap = new Map<string, number>();
      investigations.forEach((inv: any) => {
        // Debug: log all available fields
        if (investigations.indexOf(inv) === 0) {
          console.log('[ChartWidget] hbar - Sample investigation keys:', Object.keys(inv));
          console.log('[ChartWidget] hbar - Sample investigation values:', {
            sources: inv.sources,
            tools: inv.tools,
            source: inv.source,
            progress_json: inv.progress_json,
            progress: inv.progress,
          });
        }
        
        // Check multiple possible fields for sources/tools
        // Backend sends "sources" field with tools array
        const sources = inv.sources || inv.tools || inv.source || [];
        
        // Handle both array and single string values
        const sourceArray = Array.isArray(sources) ? sources : sources ? [sources] : [];
        
        if (investigations.indexOf(inv) === 0) {
          console.log('[ChartWidget] hbar - Extracted sources array:', sourceArray);
        }
        
        sourceArray.forEach((src: string) => {
          if (src && typeof src === 'string') {
            sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
          }
        });
      });

      const entries = Array.from(sourceMap.entries())
        .map(([k, v]) => ({ x: k, y: v }))
        .sort((a, b) => b.y - a.y)
        .slice(0, 8);
      
      console.log('[ChartWidget] hbar - Final entries:', entries);
      
      // If no sources found, return null to show empty state
      if (entries.length === 0) {
        console.log('[ChartWidget] hbar - No entries found, returning null');
        return null;
      }

                  // Create vibrant gradient colors for bars
                  const barColors = entries.map((_, index) => {
                    const colors = [
                      'rgba(168, 85, 247, 0.9)', // Olorin purple
                      'rgba(192, 132, 252, 0.85)', // Lighter purple
                      'rgba(139, 92, 246, 0.8)', // Medium purple
                      'rgba(124, 58, 237, 0.75)', // Dark purple
                      'rgba(168, 85, 247, 0.7)', // Repeat with opacity
                      'rgba(192, 132, 252, 0.65)',
                      'rgba(139, 92, 246, 0.6)',
                      'rgba(124, 58, 237, 0.55)',
                    ];
                    return colors[index % colors.length];
                  });

                  return {
                    id: 'hbar-chart',
                    type: 'bar',
                    title: 'Top Sources/Tools',
                    size: 'full',
                    datasets: [
                      {
                        label: 'Usage',
                        data: entries,
                        backgroundColor: barColors,
                        borderColor: entries.map((_, index) => {
                          const borders = [
                            '#A855F7',
                            '#C084FC',
                            '#8B5CF6',
                            '#7C3AED',
                            '#A855F7',
                            '#C084FC',
                            '#8B5CF6',
                            '#7C3AED',
                          ];
                          return borders[index % borders.length];
                        }),
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false,
                      },
                    ],
                    options: {
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      showGrid: true,
                      gridColor: 'rgba(168, 85, 247, 0.1)',
                      textColor: '#D8B4FE',
                      borderColor: 'rgba(168, 85, 247, 0.2)',
                    },
                  };
    }

    if (type === 'heat') {
      // Heatmap uses dedicated component - return null to trigger special rendering
      return null;
    }

    return null;
  }, [type, data]);

  // Special handling for heatmap - uses dedicated component
  // Heatmap handles its own loading/empty states, so we can render it even when chartConfig is null
  // MUST check BEFORE the !chartConfig check, since heatmap returns null from chartConfig
  if (type === 'heat') {
    console.log('[ChartWidget] Rendering heatmap component', { loading, hasData: !!data, investigationsCount: data?.investigations?.length || 0 });
    return (
      <div className="widget my-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg hover:border-corporate-accentPrimary/60 transition-all overflow-hidden flex flex-col h-[500px]">
        {/* Chart Header - matching ChartContainer style */}
        <div className="flex items-start justify-between mb-3 flex-shrink-0 px-6 pt-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-corporate-textPrimary">Activity Heatmap</h3>
          </div>
        </div>
        {/* Chart Content */}
        <div className="flex-1 min-h-0 px-6 pb-4">
          <Heatmap data={data} />
        </div>
        {/* Chart Footer - matching ChartContainer style */}
        <div className="chart-footer mt-3 pt-3 border-t border-corporate-borderPrimary/40 flex-shrink-0 px-6 pb-4">
          <div className="flex items-center justify-between text-xs text-corporate-textSecondary">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-corporate-accentPrimary animate-pulse"></div>
              Visualization Service
            </span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget my-6 rounded-xl border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md shadow-lg h-[400px] hover:border-corporate-accentPrimary/60 transition-all overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 p-4">
        {type === 'timeseries' && chartConfig && (
          <div className="h-full w-full">
            <LineChart config={chartConfig} />
          </div>
        )}
        {type === 'success' && chartConfig && (
          <div className="h-full w-full">
            <PieChart config={chartConfig} />
          </div>
        )}
        {type === 'hbar' && chartConfig && (
          <div className="h-full w-full">
            <BarChart config={chartConfig} />
          </div>
        )}
      </div>
    </div>
  );
};

