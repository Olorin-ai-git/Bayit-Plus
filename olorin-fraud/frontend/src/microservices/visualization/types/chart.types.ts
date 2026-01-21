/**
 * Chart Configuration Types
 *
 * TypeScript interfaces for chart builder components with Olorin corporate colors.
 * Supports bar, line, pie, scatter, area, radar, and other chart types.
 */

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'area'
  | 'radar'
  | 'doughnut'
  | 'bubble'
  | 'polar';

export type ChartSize = 'small' | 'medium' | 'large' | 'full';

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  datasets: ChartDataset[];
  options?: ChartOptions;
  size?: ChartSize;
  refreshInterval?: number;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  aspectRatio?: number;
  animation?: boolean;
  animationDuration?: number;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showTooltip?: boolean;
  showGrid?: boolean;
  gridColor?: string;
  axisColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  columns: number;
  gap: number;
  charts: DashboardChart[];
}

export interface DashboardChart {
  id: string;
  chartId: string;
  position: {
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
  };
}

export interface ChartTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  borderColor: string;
  accentColors: string[];
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
}

export const OLORIN_CHART_THEME: ChartTheme = {
  backgroundColor: '#0B1221',
  textColor: '#F9FAFB',
  gridColor: '#1A2332',
  borderColor: '#374151',
  accentColors: [
    '#FF6600', // Primary orange
    '#06B6D4', // Cyan
    '#10B981', // Green
    '#F59E0B', // Amber
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6'  // Teal
  ],
  successColor: '#10B981',
  warningColor: '#F59E0B',
  errorColor: '#EF4444',
  infoColor: '#3B82F6'
};

export const CHART_SIZE_DIMENSIONS: Record<ChartSize, { width: number; height: number }> = {
  small: { width: 300, height: 200 },
  medium: { width: 500, height: 300 },
  large: { width: 700, height: 400 },
  full: { width: 1000, height: 600 }
};
