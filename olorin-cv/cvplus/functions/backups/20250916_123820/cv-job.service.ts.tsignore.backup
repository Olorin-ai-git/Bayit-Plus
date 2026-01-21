// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Job Model Service
 * Handles CV job operations for the CV Processing submodule
 */

import * as admin from 'firebase-admin';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PARSED = 'parsed',
  ANALYZED = 'analyzed',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface CVJob {
  id: string;
  userId: string;
  status: JobStatus;
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  parsedData?: any;
  generatedCV?: {
    html: string;
    htmlUrl?: string;
    pdfUrl?: string;
    docxUrl?: string;
    features?: string[];
  };
  selectedTemplate?: string;
  selectedFeatures?: string[];
  error?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  quickCreate?: boolean;
  userInstructions?: string;
  processedCVId?: string;
  piiDetection?: {
    hasPII: boolean;
    detectedTypes: string[];
    recommendations: string[];
  };
}

/**
 * Get CV job by ID
 */
export async function getCVJob(jobId: string): Promise<CVJob | null> {
  try {
    const db = admin.firestore();
    const jobDoc = await db.collection('cvJobs').doc(jobId).get();

    if (!jobDoc.exists) {
      return null;
    }

    const data = jobDoc.data();
    if (!data) {
      return null;
    }

    return {
      id: jobDoc.id,
      ...data
    } as CVJob;
  } catch (error) {
    console.error('Error getting CV job:', error);
    throw error;
  }
}

/**
 * Create new CV job
 */
export async function createCVJob(jobData: Omit<CVJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const docRef = await db.collection('cvJobs').add({
      ...jobData,
      createdAt: now,
      updatedAt: now
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating CV job:', error);
    throw error;
  }
}

/**
 * Update CV job status
 */
export async function updateCVJobStatus(jobId: string, status: JobStatus, error?: string): Promise<void> {
  try {
    const db = admin.firestore();
    const updateData: Partial<CVJob> = {
      status,
      updatedAt: admin.firestore.Timestamp.now()
    };

    if (error) {
      updateData.error = error;
    }

    await db.collection('cvJobs').doc(jobId).update(updateData);
  } catch (error) {
    console.error('Error updating CV job status:', error);
    throw error;
  }
}

/**
 * Update CV job with processed CV ID
 */
export async function updateCVJobWithProcessedCV(jobId: string, processedCVId: string): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection('cvJobs').doc(jobId).update({
      processedCVId,
      updatedAt: admin.firestore.Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating CV job with processed CV:', error);
    throw error;
  }
}

/**
 * Get CV jobs by user ID
 */
export async function getCVJobsByUserId(userId: string, limit = 50): Promise<CVJob[]> {
  try {
    const db = admin.firestore();
    const query = await db.collection('cvJobs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return query.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CVJob));
  } catch (error) {
    console.error('Error getting CV jobs by user:', error);
    throw error;
  }
}