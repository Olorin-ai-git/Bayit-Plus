// Main investigation management hook
export { useManualInvestigation } from './useManualInvestigation';
export type {
  UseManualInvestigationState,
  UseManualInvestigationActions,
  UseManualInvestigationOptions
} from './useManualInvestigation';

// Investigation steps management hook
export { useInvestigationSteps } from './useInvestigationSteps';
export type {
  UseInvestigationStepsState,
  UseInvestigationStepsActions,
  UseInvestigationStepsOptions
} from './useInvestigationSteps';

// Evidence management hook
export { useEvidence } from './useEvidence';
export type {
  UseEvidenceState,
  UseEvidenceActions,
  UseEvidenceOptions
} from './useEvidence';

// Collaboration and real-time features hook
export { useCollaboration } from './useCollaboration';
export type {
  UseCollaborationState,
  UseCollaborationActions,
  UseCollaborationOptions
} from './useCollaboration';

// Investigation templates management hook
export { useInvestigationTemplates } from './useInvestigationTemplates';
export type {
  UseInvestigationTemplatesState,
  UseInvestigationTemplatesActions,
  UseInvestigationTemplatesOptions
} from './useInvestigationTemplates';

// Re-export service types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  CreateInvestigationRequest,
  UpdateInvestigationRequest,
  AddEvidenceRequest,
  AddCommentRequest
} from '../services/manualInvestigationService';

export type {
  CollaborationEvent,
  UserPresence,
  TypingIndicator,
  EventCallback,
  PresenceCallback,
  TypingCallback
} from '../services/collaborationService';

export type {
  Notification,
  NotificationTemplate,
  NotificationCallback
} from '../services/notificationService';