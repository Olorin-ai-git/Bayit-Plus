/**
 * ProcessedCV Firestore Service
 *
 * Firebase model service for managing ProcessedCV entities with comprehensive
 * CRUD operations, AI analysis results, and content management.
 *
 * @fileoverview ProcessedCV service for Firebase Functions with search and analytics
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  runTransaction
} from 'firebase-admin/firestore';
import {
  ProcessedCV,
  validateProcessedCV,
  isProcessedCV,
  PersonalInfo,
  Experience,
  Education,
  Skills,
  PersonalityProfile,
  calculateYearsOfExperience,
  getAllSkills,
  getCareerProgressionScore,
  getEducationScore
} from '../../../shared/types/processed-cv';
import { logger } from 'firebase-functions/v2';

// ============================================================================
// Service Configuration
// ============================================================================

const COLLECTION_NAME = 'processedCVs';
const CACHE_TTL_SECONDS = 600; // 10 minutes (longer for processed content)
const BATCH_SIZE = 500;
const MIN_ATS_SCORE = 0;
const MAX_ATS_SCORE = 100;

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: ProcessedCV;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(id: string): string {
  return `processedCV:${id}`;
}

function getCachedCV(id: string): ProcessedCV | null {
  const key = getCacheKey(id);
  const entry = cache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedCV(cv: ProcessedCV): void {
  const key = getCacheKey(cv.id);
  const now = Date.now();

  cache.set(key, {
    data: cv,
    timestamp: now,
    expiresAt: now + (CACHE_TTL_SECONDS * 1000)
  });
}

function invalidateCache(id: string): void {
  const key = getCacheKey(id);
  cache.delete(key);
}

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * Create a new ProcessedCV in Firestore
 */
export async function createProcessedCV(cvData: Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessedCV> {
  const db = getFirestore();
  const cvsRef = collection(db, COLLECTION_NAME);
  const newCVRef = doc(cvsRef);

  const now = Timestamp.now();
  const cv: ProcessedCV = {
    ...cvData,
    id: newCVRef.id,
    createdAt: now,
    updatedAt: now
  };

  // Validate CV data
  const validationErrors = validateProcessedCV(cv);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('ProcessedCV validation failed', { errors: validationErrors, cvId: cv.id });
    throw new Error(errorMessage);
  }

  try {
    await setDoc(newCVRef, cv);
    setCachedCV(cv);

    logger.info('ProcessedCV created successfully', {
      cvId: cv.id,
      jobId: cv.jobId,
      atsScore: cv.atsScore,
      confidenceScore: cv.confidenceScore
    });
    return cv;
  } catch (error) {
    logger.error('Failed to create ProcessedCV', { error, cvId: cv.id });
    throw new Error(`Failed to create processed CV: ${error}`);
  }
}

/**
 * Get ProcessedCV by ID
 */
export async function getProcessedCV(id: string): Promise<ProcessedCV | null> {
  // Check cache first
  const cached = getCachedCV(id);
  if (cached) {
    return cached;
  }

  const db = getFirestore();
  const cvRef = doc(db, COLLECTION_NAME, id);

  try {
    const docSnapshot = await getDoc(cvRef);

    if (!docSnapshot.exists()) {
      logger.debug('ProcessedCV not found', { cvId: id });
      return null;
    }

    const data = docSnapshot.data();
    if (!isProcessedCV(data)) {
      logger.error('Invalid ProcessedCV data structure', { cvId: id, data });
      throw new Error('Invalid processed CV data structure');
    }

    const cv = data as ProcessedCV;
    setCachedCV(cv);

    return cv;
  } catch (error) {
    logger.error('Failed to get ProcessedCV', { error, cvId: id });
    throw new Error(`Failed to retrieve processed CV: ${error}`);
  }
}

/**
 * Get ProcessedCV by job ID
 */
export async function getProcessedCVByJobId(jobId: string): Promise<ProcessedCV | null> {
  const db = getFirestore();
  const cvsRef = collection(db, COLLECTION_NAME);
  const q = query(cvsRef, where('jobId', '==', jobId), firestoreLimit(1));

  try {
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      logger.debug('ProcessedCV not found by job ID', { jobId });
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    if (!isProcessedCV(data)) {
      logger.error('Invalid ProcessedCV data structure', { jobId, data });
      throw new Error('Invalid processed CV data structure');
    }

    const cv = data as ProcessedCV;
    setCachedCV(cv);

    return cv;
  } catch (error) {
    logger.error('Failed to get ProcessedCV by job ID', { error, jobId });
    throw new Error(`Failed to retrieve processed CV by job ID: ${error}`);
  }
}

/**
 * Update ProcessedCV
 */
export async function updateProcessedCV(
  id: string,
  updates: Partial<Omit<ProcessedCV, 'id' | 'createdAt'>>
): Promise<ProcessedCV> {
  // Get existing CV
  const existingCV = await getProcessedCV(id);
  if (!existingCV) {
    throw new Error(`Processed CV not found: ${id}`);
  }

  const updatedCV: ProcessedCV = {
    ...existingCV,
    ...updates,
    updatedAt: Timestamp.now()
  };

  // Validate updated CV
  const validationErrors = validateProcessedCV(updatedCV);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('ProcessedCV update validation failed', { errors: validationErrors, cvId: id });
    throw new Error(errorMessage);
  }

  const db = getFirestore();
  const cvRef = doc(db, COLLECTION_NAME, id);

  try {
    await updateDoc(cvRef, updates as any);

    // Update cache
    setCachedCV(updatedCV);

    logger.info('ProcessedCV updated successfully', {
      cvId: id,
      updatedFields: Object.keys(updates)
    });
    return updatedCV;
  } catch (error) {
    logger.error('Failed to update ProcessedCV', { error, cvId: id });
    throw new Error(`Failed to update processed CV: ${error}`);
  }
}

/**
 * Delete ProcessedCV
 */
export async function deleteProcessedCV(id: string): Promise<boolean> {
  const db = getFirestore();
  const cvRef = doc(db, COLLECTION_NAME, id);

  try {
    await deleteDoc(cvRef);

    // Remove from cache
    invalidateCache(id);

    logger.info('ProcessedCV deleted', { cvId: id });
    return true;
  } catch (error) {
    logger.error('Failed to delete ProcessedCV', { error, cvId: id });
    throw new Error(`Failed to delete processed CV: ${error}`);
  }
}

// ============================================================================
// AI Analysis Operations
// ============================================================================

/**
 * Update ATS score and analysis
 */
export async function updateATSAnalysis(
  cvId: string,
  atsScore: number,
  suggestedImprovements: string[],
  extractedKeywords: string[]
): Promise<ProcessedCV> {
  if (atsScore < MIN_ATS_SCORE || atsScore > MAX_ATS_SCORE) {
    throw new Error(`ATS score must be between ${MIN_ATS_SCORE} and ${MAX_ATS_SCORE}`);
  }

  const updates: Partial<ProcessedCV> = {
    atsScore,
    suggestedImprovements,
    extractedKeywords,
    updatedAt: Timestamp.now()
  };

  return updateProcessedCV(cvId, updates);
}

/**
 * Update personality insights
 */
export async function updatePersonalityInsights(
  cvId: string,
  personalityInsights: PersonalityProfile
): Promise<ProcessedCV> {
  const updates: Partial<ProcessedCV> = {
    personalityInsights,
    updatedAt: Timestamp.now()
  };

  return updateProcessedCV(cvId, updates);
}

/**
 * Update confidence score
 */
export async function updateConfidenceScore(
  cvId: string,
  confidenceScore: number
): Promise<ProcessedCV> {
  if (confidenceScore < 0 || confidenceScore > 100) {
    throw new Error('Confidence score must be between 0 and 100');
  }

  const updates: Partial<ProcessedCV> = {
    confidenceScore,
    updatedAt: Timestamp.now()
  };

  return updateProcessedCV(cvId, updates);
}

// ============================================================================
// Content Management
// ============================================================================

/**
 * Update personal information
 */
export async function updatePersonalInfo(
  cvId: string,
  personalInfo: PersonalInfo
): Promise<ProcessedCV> {
  const updates: Partial<ProcessedCV> = {
    personalInfo,
    updatedAt: Timestamp.now()
  };

  return updateProcessedCV(cvId, updates);
}

/**
 * Add or update experience entry
 */
export async function updateExperience(
  cvId: string,
  experienceIndex: number,
  experience: Experience
): Promise<ProcessedCV> {
  const existingCV = await getProcessedCV(cvId);
  if (!existingCV) {
    throw new Error(`Processed CV not found: ${cvId}`);
  }

  const updatedExperience = [...existingCV.experience];

  if (experienceIndex >= 0 && experienceIndex < updatedExperience.length) {
    // Update existing experience
    updatedExperience[experienceIndex] = experience;
  } else if (experienceIndex === updatedExperience.length) {
    // Add new experience
    updatedExperience.push(experience);
  } else {
    throw new Error(`Invalid experience index: ${experienceIndex}`);
  }

  const updates: Partial<ProcessedCV> = {
    experience: updatedExperience,
    updatedAt: Timestamp.now()
  };

  return updateProcessedCV(cvId, updates);
}

/**
 * Add or update education entry
 */
export async function updateEducation(
  cvId: string,
  educationIndex: number,
  education: Education
): Promise<ProcessedCV> {
  const existingCV = await getProcessedCV(cvId);
  if (!existingCV) {
    throw new Error(`Processed CV not found: ${cvId}`);
  }

  const updatedEducation = [...existingCV.education];

  if (educationIndex >= 0 && educationIndex < updatedEducation.length) {
    // Update existing education
    updatedEducation[educationIndex] = education;
  } else if (educationIndex === updatedEducation.length) {
    // Add new education
    updatedEducation.push(education);
  } else {
    throw new Error(`Invalid education index: ${educationIndex}`);
  }

  const updates: Partial<ProcessedCV> = {
    education: updatedEducation,
    updatedAt: Timestamp.now()
  };

  return updateProcessedCV(cvId, updates);
}

/**
 * Update skills
 */
export async function updateSkills(
  cvId: string,
  skills: Skills
): Promise<ProcessedCV> {
  const updates: Partial<ProcessedCV> = {
    skills,
    updatedAt: Timestamp.now()
  };

  return updateProcessedCV(cvId, updates);
}

// ============================================================================
// Search and Query Operations
// ============================================================================

export interface ProcessedCVQueryOptions {
  jobId?: string;
  minATSScore?: number;
  maxATSScore?: number;
  minConfidenceScore?: number;
  skills?: string[];
  experienceYears?: number;
  industries?: string[];
  locations?: string[];
  languages?: string[];
  startAfterDoc?: DocumentSnapshot;
  limit?: number;
  orderByField?: 'atsScore' | 'confidenceScore' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Search ProcessedCVs with advanced filters
 */
export async function searchProcessedCVs(options: ProcessedCVQueryOptions = {}): Promise<{
  cvs: ProcessedCV[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const db = getFirestore();
  const cvsRef = collection(db, COLLECTION_NAME);

  let q = query(cvsRef);

  // Apply filters
  if (options.jobId) {
    q = query(q, where('jobId', '==', options.jobId));
  }

  if (options.minATSScore !== undefined) {
    q = query(q, where('atsScore', '>=', options.minATSScore));
  }

  if (options.maxATSScore !== undefined) {
    q = query(q, where('atsScore', '<=', options.maxATSScore));
  }

  if (options.minConfidenceScore !== undefined) {
    q = query(q, where('confidenceScore', '>=', options.minConfidenceScore));
  }

  // Apply ordering
  const orderByField = options.orderByField || 'createdAt';
  const orderDirection = options.orderDirection || 'desc';
  q = query(q, orderBy(orderByField, orderDirection));

  // Apply pagination
  if (options.startAfterDoc) {
    q = query(q, startAfter(options.startAfterDoc));
  }

  const limitCount = Math.min(options.limit || 50, BATCH_SIZE);
  q = query(q, firestoreLimit(limitCount + 1)); // Get one extra to check if there are more

  try {
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    const hasMore = docs.length > limitCount;

    if (hasMore) {
      docs.pop(); // Remove the extra document
    }

    let cvs: ProcessedCV[] = [];
    for (const doc of docs) {
      const data = doc.data();
      if (isProcessedCV(data)) {
        cvs.push(data as ProcessedCV);
      } else {
        logger.warn('Invalid ProcessedCV data in search result', { docId: doc.id });
      }
    }

    // Apply client-side filters that can't be done in Firestore
    if (options.skills && options.skills.length > 0) {
      cvs = cvs.filter(cv => {
        const allSkills = getAllSkills(cv);
        return options.skills!.some(skill =>
          allSkills.some(cvSkill =>
            cvSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
      });
    }

    if (options.experienceYears !== undefined) {
      cvs = cvs.filter(cv => {
        const years = calculateYearsOfExperience(cv.experience);
        return years >= options.experienceYears!;
      });
    }

    if (options.industries && options.industries.length > 0) {
      cvs = cvs.filter(cv => {
        return cv.experience.some(exp =>
          exp.industry && options.industries!.includes(exp.industry)
        );
      });
    }

    if (options.locations && options.locations.length > 0) {
      cvs = cvs.filter(cv => {
        return cv.personalInfo.location &&
          options.locations!.some(location =>
            cv.personalInfo.location!.toLowerCase().includes(location.toLowerCase())
          );
      });
    }

    if (options.languages && options.languages.length > 0) {
      cvs = cvs.filter(cv => {
        return cv.skills.languages.some(lang =>
          options.languages!.includes(lang.language)
        );
      });
    }

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      cvs,
      lastDoc,
      hasMore
    };
  } catch (error) {
    logger.error('Failed to search ProcessedCVs', { error, options });
    throw new Error(`Failed to search processed CVs: ${error}`);
  }
}

/**
 * Get CVs with high ATS scores
 */
export async function getHighATSScoreCVs(minScore: number = 80, limit: number = 50): Promise<ProcessedCV[]> {
  const result = await searchProcessedCVs({
    minATSScore: minScore,
    limit,
    orderByField: 'atsScore',
    orderDirection: 'desc'
  });

  return result.cvs;
}

/**
 * Get CVs by skills
 */
export async function getCVsBySkills(skills: string[], limit: number = 50): Promise<ProcessedCV[]> {
  const result = await searchProcessedCVs({
    skills,
    limit,
    orderByField: 'confidenceScore',
    orderDirection: 'desc'
  });

  return result.cvs;
}

// ============================================================================
// Analytics and Statistics
// ============================================================================

/**
 * Get CV analytics summary
 */
export async function getCVAnalyticsSummary(cvId: string): Promise<{
  atsScore: number;
  confidenceScore: number;
  experienceYears: number;
  educationScore: number;
  careerProgressionScore: number;
  totalSkills: number;
  keywordCount: number;
  suggestedImprovementsCount: number;
}> {
  const cv = await getProcessedCV(cvId);
  if (!cv) {
    throw new Error(`Processed CV not found: ${cvId}`);
  }

  const experienceYears = calculateYearsOfExperience(cv.experience);
  const educationScore = getEducationScore(cv.education);
  const careerProgressionScore = getCareerProgressionScore(cv.experience);
  const totalSkills = getAllSkills(cv).length;

  return {
    atsScore: cv.atsScore,
    confidenceScore: cv.confidenceScore,
    experienceYears,
    educationScore,
    careerProgressionScore,
    totalSkills,
    keywordCount: cv.extractedKeywords.length,
    suggestedImprovementsCount: cv.suggestedImprovements.length
  };
}

/**
 * Get system-wide CV statistics
 */
export async function getSystemCVStats(): Promise<{
  totalCVs: number;
  averageATSScore: number;
  averageConfidenceScore: number;
  topSkills: Array<{ skill: string; count: number }>;
  scoreDistribution: {
    atsScores: Record<string, number>;
    confidenceScores: Record<string, number>;
  };
}> {
  const db = getFirestore();
  const cvsRef = collection(db, COLLECTION_NAME);

  try {
    const snapshot = await getDocs(cvsRef);
    const cvs: ProcessedCV[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isProcessedCV(data)) {
        cvs.push(data as ProcessedCV);
      }
    });

    const totalCVs = cvs.length;

    if (totalCVs === 0) {
      return {
        totalCVs: 0,
        averageATSScore: 0,
        averageConfidenceScore: 0,
        topSkills: [],
        scoreDistribution: {
          atsScores: {},
          confidenceScores: {}
        }
      };
    }

    // Calculate averages
    const totalATSScore = cvs.reduce((sum, cv) => sum + cv.atsScore, 0);
    const totalConfidenceScore = cvs.reduce((sum, cv) => sum + cv.confidenceScore, 0);
    const averageATSScore = Math.round((totalATSScore / totalCVs) * 10) / 10;
    const averageConfidenceScore = Math.round((totalConfidenceScore / totalCVs) * 10) / 10;

    // Count skills
    const skillCounts = new Map<string, number>();
    cvs.forEach(cv => {
      const skills = getAllSkills(cv);
      skills.forEach(skill => {
        const normalizedSkill = skill.toLowerCase();
        skillCounts.set(normalizedSkill, (skillCounts.get(normalizedSkill) || 0) + 1);
      });
    });

    const topSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }));

    // Score distributions
    const atsScores: Record<string, number> = {};
    const confidenceScores: Record<string, number> = {};

    cvs.forEach(cv => {
      // ATS score ranges
      const atsRange = getScoreRange(cv.atsScore);
      atsScores[atsRange] = (atsScores[atsRange] || 0) + 1;

      // Confidence score ranges
      const confidenceRange = getScoreRange(cv.confidenceScore);
      confidenceScores[confidenceRange] = (confidenceScores[confidenceRange] || 0) + 1;
    });

    return {
      totalCVs,
      averageATSScore,
      averageConfidenceScore,
      topSkills,
      scoreDistribution: {
        atsScores,
        confidenceScores
      }
    };
  } catch (error) {
    logger.error('Failed to get system CV statistics', { error });
    throw new Error(`Failed to get system CV statistics: ${error}`);
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get score range label
 */
function getScoreRange(score: number): string {
  if (score >= 90) return '90-100';
  if (score >= 80) return '80-89';
  if (score >= 70) return '70-79';
  if (score >= 60) return '60-69';
  if (score >= 50) return '50-59';
  if (score >= 40) return '40-49';
  if (score >= 30) return '30-39';
  if (score >= 20) return '20-29';
  if (score >= 10) return '10-19';
  return '0-9';
}

/**
 * Clear all cached CVs (for testing/debugging)
 */
export function clearCVCache(): void {
  cache.clear();
  logger.debug('ProcessedCV cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
}

/**
 * Batch create ProcessedCVs
 */
export async function batchCreateProcessedCVs(
  cvsData: Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<ProcessedCV[]> {
  const db = getFirestore();
  const batch = db.batch();
  const cvs: ProcessedCV[] = [];

  const now = Timestamp.now();

  for (const cvData of cvsData) {
    const cvsRef = collection(db, COLLECTION_NAME);
    const newCVRef = doc(cvsRef);

    const cv: ProcessedCV = {
      ...cvData,
      id: newCVRef.id,
      createdAt: now,
      updatedAt: now
    };

    // Validate each CV
    const validationErrors = validateProcessedCV(cv);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed for CV ${cv.jobId}: ${validationErrors.join(', ')}`);
    }

    batch.set(newCVRef, cv);
    cvs.push(cv);

    // Cache the CV
    setCachedCV(cv);
  }

  try {
    await batch.commit();
    logger.info('Batch created ProcessedCVs', { count: cvs.length });
    return cvs;
  } catch (error) {
    logger.error('Failed to batch create ProcessedCVs', { error, count: cvsData.length });
    throw new Error(`Failed to batch create processed CVs: ${error}`);
  }
}