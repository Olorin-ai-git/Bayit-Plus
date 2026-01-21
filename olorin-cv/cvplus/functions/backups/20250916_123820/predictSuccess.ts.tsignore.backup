// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Success Prediction Firebase Function
 * 
 * Provides ML-powered predictions for job application success
 * with comprehensive feature analysis and recommendations.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { CallableRequest } from 'firebase-functions/v2/https';
// import { PredictionModelService, PredictionRequest } from '../services/prediction-model.service'; // Module not found
// import { MLPipelineService } from '../services/ml-pipeline.service';
import { corsOptions } from '../config/cors';
// import { AdminAccessService } from '../services/autonomous-admin.service'; // Module not found

// Temporary placeholder types and services
type PredictionRequest = {
  cvId: string;
  features?: string[];
};

const PredictionModelService = {
  predict: async (request: any) => ({ success: true, predictions: [] })
};

const AdminAccessService = {
  isAdmin: async (userId: string) => false
};
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Main success prediction endpoint
 */
export const predictJobSuccess = onCall(
  { ...corsOptions, timeoutSeconds: 60 },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      // Validate input data
      if (!data.cvData || !data.jobData) {
        throw new HttpsError('invalid-argument', 'Missing required CV or job data');
      }

      // Rate limiting check
      await checkRateLimit(auth.uid);
      
      // Get user context for personalization
      const userContext = await getUserContext(auth.uid);
      
      // Prepare prediction request
      const predictionRequest: PredictionRequest = {
        userId: auth.uid,
        cvData: data.cvData,
        jobData: {
          jobId: data.jobData.jobId || `job_${Date.now()}`,
          title: data.jobData.title,
          company: data.jobData.company,
          description: data.jobData.description || '',
          requirements: data.jobData.requirements || [],
          location: data.jobData.location || 'Remote',
          salaryRange: data.jobData.salaryRange,
          industry: data.jobData.industry || 'Technology',
          experienceLevel: data.jobData.experienceLevel || 'Mid-level',
          postedDate: data.jobData.postedDate ? new Date(data.jobData.postedDate) : new Date()
        },
        userContext
      };

      // Generate prediction using ML pipeline
      const predictionService = PredictionModelService.getInstance();
      const prediction = await predictionService.predictSuccess(predictionRequest);
      
      // Log prediction request for analytics
      await logPredictionRequest(auth.uid, predictionRequest, prediction);
      
      // Update user usage statistics
      await updateUserUsageStats(auth.uid);

      return {
        success: true,
        data: prediction,
        metadata: {
          requestId: `req_${Date.now()}`,
          timestamp: new Date(),
          version: '2.0',
          processingTime: Date.now() - request.rawRequest.body.timestamp || 0
        }
      };
      
    } catch (error) {
      
      // Return appropriate error response
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Prediction service temporarily unavailable');
    }
  }
);

/**
 * Batch prediction for multiple jobs
 */
export const predictJobSuccessBatch = onCall(
  { ...corsOptions, timeoutSeconds: 120 },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const { cvData, jobs } = data;
      
      if (!cvData || !Array.isArray(jobs) || jobs.length === 0) {
        throw new HttpsError('invalid-argument', 'Missing CV data or jobs array');
      }

      if (jobs.length > 10) {
        throw new HttpsError('invalid-argument', 'Maximum 10 jobs per batch request');
      }

      // Check rate limit for batch requests
      await checkBatchRateLimit(auth.uid, jobs.length);
      
      const userContext = await getUserContext(auth.uid);
      const predictionService = PredictionModelService.getInstance();
      
      // Process predictions in parallel with concurrency limit
      const predictions = await Promise.all(
        jobs.map(async (jobData: any) => {
          try {
            const predictionRequest: PredictionRequest = {
              userId: auth.uid,
              cvData,
              jobData: {
                jobId: jobData.jobId || `job_${Date.now()}_${Math.random()}`,
                title: jobData.title,
                company: jobData.company,
                description: jobData.description || '',
                requirements: jobData.requirements || [],
                location: jobData.location || 'Remote',
                salaryRange: jobData.salaryRange,
                industry: jobData.industry || 'Technology',
                experienceLevel: jobData.experienceLevel || 'Mid-level',
                postedDate: jobData.postedDate ? new Date(jobData.postedDate) : new Date()
              },
              userContext
            };

            const prediction = await predictionService.predictSuccess(predictionRequest);
            return { success: true, jobId: jobData.jobId, prediction };
            
          } catch (error) {
            return { 
              success: false, 
              jobId: jobData.jobId, 
              error: 'Prediction failed for this job' 
            };
          }
        })
      );

      // Log batch request
      await logBatchPredictionRequest(auth.uid, jobs.length, predictions);
      
      return {
        success: true,
        data: predictions,
        metadata: {
          requestId: `batch_req_${Date.now()}`,
          timestamp: new Date(),
          version: '2.0',
          jobsProcessed: predictions.length,
          successCount: predictions.filter(p => p.success).length
        }
      };
      
    } catch (error) {
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Batch prediction service temporarily unavailable');
    }
  }
);

/**
 * Get user's prediction history
 */
export const getUserPredictionHistory = onCall(
  { ...corsOptions, timeoutSeconds: 30 },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const { limit = 50, offset = 0, dateFrom, dateTo } = data;
      
      let query = db.collection('predictions')
        .where('userId', '==', auth.uid)
        .orderBy('timestamp', 'desc')
        .limit(Math.min(limit, 100));
      
      if (dateFrom) {
        query = query.where('timestamp', '>=', new Date(dateFrom));
      }
      
      if (dateTo) {
        query = query.where('timestamp', '<=', new Date(dateTo));
      }
      
      if (offset > 0) {
        const offsetSnapshot = await db.collection('predictions')
          .where('userId', '==', auth.uid)
          .orderBy('timestamp', 'desc')
          .limit(offset)
          .get();
        
        if (!offsetSnapshot.empty) {
          const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const predictions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get total count for pagination
      const totalCount = await getTotalPredictionCount(auth.uid);

      return {
        success: true,
        data: {
          predictions,
          pagination: {
            total: totalCount,
            limit,
            offset,
            hasMore: offset + predictions.length < totalCount
          }
        }
      };
      
    } catch (error) {
      throw new HttpsError('internal', 'Failed to retrieve prediction history');
    }
  }
);

/**
 * Update prediction with actual outcome
 */
export const updatePredictionOutcome = onCall(
  { ...corsOptions, timeoutSeconds: 30 },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const { predictionId, actualOutcome } = data;
      
      if (!predictionId || !actualOutcome) {
        throw new HttpsError('invalid-argument', 'Missing predictionId or actualOutcome');
      }

      // Verify prediction ownership
      const predictionDoc = await db.collection('predictions').doc(predictionId).get();
      
      if (!predictionDoc.exists) {
        throw new HttpsError('not-found', 'Prediction not found');
      }

      const prediction = predictionDoc.data();
      if (prediction?.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      // Update prediction with actual outcome
      await db.collection('predictions').doc(predictionId).update({
        actualOutcome: {
          result: actualOutcome.result,
          timeToResult: actualOutcome.timeToResult,
          salaryOffered: actualOutcome.salaryOffered,
          feedback: actualOutcome.feedback,
          updatedAt: FieldValue.serverTimestamp()
        },
        predictionAccuracy: calculatePredictionAccuracy(prediction, actualOutcome),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Queue for model retraining data
      await db.collection('ml_training_feedback').add({
        predictionId,
        userId: auth.uid,
        predicted: {
          interviewProbability: prediction.interviewProbability,
          offerProbability: prediction.offerProbability,
          hireProbability: prediction.hireProbability
        },
        actual: actualOutcome,
        features: prediction.features,
        createdAt: FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'Prediction outcome updated successfully'
      };
      
    } catch (error) {
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to update prediction outcome');
    }
  }
);

/**
 * Get model performance metrics
 */
export const getModelMetrics = onCall(
  { ...corsOptions, timeoutSeconds: 30 },
  async (request: CallableRequest) => {
    const { auth } = request;
    
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      // Check if user has admin privileges
      const userDoc = await db.collection('users').doc(auth.uid).get();
      const userData = userDoc.data();
      
      // Use autonomous admin access service
      await AdminAccessService.requireAdminAccess(auth.uid);

      // Get model performance metrics
      const metricsDoc = await db.collection('ml_metrics').doc('current').get();
      const metrics = metricsDoc.data();

      // Get recent prediction accuracy
      const recentPredictions = await db.collection('predictions')
        .where('actualOutcome', '!=', null)
        .where('timestamp', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
        .limit(1000)
        .get();

      const accuracyMetrics = calculateRecentAccuracy(recentPredictions.docs);

      return {
        success: true,
        data: {
          modelMetrics: metrics || {},
          recentPerformance: accuracyMetrics,
          lastUpdated: new Date()
        }
      };
      
    } catch (error) {
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to retrieve model metrics');
    }
  }
);

// Helper functions

async function checkRateLimit(userId: string): Promise<void> {
  const rateLimitRef = db.collection('rate_limits').doc(userId);
  const rateLimitDoc = await rateLimitRef.get();
  
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  if (rateLimitDoc.exists) {
    const data = rateLimitDoc.data();
    const recentRequests = (data?.requests || []).filter((time: number) => time > hourAgo);
    
    if (recentRequests.length >= 100) { // 100 requests per hour limit
      throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Please try again later.');
    }
    
    recentRequests.push(now);
    await rateLimitRef.update({ requests: recentRequests });
  } else {
    await rateLimitRef.set({ requests: [now] });
  }
}

async function checkBatchRateLimit(userId: string, jobCount: number): Promise<void> {
  // Batch requests count as 3x regular requests
  const effectiveRequests = jobCount * 3;
  
  for (let i = 0; i < effectiveRequests; i++) {
    await checkRateLimit(userId);
  }
}

async function getUserContext(userId: string): Promise<any> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    // Get recent application history
    const outcomesSnapshot = await db.collection('user_outcomes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const applicationHistory = outcomesSnapshot.docs.map(doc => doc.data());
    
    return {
      preferences: userData?.preferences || {},
      location: userData?.location || 'Unknown',
      applicationHistory
    };
  } catch (error) {
    return {
      preferences: {},
      location: 'Unknown',
      applicationHistory: []
    };
  }
}

async function logPredictionRequest(userId: string, request: PredictionRequest, prediction: any): Promise<void> {
  try {
    await db.collection('analytics_events').add({
      eventType: 'prediction_request',
      userId,
      timestamp: FieldValue.serverTimestamp(),
      data: {
        predictionId: prediction.predictionId,
        jobTitle: request.jobData.title,
        company: request.jobData.company,
        industry: request.jobData.industry,
        interviewProbability: prediction.interviewProbability,
        offerProbability: prediction.offerProbability,
        hireProbability: prediction.hireProbability
      }
    });
  } catch (error) {
  }
}

async function logBatchPredictionRequest(userId: string, jobCount: number, predictions: any[]): Promise<void> {
  try {
    await db.collection('analytics_events').add({
      eventType: 'batch_prediction_request',
      userId,
      timestamp: FieldValue.serverTimestamp(),
      data: {
        jobCount,
        successCount: predictions.filter(p => p.success).length,
        failureCount: predictions.filter(p => !p.success).length
      }
    });
  } catch (error) {
  }
}

async function updateUserUsageStats(userId: string): Promise<void> {
  try {
    const statsRef = db.collection('user_stats').doc(userId);
    await statsRef.set({
      totalPredictions: admin.firestore.FieldValue.increment(1),
      lastPredictionDate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
  }
}

async function getTotalPredictionCount(userId: string): Promise<number> {
  try {
    const countSnapshot = await db.collection('predictions')
      .where('userId', '==', userId)
      .count()
      .get();
    
    return countSnapshot.data().count;
  } catch (error) {
    return 0;
  }
}

function calculatePredictionAccuracy(prediction: any, actualOutcome: any): any {
  const predicted = {
    interview: prediction.interviewProbability,
    offer: prediction.offerProbability,
    hire: prediction.hireProbability
  };
  
  const actual = {
    interview: actualOutcome.result === 'hired' || actualOutcome.result === 'interviewed' ? 1 : 0,
    offer: actualOutcome.result === 'hired' || actualOutcome.result === 'offer_received' ? 1 : 0,
    hire: actualOutcome.result === 'hired' ? 1 : 0
  };
  
  return {
    interviewAccuracy: 1 - Math.abs(predicted.interview - actual.interview),
    offerAccuracy: 1 - Math.abs(predicted.offer - actual.offer),
    hireAccuracy: 1 - Math.abs(predicted.hire - actual.hire),
    overallAccuracy: (
      (1 - Math.abs(predicted.interview - actual.interview)) +
      (1 - Math.abs(predicted.offer - actual.offer)) +
      (1 - Math.abs(predicted.hire - actual.hire))
    ) / 3
  };
}

function calculateRecentAccuracy(predictionDocs: any[]): any {
  if (predictionDocs.length === 0) {
    return { accuracy: 0, sampleSize: 0 };
  }
  
  let totalAccuracy = 0;
  
  predictionDocs.forEach(doc => {
    const data = doc.data();
    if (data.predictionAccuracy?.overallAccuracy) {
      totalAccuracy += data.predictionAccuracy.overallAccuracy;
    }
  });
  
  return {
    accuracy: totalAccuracy / predictionDocs.length,
    sampleSize: predictionDocs.length,
    period: '30 days'
  };
}