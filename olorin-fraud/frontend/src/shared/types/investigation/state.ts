/**
 * Investigation State Management Types
 * State and actions for investigation service
 * Part of consolidated Investigation types (single source of truth)
 */

import type { PaginationState } from '../common.types';
import type {
  Investigation,
  InvestigationParams,
  InvestigationFilters,
  Finding
} from './core';

/**
 * Investigation service state
 */
export interface InvestigationState {
  current: Investigation | null;
  history: Investigation[];
  active: Investigation[];
  filters: InvestigationFilters;
  pagination: PaginationState;
}

/**
 * Investigation service actions
 */
export interface InvestigationActions {
  startInvestigation: (params: InvestigationParams) => Promise<Investigation>;
  stopInvestigation: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: number) => void;
  addFinding: (id: string, finding: Finding) => void;
  setRiskScore: (id: string, score: number) => void;
  loadInvestigation: (id: string) => Promise<Investigation>;
  deleteInvestigation: (id: string) => Promise<void>;
  setFilters: (filters: InvestigationFilters) => void;
  clearFilters: () => void;
}
