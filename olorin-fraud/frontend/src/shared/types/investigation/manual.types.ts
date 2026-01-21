/**
 * Manual Investigation Types
 * Types for manual human-driven investigations
 */

import type { Investigation } from './investigation.types';

export type CollaboratorRole = 'lead' | 'investigator' | 'reviewer' | 'observer';
export type EvidenceType = 'document' | 'screenshot' | 'log' | 'transaction' | 'communication' | 'other';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  result?: any;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  data: any;
  source: string;
  timestamp: Date;
  addedBy: string;
  verified: boolean;
}

export interface Collaborator {
  userId: string;
  role: CollaboratorRole;
  permissions: string[];
  joinedAt: Date;
  invitedBy: string;
}

export interface InvestigationNote {
  id: string;
  content: string;
  authorId: string;
  timestamp: Date;
  isPrivate: boolean;
  mentions: string[];
}

export interface ManualInvestigation extends Investigation {
  workflow: WorkflowStep[];
  evidence: Evidence[];
  collaborators: Collaborator[];
  notes: InvestigationNote[];
}
