export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  itemsProcessed: number;
  totalItems: number;
  percentage: number;
}

export interface AuditControlState {
  triggering: boolean;
  pausingAudit: boolean;
  resumingAudit: boolean;
  cancellingAudit: boolean;
  auditPaused: boolean;
  pendingAuditType: 'daily_incremental' | 'ai_agent' | null;
}

export interface AuditConfigState {
  dryRun: boolean;
  budgetLimit: number;
  budgetUsed: number;
  last24HoursOnly: boolean;
  // Capability options (ADDITIVE - multiple can be enabled together)
  // NOTE: Content integrity validation is MANDATORY and always runs first (not configurable)
  cybTitlesOnly: boolean;
  tmdbPostersOnly: boolean;
  openSubtitlesEnabled: boolean;
  classifyOnly: boolean;
  purgeDuplicates: boolean;
  // If false, skip items that already have metadata/posters/subtitles (saves API calls)
  forceUpdates: boolean;
}

export interface VoiceState {
  voiceProcessing: boolean;
  isSpeaking: boolean;
  isVoiceMuted: boolean;
}
