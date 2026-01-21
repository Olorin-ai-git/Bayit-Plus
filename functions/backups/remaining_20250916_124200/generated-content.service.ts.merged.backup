// @ts-ignore - Export conflicts/**
 * GeneratedContent Firestore Service
 *
 * Firebase model service for managing GeneratedContent entities with comprehensive
 * CRUD operations, multimedia content management, and generation tracking.
 *
 * @fileoverview GeneratedContent service for Firebase Functions with file management and analytics
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
  GeneratedContent,
  validateGeneratedContent,
  isGeneratedContent,
  ContentType,
  GenerationStatus,
  GenerationService,
  GenerationErrorDetails,
  ErrorCategory,
  getMimeType,
  requiresDuration,
  supportsPreview,
  isTerminalGenerationStatus,
  calculateTotalCost,
  getAverageQualityScore,
  getContentByType,
  isContentExpired,
  getExpiredContent,
  estimateGenerationTime,
  getServiceForContentType,
  formatFileSize,
  formatDuration
} from '../../../shared/types/generated-content';
import { logger } from 'firebase-functions/v2';

// ============================================================================
// Service Configuration
// ============================================================================

const COLLECTION_NAME = 'generatedContent';
const CACHE_TTL_SECONDS = 300; // 5 minutes
const BATCH_SIZE = 500;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_EXPIRATION_DAYS = 30;

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: GeneratedContent;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(id: string): string {
  return `generatedContent:${id}`;
}

function getCachedContent(id: string): GeneratedContent | null {
  const key = getCacheKey(id);
  const entry = cache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedContent(content: GeneratedContent): void {
  const key = getCacheKey(content.id);
  const now = Date.now();

  cache.set(key, {
    data: content,
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
 * Create a new GeneratedContent in Firestore
 */
export async function createGeneratedContent(
  contentData: Omit<GeneratedContent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GeneratedContent> {
  const db = getFirestore();
  const contentsRef = collection(db, COLLECTION_NAME);
  const newContentRef = doc(contentsRef);

  const now = Timestamp.now();

  // Set default expiration if not provided and not permanent
  let expiresAt = contentData.expiresAt;
  if (!contentData.isPermanent && !expiresAt) {
    expiresAt = Timestamp.fromMillis(now.toMillis() + (DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000));
  }

  const content: GeneratedContent = {
    ...contentData,
    id: newContentRef.id,
    mimeType: contentData.mimeType || getMimeType(contentData.contentType),
    expiresAt,
    createdAt: now,
    updatedAt: now
  };

  // Validate content data
  const validationErrors = validateGeneratedContent(content);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('GeneratedContent validation failed', { errors: validationErrors, contentId: content.id });
    throw new Error(errorMessage);
  }

  // Validate file size
  if (content.fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size ${formatFileSize(content.fileSize)} exceeds maximum allowed size ${formatFileSize(MAX_FILE_SIZE)}`);
  }

  try {
    await setDoc(newContentRef, content);
    setCachedContent(content);

    logger.info('GeneratedContent created successfully', {
      contentId: content.id,
      jobId: content.jobId,
      contentType: content.contentType,
      fileSize: formatFileSize(content.fileSize),
      status: content.status
    });
    return content;
  } catch (error) {
    logger.error('Failed to create GeneratedContent', { error, contentId: content.id });
    throw new Error(`Failed to create generated content: ${error}`);
  }
}

/**
 * Get GeneratedContent by ID
 */
export async function getGeneratedContent(id: string): Promise<GeneratedContent | null> {
  // Check cache first
  const cached = getCachedContent(id);
  if (cached) {
    return cached;
  }

  const db = getFirestore();
  const contentRef = doc(db, COLLECTION_NAME, id);

  try {
    const docSnapshot = await getDoc(contentRef);

    if (!docSnapshot.exists()) {
      logger.debug('GeneratedContent not found', { contentId: id });
      return null;
    }

    const data = docSnapshot.data();
    if (!isGeneratedContent(data)) {
      logger.error('Invalid GeneratedContent data structure', { contentId: id, data });
      throw new Error('Invalid generated content data structure');
    }

    const content = data as GeneratedContent;
    setCachedContent(content);

    return content;
  } catch (error) {
    logger.error('Failed to get GeneratedContent', { error, contentId: id });
    throw new Error(`Failed to retrieve generated content: ${error}`);
  }
}

/**
 * Update GeneratedContent
 */
export async function updateGeneratedContent(
  id: string,
  updates: Partial<Omit<GeneratedContent, 'id' | 'createdAt'>>
): Promise<GeneratedContent> {
  // Get existing content
  const existingContent = await getGeneratedContent(id);
  if (!existingContent) {
    throw new Error(`Generated content not found: ${id}`);
  }

  const updatedContent: GeneratedContent = {
    ...existingContent,
    ...updates,
    updatedAt: Timestamp.now()
  };

  // Validate updated content
  const validationErrors = validateGeneratedContent(updatedContent);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('GeneratedContent update validation failed', { errors: validationErrors, contentId: id });
    throw new Error(errorMessage);
  }

  const db = getFirestore();
  const contentRef = doc(db, COLLECTION_NAME, id);

  try {
    await updateDoc(contentRef, updates as any);

    // Update cache
    setCachedContent(updatedContent);

    logger.info('GeneratedContent updated successfully', {
      contentId: id,
      updatedFields: Object.keys(updates)
    });
    return updatedContent;
  } catch (error) {
    logger.error('Failed to update GeneratedContent', { error, contentId: id });
    throw new Error(`Failed to update generated content: ${error}`);
  }
}

/**
 * Delete GeneratedContent
 */
export async function deleteGeneratedContent(id: string): Promise<boolean> {
  const db = getFirestore();
  const contentRef = doc(db, COLLECTION_NAME, id);

  try {
    await deleteDoc(contentRef);

    // Remove from cache
    invalidateCache(id);

    logger.info('GeneratedContent deleted', { contentId: id });
    return true;
  } catch (error) {
    logger.error('Failed to delete GeneratedContent', { error, contentId: id });
    throw new Error(`Failed to delete generated content: ${error}`);
  }
}

// ============================================================================
// Generation Status Management
// ============================================================================

/**
 * Update generation status
 */
export async function updateGenerationStatus(
  contentId: string,
  status: GenerationStatus,
  errorMessage?: string,
  errorDetails?: GenerationErrorDetails
): Promise<GeneratedContent> {
  const updates: Partial<GeneratedContent> = {
    status,
    errorMessage,
    errorDetails,
    updatedAt: Timestamp.now()
  };

  return updateGeneratedContent(contentId, updates);
}

/**
 * Mark content as completed
 */
export async function completeGeneration(
  contentId: string,
  fileUrl: string,
  fileSize: number,
  duration?: number,
  qualityScore?: number
): Promise<GeneratedContent> {
  const updates: Partial<GeneratedContent> = {
    status: GenerationStatus.COMPLETED,
    fileUrl,
    fileSize,
    duration,
    qualityScore,
    updatedAt: Timestamp.now()
  };

  return updateGeneratedContent(contentId, updates);
}

/**
 * Mark content as failed
 */
export async function failGeneration(
  contentId: string,
  errorMessage: string,
  errorCategory: ErrorCategory,
  isRetryable: boolean = false,
  serviceErrorCode?: string,
  serviceResponse?: string
): Promise<GeneratedContent> {
  const existingContent = await getGeneratedContent(contentId);
  const retryCount = existingContent?.errorDetails?.retryCount || 0;

  const errorDetails: GenerationErrorDetails = {
    category: errorCategory,
    serviceErrorCode,
    serviceResponse,
    retryCount: retryCount + 1,
    isRetryable,
    userAction: getErrorUserAction(errorCategory)
  };

  const updates: Partial<GeneratedContent> = {
    status: GenerationStatus.FAILED,
    errorMessage,
    errorDetails,
    updatedAt: Timestamp.now()
  };

  logger.warn('GeneratedContent generation failed', {
    contentId,
    errorMessage,
    errorCategory,
    retryCount: retryCount + 1,
    isRetryable
  });

  return updateGeneratedContent(contentId, updates);
}

/**
 * Update generation progress
 */
export async function updateGenerationProgress(
  contentId: string,
  processingTimeMs: number
): Promise<GeneratedContent> {
  const updates: Partial<GeneratedContent> = {
    status: GenerationStatus.GENERATING,
    processingTimeMs,
    updatedAt: Timestamp.now()
  };

  return updateGeneratedContent(contentId, updates);
}

// ============================================================================
// Query Operations
// ============================================================================

export interface GeneratedContentQueryOptions {
  jobId?: string;
  contentType?: ContentType;
  status?: GenerationStatus;
  generatedWith?: string;
  isPermanent?: boolean;
  includeExpired?: boolean;
  startAfterDoc?: DocumentSnapshot;
  limit?: number;
  orderByField?: 'createdAt' | 'updatedAt' | 'fileSize' | 'generationCost';
  orderDirection?: 'asc' | 'desc';
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
}

/**
 * Query GeneratedContent with pagination
 */
export async function queryGeneratedContent(options: GeneratedContentQueryOptions = {}): Promise<{
  contents: GeneratedContent[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const db = getFirestore();
  const contentsRef = collection(db, COLLECTION_NAME);

  let q = query(contentsRef);

  // Apply filters
  if (options.jobId) {
    q = query(q, where('jobId', '==', options.jobId));
  }

  if (options.contentType) {
    q = query(q, where('contentType', '==', options.contentType));
  }

  if (options.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options.generatedWith) {
    q = query(q, where('generatedWith', '==', options.generatedWith));
  }

  if (options.isPermanent !== undefined) {
    q = query(q, where('isPermanent', '==', options.isPermanent));
  }

  // Apply date filters
  if (options.dateFrom) {
    q = query(q, where('createdAt', '>=', options.dateFrom));
  }

  if (options.dateTo) {
    q = query(q, where('createdAt', '<=', options.dateTo));
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

    let contents: GeneratedContent[] = [];
    for (const doc of docs) {
      const data = doc.data();
      if (isGeneratedContent(data)) {
        const content = data as GeneratedContent;

        // Filter out expired content unless explicitly requested
        if (!options.includeExpired && isContentExpired(content)) {
          continue;
        }

        contents.push(content);
      } else {
        logger.warn('Invalid GeneratedContent data in query result', { docId: doc.id });
      }
    }

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      contents,
      lastDoc,
      hasMore
    };
  } catch (error) {
    logger.error('Failed to query GeneratedContent', { error, options });
    throw new Error(`Failed to query generated content: ${error}`);
  }
}

/**
 * Get content by job ID
 */
export async function getContentByJobId(jobId: string): Promise<GeneratedContent[]> {
  const result = await queryGeneratedContent({
    jobId,
    limit: 100,
    orderByField: 'createdAt',
    orderDirection: 'asc'
  });

  return result.contents;
}

/**
 * Get content by type and status
 */
export async function getContentByTypeAndStatus(
  contentType: ContentType,
  status: GenerationStatus,
  limit: number = 50
): Promise<GeneratedContent[]> {
  const result = await queryGeneratedContent({
    contentType,
    status,
    limit,
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });

  return result.contents;
}

/**
 * Get pending generations
 */
export async function getPendingGenerations(limit: number = 100): Promise<GeneratedContent[]> {
  const result = await queryGeneratedContent({
    status: GenerationStatus.PENDING,
    limit,
    orderByField: 'createdAt',
    orderDirection: 'asc'
  });

  return result.contents;
}

/**
 * Get failed generations that are retryable
 */
export async function getRetryableFailedGenerations(limit: number = 50): Promise<GeneratedContent[]> {
  const db = getFirestore();
  const contentsRef = collection(db, COLLECTION_NAME);
  const q = query(
    contentsRef,
    where('status', '==', GenerationStatus.FAILED),
    orderBy('updatedAt', 'asc'),
    firestoreLimit(limit)
  );

  try {
    const snapshot = await getDocs(q);
    const contents: GeneratedContent[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isGeneratedContent(data)) {
        const content = data as GeneratedContent;
        if (content.errorDetails?.isRetryable) {
          contents.push(content);
        }
      }
    });

    return contents;
  } catch (error) {
    logger.error('Failed to get retryable failed generations', { error });
    throw new Error(`Failed to get retryable failed generations: ${error}`);
  }
}

// ============================================================================
// Analytics and Statistics
// ============================================================================

/**
 * Get generation statistics by job
 */
export async function getJobGenerationStats(jobId: string): Promise<{
  totalContent: number;
  completedContent: number;
  failedContent: number;
  pendingContent: number;
  totalCost: number;
  averageQualityScore: number;
  contentByType: Record<ContentType, number>;
  totalFileSize: number;
}> {
  const contents = await getContentByJobId(jobId);

  const totalContent = contents.length;
  const completedContent = contents.filter(c => c.status === GenerationStatus.COMPLETED).length;
  const failedContent = contents.filter(c => c.status === GenerationStatus.FAILED).length;
  const pendingContent = contents.filter(c =>
    c.status === GenerationStatus.PENDING || c.status === GenerationStatus.GENERATING
  ).length;

  const totalCost = calculateTotalCost(contents);
  const averageQualityScore = getAverageQualityScore(contents);
  const totalFileSize = contents.reduce((sum, content) => sum + content.fileSize, 0);

  const contentByType: Record<ContentType, number> = {} as Record<ContentType, number>;
  Object.values(ContentType).forEach(type => {
    contentByType[type] = getContentByType(contents, type).length;
  });

  return {
    totalContent,
    completedContent,
    failedContent,
    pendingContent,
    totalCost,
    averageQualityScore,
    contentByType,
    totalFileSize
  };
}

/**
 * Get system-wide generation statistics
 */
export async function getSystemGenerationStats(): Promise<{
  totalGenerated: number;
  generationsByStatus: Record<GenerationStatus, number>;
  generationsByType: Record<ContentType, number>;
  generationsByService: Record<GenerationService, number>;
  averageProcessingTime: number;
  totalStorageUsed: number;
  successRate: number;
}> {
  const db = getFirestore();
  const contentsRef = collection(db, COLLECTION_NAME);

  // Get recent content for statistics (last 30 days)
  const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - (30 * 24 * 60 * 60 * 1000));
  const q = query(contentsRef, where('createdAt', '>=', thirtyDaysAgo));

  try {
    const snapshot = await getDocs(q);
    const contents: GeneratedContent[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isGeneratedContent(data)) {
        contents.push(data as GeneratedContent);
      }
    });

    const totalGenerated = contents.length;

    // Generations by status
    const generationsByStatus: Record<GenerationStatus, number> = {
      [GenerationStatus.PENDING]: 0,
      [GenerationStatus.GENERATING]: 0,
      [GenerationStatus.COMPLETED]: 0,
      [GenerationStatus.FAILED]: 0,
      [GenerationStatus.CANCELLED]: 0,
      [GenerationStatus.EXPIRED]: 0
    };

    // Generations by type
    const generationsByType: Record<ContentType, number> = {} as Record<ContentType, number>;
    Object.values(ContentType).forEach(type => {
      generationsByType[type] = 0;
    });

    // Generations by service
    const generationsByService: Record<GenerationService, number> = {
      [GenerationService.ELEVENLABS]: 0,
      [GenerationService.DID]: 0,
      [GenerationService.OPENAI]: 0,
      [GenerationService.ANTHROPIC]: 0,
      [GenerationService.INTERNAL]: 0,
      [GenerationService.CANVA]: 0,
      [GenerationService.FIGMA]: 0
    };

    let totalProcessingTime = 0;
    let completedWithProcessingTime = 0;
    let totalStorageUsed = 0;

    contents.forEach(content => {
      // Count by status
      generationsByStatus[content.status]++;

      // Count by type
      generationsByType[content.contentType]++;

      // Count by service
      const service = getServiceForContentType(content.contentType);
      generationsByService[service]++;

      // Storage usage
      totalStorageUsed += content.fileSize;

      // Processing time for completed content
      if (content.status === GenerationStatus.COMPLETED && content.processingTimeMs) {
        totalProcessingTime += content.processingTimeMs;
        completedWithProcessingTime++;
      }
    });

    const averageProcessingTime = completedWithProcessingTime > 0
      ? Math.round(totalProcessingTime / completedWithProcessingTime / 1000) // Convert to seconds
      : 0;

    const successRate = totalGenerated > 0
      ? Math.round((generationsByStatus[GenerationStatus.COMPLETED] / totalGenerated) * 100 * 10) / 10
      : 0;

    return {
      totalGenerated,
      generationsByStatus,
      generationsByType,
      generationsByService,
      averageProcessingTime,
      totalStorageUsed,
      successRate
    };
  } catch (error) {
    logger.error('Failed to get system generation statistics', { error });
    throw new Error(`Failed to get system generation statistics: ${error}`);
  }
}

// ============================================================================
// Cleanup Operations
// ============================================================================

/**
 * Clean up expired content
 */
export async function cleanupExpiredContent(): Promise<number> {
  const result = await queryGeneratedContent({
    isPermanent: false,
    includeExpired: true,
    limit: BATCH_SIZE
  });

  const expiredContents = getExpiredContent(result.contents);

  if (expiredContents.length === 0) {
    return 0;
  }

  const db = getFirestore();
  const batch = db.batch();

  expiredContents.forEach(content => {
    const contentRef = doc(db, COLLECTION_NAME, content.id);
    batch.update(contentRef, {
      status: GenerationStatus.EXPIRED,
      updatedAt: Timestamp.now()
    });
    invalidateCache(content.id);
  });

  try {
    await batch.commit();
    logger.info('Marked expired content', { count: expiredContents.length });
    return expiredContents.length;
  } catch (error) {
    logger.error('Failed to cleanup expired content', { error });
    throw new Error(`Failed to cleanup expired content: ${error}`);
  }
}

/**
 * Delete old failed generations
 */
export async function deleteOldFailedGenerations(olderThanDays: number = 7): Promise<number> {
  const cutoffDate = Timestamp.fromMillis(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
  const db = getFirestore();
  const contentsRef = collection(db, COLLECTION_NAME);
  const q = query(
    contentsRef,
    where('status', '==', GenerationStatus.FAILED),
    where('updatedAt', '<=', cutoffDate),
    firestoreLimit(BATCH_SIZE)
  );

  try {
    const snapshot = await getDocs(q);
    const batch = db.batch();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      invalidateCache(doc.id);
    });

    if (snapshot.docs.length > 0) {
      await batch.commit();
      logger.info('Deleted old failed generations', { count: snapshot.docs.length, olderThanDays });
    }

    return snapshot.docs.length;
  } catch (error) {
    logger.error('Failed to delete old failed generations', { error, olderThanDays });
    throw new Error(`Failed to delete old failed generations: ${error}`);
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get error user action based on category
 */
function getErrorUserAction(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.QUOTA_EXCEEDED:
      return 'Please try again later when quota resets';
    case ErrorCategory.INVALID_INPUT:
      return 'Please check your input and try again';
    case ErrorCategory.SERVICE_UNAVAILABLE:
      return 'Service temporarily unavailable, please try again later';
    case ErrorCategory.TIMEOUT:
      return 'Generation timed out, please try again';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication error, please contact support';
    case ErrorCategory.FILE_TOO_LARGE:
      return 'Please reduce file size and try again';
    case ErrorCategory.UNSUPPORTED_FORMAT:
      return 'Please use a supported file format';
    case ErrorCategory.INSUFFICIENT_CREDITS:
      return 'Please purchase more credits to continue';
    case ErrorCategory.INTERNAL_ERROR:
    default:
      return 'Internal error occurred, please contact support';
  }
}

/**
 * Clear all cached content (for testing/debugging)
 */
export function clearContentCache(): void {
  cache.clear();
  logger.debug('GeneratedContent cache cleared');
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
 * Estimate content generation cost
 */
export function estimateGenerationCost(
  contentType: ContentType,
  parameters?: Record<string, any>
): number {
  // This would typically query external service pricing APIs
  // For now, return basic estimates
  const baseCosts: Record<ContentType, number> = {
    [ContentType.PODCAST_AUDIO]: 0.30,
    [ContentType.VIDEO_INTRO]: 0.20,
    [ContentType.TIMELINE_SVG]: 0.05,
    [ContentType.PORTFOLIO_PDF]: 0.10,
    [ContentType.QR_CODE_PNG]: 0.01,
    [ContentType.ENHANCED_CV_PDF]: 0.15,
    [ContentType.ENHANCED_CV_DOCX]: 0.12,
    [ContentType.ENHANCED_CV_HTML]: 0.08,
    [ContentType.HEADSHOT_IMAGE]: 0.25,
    [ContentType.SKILLS_CHART]: 0.05,
    [ContentType.CAREER_INFOGRAPHIC]: 0.10
  };

  return baseCosts[contentType] || 0.10;
}