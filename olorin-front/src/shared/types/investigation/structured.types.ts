/**
 * Structured Investigation Types
 * Types for AI-driven structured investigations
 */

import type { Investigation } from './investigation.types';

export type AIMode = 'conservative' | 'balanced' | 'aggressive';

export interface AIDecision {
  id: string;
  timestamp: Date;
  decision: 'continue' | 'escalate' | 'complete';
  confidence: number;
  reasoning: string;
  context: Record<string, any>;
}

export interface AutomatedAction {
  id: string;
  type: string;
  timestamp: Date;
  parameters: Record<string, any>;
  result: any;
  duration: number;
}

export interface StructuredInvestigation extends Investigation {
  aiMode: AIMode;
  escalationReason?: string;
  agentDecisions: AIDecision[];
  automatedActions: AutomatedAction[];
}
