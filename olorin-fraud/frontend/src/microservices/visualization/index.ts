/**
 * Visualization Microservice - Main Barrel Export
 * Feature: 002-visualization-microservice
 *
 * Enterprise fraud detection visualization microservice providing:
 * - Risk score gauges and severity indicators
 * - Network diagrams with D3.js force simulation
 * - Geographic location maps with Google Maps
 * - Chronological event timelines with virtualization
 * - Real-time monitoring (EKG, TPS, radar)
 * - Chart builder with Chart.js (bar, line, pie, scatter)
 * - Dashboard grid layouts
 *
 * @module visualization-microservice
 * @example
 * import {
 *   RiskGauge,
 *   NetworkDiagram,
 *   LocationMap,
 *   Timeline,
 *   EKGMonitor,
 *   BarChart
 * } from '@microservices/visualization';
 */

// Error Boundary
export { VisualizationErrorBoundary } from './components/VisualizationErrorBoundary';

// Risk Visualization Components
export * from './components/risk';

// Network Visualization Components
export * from './components/network';

// Geographic Visualization Components
export * from './components/geographic';

// Timeline Components
export * from './components/timeline';

// Real-Time Monitoring Components
export * from './components/monitoring';

// Chart Components
export * from './components/charts';

// Hooks
export * from './hooks';

// Contexts
export * from './contexts/ChartThemeContext';

// Types
export * from './types/risk.types';
export * from './types/network.types';
export * from './types/geographic.types';
export * from './types/chart.types';
export * from './types/events.types';

// Utilities
export * from './utils';

// Services
export * from './services/eventBus';

// Constants
export const VISUALIZATION_SERVICE_VERSION = '1.0.0';
export const VISUALIZATION_SERVICE_NAME = 'visualization-microservice';
