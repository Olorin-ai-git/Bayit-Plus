import React from 'react';
import { PerformanceDataPoint, calculateStats } from './RAGPerformanceChartConfig';

interface RAGChartVisualizationProps {
  data: PerformanceDataPoint[];
  metricName: string;
  metricUnit: string;
  metricColor: string;
  timeRange: string;
}

/**
 * RAG Chart Visualization Component
 * Simple SVG-based chart for performance data visualization
 */
const RAGChartVisualization: React.FC<RAGChartVisualizationProps> = ({
  data,
  metricName,
  metricUnit,
  metricColor,
  timeRange,
}) => {
  const { max, min, avg } = calculateStats(data);
  const strokeColor = metricColor.replace('text-', '#').replace('-600', '');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          {metricName} Over Time
        </h4>
        <div className="text-sm text-gray-500">
          Avg: {avg.toFixed(metricName.includes('Time') ? 0 : 1)}{metricUnit} • 
          Range: {min.toFixed(1)} - {max.toFixed(1)}{metricUnit}
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="h-48 relative bg-gray-50 rounded border">
        <div className="absolute inset-4">
          <svg className="w-full h-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                y1={`${ratio * 100}%`}
                x2="100%"
                y2={`${ratio * 100}%`}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Data line */}
            {data.length > 1 && (
              <polyline
                points={data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y = 100 - ((point.value - min) / (max - min)) * 100;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                className="drop-shadow-sm"
              />
            )}
            
            {/* Data points */}
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((point.value - min) / (max - min)) * 100;
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="2"
                  fill={strokeColor}
                  className="drop-shadow-sm"
                >
                  <title>{point.label}: {point.value.toFixed(metricName.includes('Time') ? 0 : 2)}{metricUnit}</title>
                </circle>
              );
            })}
          </svg>
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
          <span>{max.toFixed(1)}</span>
          <span>{((max + min) / 2).toFixed(1)}</span>
          <span>{min.toFixed(1)}</span>
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2 px-4">
        <span>{timeRange} ago</span>
        <span>Now</span>
      </div>
    </div>
  );
};

export default RAGChartVisualization;