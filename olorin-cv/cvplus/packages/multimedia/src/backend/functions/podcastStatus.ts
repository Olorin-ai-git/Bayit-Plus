import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';

export const podcastStatus = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
    ...corsOptions
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const userId = request.auth.uid;
    const { jobId } = request.data;

    if (!jobId) {
      throw new Error('Job ID is required');
    }

    try {
      // Check the job document for podcast status
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();

      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      
      // Check if user owns this job
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      const podcastStatus = jobData?.podcastStatus;
      const podcast = jobData?.podcast;
      
      if (podcastStatus === 'completed' && podcast) {
        return {
          status: 'ready',
          audioUrl: podcast.url,
          transcript: podcast.transcript,
          duration: podcast.duration,
          chapters: podcast.chapters || []
        };
      } else if (podcastStatus === 'failed') {
        return {
          status: 'failed',
          error: jobData?.podcastError || 'Unknown error occurred'
        };
      } else if (podcastStatus === 'generating') {
        return {
          status: 'generating',
          message: 'Podcast is being generated...'
        };
      } else {
        return {
          status: 'not-started',
          message: 'Podcast generation has not been initiated'
        };
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to check podcast status');
    }
  }
);