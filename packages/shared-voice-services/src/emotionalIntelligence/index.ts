/**
 * Emotional Intelligence Module
 * Exports for voice emotional analysis
 */

export { EmotionalIntelligenceService, emotionalIntelligenceService } from './EmotionalIntelligenceService';
export * from './types';
export { analyzePatterns, extractKeywords } from './patternAnalysis';
export { detectFrustration, determineMood } from './frustrationDetection';
export { getToneAdjustment, adjustTTSRate } from './toneAdjustment';
export { generateHelpSuggestion, shouldOfferHelp } from './helpSuggestion';
