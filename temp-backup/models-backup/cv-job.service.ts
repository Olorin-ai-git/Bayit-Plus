/**
 * CVJob Firestore Service
 *
 * Firebase model service for managing CVJob entities with comprehensive
 * CRUD operations, status tracking, and processing workflow management.
 *
 * @fileoverview CVJob service for Firebase Functions with real-time updates and monitoring
 */

import {
  getFirestore,
  // collection,
  // doc,
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
  runTransaction,
  onSnapshot,
  Unsubscribe
} from 'firebase-admin/firestore';
import { CVJob, validateCVJob, isCVJob, JobStatus, ProcessingStage, FeatureType } from '../../../shared/types/cv-job';
import { logger } from 'firebase-functions/v2';

// ============================================================================
// Service Configuration
// ============================================================================

const COLLECTION_NAME = 'cvJobs';
const CACHE_TTL_SECONDS = 180; // 3 minutes (shorter than UserProfile for more real-time updates)
const BATCH_SIZE = 500;
const MAX_RETRY_ATTEMPTS = 3;

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: CVJob;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(id: string): string {
  return `cvJob:${id}`;
}

function getCachedJob(id: string): CVJob | null {
  const key = getCacheKey(id);
  const entry = cache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedJob(job: CVJob): void {
  const key = getCacheKey(job.id);
  const now = Date.now();

  cache.set(key, {
    data: job,
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
 * Create a new CVJob in Firestore
 */
export async function createCVJob(jobData: Omit<CVJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<CVJob> {
  const db = getFirestore();
  const jobsRef = collection(db, COLLECTION_NAME);
  const newJobRef = doc(jobsRef);

  const now = Timestamp.now();
  const job: CVJob = {
    ...jobData,
    id: newJobRef.id,
    createdAt: now,
    updatedAt: now
  };

  // Validate job data
  const validationErrors = validateCVJob(job);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('CVJob validation failed', { errors: validationErrors, jobId: job.id });
    throw new Error(errorMessage);
  }

  try {
    await setDoc(newJobRef, job);
    setCachedJob(job);

    logger.info('CVJob created successfully', {
      jobId: job.id,
      userId: job.userId,
      features: job.requestedFeatures,
      status: job.status
    });
    return job;
  } catch (error) {
    logger.error('Failed to create CVJob', { error, jobId: job.id });
    throw new Error(`Failed to create CV job: ${error}`);
  }
}

/**
 * Get CVJob by ID
 */
export async function getCVJob(id: string): Promise<CVJob | null> {
  // Check cache first
  const cached = getCachedJob(id);
  if (cached) {
    return cached;
  }

  const db = getFirestore();
  const jobRef = doc(db, COLLECTION_NAME, id);

  try {
    const docSnapshot = await getDoc(jobRef);

    if (!docSnapshot.exists()) {
      logger.debug('CVJob not found', { jobId: id });
      return null;
    }

    const data = docSnapshot.data();
    if (!isCVJob(data)) {
      logger.error('Invalid CVJob data structure', { jobId: id, data });
      throw new Error('Invalid CV job data structure');
    }

    const job = data as CVJob;
    setCachedJob(job);

    return job;
  } catch (error) {
    logger.error('Failed to get CVJob', { error, jobId: id });
    throw new Error(`Failed to retrieve CV job: ${error}`);
  }
}

/**
 * Update CVJob
 */
export async function updateCVJob(
  id: string,
  updates: Partial<Omit<CVJob, 'id' | 'createdAt'>>
): Promise<CVJob> {
  // Get existing job
  const existingJob = await getCVJob(id);
  if (!existingJob) {
    throw new Error(`CV job not found: ${id}`);
  }

  const updatedJob: CVJob = {
    ...existingJob,
    ...updates,
    updatedAt: Timestamp.now()
  };

  // Validate updated job
  const validationErrors = validateCVJob(updatedJob);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('CVJob update validation failed', { errors: validationErrors, jobId: id });
    throw new Error(errorMessage);
  }

  const db = getFirestore();
  const jobRef = doc(db, COLLECTION_NAME, id);

  try {
    await updateDoc(jobRef, updates as any);

    // Update cache
    setCachedJob(updatedJob);

    logger.info('CVJob updated successfully', {
      jobId: id,
      updatedFields: Object.keys(updates),
      status: updatedJob.status
    });
    return updatedJob;
  } catch (error) {
    logger.error('Failed to update CVJob', { error, jobId: id });
    throw new Error(`Failed to update CV job: ${error}`);
  }
}

/**
 * Delete CVJob
 */
export async function deleteCVJob(id: string): Promise<boolean> {
  const db = getFirestore();
  const jobRef = doc(db, COLLECTION_NAME, id);

  try {
    await deleteDoc(jobRef);

    // Remove from cache
    invalidateCache(id);

    logger.info('CVJob deleted', { jobId: id });
    return true;
  } catch (error) {
    logger.error('Failed to delete CVJob', { error, jobId: id });
    throw new Error(`Failed to delete CV job: ${error}`);
  }
}

// ============================================================================
// Status Management
// ============================================================================

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  statusMessage?: string,
  currentStage?: ProcessingStage
): Promise<CVJob> {
  const updates: Partial<CVJob> = {
    status,
    statusMessage,
    updatedAt: Timestamp.now()
  };

  if (currentStage) {
    updates.currentStage = currentStage;
  }

  // Update progress based on status
  switch (status) {
    case JobStatus.QUEUED:
      updates.progressPercentage = 0;
      break;
    case JobStatus.PROCESSING:
      updates.progressPercentage = updates.progressPercentage || 25;
      break;
    case JobStatus.COMPLETED:
      updates.progressPercentage = 100;
      updates.completedAt = Timestamp.now();
      break;
    case JobStatus.FAILED:
      updates.failedAt = Timestamp.now();
      break;
  }

  return updateCVJob(jobId, updates);
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progressPercentage: number,
  currentStage?: ProcessingStage,
  stageMessage?: string
): Promise<CVJob> {
  const updates: Partial<CVJob> = {
    progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
    updatedAt: Timestamp.now()
  };

  if (currentStage) {
    updates.currentStage = currentStage;
  }

  if (stageMessage) {
    updates.statusMessage = stageMessage;
  }

  return updateCVJob(jobId, updates);
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string, completionData?: Partial<CVJob>): Promise<CVJob> {
  const updates: Partial<CVJob> = {
    status: JobStatus.COMPLETED,
    progressPercentage: 100,
    completedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...completionData
  };

  return updateCVJob(jobId, updates);
}

/**
 * Mark job as failed
 */
export async function failJob(jobId: string, error: string, retryable: boolean = false): Promise<CVJob> {
  const existingJob = await getCVJob(jobId);
  if (!existingJob) {
    throw new Error(`CV job not found: ${jobId}`);
  }

  const retryCount = existingJob.retryCount || 0;
  const shouldRetry = retryable && retryCount < MAX_RETRY_ATTEMPTS;

  const updates: Partial<CVJob> = {
    status: shouldRetry ? JobStatus.QUEUED : JobStatus.FAILED,
    statusMessage: error,
    retryCount: retryCount + 1,
    updatedAt: Timestamp.now()
  };

  if (!shouldRetry) {
    updates.failedAt = Timestamp.now();
  }

  logger.warn('CVJob marked as failed', {
    jobId,
    error,
    retryCount: retryCount + 1,
    willRetry: shouldRetry
  });

  return updateCVJob(jobId, updates);
}

// ============================================================================
// Query Operations
// ============================================================================

export interface CVJobQueryOptions {
  userId?: string;
  status?: JobStatus;
  featureType?: FeatureType;
  startAfterDoc?: DocumentSnapshot;
  limit?: number;
  orderByField?: 'createdAt' | 'updatedAt' | 'completedAt';
  orderDirection?: 'asc' | 'desc';
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
}

/**
 * Query CVJobs with pagination
 */
export async function queryCVJobs(options: CVJobQueryOptions = {}): Promise<{
  jobs: CVJob[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const db = getFirestore();
  const jobsRef = collection(db, COLLECTION_NAME);

  let q = query(jobsRef);

  // Apply filters
  if (options.userId) {
    q = query(q, where('userId', '==', options.userId));
  }

  if (options.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options.featureType) {
    q = query(q, where('requestedFeatures', 'array-contains', options.featureType));
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

    const jobs: CVJob[] = [];
    for (const doc of docs) {
      const data = doc.data();
      if (isCVJob(data)) {
        jobs.push(data as CVJob);
      } else {
        logger.warn('Invalid CVJob data in query result', { docId: doc.id });
      }
    }

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      jobs,
      lastDoc,
      hasMore
    };
  } catch (error) {
    logger.error('Failed to query CVJobs', { error, options });
    throw new Error(`Failed to query CV jobs: ${error}`);
  }
}

/**
 * Get jobs by user ID
 */
export async function getJobsByUserId(userId: string, limit: number = 50): Promise<CVJob[]> {
  const result = await queryCVJobs({
    userId,
    limit,
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });

  return result.jobs;
}

/**
 * Get active jobs (processing or queued)
 */
export async function getActiveJobs(limit: number = 100): Promise<CVJob[]> {
  const db = getFirestore();
  const jobsRef = collection(db, COLLECTION_NAME);
  const q = query(
    jobsRef,
    where('status', 'in', [JobStatus.QUEUED, JobStatus.PROCESSING]),
    orderBy('createdAt', 'asc'),
    firestoreLimit(limit)
  );

  try {
    const snapshot = await getDocs(q);
    const jobs: CVJob[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isCVJob(data)) {
        jobs.push(data as CVJob);
      }
    });

    return jobs;
  } catch (error) {
    logger.error('Failed to get active jobs', { error });
    throw new Error(`Failed to get active jobs: ${error}`);
  }
}

/**
 * Get stuck jobs (processing for too long)
 */
export async function getStuckJobs(timeoutMinutes: number = 60): Promise<CVJob[]> {
  const cutoffTime = Timestamp.fromMillis(Date.now() - (timeoutMinutes * 60 * 1000));
  const db = getFirestore();
  const jobsRef = collection(db, COLLECTION_NAME);
  const q = query(
    jobsRef,
    where('status', '==', JobStatus.PROCESSING),
    where('updatedAt', '<=', cutoffTime)
  );

  try {
    const snapshot = await getDocs(q);
    const jobs: CVJob[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isCVJob(data)) {
        jobs.push(data as CVJob);
      }
    });

    logger.warn('Found stuck jobs', { count: jobs.length, timeoutMinutes });
    return jobs;
  } catch (error) {
    logger.error('Failed to get stuck jobs', { error });
    throw new Error(`Failed to get stuck jobs: ${error}`);
  }
}

// ============================================================================
// Real-time Monitoring
// ============================================================================

/**
 * Subscribe to job status changes
 */
export function subscribeToJobUpdates(
  jobId: string,
  callback: (job: CVJob | null) => void
): Unsubscribe {
  const db = getFirestore();
  const jobRef = doc(db, COLLECTION_NAME, jobId);

  return onSnapshot(jobRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      if (isCVJob(data)) {
        const job = data as CVJob;
        setCachedJob(job); // Update cache
        callback(job);
      } else {
        logger.warn('Invalid CVJob data in snapshot', { jobId });
        callback(null);
      }
    } else {
      callback(null);
    }
  }, (error) => {
    logger.error('Job subscription error', { error, jobId });
  });
}

/**
 * Subscribe to user's jobs
 */
export function subscribeToUserJobs(
  userId: string,
  callback: (jobs: CVJob[]) => void,
  limit: number = 10
): Unsubscribe {
  const db = getFirestore();
  const jobsRef = collection(db, COLLECTION_NAME);
  const q = query(
    jobsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit)
  );

  return onSnapshot(q, (querySnapshot) => {
    const jobs: CVJob[] = [];
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isCVJob(data)) {
        jobs.push(data as CVJob);
      }
    });
    callback(jobs);
  }, (error) => {
    logger.error('User jobs subscription error', { error, userId });
  });
}

// ============================================================================
// Analytics and Statistics
// ============================================================================

/**
 * Get job statistics for a user
 */
export async function getUserJobStats(userId: string): Promise<{
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  averageProcessingTime: number;
}> {
  const jobs = await getJobsByUserId(userId, 1000); // Get more for better statistics

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(job => job.status === JobStatus.COMPLETED).length;
  const failedJobs = jobs.filter(job => job.status === JobStatus.FAILED).length;
  const activeJobs = jobs.filter(job =>
    job.status === JobStatus.PROCESSING || job.status === JobStatus.QUEUED
  ).length;

  // Calculate average processing time for completed jobs
  const completedWithTimes = jobs.filter(job =>
    job.status === JobStatus.COMPLETED && job.completedAt
  );

  let averageProcessingTime = 0;
  if (completedWithTimes.length > 0) {
    const totalProcessingTime = completedWithTimes.reduce((sum, job) => {
      const processingTime = job.completedAt!.toMillis() - job.createdAt.toMillis();
      return sum + processingTime;
    }, 0);
    averageProcessingTime = Math.round(totalProcessingTime / completedWithTimes.length / 1000); // Convert to seconds
  }

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    activeJobs,
    averageProcessingTime
  };
}

/**
 * Get system-wide job statistics
 */
export async function getSystemJobStats(): Promise<{
  totalJobs: number;
  jobsByStatus: Record<JobStatus, number>;
  jobsByFeature: Record<FeatureType, number>;
  averageProcessingTime: number;
  successRate: number;
}> {
  const db = getFirestore();
  const jobsRef = collection(db, COLLECTION_NAME);

  // Get recent jobs for statistics (last 30 days)
  const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - (30 * 24 * 60 * 60 * 1000));
  const q = query(jobsRef, where('createdAt', '>=', thirtyDaysAgo));

  try {
    const snapshot = await getDocs(q);
    const jobs: CVJob[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isCVJob(data)) {
        jobs.push(data as CVJob);
      }
    });

    const totalJobs = jobs.length;

    // Jobs by status
    const jobsByStatus: Record<JobStatus, number> = {
      [JobStatus.QUEUED]: 0,
      [JobStatus.PROCESSING]: 0,
      [JobStatus.COMPLETED]: 0,
      [JobStatus.FAILED]: 0
    };

    // Jobs by feature
    const jobsByFeature: Record<FeatureType, number> = {} as Record<FeatureType, number>;
    Object.values(FeatureType).forEach(feature => {
      jobsByFeature[feature] = 0;
    });

    let totalProcessingTime = 0;
    let completedJobsCount = 0;

    jobs.forEach(job => {
      // Count by status
      jobsByStatus[job.status]++;

      // Count by features
      job.requestedFeatures.forEach(feature => {
        jobsByFeature[feature]++;
      });

      // Calculate processing time for completed jobs
      if (job.status === JobStatus.COMPLETED && job.completedAt) {
        const processingTime = job.completedAt.toMillis() - job.createdAt.toMillis();
        totalProcessingTime += processingTime;
        completedJobsCount++;
      }
    });

    const averageProcessingTime = completedJobsCount > 0
      ? Math.round(totalProcessingTime / completedJobsCount / 1000) // Convert to seconds
      : 0;

    const successRate = totalJobs > 0
      ? Math.round((jobsByStatus[JobStatus.COMPLETED] / totalJobs) * 100 * 10) / 10
      : 0;

    return {
      totalJobs,
      jobsByStatus,
      jobsByFeature,
      averageProcessingTime,
      successRate
    };
  } catch (error) {
    logger.error('Failed to get system job statistics', { error });
    throw new Error(`Failed to get system job statistics: ${error}`);
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch update job statuses
 */
export async function batchUpdateJobStatuses(
  updates: Array<{ jobId: string; status: JobStatus; statusMessage?: string }>
): Promise<void> {
  const db = getFirestore();
  const batch = db.batch();

  const now = Timestamp.now();

  for (const update of updates) {
    const jobRef = doc(db, COLLECTION_NAME, update.jobId);
    const updateData: Partial<CVJob> = {
      status: update.status,
      statusMessage: update.statusMessage,
      updatedAt: now
    };

    if (update.status === JobStatus.COMPLETED) {
      updateData.completedAt = now;
      updateData.progressPercentage = 100;
    } else if (update.status === JobStatus.FAILED) {
      updateData.failedAt = now;
    }

    batch.update(jobRef, updateData as any);

    // Invalidate cache for updated jobs
    invalidateCache(update.jobId);
  }

  try {
    await batch.commit();
    logger.info('Batch updated job statuses', { count: updates.length });
  } catch (error) {
    logger.error('Failed to batch update job statuses', { error, count: updates.length });
    throw new Error(`Failed to batch update job statuses: ${error}`);
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Clear all cached jobs (for testing/debugging)
 */
export function clearJobCache(): void {
  cache.clear();
  logger.debug('CVJob cache cleared');
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
 * Clean up old completed jobs (for maintenance)
 */
export async function cleanupOldJobs(olderThanDays: number = 90): Promise<number> {
  const cutoffDate = Timestamp.fromMillis(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
  const db = getFirestore();
  const jobsRef = collection(db, COLLECTION_NAME);
  const q = query(
    jobsRef,
    where('status', 'in', [JobStatus.COMPLETED, JobStatus.FAILED]),
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
      logger.info('Cleaned up old jobs', { count: snapshot.docs.length, olderThanDays });
    }

    return snapshot.docs.length;
  } catch (error) {
    logger.error('Failed to cleanup old jobs', { error, olderThanDays });
    throw new Error(`Failed to cleanup old jobs: ${error}`);
  }
}