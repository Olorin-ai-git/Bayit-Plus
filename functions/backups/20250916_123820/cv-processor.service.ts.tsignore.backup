// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Processing Service
 *
 * Core business logic service for CV processing orchestration, including
 * file parsing, content extraction, AI analysis, and ATS optimization.
 *
 * @fileoverview CV Processing orchestration service with comprehensive workflow management
 */

import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Model services
import {
  getCVJob,
  updateJobStatus,
  updateJobProgress,
  completeJob,
  failJob
} from '../models/cv-job.service';
import {
  createProcessedCV,
  updateProcessedCV,
  updateATSAnalysis,
  updatePersonalityInsights,
  updateConfidenceScore
} from '../models/processed-cv.service';

// Types
import { CVJob, JobStatus, ProcessingStage, FeatureType } from '../../../shared/types/cv-job';
import {
  ProcessedCV,
  PersonalInfo,
  Experience,
  Education,
  Skills,
  PersonalityProfile,
  EmploymentType,
  ProficiencyLevel,
  CertificationStatus,
  AchievementCategory,
  ProjectStatus
} from '../../../shared/types/processed-cv';

// External services (would be implemented separately)
import { AIAnalysisService } from './ai-analysis.service';

// ============================================================================
// Configuration
// ============================================================================

const SUPPORTED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MIN_CONFIDENCE_THRESHOLD = 70;

// ============================================================================
// Core Processing Interface
// ============================================================================

export interface CVProcessingOptions {
  jobId: string;
  features: FeatureType[];
  customizations?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface CVProcessingResult {
  processedCV: ProcessedCV;
  confidence: number;
  processingTime: number;
  warnings: string[];
  errors: string[];
}

export interface CVExtractionResult {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skills;
  certifications: any[];
  achievements: any[];
  projects: any[];
  rawText: string;
  confidence: number;
}

// ============================================================================
// Main Processing Service
// ============================================================================

export class CVProcessorService {
  private aiAnalysisService: AIAnalysisService;

  constructor() {
    this.aiAnalysisService = new AIAnalysisService();
  }

  /**
   * Main entry point for CV processing
   */
  async processCV(options: CVProcessingOptions): Promise<CVProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      logger.info('Starting CV processing', { jobId: options.jobId, features: options.features });

      // Get the job details
      const job = await getCVJob(options.jobId);
      if (!job) {
        throw new Error(`CV job not found: ${options.jobId}`);
      }

      // Update job status to processing
      await updateJobStatus(options.jobId, JobStatus.PROCESSING, 'Starting CV processing', ProcessingStage.PARSING);

      // Phase 1: File Download and Parsing
      await updateJobProgress(options.jobId, 10, ProcessingStage.PARSING, 'Downloading and parsing CV file');
      const extractionResult = await this.extractCVContent(job);

      if (extractionResult.confidence < MIN_CONFIDENCE_THRESHOLD) {
        warnings.push(`Low extraction confidence: ${extractionResult.confidence}%`);
      }

      // Phase 2: Content Structuring
      await updateJobProgress(options.jobId, 30, ProcessingStage.ANALYSIS, 'Structuring CV content');
      const structuredContent = await this.structureCVContent(extractionResult, job);

      // Phase 3: AI Analysis
      await updateJobProgress(options.jobId, 50, ProcessingStage.ANALYSIS, 'Performing AI analysis');
      const analysisResults = await this.performAIAnalysis(structuredContent, options.features);

      // Phase 4: ATS Optimization
      await updateJobProgress(options.jobId, 70, ProcessingStage.OPTIMIZATION, 'Optimizing for ATS systems');
      const atsResults = await this.performATSAnalysis(structuredContent, analysisResults);

      // Phase 5: Quality Validation
      await updateJobProgress(options.jobId, 85, ProcessingStage.VALIDATION, 'Validating results');
      const validationResults = await this.validateProcessingResults(structuredContent, analysisResults, atsResults);

      // Phase 6: Save Results
      await updateJobProgress(options.jobId, 95, ProcessingStage.COMPLETION, 'Saving processed CV');
      const processedCV = await this.saveProcessedCV(options.jobId, structuredContent, analysisResults, atsResults);

      // Complete the job
      const processingTime = Date.now() - startTime;
      await completeJob(options.jobId, {
        processingTimeMs: processingTime,
        statusMessage: 'CV processing completed successfully'
      });

      logger.info('CV processing completed successfully', {
        jobId: options.jobId,
        processingTime,
        confidence: processedCV.confidenceScore,
        atsScore: processedCV.atsScore
      });

      return {
        processedCV,
        confidence: processedCV.confidenceScore,
        processingTime,
        warnings: [...warnings, ...validationResults.warnings],
        errors: [...errors, ...validationResults.errors]
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('CV processing failed', {
        jobId: options.jobId,
        error: errorMessage,
        processingTime
      });

      // Mark job as failed
      await failJob(options.jobId, errorMessage, true);

      throw error;
    }
  }

  /**
   * Extract content from CV file
   */
  private async extractCVContent(job: CVJob): Promise<CVExtractionResult> {
    logger.debug('Extracting CV content', { jobId: job.id, fileUrl: job.fileUrl });

    if (!job.fileUrl) {
      throw new Error('No file URL provided in job');
    }

    // Download file from Firebase Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const fileName = path.basename(job.fileUrl);
    const fileExtension = path.extname(fileName).toLowerCase();

    if (!SUPPORTED_FILE_TYPES.includes(fileExtension)) {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    // Create temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `cv-${job.id}${fileExtension}`);

    try {
      // Download file
      const file = bucket.file(job.fileUrl);
      const [metadata] = await file.getMetadata();

      if (metadata.size && parseInt(metadata.size) > MAX_FILE_SIZE) {
        throw new Error(`File size ${metadata.size} exceeds maximum allowed size ${MAX_FILE_SIZE}`);
      }

      await file.download({ destination: tempFilePath });

      // Extract text based on file type
      let rawText: string;
      let confidence = 90; // Base confidence

      switch (fileExtension) {
        case '.pdf':
          rawText = await this.extractFromPDF(tempFilePath);
          break;
        case '.docx':
          rawText = await this.extractFromDocx(tempFilePath);
          break;
        case '.doc':
          rawText = await this.extractFromDoc(tempFilePath);
          confidence -= 10; // Lower confidence for older format
          break;
        case '.txt':
          rawText = await fs.readFile(tempFilePath, 'utf-8');
          confidence -= 20; // Lower confidence for plain text
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      if (!rawText || rawText.trim().length < 100) {
        throw new Error('Insufficient content extracted from CV file');
      }

      // Use AI to structure the extracted text
      const structuredData = await this.aiAnalysisService.extractStructuredCV(rawText);

      return {
        personalInfo: structuredData.personalInfo,
        summary: structuredData.summary,
        experience: structuredData.experience,
        education: structuredData.education,
        skills: structuredData.skills,
        certifications: structuredData.certifications || [],
        achievements: structuredData.achievements || [],
        projects: structuredData.projects || [],
        rawText,
        confidence
      };

    } finally {
      // Cleanup temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary file', { path: tempFilePath, error: cleanupError });
      }
    }
  }

  /**
   * Structure CV content into standardized format
   */
  private async structureCVContent(
    extractionResult: CVExtractionResult,
    job: CVJob
  ): Promise<Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>> {
    logger.debug('Structuring CV content', { jobId: job.id });

    // Enhance and validate personal information
    const personalInfo = await this.enhancePersonalInfo(extractionResult.personalInfo);

    // Process and validate experience
    const experience = await this.processExperience(extractionResult.experience);

    // Process and validate education
    const education = await this.processEducation(extractionResult.education);

    // Process and categorize skills
    const skills = await this.processSkills(extractionResult.skills);

    // Process certifications
    const certifications = await this.processCertifications(extractionResult.certifications);

    // Process achievements
    const achievements = await this.processAchievements(extractionResult.achievements);

    // Process projects
    const projects = await this.processProjects(extractionResult.projects);

    // Calculate initial confidence score
    const confidenceScore = this.calculateConfidenceScore(extractionResult, {
      personalInfo,
      experience,
      education,
      skills
    });

    return {
      jobId: job.id,
      personalInfo,
      summary: extractionResult.summary,
      experience,
      education,
      skills,
      certifications,
      achievements,
      projects,
      atsScore: 0, // Will be calculated in ATS analysis
      personalityInsights: {} as PersonalityProfile, // Will be filled by AI analysis
      suggestedImprovements: [],
      extractedKeywords: [],
      originalLanguage: 'en', // Default, could be detected
      confidenceScore,
      processingVersion: '1.0.0'
    };
  }

  /**
   * Perform AI analysis on structured CV
   */
  private async performAIAnalysis(
    structuredCV: Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>,
    features: FeatureType[]
  ): Promise<{
    personalityInsights: PersonalityProfile;
    suggestedImprovements: string[];
    extractedKeywords: string[];
  }> {
    logger.debug('Performing AI analysis', { jobId: structuredCV.jobId, features });

    const results = {
      personalityInsights: {} as PersonalityProfile,
      suggestedImprovements: [] as string[],
      extractedKeywords: [] as string[]
    };

    // Personality analysis if requested
    if (features.includes(FeatureType.PERSONALITY_INSIGHTS)) {
      results.personalityInsights = await this.aiAnalysisService.analyzePersonality(structuredCV);
    }

    // General CV analysis
    const analysis = await this.aiAnalysisService.analyzeCVContent({
      summary: structuredCV.summary,
      experience: structuredCV.experience,
      education: structuredCV.education,
      skills: structuredCV.skills
    });

    results.suggestedImprovements = analysis.improvements;
    results.extractedKeywords = analysis.keywords;

    return results;
  }

  /**
   * Perform ATS analysis and optimization
   */
  private async performATSAnalysis(
    structuredCV: Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>,
    aiResults: { extractedKeywords: string[] }
  ): Promise<{
    atsScore: number;
    atsImprovements: string[];
    optimizedKeywords: string[];
  }> {
    logger.debug('Performing ATS analysis', { jobId: structuredCV.jobId });

    // Calculate ATS score based on various factors
    let atsScore = 0;

    // Contact information completeness (20 points)
    if (structuredCV.personalInfo.email) atsScore += 10;
    if (structuredCV.personalInfo.phone) atsScore += 10;

    // Experience section quality (30 points)
    if (structuredCV.experience.length > 0) atsScore += 15;
    if (structuredCV.experience.some(exp => exp.achievements.length > 0)) atsScore += 15;

    // Education section (15 points)
    if (structuredCV.education.length > 0) atsScore += 15;

    // Skills section (20 points)
    const totalSkills = structuredCV.skills.technical.length +
                       structuredCV.skills.soft.length +
                       structuredCV.skills.tools.length;
    if (totalSkills > 5) atsScore += 10;
    if (totalSkills > 10) atsScore += 10;

    // Keywords presence (15 points)
    if (aiResults.extractedKeywords.length > 10) atsScore += 15;

    // Generate ATS-specific improvements
    const atsImprovements: string[] = [];

    if (!structuredCV.personalInfo.email) {
      atsImprovements.push('Add a professional email address');
    }
    if (!structuredCV.personalInfo.phone) {
      atsImprovements.push('Include a phone number for contact');
    }
    if (structuredCV.experience.length === 0) {
      atsImprovements.push('Add work experience section');
    }
    if (totalSkills < 5) {
      atsImprovements.push('Include more relevant skills');
    }

    return {
      atsScore: Math.min(atsScore, 100),
      atsImprovements,
      optimizedKeywords: aiResults.extractedKeywords
    };
  }

  /**
   * Validate processing results for quality and completeness
   */
  private async validateProcessingResults(
    structuredCV: any,
    aiResults: any,
    atsResults: any
  ): Promise<{ warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate required fields
    if (!structuredCV.personalInfo.name) {
      errors.push('No name found in CV');
    }

    if (structuredCV.experience.length === 0 && structuredCV.education.length === 0) {
      errors.push('No experience or education found');
    }

    // Quality warnings
    if (structuredCV.summary.length < 50) {
      warnings.push('Summary is very short');
    }

    if (atsResults.atsScore < 60) {
      warnings.push('Low ATS compatibility score');
    }

    if (structuredCV.confidenceScore < MIN_CONFIDENCE_THRESHOLD) {
      warnings.push('Low processing confidence - manual review recommended');
    }

    return { warnings, errors };
  }

  /**
   * Save processed CV to database
   */
  private async saveProcessedCV(
    jobId: string,
    structuredCV: Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>,
    aiResults: any,
    atsResults: any
  ): Promise<ProcessedCV> {
    logger.debug('Saving processed CV', { jobId });

    const processedCVData = {
      ...structuredCV,
      atsScore: atsResults.atsScore,
      personalityInsights: aiResults.personalityInsights,
      suggestedImprovements: [...aiResults.suggestedImprovements, ...atsResults.atsImprovements],
      extractedKeywords: atsResults.optimizedKeywords
    };

    return await createProcessedCV(processedCVData);
  }

  // ============================================================================
  // Content Processing Helpers
  // ============================================================================

  private async enhancePersonalInfo(personalInfo: PersonalInfo): Promise<PersonalInfo> {
    // Enhance and validate personal information
    const enhanced = { ...personalInfo };

    // Validate email format
    if (enhanced.email && !this.isValidEmail(enhanced.email)) {
      delete enhanced.email;
    }

    // Validate URLs
    if (enhanced.linkedin && !this.isValidUrl(enhanced.linkedin)) {
      delete enhanced.linkedin;
    }
    if (enhanced.website && !this.isValidUrl(enhanced.website)) {
      delete enhanced.website;
    }
    if (enhanced.github && !this.isValidUrl(enhanced.github)) {
      delete enhanced.github;
    }

    return enhanced;
  }

  private async processExperience(experience: Experience[]): Promise<Experience[]> {
    return experience.map(exp => ({
      ...exp,
      employmentType: exp.employmentType || EmploymentType.FULL_TIME,
      skills: exp.skills || [],
      achievements: exp.achievements || []
    }));
  }

  private async processEducation(education: Education[]): Promise<Education[]> {
    return education.map(edu => ({
      ...edu,
      achievements: edu.achievements || [],
      coursework: edu.coursework || []
    }));
  }

  private async processSkills(skills: Skills): Promise<Skills> {
    return {
      technical: skills.technical || [],
      soft: skills.soft || [],
      languages: (skills.languages || []).map(lang => ({
        ...lang,
        level: lang.level || ProficiencyLevel.INTERMEDIATE
      })),
      tools: skills.tools || []
    };
  }

  private async processCertifications(certifications: any[]): Promise<any[]> {
    return certifications.map(cert => ({
      ...cert,
      status: cert.status || CertificationStatus.ACTIVE
    }));
  }

  private async processAchievements(achievements: any[]): Promise<any[]> {
    return achievements.map(achievement => ({
      ...achievement,
      category: achievement.category || AchievementCategory.OTHER
    }));
  }

  private async processProjects(projects: any[]): Promise<any[]> {
    return projects.map(project => ({
      ...project,
      status: project.status || ProjectStatus.COMPLETED,
      technologies: project.technologies || []
    }));
  }

  private calculateConfidenceScore(
    extractionResult: CVExtractionResult,
    structuredData: any
  ): number {
    let confidence = extractionResult.confidence;

    // Adjust based on data completeness
    if (structuredData.personalInfo.name) confidence += 5;
    if (structuredData.personalInfo.email) confidence += 5;
    if (structuredData.experience.length > 0) confidence += 10;
    if (structuredData.education.length > 0) confidence += 5;

    // Adjust based on content quality
    if (structuredData.summary && structuredData.summary.length > 100) confidence += 5;

    return Math.min(confidence, 100);
  }

  // ============================================================================
  // File Processing Helpers
  // ============================================================================

  private async extractFromPDF(filePath: string): Promise<string> {
    // This would use a PDF parsing library like pdf-parse
    // For now, return placeholder
    logger.debug('Extracting from PDF', { filePath });

    // In real implementation, would use pdf-parse:
    // const pdfParse = require('pdf-parse');
    // const dataBuffer = await fs.readFile(filePath);
    // const pdfData = await pdfParse(dataBuffer);
    // return pdfData.text;

    throw new Error('PDF extraction not implemented - requires pdf-parse library');
  }

  private async extractFromDocx(filePath: string): Promise<string> {
    // This would use a DOCX parsing library like mammoth
    logger.debug('Extracting from DOCX', { filePath });

    // In real implementation, would use mammoth:
    // const mammoth = require('mammoth');
    // const result = await mammoth.extractRawText({ path: filePath });
    // return result.value;

    throw new Error('DOCX extraction not implemented - requires mammoth library');
  }

  private async extractFromDoc(filePath: string): Promise<string> {
    // This would use a DOC parsing library or conversion tool
    logger.debug('Extracting from DOC', { filePath });
    throw new Error('DOC extraction not implemented - requires conversion tool');
  }

  // ============================================================================
  // Validation Utilities
  // ============================================================================

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Service Factory
// ============================================================================

let cvProcessorService: CVProcessorService;

export function getCVProcessorService(): CVProcessorService {
  if (!cvProcessorService) {
    cvProcessorService = new CVProcessorService();
  }
  return cvProcessorService;
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Process a CV job
 */
export async function processCV(options: CVProcessingOptions): Promise<CVProcessingResult> {
  const service = getCVProcessorService();
  return service.processCV(options);
}

/**
 * Reprocess a CV with different features
 */
export async function reprocessCV(
  jobId: string,
  additionalFeatures: FeatureType[]
): Promise<CVProcessingResult> {
  const job = await getCVJob(jobId);
  if (!job) {
    throw new Error(`CV job not found: ${jobId}`);
  }

  const allFeatures = [...new Set([...job.requestedFeatures, ...additionalFeatures])];

  return processCV({
    jobId,
    features: allFeatures,
    customizations: job.customizations
  });
}

/**
 * Get processing status and progress
 */
export async function getProcessingStatus(jobId: string): Promise<{
  status: JobStatus;
  stage: ProcessingStage;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}> {
  const job = await getCVJob(jobId);
  if (!job) {
    throw new Error(`CV job not found: ${jobId}`);
  }

  const estimatedTimeRemaining = job.status === JobStatus.PROCESSING
    ? Math.max(0, PROCESSING_TIMEOUT_MS - (Date.now() - job.updatedAt.toMillis()))
    : undefined;

  return {
    status: job.status,
    stage: job.currentStage,
    progress: job.progressPercentage,
    message: job.statusMessage || '',
    estimatedTimeRemaining
  };
}