import React from 'react';
import { Investigation, AgentProgress } from '../types/investigation';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

interface SimpleBarChartProps {
  data: ChartData[];
  title: string;
  height?: number;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  title,
  height = 200
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="flex items-end space-x-2" style={{ height }}>
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full bg-blue-500 rounded-t transition-all duration-300 min-h-2"
              style={{
                height: `${(item.value / maxValue) * (height - 40)}px`,
                backgroundColor: item.color || '#3B82F6'
              }}
            />
            <div className="text-xs text-gray-600 mt-1 text-center">
              {item.label}
            </div>
            <div className="text-xs font-medium text-gray-900">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SimpleLineChartProps {
  data: TimeSeriesData[];
  title: string;
  height?: number;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  title,
  height = 200
}) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 300;
    const y = height - 40 - ((item.value - minValue) / range) * (height - 60);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="relative">
        <svg width="300" height={height} className="w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={ratio}
              x1="0"
              y1={40 + ratio * (height - 80)}
              x2="300"
              y2={40 + ratio * (height - 80)}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          ))}

          {/* Data line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 300;
            const y = height - 40 - ((item.value - minValue) / range) * (height - 60);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3B82F6"
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-10">
          <span>{maxValue.toFixed(1)}</span>
          <span>{((maxValue + minValue) / 2).toFixed(1)}</span>
          <span>{minValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

interface DonutChartProps {
  data: ChartData[];
  title: string;
  centerText?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  centerText
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 60;
  const strokeWidth = 20;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;

  let cumulativePercentage = 0;

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="flex items-center space-x-6">
        <div className="relative">
          <svg width={radius * 2} height={radius * 2}>
            {data.map((item, index) => {
              const percentage = item.value / total;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercentage * circumference;
              cumulativePercentage += percentage;

              return (
                <circle
                  key={index}
                  stroke={item.color || colors[index % colors.length]}
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  className="transition-all duration-300"
                  transform={`rotate(-90 ${radius} ${radius})`}
                />
              );
            })}
          </svg>
          {centerText && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-900">{centerText}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface InvestigationChartsProps {
  investigation: Investigation;
}

export const InvestigationCharts: React.FC<InvestigationChartsProps> = ({
  investigation
}) => {
  // Agent performance data
  const agentPerformanceData: ChartData[] = investigation.progress.agents.map(agent => ({
    label: agent.agentId.substring(0, 10) + '...',
    value: agent.progress,
    color: agent.status === 'completed' ? '#10B981' :
           agent.status === 'running' ? '#3B82F6' :
           agent.status === 'failed' ? '#EF4444' : '#6B7280'
  }));

  // Agent status distribution
  const statusDistribution = investigation.progress.agents.reduce((acc, agent) => {
    acc[agent.status] = (acc[agent.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData: ChartData[] = Object.entries(statusDistribution).map(([status, count]) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: status === 'completed' ? '#10B981' :
           status === 'running' ? '#3B82F6' :
           status === 'failed' ? '#EF4444' :
           status === 'paused' ? '#F59E0B' : '#6B7280'
  }));

  // Mock timeline data for progress visualization
  const timelineData: TimeSeriesData[] = [
    { timestamp: '0h', value: 0 },
    { timestamp: '1h', value: 15 },
    { timestamp: '2h', value: 35 },
    { timestamp: '3h', value: 50 },
    { timestamp: '4h', value: 65 },
    { timestamp: '5h', value: investigation.progress.overall }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SimpleBarChart
          data={agentPerformanceData}
          title="Agent Progress"
          height={200}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <DonutChart
          data={statusData}
          title="Agent Status Distribution"
          centerText={`${investigation.progress.agents.length} Total`}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
        <SimpleLineChart
          data={timelineData}
          title="Investigation Progress Over Time"
          height={200}
        />
      </div>
    </div>
  );
};