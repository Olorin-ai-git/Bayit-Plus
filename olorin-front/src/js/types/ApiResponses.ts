// Olorin API Response Types - Complete definitions based on API documentation

export interface NetworkAnalysisResponse {
  user_id: string;
  raw_splunk_results_count: number;
  extracted_network_signals: NetworkSignal[];
  network_risk_assessment: NetworkRiskAssessment;
}

export interface NetworkSignal {
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  port: number;
  protocol: string;
  bytes_transferred: number;
  location: string;
}

export interface NetworkRiskAssessment {
  risk_level: number;
  risk_factors: string[];
  anomaly_details: AnomalyDetail[];
  confidence: number;
  summary: string;
  thoughts: string;
}

export interface DeviceAnalysisResponse {
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  raw_splunk_results_count: number;
  extracted_device_signals: DeviceSignal[];
  device_risk_assessment: DeviceRiskAssessment;
}

export interface DeviceSignal {
  device_id: string;
  os: string;
  os_version: string;
  browser: string;
  screen_resolution: string;
  timezone: string;
  last_seen: string;
  location: DeviceLocation;
}

export interface DeviceLocation {
  city: string;
  region: string;
  country: string;
}

export interface DeviceRiskAssessment {
  risk_level: number;
  risk_factors: string[];
  confidence: number;
  summary: string;
  thoughts: string;
}

export interface LocationAnalysisResponse {
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  oii_location_info: LocationInfo;
  business_location_info: LocationInfo;
  phone_location_info: LocationInfo;
  device_analysis_results: DeviceAnalysisResults;
  overall_location_risk_assessment: LocationRiskAssessment;
}

export interface LocationInfo {
  city: string;
  region: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
  carrier?: string;
  business_type?: string;
  last_updated?: string;
}

export interface DeviceAnalysisResults {
  device_locations: DeviceLocationEntry[];
}

export interface DeviceLocationEntry {
  city: string;
  country: string;
  last_seen: string;
}

export interface LocationRiskAssessment {
  risk_level: number;
  risk_factors: string[];
  confidence: number;
  summary: string;
  thoughts: string;
}

export interface LocationRiskAnalysisResponse {
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  user_id: string;
  oii_location_info: LocationInfo;
  business_location_info: LocationInfo;
  phone_location_info: LocationInfo;
  device_analysis_results: {
    entity_id: string;
    device_risk_assessment: DeviceRiskAssessment;
  };
  overall_location_risk_assessment: LocationRiskAssessment;
  timestamp: string;
}

export interface LogsAnalysisResponse {
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  raw_splunk_results_count: number;
  extracted_log_signals: LogSignal[];
  logs_risk_assessment: LogsRiskAssessment;
}

export interface LogSignal {
  timestamp: string;
  event_type: string;
  status: string;
  source_ip: string;
  user_agent?: string;
  location: {
    city: string;
    country: string;
  };
  originating_ips: string[];
  cities: string[];
  transaction: string[];
  reason?: string;
}

export interface LogsRiskAssessment {
  risk_level: number;
  risk_factors: string[];
  confidence: number;
  summary: string;
  timestamp: string;
}

export interface RiskAssessmentResponse {
  user_id: string;
  investigation_id: string;
  overall_risk_score: number;
  risk_breakdown: RiskBreakdown;
  domain_assessments: DomainAssessments;
  overall_risk_factors: string[];
  confidence: number;
  summary: string;
  recommendation: string;
  thoughts: string;
  timestamp: string;
}

export interface RiskBreakdown {
  device_risk: number;
  network_risk: number;
  location_risk: number;
  logs_risk: number;
}

export interface DomainAssessments {
  device: DomainAssessment;
  network: DomainAssessment;
  location: DomainAssessment;
  logs: DomainAssessment;
}

export interface DomainAssessment {
  risk_level: number;
  risk_factors: string[];
  summary: string;
}

export interface OiiResponse {
  user_id: string;
  profile_data: ProfileData;
  location_info: LocationInfo;
  risk_indicators: RiskIndicators;
}

export interface ProfileData {
  name: string;
  email: string;
  verified: boolean;
  account_age_days: number;
  last_login: string;
}

export interface RiskIndicators {
  account_takeover_risk: number;
  synthetic_identity_risk: number;
}

export interface LogsApiResponse {
  risk_assessment: {
    risk_level: number;
    risk_factors: string[];
    confidence: number;
    summary: string;
    timestamp: string;
  };
  splunk_data: any[];
  parsed_logs: any[];
  investigationId: string;
}

export interface DeviceApiResponse {
  risk_assessment: {
    risk_level: number;
    risk_factors: string[];
    confidence: number;
    summary: string;
    timestamp: string;
  };
  splunk_data: any[];
  di_bb?: any;
  investigationId: string;
}

export interface CommentResponse {
  id: number;
  investigation_id: string;
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  sender: string;
  text: string;
  timestamp: number;
}

export interface AgentInvokeRequest {
  agent: {
    name: string;
  };
  agentInput: {
    content: AgentInputContent[];
  };
  metadata: AgentMetadata;
  context: AgentContext;
}

export interface AgentInputContent {
  type: 'text';
  text: string;
}

export interface AgentMetadata {
  interactionGroupId: string;
  supportedOutputFormats: OutputFormat[];
  additionalMetadata: {
    investigation_id: string;
  };
}

export interface OutputFormat {
  format: 'json';
  formatterVersion: string;
  formatterName: string;
}

export interface AgentContext {
  interactionType: string;
  platform: string;
  taxYear: string;
  additionalContext: {
    user_id: string;
    time_range: string;
  };
}

export interface AgentInvokeResponse {
  agentOutput: {
    plainText: string;
    outputs: any[];
  };
  agentMetadata: {
    agentTraceId: string;
  };
}

export interface AnomalyDetail {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ErrorResponse {
  detail: string | ValidationError[];
  status_code: number;
}

export interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
  ctx?: Record<string, any>;
}

// Location source-specific responses
export interface OiiLocationResponse {
  city: string;
  region: string;
  country: string;
  postal_code: string;
  confidence: number;
  last_updated: string;
}

export interface BusinessLocationResponse {
  city: string;
  region: string;
  country: string;
  postal_code: string;
  business_type: string;
}

export interface PhoneLocationResponse {
  city: string;
  region: string;
  country: string;
  postal_code: string;
  carrier: string;
}

// Demo mode responses
export interface DemoResponse {
  message: string;
}

export interface DemoAllDataResponse {
  user_id: string;
  demo_mode: boolean;
  network: Partial<NetworkAnalysisResponse>;
  device: Partial<DeviceAnalysisResponse>;
  location: Partial<LocationAnalysisResponse>;
  logs: Partial<LogsAnalysisResponse>;
  oii: Partial<OiiResponse>;
}

// Splunk job responses
export interface SplunkJobCancelResponse {
  job_id: string;
  status: 'cancelled';
  message: string;
  cancelled_at: string;
}

// Batch delete responses
export interface BatchDeleteResponse {
  deleted: boolean;
  ids: string[];
}

export interface DeleteAllResponse {
  detail: string;
}

export interface SingleDeleteResponse {
  deleted: boolean;
  id: string;
}

export interface InvestigationResponse {
  id: string;
  user_id: string;
  investigation_id: string;
  entity_type: 'user_id' | 'device_id';
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}
