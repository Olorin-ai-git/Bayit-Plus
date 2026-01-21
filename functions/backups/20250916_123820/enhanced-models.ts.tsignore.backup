// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Enhanced Data Models - Main Interface
 * 
 * Core enhanced models with imports from modular files.
 * Refactored to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Core types
import type { ParsedCV } from './job';
export type { ParsedCV } from './job';

// Import and re-export modular types
export type {
  EnhancedJob,
  PortfolioImage,
  CalendarSettings,
  Testimonial,
  PersonalityProfile,
  PrivacySettings,
  SkillsVisualization,
  SkillCategory,
  LanguageSkill,
  Certification
} from './enhanced-job';

export type {
  FlexibleSkillsFormat
} from './enhanced-skills';

export type {
  PublicCVProfile,
  PublicProfileAnalytics,
  FeatureAnalytics,
  FeatureInteraction,
  ContactFormSubmission,
  QRCodeScan
} from './enhanced-analytics';

// Session and processing management types
export interface EnhancedSessionState {
  /** Session ID */
  sessionId: string;
  
  /** User ID who owns the session */
  userId: string;
  
  /** Current processing step */
  currentStep: CVStep;
  
  /** Session status */
  status: 'active' | 'paused' | 'completed' | 'failed';
  
  /** Processing checkpoints */
  processingCheckpoints?: ProcessingCheckpoint[];
  
  /** Action queue */
  actionQueue?: QueuedAction[];
  
  /** Feature states */
  featureStates?: Record<string, any>;
  
  /** Step progress tracking */
  stepProgress?: Record<CVStep, number>;
  
  /** Session metadata */
  metadata: {
    startedAt: Date;
    lastActivity: Date;
    totalSteps: number;
    completedSteps: number;
  };
  
  /** Current processing data */
  processingData?: any;
  
  /** Error information if session failed */
  error?: {
    message: string;
    step: CVStep;
    timestamp: Date;
  };
}

export interface ProcessingCheckpoint {
  /** Checkpoint ID */
  id: string;
  
  /** Session ID this checkpoint belongs to */
  sessionId: string;
  
  /** Processing step when checkpoint was created */
  step: CVStep;
  
  /** Step ID (legacy alias) */
  stepId?: string;
  
  /** Function name that created the checkpoint */
  functionName?: string;
  
  /** Checkpoint parameters */
  parameters?: Record<string, any>;
  
  /** Last attempt timestamp */
  lastAttemptAt?: Date;
  
  /** Checkpoint result */
  result?: any;
  
  /** Maximum retry attempts */
  maxRetries?: number;
  
  /** Checkpoint priority */
  priority?: 'low' | 'normal' | 'high';
  
  /** Processing state */
  state?: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Estimated duration for completion */
  estimatedDuration?: number;
  
  /** When checkpoint was completed */
  completedAt?: Date;
  
  /** Execution time in milliseconds */
  executionTime?: number;
  
  /** Number of retry attempts */
  retryCount?: number;
  
  /** Error information if checkpoint failed */
  error?: {
    message: string;
    code?: string;
    timestamp: Date;
  };
  
  /** Checkpoint data */
  data: any;
  
  /** Timestamp when checkpoint was created */
  createdAt: Date;
  
  /** Whether checkpoint can be restored */
  isRestorable: boolean;
}

export interface QueuedAction {
  /** Action ID */
  id: string;
  
  /** Session ID this action belongs to */
  sessionId: string;
  
  /** Action type */
  type: 'retry' | 'skip' | 'manual_intervention' | 'rollback' | 'session_update' | 'form_save' | 'feature_toggle';
  
  /** Target step for the action */
  targetStep: CVStep;
  
  /** Action parameters */
  parameters?: any;
  
  /** Action payload */
  payload?: Record<string, any>;
  
  /** Action priority */
  priority: 'low' | 'normal' | 'high';
  
  /** When action was queued */
  queuedAt: Date;
  
  /** Action status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Number of attempts made */
  attempts?: number;
  
  /** Maximum allowed attempts */
  maxAttempts?: number;
  
  /** Whether action requires network */
  requiresNetwork?: boolean;
}

export enum CVStep {
  INIT = 'init',
  PARSE_CV = 'parse_cv',
  ANALYZE_CONTENT = 'analyze_content',
  GENERATE_INSIGHTS = 'generate_insights',
  CREATE_PORTAL = 'create_portal',
  GENERATE_MEDIA = 'generate_media',
  FINALIZE = 'finalize',
  COMPLETE = 'complete'
}

export type {
  UserRAGProfile,
  CVChunk,
  ChatSession,
  ChatMessage
} from './enhanced-rag';

export type {
  AdvancedATSScore,
  PrioritizedRecommendation,
  CompetitorAnalysis,
  SemanticKeywordAnalysis,
  KeywordMatch,
  ATSSystemSimulation,
  ATSOptimizationResult,
  ATSIssue,
  ATSSuggestion
} from './enhanced-ats';

// All enhanced model interfaces are now imported from modular files
// This provides a clean main interface while maintaining type safety