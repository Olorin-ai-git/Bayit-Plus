// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { SocialMediaService } from '../services/social-media.service';
import { CVParsingService } from '../services/cvParsing.service';
import { logger } from 'firebase-functions';
import { corsOptions } from '../config/cors';

const socialMediaService = new SocialMediaService();
const cvParsingService = new CVParsingService();

export const generateSocialMediaIntegration = onCall(
  { 
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId } = request.data;
      if (!jobId) {
        throw new HttpsError('invalid-argument', 'Job ID is required');
      }

      logger.info(`Generating social media integration for job: ${jobId}`);

      // Get the parsed CV data
      const parsedCV = await cvParsingService.getParsedCV(jobId);
      if (!parsedCV) {
        throw new HttpsError('not-found', 'Parsed CV not found');
      }

      // Generate social media integration
      const integration = await socialMediaService.generateSocialMediaIntegration(parsedCV, jobId);

      logger.info(`Successfully generated social media integration with ${integration.profiles.length} profiles`);

      return {
        success: true,
        integration,
        message: 'Social media integration generated successfully'
      };
    } catch (error) {
      logger.error('Error generating social media integration:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to generate social media integration');
    }
  }
);

export const addSocialProfile = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, profile } = request.data;
      if (!jobId || !profile) {
        throw new HttpsError('invalid-argument', 'Job ID and profile data are required');
      }

      logger.info(`Adding social profile to job: ${jobId}`);

      await socialMediaService.addSocialProfile(jobId, profile);

      return {
        success: true,
        message: 'Social profile added successfully'
      };
    } catch (error) {
      logger.error('Error adding social profile:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to add social profile');
    }
  }
);

export const updateSocialProfile = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, profileId, updates } = request.data;
      if (!jobId || !profileId || !updates) {
        throw new HttpsError('invalid-argument', 'Job ID, profile ID, and updates are required');
      }

      logger.info(`Updating social profile ${profileId} for job: ${jobId}`);

      await socialMediaService.updateSocialProfile(jobId, profileId, updates);

      return {
        success: true,
        message: 'Social profile updated successfully'
      };
    } catch (error) {
      logger.error('Error updating social profile:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to update social profile');
    }
  }
);

export const removeSocialProfile = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, profileId } = request.data;
      if (!jobId || !profileId) {
        throw new HttpsError('invalid-argument', 'Job ID and profile ID are required');
      }

      logger.info(`Removing social profile ${profileId} from job: ${jobId}`);

      await socialMediaService.removeSocialProfile(jobId, profileId);

      return {
        success: true,
        message: 'Social profile removed successfully'
      };
    } catch (error) {
      logger.error('Error removing social profile:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to remove social profile');
    }
  }
);

export const trackSocialClick = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      const { jobId, platform, metadata } = request.data;
      if (!jobId || !platform) {
        throw new HttpsError('invalid-argument', 'Job ID and platform are required');
      }

      logger.info(`Tracking social click for platform ${platform} on job: ${jobId}`);

      await socialMediaService.trackSocialClick(jobId, platform, metadata);

      return {
        success: true,
        message: 'Social click tracked successfully'
      };
    } catch (error) {
      logger.error('Error tracking social click:', error);
      
      // Don't throw error for tracking - it should fail silently
      return {
        success: false,
        message: 'Failed to track social click'
      };
    }
  }
);

export const getSocialAnalytics = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId } = request.data;
      if (!jobId) {
        throw new HttpsError('invalid-argument', 'Job ID is required');
      }

      const analytics = await socialMediaService.getSocialAnalytics(jobId);

      return {
        success: true,
        analytics,
        message: 'Social analytics retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting social analytics:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to get social analytics');
    }
  }
);

export const updateSocialDisplaySettings = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, displaySettings } = request.data;
      if (!jobId || !displaySettings) {
        throw new HttpsError('invalid-argument', 'Job ID and display settings are required');
      }

      logger.info(`Updating social display settings for job: ${jobId}`);

      // Update display settings in Firestore
      const admin = require('firebase-admin');
      const db = admin.firestore();
      
      const integrationDoc = await db.collection('jobs').doc(jobId).collection('features').doc('social-media').get();
      
      if (integrationDoc.exists) {
        const data = integrationDoc.data();
        const integration = data?.integration;
        
        if (integration) {
          integration.display = { ...integration.display, ...displaySettings };
          integration.updatedAt = new Date();
          await integrationDoc.ref.update({ integration });
        }
      }

      return {
        success: true,
        message: 'Social display settings updated successfully'
      };
    } catch (error) {
      logger.error('Error updating social display settings:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to update social display settings');
    }
  }
);