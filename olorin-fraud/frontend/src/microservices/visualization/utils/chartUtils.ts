/**
 * Chart Data Transformation Utilities
 *
 * Helper functions for transforming and preparing data for chart visualizations.
 */

import { ChartDataPoint, ChartDataset } from '../types/chart.types';

export interface RawDataPoint {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Transform raw data array into chart data points
 */
export function transformToChartData(
  data: RawDataPoint[],
  xKey: string,
  yKey: string,
  labelKey?: string
): ChartDataPoint[] {
  return data.map(item => ({
    x: item[xKey] as string | number,
    y: Number(item[yKey]) || 0,
    label: labelKey ? String(item[labelKey]) : undefined,
    metadata: item
  }));
}

/**
 * Aggregate data by category with sum
 */
export function aggregateByCategory(
  data: RawDataPoint[],
  categoryKey: string,
  valueKey: string
): ChartDataPoint[] {
  const aggregated = new Map<string | number, number>();

  data.forEach(item => {
    const category = item[categoryKey] as string | number;
    const value = Number(item[valueKey]) || 0;
    aggregated.set(category, (aggregated.get(category) || 0) + value);
  });

  return Array.from(aggregated.entries()).map(([x, y]) => ({
    x: x,
    y: y,
    label: String(x)
  }));
}

/**
 * Calculate moving average for time series data
 */
export function calculateMovingAverage(
  data: ChartDataPoint[],
  windowSize: number
): ChartDataPoint[] {
  const result: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, point) => sum + point.y, 0) / window.length;

    result.push({
      x: data[i].x,
      y: avg,
      label: data[i].label
    });
  }

  return result;
}

/**
 * Group data by time intervals (hour, day, week, month)
 */
export function groupByTimeInterval(
  data: RawDataPoint[],
  timestampKey: string,
  valueKey: string,
  interval: 'hour' | 'day' | 'week' | 'month'
): ChartDataPoint[] {
  const grouped = new Map<string, number[]>();

  data.forEach(item => {
    const timestamp = new Date(item[timestampKey] as string);
    const value = Number(item[valueKey]) || 0;

    let key: string;
    switch (interval) {
      case 'hour':
        key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
        break;
      case 'day':
        key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`;
        break;
      case 'week':
        const week = Math.floor((timestamp.getTime() - new Date(timestamp.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `${timestamp.getFullYear()}-W${week}`;
        break;
      case 'month':
        key = `${timestamp.getFullYear()}-${timestamp.getMonth()}`;
        break;
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(value);
  });

  return Array.from(grouped.entries()).map(([x, values]) => ({
    x: x,
    y: values.reduce((sum, v) => sum + v, 0) / values.length,
    label: x
  }));
}

/**
 * Normalize data to 0-100 scale
 */
export function normalizeData(data: ChartDataPoint[]): ChartDataPoint[] {
  const values = data.map(d => d.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return data.map(d => ({ ...d, y: 0 }));

  return data.map(d => ({
    ...d,
    y: ((d.y - min) / range) * 100
  }));
}

/**
 * Filter outliers using IQR method
 */
export function filterOutliers(data: ChartDataPoint[], threshold: number = 1.5): ChartDataPoint[] {
  const values = data.map(d => d.y).sort((a, b) => a - b);
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  return data.filter(d => d.y >= lowerBound && d.y <= upperBound);
}

/**
 * Sort data points by x or y value
 */
export function sortChartData(
  data: ChartDataPoint[],
  by: 'x' | 'y' = 'x',
  order: 'asc' | 'desc' = 'asc'
): ChartDataPoint[] {
  return [...data].sort((a, b) => {
    const valueA = by === 'x' ? a.x : a.y;
    const valueB = by === 'x' ? b.x : b.y;

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return order === 'asc' ? valueA - valueB : valueB - valueA;
    }

    return order === 'asc'
      ? String(valueA).localeCompare(String(valueB))
      : String(valueB).localeCompare(String(valueA));
  });
}

/**
 * Merge multiple datasets with alignment
 */
export function mergeDatasets(datasets: ChartDataset[]): ChartDataset {
  const allLabels = new Set<string | number>();

  datasets.forEach(dataset => {
    dataset.data.forEach(point => allLabels.add(point.x));
  });

  const sortedLabels = Array.from(allLabels).sort();

  return {
    label: 'Merged',
    data: sortedLabels.map(x => ({
      x,
      y: datasets.reduce((sum, dataset) => {
        const point = dataset.data.find(p => p.x === x);
        return sum + (point?.y || 0);
      }, 0)
    }))
  };
}
