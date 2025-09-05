/**
 * RAG Performance Chart Configuration
 * Shared configuration and utility functions for performance charts
 */

export interface PerformanceDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

export const metricOptions = [
  {
    id: 'retrieval_time',
    name: 'Retrieval Time',
    unit: 'ms',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'hit_rate',
    name: 'Hit Rate',
    unit: '%',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'success_rate',
    name: 'Success Rate',
    unit: '%',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export const timeRangeOptions = [
  { id: '5m', name: '5 minutes' },
  { id: '15m', name: '15 minutes' },
  { id: '1h', name: '1 hour' },
  { id: '24h', name: '24 hours' },
];

export const generatePerformanceData = (
  timeRange: '5m' | '15m' | '1h' | '24h',
  selectedMetric: 'retrieval_time' | 'hit_rate' | 'success_rate',
  baseMetrics: any
): PerformanceDataPoint[] => {
  const now = new Date();
  const dataPoints: PerformanceDataPoint[] = [];
  const intervals = {
    '5m': { count: 25, interval: 12000 },
    '15m': { count: 30, interval: 30000 },
    '1h': { count: 60, interval: 60000 },
    '24h': { count: 96, interval: 900000 },
  };

  const { count, interval } = intervals[timeRange];
  
  for (let i = count; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * interval);
    let value: number;
    
    switch (selectedMetric) {
      case 'retrieval_time':
        value = baseMetrics.avg_retrieval_time + (Math.random() - 0.5) * 100;
        break;
      case 'hit_rate':
        value = baseMetrics.knowledge_hit_rate + (Math.random() - 0.5) * 0.2;
        break;
      case 'success_rate':
        value = baseMetrics.enhancement_success_rate + (Math.random() - 0.5) * 0.15;
        break;
    }
    
    dataPoints.push({
      timestamp: timestamp.toISOString(),
      value: Math.max(0, value),
      label: timestamp.toLocaleTimeString(),
    });
  }
  
  return dataPoints;
};

export const calculateStats = (data: PerformanceDataPoint[]) => {
  if (data.length === 0) return { max: 0, min: 0, avg: 0 };
  
  const values = data.map(d => d.value);
  return {
    max: Math.max(...values),
    min: Math.min(...values),
    avg: values.reduce((acc, v) => acc + v, 0) / values.length,
  };
};