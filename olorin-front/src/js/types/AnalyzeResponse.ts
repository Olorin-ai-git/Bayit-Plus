export interface HistoryEntry {
  timestamp: string | number | Date;
  [key: string]: any;
}

export interface NetworkHistory extends HistoryEntry {
  ip?: string;
  isp?: string;
  location?: string;
}

export interface LocationHistory extends HistoryEntry {
  city?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface DeviceHistory extends HistoryEntry {
  device_type?: string;
  browser?: string;
  os?: string;
}

export interface Anomaly {
  type: string;
  timestamp: string | number | Date;
  details: string;
}

export interface BehaviorPatterns {
  login_times: (string | number | Date)[];
  usual_locations: string[];
  common_devices: string[];
}

export interface RiskAssessment {
  risk_level: number;
  risk_factors: string[];
  confidence: number;
  timestamp: string | number | Date;
}

export interface AnalyzeResponse {
  current_network?: {
    timestamp: string | number | Date;
    [key: string]: any;
  };
  network_history?: NetworkHistory[];
  current_location?: {
    timestamp: string | number | Date;
    [key: string]: any;
  };
  location_history?: LocationHistory[];
  current_device?: {
    timestamp: string | number | Date;
    [key: string]: any;
  };
  device_history?: DeviceHistory[];
  behavior_patterns?: BehaviorPatterns;
  anomalies?: Anomaly[];
  risk_assessment?: RiskAssessment;
}

export enum AutonomousInvestigationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
}
