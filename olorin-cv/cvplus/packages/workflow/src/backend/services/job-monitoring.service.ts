import { FieldValue } from 'firebase-admin/firestore';
import { sanitizeForFirestore } from '../utils/firestore-sanitizer';

/**
 * Comprehensive job monitoring service for detecting and resolving stuck CV generation jobs
  */
export class JobMonitoringService {
  
  /**
   * Monitor for stuck jobs and apply recovery mechanisms
    */
  static async monitorStuckJobs(): Promise<void> {
    
    try {
      const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      
      // Query for jobs stuck in 'generating' status for more than 15 minutes
      const stuckJobsQuery = await admin.firestore()
        .collection('jobs')
        .where('status', '==', 'generating')
        .where('generationStartedAt', '<', cutoffTime)
        .limit(50)
        .get();
      
      if (stuckJobsQuery.empty) {
        return;
      }
      
      
      // Process each stuck job
      const recoveryPromises = stuckJobsQuery.docs.map(async (doc) => {
        const jobData = doc.data();
        const jobId = doc.id;
        
        
        try {
          await this.recoverStuckJob(jobId, jobData);
        } catch (error) {
        }
      });
      
      await Promise.allSettled(recoveryPromises);
      
    } catch (error) {
    }
  }
  
  /**
   * Recover a specific stuck job
    */
  private static async recoverStuckJob(jobId: string, jobData: any): Promise<void> {
    const stuckDuration = Date.now() - (jobData.generationStartedAt?.toDate()?.getTime() || 0);
    const stuckMinutes = Math.floor(stuckDuration / (1000 * 60));
    
    
    // Analyze job state
    const hasEnhancedFeatures = !!jobData.enhancedFeatures;
    const hasGeneratedCV = !!jobData.generatedCV;
    const selectedFeatures = jobData.selectedFeatures || [];
    
    // Determine recovery strategy based on job state
    if (!hasEnhancedFeatures && selectedFeatures.length > 0) {
      // Job failed before feature processing started
      await this.failJobWithMissingFeatures(jobId, selectedFeatures, stuckMinutes);
    } else if (hasEnhancedFeatures && !hasGeneratedCV) {
      // Job failed during CV generation phase
      await this.failJobWithPartialProcessing(jobId, jobData, stuckMinutes);
    } else if (hasGeneratedCV && hasEnhancedFeatures) {
      // Job appears complete but status wasn't updated
      await this.completeStuckJob(jobId, jobData, stuckMinutes);
    } else {
      // Unknown state - mark as failed
      await this.failJobWithUnknownState(jobId, stuckMinutes);
    }
  }
  
  /**
   * Fail job that never started feature processing
    */
  private static async failJobWithMissingFeatures(
    jobId: string, 
    selectedFeatures: string[], 
    stuckMinutes: number
  ): Promise<void> {
    
    const enhancedFeatures: Record<string, any> = {};
    for (const feature of selectedFeatures) {
      enhancedFeatures[feature] = {
        status: 'failed',
        error: `Job stuck for ${stuckMinutes} minutes - feature processing never started`,
        failureTimestamp: FieldValue.serverTimestamp(),
        retryable: true
      };
    }
    
    const updateData = sanitizeForFirestore({
      status: 'failed',
      error: `Job stuck in generating status for ${stuckMinutes} minutes - feature processing never started`,
      enhancedFeatures: enhancedFeatures,
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'missing_features_initialization',
      updatedAt: FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection('jobs').doc(jobId).update(updateData);
  }
  
  /**
   * Fail job that had partial processing
    */
  private static async failJobWithPartialProcessing(
    jobId: string, 
    jobData: any, 
    stuckMinutes: number
  ): Promise<void> {
    
    // Count feature processing status
    const enhancedFeatures = jobData.enhancedFeatures || {};
    let completedCount = 0;
    let failedCount = 0;
    let processingCount = 0;
    
    for (const [featureName, featureData] of Object.entries(enhancedFeatures)) {
      const feature = featureData as any;
      if (feature.status === 'completed') completedCount++;
      else if (feature.status === 'failed') failedCount++;
      else if (feature.status === 'processing') processingCount++;
    }
    
    const updateData = sanitizeForFirestore({
      status: 'failed',
      error: `Job stuck for ${stuckMinutes} minutes during CV generation phase. Features: ${completedCount} completed, ${failedCount} failed, ${processingCount} stuck`,
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'partial_processing_timeout',
      featureProcessingSummary: {
        completed: completedCount,
        failed: failedCount,
        processing: processingCount,
        recoveryTimestamp: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection('jobs').doc(jobId).update(updateData);
  }
  
  /**
   * Complete job that appears finished but wasn't marked complete
    */
  private static async completeStuckJob(
    jobId: string, 
    jobData: any, 
    stuckMinutes: number
  ): Promise<void> {
    
    const updateData = sanitizeForFirestore({
      status: 'completed',
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'status_update_missed',
      recoveryNote: `Job was stuck for ${stuckMinutes} minutes but appeared complete - status updated by recovery system`,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection('jobs').doc(jobId).update(updateData);
  }
  
  /**
   * Fail job with unknown state
    */
  private static async failJobWithUnknownState(
    jobId: string, 
    stuckMinutes: number
  ): Promise<void> {
    
    const updateData = sanitizeForFirestore({
      status: 'failed',
      error: `Job stuck for ${stuckMinutes} minutes in unknown state - unable to determine processing phase`,
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'unknown_state_timeout',
      updatedAt: FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection('jobs').doc(jobId).update(updateData);
  }
  
  /**
   * Get job processing statistics for monitoring dashboard
    */
  static async getJobProcessingStats(): Promise<any> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get job counts by status
      const [completed, failed, generating, pending] = await Promise.all([
        admin.firestore().collection('jobs')
          .where('status', '==', 'completed')
          .where('updatedAt', '>=', last24Hours)
          .count().get(),
        admin.firestore().collection('jobs')
          .where('status', '==', 'failed')
          .where('updatedAt', '>=', last24Hours)
          .count().get(),
        admin.firestore().collection('jobs')
          .where('status', '==', 'generating')
          .count().get(),
        admin.firestore().collection('jobs')
          .where('status', '==', 'pending')
          .count().get()
      ]);
      
      const stats = {
        last24Hours: {
          completed: completed.data().count,
          failed: failed.data().count,
          successRate: completed.data().count / (completed.data().count + failed.data().count) * 100 || 0
        },
        current: {
          generating: generating.data().count,
          pending: pending.data().count
        },
        timestamp: new Date().toISOString()
      };
      
      return stats;
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Log detailed information about a specific job for debugging
    */
  static async logJobDetails(jobId: string): Promise<void> {
    try {
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      
      if (!jobDoc.exists) {
        return;
      }
      
      const jobData = jobDoc.data();
      
      logger.info(`
🔍 DETAILED JOB ANALYSIS for ${jobId}:
📊 Status: ${jobData?.status}
⏰ Created: ${jobData?.createdAt?.toDate()?.toISOString() || 'Unknown'}
🚀 Generation Started: ${jobData?.generationStartedAt?.toDate()?.toISOString() || 'Not started'}
📝 Last Updated: ${jobData?.updatedAt?.toDate()?.toISOString() || 'Unknown'}

🎯 Selected Features: ${JSON.stringify(jobData?.selectedFeatures || [])}
🏗️ Enhanced Features Status:
${jobData?.enhancedFeatures ? Object.entries(jobData.enhancedFeatures)
  .map(([name, data]: [string, any]) => `  - ${name}: ${data.status} (${data.progress || 0}%)`)
  .join('\n') : '  None'}

📄 Generated CV: ${jobData?.generatedCV ? 'Available' : 'Missing'}
📈 Processing Summary: ${JSON.stringify(jobData?.featureProcessingSummary || 'None')}
🔧 Recovery Info: ${JSON.stringify(jobData?.recoveryInfo || 'None')}
      `);
      
    } catch (error) {
    }
  }
}