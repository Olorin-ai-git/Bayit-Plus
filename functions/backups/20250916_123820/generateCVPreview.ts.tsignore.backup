// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';
import { CVPreviewRequest, CVPreviewResponse } from '../../types';

/**
 * Firebase Function to generate real-time CV preview JSON data
 * Lightweight version optimized for React SPA consumption
 */
export const generateCVPreview = onCall(
  {
    timeoutSeconds: 60, // Short timeout for preview - should be fast
    memory: '1GiB', // Lower memory requirement than full generation
    ...corsOptions
  },
  async (request) => {
    
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, templateId, features } = request.data;
    const userId = request.auth.uid;
    

    try {
      // Validate required parameters
      if (!jobId) {
        throw new Error('jobId is required');
      }

      // Get job data and validate user ownership
      const { cvData } = await validateJobAndGetData(jobId, userId);

      // Generate preview JSON data for React SPA
      const previewData = await generatePreviewData(cvData, templateId, features, jobId);

      
      return {
        success: true,
        data: previewData,
        template: templateId || 'modern',
        features: features || [],
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      
      throw new Error(`Failed to generate CV preview: ${error.message}`);
    }
  }
);

/**
 * Validate job ownership and get CV data
 */
async function validateJobAndGetData(jobId: string, userId: string) {
  // Get job data
  const jobDoc = await admin.firestore()
    .collection('jobs')
    .doc(jobId)
    .get();
  
  if (!jobDoc.exists) {
    throw new Error('Job not found');
  }

  const jobData = jobDoc.data();
  
  // Verify user ownership
  if (jobData?.userId !== userId) {
    throw new Error('Unauthorized access to job');
  }
  
  const parsedCV = jobData?.parsedData;
  
  if (!parsedCV) {
    throw new Error('No parsed CV data found');
  }

  // Use privacy version if privacy mode is in features
  const cvData = jobData?.privacyVersion && jobData.privacyVersion
    ? jobData.privacyVersion 
    : parsedCV;

  return { jobData, cvData };
}

/**
 * Generate lightweight preview JSON data for React SPA
 */
async function generatePreviewData(
  cvData: any,
  templateId: string | undefined,
  features: string[] | undefined,
  jobId: string
): Promise<any> {
  
  try {
    // Return structured CV data for React components
    const previewData = {
      personalInfo: cvData.personalInfo || {},
      experience: cvData.experience || [],
      skills: cvData.skills || {},
      education: cvData.education || [],
      summary: cvData.summary || '',
      enhancedFeatures: features || [],
      template: templateId || 'modern',
      metadata: {
        jobId,
        preview: true,
        timestamp: new Date().toISOString()
      }
    };
    
    
    return previewData;
    
  } catch (error: any) {
    throw error;
  }
}

/**
 * Type definitions for this function
 */
export type { CVPreviewRequest, CVPreviewResponse };