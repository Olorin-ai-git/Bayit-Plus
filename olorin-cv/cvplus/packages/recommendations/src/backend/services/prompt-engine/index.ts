/**
 * Enhanced Prompt Engine Module
 *
 * Exports all components of the modular prompt engine system.
 * Provides backward compatibility with the original enhanced-prompt-engine.service.ts
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// Core engine and types
export { CorePromptEngine } from './core-engine';
export * from './types';

// Specialized modules
export { PersonalityAnalyzer } from './personality-analyzer';
export { ContextBuilder } from './context-builder';
export { PromptOptimizer } from './prompt-optimizer';
export { QualityAssessor } from './quality-assessor';

// Backward compatibility aliases
export { CorePromptEngine as AdvancedPromptEngine } from './core-engine';