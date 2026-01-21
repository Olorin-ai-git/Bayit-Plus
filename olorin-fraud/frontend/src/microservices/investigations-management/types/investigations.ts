/**
 * Type definitions for Investigations Management Microservice
 */

export type InvestigationStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'archived';

export type PhaseStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed';

export interface InvestigationPhase {
  name: string;
  status: PhaseStatus;
  pct: number;
  started?: string;
  ended?: string;
  summary?: string;
}

export interface Investigation {
  id: string;
  name?: string; // Optional - may be null/undefined from API (NO FALLBACK)
  owner?: string; // Optional - may be null/undefined from API (NO FALLBACK)
  description?: string;
  status: InvestigationStatus;
  created?: string; // Optional - may be null/undefined from API
  updated?: string; // Optional - may be null/undefined from API
  riskModel?: string;
  sources?: string[]; // Optional - may be null/undefined from API (NO FALLBACK to empty array)
  tools?: string[]; // Optional - may be null/undefined from API (NO FALLBACK to empty array)
  from?: string;
  to?: string;
  progress?: number; // Optional - may be null/undefined from API
  phases?: InvestigationPhase[]; // Optional - may be null/undefined from API
  entity_id?: string;
  entity_type?: string;
  overall_risk_score?: number;
  // Domain-specific risk scores and LLM thoughts
  device_risk_score?: number;
  location_risk_score?: number;
  network_risk_score?: number;
  logs_risk_score?: number;
  device_llm_thoughts?: string;
  location_llm_thoughts?: string;
  network_llm_thoughts?: string;
  logs_llm_thoughts?: string;
}

export interface ActivityLogEntry {
  time: string;
  text: string;
  source: string;
}

export interface InvestigationFilters {
  searchQuery?: string;
  status?: InvestigationStatus;
  owner?: string;
  tab?: InvestigationTab;
}

export type InvestigationTab = 
  | 'all'
  | 'mine'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'archived';

export interface InvestigationFormData {
  name: string;
  owner: string;
  description: string;
  riskModel: string;
  sources: string[];
  tools: string[];
  from: string;
  to: string;
  status: InvestigationStatus;
  autoRun: boolean;
}

export interface CreateInvestigationRequest {
  name: string;
  owner: string;
  description?: string;
  riskModel?: string;
  sources?: string[];
  tools?: string[];
  from?: string;
  to?: string;
  status?: InvestigationStatus;
  autoRun?: boolean;
}

export interface UpdateInvestigationRequest {
  name?: string;
  owner?: string;
  description?: string;
  status?: InvestigationStatus;
  riskModel?: string;
  sources?: string[];
  tools?: string[];
  from?: string;
  to?: string;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  investigations: Investigation[];
}

