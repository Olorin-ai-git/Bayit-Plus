/**
 * TimeSeriesChart Component - SVG-based time series chart
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useMemo } from 'react';

export interface TimeSeriesPoint {
  timestamp: number | string;
  value: number;
}

export interface AnomalyPoint {
  timestamp: number | string;
  value: number;
  score?: number;
  anomaly?: any; // Full anomaly data for click handler
}

export interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  showPoints?: boolean;
  anomalyPoints?: AnomalyPoint[];
  onAnomalyClick?: (anomaly: any) => void;
  className?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  width = 800,
  height = 300,
  showGrid = true,
  showPoints = false,
  anomalyPoints = [],
  onAnomalyClick,
  className = '',
}) => {
  const { min, max, range } = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0, range: 1 };
    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    return {
      min: minVal,
      max: maxVal,
      range: maxVal - minVal || 1,
    };
  }, [data]);

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const path = useMemo(() => {
    if (data.length === 0) return '';

    const points = data.map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * chartWidth + padding.left;
      const y =
        chartHeight -
        ((point.value - min) / range) * chartHeight +
        padding.top;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, chartWidth, chartHeight, min, range, padding]);

  const anomalyPath = useMemo(() => {
    if (anomalyPoints.length === 0) return [];

    const points = anomalyPoints.map((point) => {
      const dataIndex = data.findIndex(
        (d) =>
          new Date(d.timestamp).getTime() === new Date(point.timestamp).getTime()
      );
      if (dataIndex === -1) return null;
      const x = (dataIndex / (data.length - 1 || 1)) * chartWidth + padding.left;
      const y =
        chartHeight -
        ((point.value - min) / range) * chartHeight +
        padding.top;
      return { 
        x, 
        y, 
        score: point.score,
        anomaly: point.anomaly,
        timestamp: point.timestamp,
        value: point.value
      };
    });

    return points.filter((p) => p !== null) as Array<{
      x: number;
      y: number;
      score?: number;
      anomaly?: any;
      timestamp: number | string;
      value: number;
    }>;
  }, [anomalyPoints, data, chartWidth, chartHeight, min, range, padding]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center glass-md rounded-lg border border-corporate-borderPrimary/40 ${className}`}
        style={{ width, height }}
        aria-label="No data available"
      >
        <span className="text-corporate-textTertiary">No data available</span>
      </div>
    );
  }

  return (
    <div
      className={`glass-md rounded-lg border border-corporate-borderPrimary/40 p-4 w-full ${className}`}
    >
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto max-h-full"
        aria-label="Time series chart" 
        role="img"
        style={{ pointerEvents: 'all' }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#C084FC" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {showGrid && (
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - ratio * chartHeight + padding.top;
              return (
                <line
                  key={ratio}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#6B21A8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
              );
            })}
          </g>
        )}

        <path
          d={path}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showPoints &&
          data.map((point, index) => {
            const x = (index / (data.length - 1 || 1)) * chartWidth + padding.left;
            const y =
              chartHeight -
              ((point.value - min) / range) * chartHeight +
              padding.top;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#A855F7"
                className="hover:r-4 transition-all"
              />
            );
          })}

        {anomalyPath.map((point, index) => {
          if (!point) return null;
          // Find the corresponding data point to draw line from
          const dataPoint = data.find(
            (d) =>
              new Date(d.timestamp).getTime() === new Date(point.timestamp).getTime()
          );
          const dataIndex = dataPoint ? data.findIndex((d) => d === dataPoint) : -1;
          const dataX = dataIndex >= 0 ? (dataIndex / (data.length - 1 || 1)) * chartWidth + padding.left : point.x;
          const dataY = dataPoint
            ? chartHeight -
              ((dataPoint.value - min) / range) * chartHeight +
              padding.top
            : point.y;
          
          const labelY = point.y - 20; // Position label above the point
          const hasClickHandler = !!onAnomalyClick && !!point.anomaly;
          
          return (
            <g 
              key={`anomaly-${index}`}
              onClick={hasClickHandler ? () => onAnomalyClick?.(point.anomaly) : undefined}
              style={hasClickHandler ? { cursor: 'pointer', pointerEvents: 'all' } : {}}
            >
              {/* Vertical line connecting anomaly to data point */}
              {dataPoint && (
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={dataX}
                  y2={dataY}
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              )}
              
              {/* Score label background */}
              {point.score !== undefined && (
                <rect
                  x={point.x - 20}
                  y={labelY - 10}
                  width={40}
                  height={16}
                  fill="#1F2937"
                  stroke="#EF4444"
                  strokeWidth="1"
                  rx="4"
                  opacity="0.9"
                />
              )}
              
              {/* Score label text */}
              {point.score !== undefined && (
                <text
                  x={point.x}
                  y={labelY}
                  fill="#EF4444"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {point.score.toFixed(2)}
                </text>
              )}
              
              {/* Anomaly marker */}
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#EF4444"
                stroke="#FFFFFF"
                strokeWidth="2"
                className={hasClickHandler ? "animate-pulse hover:r-8 transition-all" : "animate-pulse"}
              />
              {/* Inner white dot */}
              <circle
                cx={point.x}
                cy={point.y}
                r="2"
                fill="#FFFFFF"
              />
            </g>
          );
        })}

        <g>
          <text
            x={padding.left}
            y={padding.top - 5}
            fill="#D8B4FE"
            fontSize="12"
            fontWeight="600"
          >
            Value
          </text>
          <text
            x={width / 2}
            y={height - 10}
            fill="#D8B4FE"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
          >
            Time
          </text>
        </g>
      </svg>
    </div>
  );
};

