// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { LLMVerificationService, VerificationResult } from '@cvplus/core/services/llm-verification.service';
import { llmVerificationConfig } from '@cvplus/core/config/llm-verification.config';
import { VerifiedCVParsingService, VerifiedParsingResult } from './verified-cv-parser.service';

// Config interface for CV parsing
export interface CVParsingConfig {
  enableVerification: boolean;
  serviceName: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  customValidationCriteria?: any;
}

// Performance tracking interface
export interface CVParsingMetrics {
  processingTime: number;
  verificationTime?: number;
  totalTime: number;
  retryCount: number;
  verificationUsed: boolean;
  fallbackUsed: boolean;
}

export interface ParsedCV {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    summary?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    location?: string;
  };
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    startDate: string;
    endDate?: string;
    description?: string;
    achievements?: string[];
    technologies?: string[];
    current?: boolean;
    location?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
    gpa?: string;
    honors?: string[];
    startDate?: string;
    endDate?: string;
    location?: string;
    achievements?: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId?: string;
    expiryDate?: string;
    url?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    github?: string;
    duration?: string;
    role?: string;
  }>;
  achievements?: string[];
  publications?: Array<{
    title: string;
    publication: string;
    date: string;
    url?: string;
  }>;
  interests?: string[];
  summary?: string;
}

/**
 * Enhanced CV Parsing Service with LLM Verification Integration
 * 
 * This service demonstrates how to integrate the LLM verification system
 * with existing CV parsing functionality while maintaining backward compatibility.
 * 
 * BEFORE/AFTER COMPARISON:
 * - BEFORE: Basic CV parsing with simple validation
 * - AFTER: LLM-verified parsing with comprehensive validation, audit trails, and fallback mechanisms
 * 
 * Key Integration Points:
 * 1. Automatic LLM verification for all parsing operations
 * 2. Performance tracking and monitoring
 * 3. Comprehensive error handling with fallback
 * 4. Enhanced validation with verification scores
 * 5. Audit trail for compliance and debugging
 */
export class EnhancedCVParsingService {
  private db = admin.firestore();
  private verifiedParser?: VerifiedCVParsingService;
  private llmVerification?: LLMVerificationService;
  private config: CVParsingConfig;
  
  constructor() {
    // Initialize LLM verification if enabled
    this.config = {
      enableVerification: llmVerificationConfig.verification.enabled,
      serviceName: 'cv-parsing',
      defaultModel: llmVerificationConfig.apis.anthropic.model,
      defaultTemperature: llmVerificationConfig.apis.anthropic.temperature,
      defaultMaxTokens: llmVerificationConfig.apis.anthropic.maxTokens,
      customValidationCriteria: llmVerificationConfig.serviceValidation['cv-parsing']
    };
    
    // Initialize services if verification is enabled and API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (this.config.enableVerification && apiKey) {
      try {
        this.verifiedParser = new VerifiedCVParsingService();
        this.llmVerification = new LLMVerificationService();
      } catch (error) {
        // Continue with standard parsing if verification fails to initialize
      }
    }
  }

  /**
   * BEFORE: Simple getParsedCV without verification details
   * AFTER: Enhanced method with optional verification details
   */
  async getParsedCV(jobId: string): Promise<ParsedCV | null> {
    try {
      const jobDoc = await this.db.collection('jobs').doc(jobId).get();
      
      if (!jobDoc.exists) {
        return null;
      }

      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        return null;
      }

      return jobData.parsedData as ParsedCV;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * NEW: Get parsed CV with verification details if available
   */
  async getParsedCVWithVerification(jobId: string): Promise<{
    parsedCV: ParsedCV | null;
    verificationDetails?: any;
    auditInfo?: any;
    metrics?: CVParsingMetrics;
  }> {
    try {
      const jobDoc = await this.db.collection('jobs').doc(jobId).get();
      
      if (!jobDoc.exists) {
        return { parsedCV: null };
      }

      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        return { parsedCV: null };
      }

      return {
        parsedCV: jobData.parsedData as ParsedCV,
        verificationDetails: jobData.verificationDetails,
        auditInfo: jobData.auditInfo,
        metrics: jobData.parsingMetrics
      };
    } catch (error) {
      return { parsedCV: null };
    }
  }

  /**
   * BEFORE: Simple updateParsedCV
   * AFTER: Enhanced update with backward compatibility
   */
  async updateParsedCV(jobId: string, parsedData: ParsedCV): Promise<void> {
    try {
      await this.db.collection('jobs').doc(jobId).update({
        parsedData,
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * NEW: Update parsed CV with verification results
   */
  async updateParsedCVWithVerification(
    jobId: string, 
    result: VerifiedParsingResult,
    metrics?: CVParsingMetrics
  ): Promise<void> {
    try {
      const updateData: any = {
        parsedData: result,
        verificationDetails: result.verificationDetails,
        auditInfo: result.verificationDetails,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      if (metrics) {
        updateData.parsingMetrics = metrics;
      }
      
      // Check if fallback was used based on parsing method
      const fallbackUsed = result.metadata?.parsingMethod === 'fallback';
      if (fallbackUsed) {
        updateData.fallbackUsed = fallbackUsed;
      }
      
      // Use issues from verificationDetails as warnings
      if (result.verificationDetails?.issues && result.verificationDetails.issues.length > 0) {
        updateData.warnings = result.verificationDetails.issues;
      }
      
      await this.db.collection('jobs').doc(jobId).update(updateData);
      
      console.log(`✅ Updated job ${jobId} with verification results:`, {
        verified: result.verificationDetails.isValid,
        score: result.verificationDetails.qualityScore,
        processingTime: metrics?.totalTime
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * BEFORE: Basic validation only
   * AFTER: Enhanced validation with backward compatibility
   */
  async validateParsedCV(parsedData: any): Promise<boolean> {
    try {
      // Basic validation
      if (!parsedData || typeof parsedData !== 'object') {
        return false;
      }

      // Check for required fields
      if (!parsedData.personalInfo || !parsedData.experience || !parsedData.skills) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * NEW: Enhanced validation with verification
   */
  async validateParsedCVWithVerification(
    parsedData: any, 
    originalText?: string
  ): Promise<{
    isValid: boolean;
    verificationScore?: number;
    issues: string[];
    recommendations: string[];
  }> {
    const startTime = Date.now();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Basic validation first
      const basicValid = await this.validateParsedCV(parsedData);
      if (!basicValid) {
        issues.push('Basic validation failed');
        return { isValid: false, issues, recommendations };
      }
      
      // If verification is enabled and we have the verified parser
      if (this.verifiedParser && originalText) {
        try {
          // Use parseText for verification instead of validateExtractedData
          const verificationResult = await this.verifiedParser.parseText(originalText);
          
          if (verificationResult.verification && !verificationResult.verification.isValid) {
            issues.push('LLM verification failed');
            if (verificationResult.verification.issues) {
              issues.push(...verificationResult.verification.issues);
            }
          }
          
          if (verificationResult.verification?.warnings) {
            recommendations.push(...verificationResult.verification.warnings);
          }
          
          
          return {
            isValid: verificationResult.verification?.isValid || false,
            verificationScore: verificationResult.verification?.qualityScore || 0,
            issues,
            recommendations
          };
        } catch (verificationError) {
          recommendations.push('Verification service unavailable - used basic validation only');
        }
      }
      
      
      return {
        isValid: true,
        issues,
        recommendations
      };
    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, issues, recommendations };
    }
  }
  
  /**
   * NEW: Parse CV with LLM verification if enabled
   * This is the main integration point showing how to use verified parsing
   */
  async parseWithVerification(
    fileBuffer: Buffer, 
    mimeType: string, 
    userInstructions?: string
  ): Promise<{
    parsedCV: ParsedCV;
    metrics: CVParsingMetrics;
    verificationDetails?: any;
    auditInfo?: any;
    fallbackUsed?: boolean;
    warnings?: string[];
  }> {
    const startTime = Date.now();
    let verificationStartTime: number | undefined;
    let retryCount = 0;
    const maxRetries = llmVerificationConfig.verification.maxRetries;
    
    try {
      // If verification is enabled and available
      if (this.verifiedParser && this.config.enableVerification) {
        verificationStartTime = Date.now();
        
        
        while (retryCount <= maxRetries) {
          try {
            const result = await this.verifiedParser.parseCV(
              { buffer: fileBuffer, originalname: 'cv-file.pdf' },
              mimeType,
              userInstructions
            );
            const endTime = Date.now();
            
            const metrics: CVParsingMetrics = {
              processingTime: endTime - startTime,
              verificationTime: verificationStartTime ? endTime - verificationStartTime : undefined,
              totalTime: endTime - startTime,
              retryCount,
              verificationUsed: true,
              fallbackUsed: result.metadata?.parsingMethod === 'fallback'
            };
            
            console.log('✅ CV parsing with verification completed:', {
              verified: result.verificationDetails.isValid,
              score: result.verificationDetails.qualityScore,
              metrics
            });
            
            // Convert VerifiedParsingResult to ParsedCV format
            const parsedCV: ParsedCV = {
              personalInfo: result.personalInfo,
              experience: result.experience,
              education: result.education,
              skills: result.skills,
              certifications: result.certifications,
              projects: result.projects?.map(project => ({
                name: project.name,
                description: project.description,
                technologies: project.technologies || [],
                url: project.url
              })),
              publications: Array.isArray((result as any).publications) ? (result as any).publications : undefined,
              interests: Array.isArray((result as any).interests) ? (result as any).interests : undefined
            };
            
            return {
              parsedCV,
              metrics,
              verificationDetails: result.verificationDetails,
              auditInfo: { processingTime: result.verificationDetails.processingTimeMs },
              fallbackUsed: result.metadata?.parsingMethod === 'fallback',
              warnings: result.verificationDetails?.issues
            };
          } catch (error) {
            retryCount++;
            if (retryCount > maxRetries) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, llmVerificationConfig.verification.retryDelay));
          }
        }
      }
      
      // Fallback to standard parsing (this would need to be implemented)
      throw new Error('Standard CV parsing not implemented in this service - use CVParser directly');
      
    } catch (error) {
      const endTime = Date.now();
      
      const metrics: CVParsingMetrics = {
        processingTime: endTime - startTime,
        verificationTime: verificationStartTime ? endTime - verificationStartTime : undefined,
        totalTime: endTime - startTime,
        retryCount,
        verificationUsed: false,
        fallbackUsed: true
      };
      
      throw error;
    }
  }
  
  /**
   * NEW: Get service health status including verification availability
   */
  getServiceStatus(): {
    verificationEnabled: boolean;
    verificationAvailable: boolean;
    configuration: LLMIntegrationConfig;
    healthCheck: {
      timestamp: Date;
      apiKeysConfigured: boolean;
      servicesInitialized: boolean;
    };
  } {
    return {
      verificationEnabled: Boolean(this.config.enableVerification),
      verificationAvailable: Boolean(this.verifiedParser && this.llmWrapper),
      configuration: this.config,
      healthCheck: {
        timestamp: new Date(),
        apiKeysConfigured: !!(process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY),
        servicesInitialized: !!(this.verifiedParser && this.llmWrapper)
      }
    };
  }
}

// Export both original and enhanced services for comparison
export { CVParsingService as OriginalCVParsingService } from './cvParsing.service';