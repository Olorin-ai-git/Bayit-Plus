export interface ExtractedNetworkSignal {
  ip_address?: string;
  isp?: string;
  organization?: string;
  tm_sessionid?: string;
  _time: string;
  countries: string[];
}

export interface NetworkRiskAssessment {
  risk_level: number;
  risk_factors: string[];
  anomaly_details?: string[];
  confidence: number;
  summary?: string;
  thoughts?: string;
  timestamp: string;
}

export interface NetworkAgentResponse {
  user_id: string;
  raw_splunk_results_count: number;
  extracted_network_signals: ExtractedNetworkSignal[];
  network_risk_assessment: NetworkRiskAssessment;
  llm_thoughts?: string;
}

export interface SplunkLocation {
  fuzzy_device_id: string | null;
  city: string | null;
  country: string | null;
  tm_sessionid: string | null;
  _time: string;
  countries: string[];
}

export interface LocationRiskAssessment {
  risk_level: number;
  risk_factors: string[];
  anomaly_details: string[];
  confidence: number;
  summary: string;
  thoughts: string;
  timestamp: string;
}

// Vector search types for location agent
export interface VectorSearchRecord {
  fuzzy_device_id: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  _time: string;
  // ... other fields as needed
}

export interface VectorSearchSimilarRecord {
  record: VectorSearchRecord;
  distance: number;
  index: number;
}

export interface VectorSearchResults {
  target_record: VectorSearchRecord;
  similar_records: VectorSearchSimilarRecord[];
  total_candidates: number;
  total_results: number;
  max_results: number;
  distance_threshold: number;
  metadata: {
    distance_range: {
      min: number;
      max: number;
      avg: number;
    };
  };
}

export interface LocationAgentResponse {
  splunk_locations: SplunkLocation[];
  user_id: string;
  timestamp: string;
  llm_thoughts: LocationRiskAssessment;
  vector_search_results?: VectorSearchResults;
}

export interface RawSplunkDeviceResult {
  _time: string;
  device_id: string | null;
  fuzzy_device_id: string | null;
  smartId: string | null;
  tm_smartid: string | null;
  tm_sessionid: string | null;
  olorin_tid: string;
  true_ip: string | null;
  true_ip_city: string | null;
  true_ip_country: string | null;
  true_ip_region: string | null;
  true_ip_latitude: string | null;
  true_ip_longitude: string | null;
}

export interface ExtractedDeviceSignal {
  fuzzy_device_id?: string;
  true_ip?: string;
  true_ip_city?: string;
  true_ip_region?: string;
  tm_smartid?: string;
  tm_sessionid?: string;
  olorin_tid: string;
  _time: string;
  countries: string[];
}

export interface DeviceSignalRiskAssessment {
  risk_level: number;
  risk_factors: string[];
  anomaly_details: string[];
  confidence: number;
  summary: string;
  thoughts: string;
  timestamp: string;
}

export interface DeviceAgentResponse {
  user_id: string;
  raw_splunk_results: RawSplunkDeviceResult[];
  extracted_device_signals: ExtractedDeviceSignal[];
  device_signal_risk_assessment: DeviceSignalRiskAssessment;
  timestamp: string;

  di_tool_warning?: string;
  llm_thoughts?: string;
}

// Legacy interfaces - keeping for backward compatibility
export interface LocationAgentLocation {
  source: string;
  location: {
    address1?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  } | null;
  confidence: number;
  timestamp: string;
  additional_info?: {
    status?: string;
    [key: string]: any;
  };
}

export interface DeviceLocation {
  device_id: string;
  city: string;
  state: string;
  country: string;
}

export interface RiskAssessment {
  risk_level: number;
  risk_factors: string[];
  confidence: number;
  summary?: string;
  anomaly_details?: string[];
  timestamp: string;
}

// Legacy LocationAgentResponse interface for backward compatibility
export interface LegacyLocationAgentResponse {
  locations: LocationAgentLocation[];
  device_locations: DeviceLocation[];
  location_risk_assessment: RiskAssessment;
  device_risk_assessment: RiskAssessment;
  timestamp: string;
}

export enum InvestigationStepId {
  INIT = 'init',
  NETWORK = 'network',
  LOCATION = 'location',
  DEVICE = 'device',
  LOG = 'log',
  RISK = 'risk',
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface InvestigationStep {
  id: InvestigationStepId;
  agent: string;
  title: string;
  description: string;
  status: StepStatus;
  details?: any;
  data?: any;
  timestamp?: string;
  /** Tools selected for this agent */
  tools: string[];
}

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: LogLevel;
}

export interface LogAgentSplunkData {
  email_address: string;
  username: string;
  offering_ids: string[];
  transactions: string[];
  originating_ips: string[];
  isp: string;
  cities: string[];
  region: string;
  device_ids: string[];
  device_first_seen: string[];
}

export interface LogAgentResponse {
  risk_assessment: RiskAssessment;
  splunk_data: LogAgentSplunkData[];
}

export interface AgentResponses {
  networkResponse?: NetworkAgentResponse;
  locationResponse?: LocationAgentResponse;
  deviceResponse?: DeviceAgentResponse;
  logResponse?: LogAgentResponse;
  oiiResponse?: any; // Keeping this as any since we don't have its type defined
}
