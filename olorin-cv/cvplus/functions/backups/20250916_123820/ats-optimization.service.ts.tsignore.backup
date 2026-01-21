// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Advanced ATS (Applicant Tracking System) Optimization Service - Phase 1
 * 
 * LEGACY WRAPPER - This service maintains backward compatibility while
 * delegating to the new modular architecture.
 * 
 * New modular architecture provides:
 * - Focused, maintainable services (each <200 lines)
 * - Better separation of concerns
 * - Enhanced testability
 * - Improved scalability
 * 
 * Features:
 * - Multi-factor scoring system with weighted breakdown
 * - Dual-LLM verification (GPT-4 Turbo + Claude 3.5 Sonnet)
 * - ATS system simulation engine
 * - Semantic keyword analysis
 * - Competitor benchmarking
 */

import { 
  ParsedCV, 
  ATSOptimizationResult
} from '../types/enhanced-models';
import { ATSOptimizationOrchestrator } from './ats-optimization/ATSOptimizationOrchestrator';

/**
 * Legacy wrapper for the Advanced ATS Optimization Service
 * 
 * This class maintains backward compatibility with existing code
 * while delegating all functionality to the new modular architecture.
 * 
 * @deprecated Use ATSOptimizationOrchestrator directly for new implementations
 */
export class AdvancedATSOptimizationService {
  private orchestrator: ATSOptimizationOrchestrator;

  constructor() {
    // Initialize the new modular orchestrator
    this.orchestrator = new ATSOptimizationOrchestrator();
    
  }

  /**
   * Advanced Multi-Factor ATS Analysis - Main Entry Point
   * 
   * @deprecated Use orchestrator.analyzeCV() directly
   */
  async analyzeCV(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[],
    jobDescription?: string,
    industry?: string
  ): Promise<ATSOptimizationResult> {
    
    return this.orchestrator.analyzeCV(
      parsedCV,
      targetRole,
      targetKeywords,
      jobDescription,
      industry
    );
  }

  /**
   * Backward compatibility methods
   */

  async analyzeATSCompatibility(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[]
  ): Promise<ATSOptimizationResult> {
    return this.orchestrator.analyzeATSCompatibility(parsedCV, targetRole, targetKeywords);
  }

  async applyOptimizations(
    parsedCV: ParsedCV,
    optimizations: any[]
  ): Promise<Partial<ParsedCV>> {
    return this.orchestrator.applyOptimizations(parsedCV, optimizations);
  }

  async getATSTemplates(industry?: string, role?: string): Promise<any[]> {
    return this.orchestrator.getATSTemplates(industry, role);
  }

  async generateKeywords(
    jobDescription: string,
    industry?: string,
    role?: string
  ): Promise<string[]> {
    return this.orchestrator.generateKeywords(jobDescription, industry, role);
  }

  /**
   * Get the modular orchestrator instance
   * 
   * Use this method to access the new modular architecture directly
   * when migrating away from this legacy wrapper.
   */
  getOrchestrator(): ATSOptimizationOrchestrator {
    return this.orchestrator;
  }
}

// Export service instance for backward compatibility
export const atsOptimizationService = new AdvancedATSOptimizationService();

// Also export as default for flexibility
export default AdvancedATSOptimizationService;
