export type ManualInvestigationStatus =
  | 'draft'
  | 'in_progress'
  | 'under_review'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

export type EvidenceType =
  | 'document'
  | 'screenshot'
  | 'log_entry'
  | 'transaction'
  | 'communication'
  | 'system_data'
  | 'witness_statement'
  | 'external_report';

export type StepStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked'
  | 'requires_review';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type InvestigationType =
  | 'fraud_detection'
  | 'account_takeover'
  | 'identity_theft'
  | 'payment_fraud'
  | 'data_breach'
  | 'compliance_violation'
  | 'internal_misconduct'
  | 'external_threat';

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  tags: string[];
  collectedBy: string;
  collectedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  isVerified: boolean;
  metadata: Record<string, any>;
  relatedStepId?: string;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  id: string;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'accessed';
  performedBy: string;
  performedAt: string;
  location: string;
  notes?: string;
  digitalSignature?: string;
}

export interface InvestigationStep {
  id: string;
  title: string;
  description: string;
  instructions: string;
  status: StepStatus;
  assignedTo?: string;
  estimatedDuration: number; // minutes
  actualDuration?: number;
  startedAt?: string;
  completedAt?: string;
  notes: string;
  evidence: string[]; // Evidence IDs
  dependencies: string[]; // Step IDs that must be completed first
  checklist: ChecklistItem[];
  reviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  order: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  required: boolean;
  notes?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'lead_investigator' | 'investigator' | 'analyst' | 'reviewer' | 'observer';
  department: string;
  addedAt: string;
  addedBy: string;
  permissions: {
    canEdit: boolean;
    canAddEvidence: boolean;
    canAssignSteps: boolean;
    canReview: boolean;
    canExport: boolean;
  };
}

export interface Timeline {
  id: string;
  timestamp: string;
  type: 'step_started' | 'step_completed' | 'evidence_added' | 'review_completed' | 'status_changed' | 'note_added' | 'collaborator_added';
  description: string;
  performedBy: string;
  relatedEntityId?: string; // Step ID, Evidence ID, etc.
  metadata?: Record<string, any>;
}

export interface InvestigationTemplate {
  id: string;
  name: string;
  description: string;
  type: InvestigationType;
  steps: Omit<InvestigationStep, 'id' | 'status' | 'notes' | 'evidence' | 'startedAt' | 'completedAt' | 'assignedTo'>[];
  estimatedDuration: number; // total minutes
  requiredRoles: string[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ManualInvestigation {
  id: string;
  title: string;
  description: string;
  type: InvestigationType;
  status: ManualInvestigationStatus;
  priority: Priority;

  // Template and workflow
  templateId?: string;
  templateName?: string;
  customWorkflow: boolean;

  // Timeline and progress
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;

  // People and assignments
  createdBy: string;
  leadInvestigator: string;
  collaborators: Collaborator[];

  // Investigation content
  steps: InvestigationStep[];
  evidence: Evidence[];
  timeline: Timeline[];

  // Progress tracking
  progress: {
    overall: number; // percentage
    stepsCompleted: number;
    stepsTotal: number;
    evidenceCollected: number;
    estimatedTimeRemaining: number; // minutes
  };

  // Case details
  subjectInformation: {
    primarySubject?: string;
    relatedSubjects?: string[];
    affectedAccounts?: string[];
    incidentDate?: string;
    reportedDate?: string;
    reportedBy?: string;
    externalCaseId?: string;
  };

  // Results and conclusions
  findings: string[];
  conclusions: string[];
  recommendations: string[];
  actionsTaken: string[];

  // Metadata
  tags: string[];
  category: string;
  jurisdiction?: string;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';

  // Review and approval
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'requires_changes';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;

  // Related investigations
  relatedInvestigations: string[];
  parentInvestigationId?: string;
  childInvestigations: string[];
}

export interface InvestigationFilter {
  status?: ManualInvestigationStatus[];
  priority?: Priority[];
  type?: InvestigationType[];
  assignedTo?: string[];
  createdBy?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  searchQuery?: string;
}

export interface InvestigationStats {
  total: number;
  byStatus: Record<ManualInvestigationStatus, number>;
  byPriority: Record<Priority, number>;
  byType: Record<InvestigationType, number>;
  averageCompletionTime: number; // days
  overdueCount: number;
  pendingReviewCount: number;
}

export interface StepTemplate {
  id: string;
  title: string;
  description: string;
  instructions: string;
  category: string;
  estimatedDuration: number;
  checklist: Omit<ChecklistItem, 'id' | 'completed' | 'completedBy' | 'completedAt'>[];
  requiredEvidence: EvidenceType[];
  dependencies: string[];
  reviewRequired: boolean;
  tags: string[];
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  relatedEntityId: string; // Investigation, Step, or Evidence ID
  relatedEntityType: 'investigation' | 'step' | 'evidence';
  isInternal: boolean;
  mentions: string[]; // User IDs
  attachments: string[]; // File URLs
}

export interface NotificationSettings {
  stepAssigned: boolean;
  stepCompleted: boolean;
  evidenceAdded: boolean;
  reviewRequired: boolean;
  statusChanged: boolean;
  dueDate: boolean;
  mentions: boolean;
}

export interface InvestigationPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssignSteps: boolean;
  canAddEvidence: boolean;
  canAddCollaborators: boolean;
  canChangeStatus: boolean;
  canReview: boolean;
  canExport: boolean;
  canComment: boolean;
}