export * from './api';
export * from './demoService';
export * from './adminApi';
export * from './devicePairingService';
export * from './onboardingAIService';
export * from './epgApi';

// Downloads Service exports
export { downloadsService, type Download, type DownloadAdd } from './api';

// Voice-first conversational interface services (Phases 1, 8-10)
export { ttsService, default as ttsServiceDefault } from './ttsService';
export { proactiveAgentService, default as proactiveAgentServiceDefault } from './proactiveAgentService';
export { emotionalIntelligenceService, default as emotionalIntelligenceServiceDefault } from './emotionalIntelligenceService';
export { presenceDetectionService, default as presenceDetectionServiceDefault } from './presenceDetectionService';
export { gazeDetectionService, default as gazeDetectionServiceDefault } from './gazeDetectionService';

// Recording service is exported from api.ts (recordingService)
