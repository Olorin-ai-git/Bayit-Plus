import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../../config/cors';

export const skipFeature = onCall(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request) => {
    
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }


    const { jobId, featureId } = request.data;


    if (!jobId || !featureId) {
      throw new Error('Job ID and Feature ID are required');
    }

    try {
      // Get the job data
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      
      // Verify user owns this job
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access to job');
      }
      

      // Update the specific feature status to skipped
      const updateData: any = {
        [`enhancedFeatures.${featureId}.status`]: 'skipped',
        [`enhancedFeatures.${featureId}.progress`]: 100,
        [`enhancedFeatures.${featureId}.processedAt`]: FieldValue.serverTimestamp(),
        [`enhancedFeatures.${featureId}.skippedAt`]: FieldValue.serverTimestamp(),
        [`enhancedFeatures.${featureId}.currentStep`]: 'Skipped by user',
        updatedAt: FieldValue.serverTimestamp()
      };

      // Also update any legacy status fields for specific features
      switch (featureId) {
        case 'generatePodcast':
          updateData.podcastStatus = 'skipped';
          break;
        case 'generateVideo':
          updateData.videoStatus = 'skipped';
          break;
        // Add other feature-specific status fields as needed
      }

      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(updateData);


      return {
        success: true,
        message: `Feature ${featureId} has been skipped`,
        featureId,
        jobId
      };
    } catch (error: any) {
      
      throw new Error(`Failed to skip feature: ${error.message}`);
    }
  });