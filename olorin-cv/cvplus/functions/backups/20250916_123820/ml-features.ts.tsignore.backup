// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * ML Feature Types
 * 
 * Feature vector and feature engineering types.
 * Extracted from ml-pipeline.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * Feature vector for ML models
 */
export interface FeatureVector {
  /** Vector identifier */
  id: string;
  
  /** Associated job/CV ID */
  jobId: string;
  
  /** Feature extraction timestamp */
  extractedAt: Date;
  
  /** Feature categories */
  features: {
    /** Personal information features */
    personal: {
      ageGroup: number;
      locationTier: number;
      educationLevel: number;
      careerStage: number;
    };
    
    /** Experience features */
    experience: {
      totalYears: number;
      companiesCount: number;
      averageTenure: number;
      seniorityProgression: number;
      industryDiversity: number;
      roleConsistency: number;
      leadershipExperience: number;
      techStackModernity: number;
    };
    
    /** Skills features */
    skills: {
      technicalSkillsCount: number;
      softSkillsCount: number;
      skillsMaturity: number;
      demandedSkillsRatio: number;
      emergingSkillsRatio: number;
      skillsComplementarity: number;
      certificationLevel: number;
    };
    
    /** Education features */
    education: {
      degreeLevel: number;
      institutionTier: number;
      relevanceScore: number;
      continuousLearning: number;
      specialization: number;
    };
    
    /** Achievements features */
    achievements: {
      achievementsCount: number;
      quantifiableResults: number;
      impactScore: number;
      recognitionLevel: number;
      innovationIndicator: number;
    };
    
    /** Content quality features */
    content: {
      overallQuality: number;
      readabilityScore: number;
      keywordOptimization: number;
      structureScore: number;
      completeness: number;
      uniqueness: number;
      grammarScore: number;
    };
    
    /** ATS compatibility features */
    ats: {
      formatScore: number;
      keywordDensity: number;
      sectionStructure: number;
      fileFormatScore: number;
      parseability: number;
    };
    
    /** Market alignment features */
    market: {
      salaryCompetitiveness: number;
      roleAvailability: number;
      industryTrends: number;
      geographicFit: number;
      timeToMarket: number;
    };
    
    /** Behavioral indicators */
    behavioral: {
      careerConsistency: number;
      growthTrajectory: number;
      riskProfile: number;
      adaptabilityScore: number;
      stabilityIndicator: number;
    };
  };
  
  /** Raw feature values */
  rawFeatures: Record<string, number>;
  
  /** Feature importance weights */
  weights: Record<string, number>;
  
  /** Normalized features (0-1 scale) */
  normalizedFeatures: Record<string, number>;
  
  /** Feature engineering metadata */
  metadata: {
    version: string;
    extractionMethod: string;
    normalizationMethod: string;
    missingValueHandling: string;
    outlierHandling: string;
    featureSelectionMethod?: string;
    selectedFeatures?: string[];
  };
}