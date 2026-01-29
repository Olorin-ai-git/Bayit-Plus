/**
 * GlassRadar Types
 *
 * Type definitions for radar visualization component
 */

export interface RadarAgent {
  id: string;
  name: string;
  radius: number;
  color?: string;
}

export interface RadarAnomaly {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  riskLevel?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RadarUIState {
  isScanning: boolean;
  showLabels: boolean;
  filterRiskLevel?: number;
}

export interface GlassRadarProps {
  /** Agent/service rings to display */
  agents: RadarAgent[];
  /** Anomalies/alerts to display */
  anomalies?: RadarAnomaly[];
  /** UI state configuration */
  uiState?: RadarUIState;
  /** Radar size in pixels */
  size?: number;
  /** Callback when anomaly is selected */
  onAnomalySelected?: (anomaly: RadarAnomaly) => void;
  /** Test ID for testing */
  testID?: string;
}
