/**
 * Heatmap Component - Activity heatmap with glassmorphic Olorin styling
 * Shows activity by day of week and hour of day
 */

import React, { useMemo, useState } from 'react';

// Investigation data structure for heatmap
interface Investigation {
  updated?: string | null;
  [key: string]: any;
}

interface InvestigationStatistics {
  investigations?: Investigation[];
  [key: string]: any;
}

interface HeatmapProps {
  data: InvestigationStatistics | null;
  className?: string;
}

interface HeatmapCell {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number;
  intensity: number; // 0-1
}

interface HeatmapDataResult {
  cells: HeatmapCell[];
  processedCount: number;
  skippedCount: number;
  totalCount: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Heatmap({ data, className = '' }: HeatmapProps) {
  console.log('[Heatmap] ⚡ Component function called', { hasData: !!data, investigationsCount: data?.investigations?.length || 0 });
  
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  console.log('[Heatmap] Component rendered with data:', data ? 'present' : 'null', data?.investigations?.length || 0, 'investigations');

  const heatmapData = useMemo<HeatmapDataResult>(() => {
    if (!data) {
      console.log('[Heatmap] No data provided');
      return { cells: [], processedCount: 0, skippedCount: 0, totalCount: 0 };
    }
    
    // Extract investigations array - same pattern as other charts
    const investigations = data.investigations || [];
    
    console.log('[Heatmap] Processing', investigations.length, 'investigations');
    
    if (investigations.length === 0) {
      console.log('[Heatmap] No investigations found');
      return { cells: [], processedCount: 0, skippedCount: 0, totalCount: 0 };
    }

    // Debug: log first investigation structure
    if (investigations.length > 0) {
      console.log('[Heatmap] Sample investigation:', {
        id: investigations[0].id,
        name: investigations[0].name,
        updated: investigations[0].updated,
        allKeys: Object.keys(investigations[0]),
      });
    }

    // Initialize 7x24 grid (7 days x 24 hours)
    const grid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    let processedCount = 0;
    let skippedCount = 0;
    let totalCount = 0;

    // Count activities by day/hour - same pattern as timeseries chart
    investigations.forEach((inv, index) => {
      totalCount++;
      // Handle null updated timestamp - backend uses created_at as updated
      // Also check for created_at as fallback
      const timestamp = inv.updated || (inv as any).created_at || (inv as any).createdAt;
      
      if (index === 0) {
        console.log('[Heatmap] First investigation timestamp check:', {
          updated: inv.updated,
          created_at: (inv as any).created_at,
          createdAt: (inv as any).createdAt,
          finalTimestamp: timestamp,
        });
      }
      
      if (!timestamp) {
        skippedCount++;
        return;
      }
      
      try {
        const date = new Date(timestamp);
        // Validate date is valid
        if (isNaN(date.getTime())) {
          console.warn('Invalid date in investigation:', timestamp);
          return;
        }
        
        const day = date.getDay(); // 0 (Sunday) to 6 (Saturday)
        const hour = date.getHours(); // 0 to 23
        
        if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
          grid[day][hour]++;
          processedCount++;
        }
      } catch (error) {
        // Skip invalid dates
        console.warn('[Heatmap] Error parsing date in investigation:', timestamp, error);
        skippedCount++;
      }
    });

    const maxValue = Math.max(1, ...grid.flat());
    
    console.log('[Heatmap] Processing complete:', {
      totalInvestigations: totalCount,
      processed: processedCount,
      skipped: skippedCount,
      maxValue,
      gridMax: Math.max(...grid.flat()),
    });
    
    // Convert to cell data (row-major order: all hours for day 0, then all hours for day 1, etc.)
    const cells: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        cells.push({
          day,
          hour,
          value: grid[day][hour],
          intensity: grid[day][hour] / maxValue,
        });
      }
    }

    return { cells, processedCount, skippedCount, totalCount };
  }, [data]);

  const getCellColor = (intensity: number): string => {
    // Olorin purple gradient: from subtle to vibrant
    const baseR = 168; // #A855F7
    const baseG = 85;
    const baseB = 247;

    // Intensity-based color calculation
    const r = Math.round(baseR - intensity * 60); // 168 -> 108
    const g = Math.round(baseG - intensity * 30); // 85 -> 55
    const b = Math.round(baseB - intensity * 50); // 247 -> 197

    const opacity = 0.2 + intensity * 0.8; // 0.2 -> 1.0
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const getCellBorderColor = (intensity: number, isHovered: boolean): string => {
    if (isHovered) {
      return 'rgba(168, 85, 247, 0.9)';
    }
    if (intensity > 0.5) {
      return 'rgba(168, 85, 247, 0.5)';
    }
    if (intensity > 0.2) {
      return 'rgba(168, 85, 247, 0.3)';
    }
    return 'rgba(255, 255, 255, 0.08)';
  };

  const getCellGlow = (intensity: number, isHovered: boolean): string => {
    if (isHovered) {
      return '0 0 12px rgba(168, 85, 247, 0.6), 0 0 24px rgba(168, 85, 247, 0.3)';
    }
    if (intensity > 0.7) {
      return `0 0 8px rgba(168, 85, 247, ${intensity * 0.4})`;
    }
    return 'none';
  };

  const heatmapCells = heatmapData.cells || [];
  const maxValue = Math.max(...heatmapCells.map(c => c.value), 1);
  const hasData = heatmapCells.some(c => c.value > 0);

  console.log('[Heatmap] Final state:', {
    heatmapDataLength: heatmapCells.length,
    hasData,
    maxValue,
    processedCount: heatmapData.processedCount || 0,
    skippedCount: heatmapData.skippedCount || 0,
    totalCount: heatmapData.totalCount || 0,
  });

  // Show empty state if no data - matching pattern from ChartWidget
  // BUT: Only show empty if we actually have investigations but no activity
  // If no investigations at all, let parent handle empty state
  if (data && data.investigations && data.investigations.length > 0 && !hasData) {
    console.log('[Heatmap] Showing empty state - investigations exist but no activity data');
    return (
      <div className={`heatmap-container h-full flex flex-col ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 flex-1">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur border-2 border-corporate-borderPrimary/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-corporate-textTertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-sm font-medium text-corporate-textPrimary mb-1">No activity data available</div>
          <div className="text-xs text-corporate-textSecondary">Investigations found but no timestamp data</div>
        </div>
      </div>
    );
  }
  
  // If no investigations at all, render empty grid (parent will show message)
  if (!data || !data.investigations || data.investigations.length === 0) {
    console.log('[Heatmap] No investigations data');
    return (
      <div className={`heatmap-container h-full flex flex-col ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 flex-1">
          <div className="text-sm font-medium text-corporate-textPrimary mb-1">No investigations available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`heatmap-container h-full flex flex-col ${className}`}>
      {/* Legend - header is now rendered by ChartWidget */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-3">
          <span className="text-xs text-corporate-textSecondary">Less</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
              <div
                key={intensity}
                className="w-4 h-4 rounded border border-corporate-borderPrimary/30"
                style={{
                  backgroundColor: getCellColor(intensity),
                  boxShadow: intensity > 0.7 ? `0 0 4px rgba(168, 85, 247, ${intensity * 0.3})` : 'none',
                }}
              />
            ))}
          </div>
          <span className="text-xs text-corporate-textSecondary">More</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="relative">
        {/* Hour labels (top) */}
        <div className="flex mb-2 pl-12">
          {HOURS.filter((_, i) => i % 6 === 0).map((hour) => (
            <div
              key={hour}
              className="text-xs text-corporate-textSecondary font-medium"
              style={{ width: `${(100 / 24) * 6}%` }}
            >
              {hour}:00
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-2">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pr-3 min-w-[40px]">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-xs text-corporate-textSecondary font-medium text-right flex items-center justify-end h-8"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap cells */}
          <div 
            className="flex-1 grid gap-1"
            style={{
              gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
            }}
          >
            {heatmapCells.map((cell) => {
              const isHovered = hoveredCell?.day === cell.day && hoveredCell?.hour === cell.hour;
              const bgColor = getCellColor(cell.intensity);
              const borderColor = getCellBorderColor(cell.intensity, isHovered);
              const glow = getCellGlow(cell.intensity, isHovered);

              return (
                <div
                  key={`${cell.day}-${cell.hour}`}
                  className="relative group cursor-pointer transition-all duration-200"
                  style={{
                    aspectRatio: '1',
                  }}
                  onMouseEnter={() => setHoveredCell({ day: cell.day, hour: cell.hour })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {/* Cell */}
                  <div
                    className="w-full h-full rounded border transition-all duration-200 relative overflow-hidden"
                    style={{
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                      borderWidth: isHovered ? '2px' : '1px',
                      boxShadow: glow,
                      transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                    }}
                  >
                    {/* Glassmorphic highlight */}
                    {cell.intensity > 0.1 && (
                      <div
                        className="absolute top-0 left-0 right-0 h-1/3 rounded-t"
                        style={{
                          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.15), transparent)',
                          opacity: cell.intensity,
                        }}
                      />
                    )}

                    {/* Value label for significant activity */}
                    {cell.value > 0 && cell.intensity > 0.3 && (
                      <div
                        className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-corporate-textPrimary"
                        style={{
                          opacity: Math.min(1, 0.5 + cell.intensity),
                        }}
                      >
                        {cell.value}
                      </div>
                    )}
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg border-2 border-corporate-accentPrimary/50 bg-black/90 backdrop-blur-md shadow-lg z-20 pointer-events-none whitespace-nowrap"
                      style={{
                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
                      }}
                    >
                      <div className="text-xs font-semibold text-corporate-accentPrimary">
                        {DAYS[cell.day]} {cell.hour}:00
                      </div>
                      <div className="text-xs text-corporate-textSecondary mt-0.5">
                        {cell.value} {cell.value === 1 ? 'activity' : 'activities'}
                      </div>
                      {maxValue > 0 && (
                        <div className="text-[10px] text-corporate-textTertiary mt-1">
                          {Math.round((cell.value / maxValue) * 100)}% of peak
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-4 flex items-center justify-between text-xs text-corporate-textTertiary">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-corporate-accentPrimary/40"></div>
          <span>Activity by day and hour</span>
        </div>
        <div className="text-corporate-textSecondary">
          {heatmapCells.filter(c => c.value > 0).length} active time slots
        </div>
      </div>
    </div>
  );
}

