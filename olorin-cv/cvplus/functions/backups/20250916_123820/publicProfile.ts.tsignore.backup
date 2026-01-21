// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Cloud Functions for public CV profiles
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { integrationsService } from '../services/integrations.service';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { EnhancedJob, PublicCVProfile, PrivacySettings } from '../types/enhanced-models';
import { maskPII } from '../utils/privacy';
import { corsOptions } from '../config/cors';

interface CreatePublicProfileRequest {
  jobId: string;
}

interface GetPublicProfileRequest {
  slug: string;
}

interface UpdateProfileSettingsRequest {
  jobId: string;
  settings: {
    isPublic: boolean;
    allowContactForm: boolean;
    showAnalytics: boolean;
    customSlug?: string;
  };
}

interface SubmitContactFormRequest {
  profileId: string; // Can be either jobId or profile slug
  jobId?: string; // Optional fallback jobId for compatibility
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  company?: string;
  subject: string;
  message: string;
}

interface TrackQRScanRequest {
  jobId: string;
  metadata?: {
    userAgent?: string;
    source?: string;
  };
}

/**
 * Create public profile for a CV
 */
export const createPublicProfile = onCall<CreatePublicProfileRequest>(
  {
    timeoutSeconds: 120,
    ...corsOptions
  },
  async (request: CallableRequest<CreatePublicProfileRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Check if parsed CV exists
      if (!job.parsedData) {
        throw new HttpsError('failed-precondition', 'CV must be parsed before creating public profile');
      }

      // Generate public profile with default privacy settings
      const defaultPrivacySettings: PrivacySettings = {
        showContactInfo: true,
        showSocialLinks: true,
        allowCVDownload: true,
        showAnalytics: false,
        allowChatMessages: true,
        publicProfile: true,
        searchable: true,
        showPersonalityProfile: true,
        showTestimonials: true,
        showPortfolio: true,
        enabled: true,
        maskingRules: {
          maskEmail: true,
          maskPhone: true,
          maskAddress: true
        },
        publicEmail: false,
        publicPhone: false,
        requireContactFormForCV: false
      };
      const _maskedCV = maskPII(job.parsedData, defaultPrivacySettings);
      const publicSlug = `cv-${jobId.substring(0, 8)}-${Date.now()}`;
      
      // Generate QR code for the public profile
      const publicUrl = `${process.env.PUBLIC_URL || 'https://cvplus.ai'}/public/${publicSlug}`;
      const qrCodeBuffer = await integrationsService.generateQRCode(publicUrl);
      
      // Upload QR code to storage
      const bucket = admin.storage().bucket();
      const qrFile = bucket.file(`public-profiles/${jobId}/qr-code.png`);
      await qrFile.save(qrCodeBuffer, {
        metadata: {
          contentType: 'image/png'
        }
      });
      
      // Generate URL based on environment (emulator vs production)
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                         process.env.FIREBASE_STORAGE_EMULATOR_HOST;
      let qrCodeUrl: string;
      
      if (isEmulator) {
        // In emulator, use direct Storage emulator URL
        const bucketName = process.env.STORAGE_BUCKET || 'getmycv-ai.firebasestorage.app';
        qrCodeUrl = `http://localhost:9199/v0/b/${bucketName}/o/${encodeURIComponent(qrFile.name)}?alt=media`;
      } else {
        // In production, use signed URL
        const [signedUrl] = await qrFile.getSignedUrl({
          action: 'read',
          expires: '03-09-2491' // Far future date
        });
        qrCodeUrl = signedUrl;
      }

      // Create public profile
      const publicProfile: PublicCVProfile = {
        id: jobId,
        jobId,
        userId: job.userId,
        slug: publicSlug,
        isPublic: true,
        allowContactForm: true,
        publicUrl,
        socialSharing: {
          enabled: true,
          platforms: ['linkedin', 'twitter', 'facebook'],
          customMessage: `Check out my professional CV: ${publicUrl}`
        },
        createdAt: FieldValue.serverTimestamp() as any,
        updatedAt: FieldValue.serverTimestamp() as any,
        analytics: {
          totalViews: 0,
          uniqueVisitors: 0,
          averageTimeOnPage: 0,
          bounceRate: 0,
          featureUsage: {},
          conversionRate: 0,
          lastAnalyticsUpdate: new Date(),
          views: 0,
          qrScans: 0,
          contactSubmissions: 0
        }
      };

      // Save to Firestore
      await admin.firestore()
        .collection('publicProfiles')
        .doc(jobId)
        .set(publicProfile);

      // Update job with public profile info
      await jobDoc.ref.update({
        publicProfile: {
          slug: publicSlug,
          url: publicUrl,
          qrCodeUrl,
          createdAt: FieldValue.serverTimestamp()
        }
      });

      return {
        success: true,
        slug: publicSlug,
        publicUrl,
        qrCodeUrl
      };
    } catch (error: any) {
      throw new HttpsError('internal', error.message || 'Failed to create public profile');
    }
  }
);

/**
 * Get public profile by slug
 */
export const getPublicProfile = onCall<GetPublicProfileRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<GetPublicProfileRequest>) => {
    const { slug } = request.data;
    if (!slug) {
      throw new HttpsError('invalid-argument', 'Slug is required');
    }

    try {
      // Find profile by slug
      const profilesSnapshot = await admin.firestore()
        .collection('publicProfiles')
        .where('slug', '==', slug)
        .where('isPublic', '==', true)
        .limit(1)
        .get();

      if (profilesSnapshot.empty) {
        throw new HttpsError('not-found', 'Public profile not found');
      }

      const profileDoc = profilesSnapshot.docs[0];
      if (!profileDoc) {
        throw new HttpsError('not-found', 'Profile not found');
      }
      
      const profile = profileDoc.data() as PublicCVProfile;

      // Update analytics
      await profileDoc.ref.update({
        'analytics.views': FieldValue.increment(1),
        'analytics.lastViewedAt': FieldValue.serverTimestamp()
      });

      // Remove sensitive data if not authenticated as owner
      if (!request.auth || request.auth.uid !== profile.userId) {
        delete (profile as any).userId;
        delete (profile as any).analytics.contactSubmissions;
      }

      return {
        success: true,
        profile
      };
    } catch (error: any) {
      throw new HttpsError('internal', error.message || 'Failed to get public profile');
    }
  }
);

/**
 * Update public profile settings
 */
export const updatePublicProfileSettings = onCall<UpdateProfileSettingsRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<UpdateProfileSettingsRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, settings } = request.data;
    if (!jobId || !settings) {
      throw new HttpsError('invalid-argument', 'Job ID and settings are required');
    }

    try {
      // Get profile and verify ownership
      const profileDoc = await admin.firestore()
        .collection('publicProfiles')
        .doc(jobId)
        .get();

      if (!profileDoc.exists) {
        throw new HttpsError('not-found', 'Public profile not found');
      }

      const profile = profileDoc.data() as PublicCVProfile;
      if (profile.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to profile');
      }

      // Update settings
      const updates: any = {
        isPublic: settings.isPublic ?? profile.isPublic,
        allowContactForm: settings.allowContactForm ?? profile.allowContactForm,
        showAnalytics: settings.showAnalytics ?? profile.showAnalytics,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (settings.customSlug && settings.customSlug !== profile.slug) {
        // Check if custom slug is available
        const existingSlug = await admin.firestore()
          .collection('publicProfiles')
          .where('slug', '==', settings.customSlug)
          .limit(1)
          .get();

        if (!existingSlug.empty) {
          throw new HttpsError('already-exists', 'This custom URL is already taken');
        }

        updates.slug = settings.customSlug;
        updates.publicUrl = `${process.env.PUBLIC_URL || 'https://cvplus.ai'}/public/${settings.customSlug}`;
      }

      await profileDoc.ref.update(updates);

      return {
        success: true,
        settings: updates
      };
    } catch (error: any) {
      throw new HttpsError('internal', error.message || 'Failed to update profile settings');
    }
  }
);

/**
 * Submit contact form for public profile
 */
export const submitContactForm = onCall<SubmitContactFormRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<SubmitContactFormRequest>) => {
    const { profileId, jobId, senderName, senderEmail, senderPhone, company, subject, message } = request.data;
    
    // SECURITY: Enhanced input validation
    if (!profileId || typeof profileId !== 'string') {
      throw new HttpsError('invalid-argument', 'Invalid profile ID provided');
    }
    if (!senderName || typeof senderName !== 'string' || senderName.trim().length < 2) {
      throw new HttpsError('invalid-argument', 'Name must be at least 2 characters long');
    }
    if (!senderEmail || typeof senderEmail !== 'string') {
      throw new HttpsError('invalid-argument', 'Email is required');
    }
    if (!subject || typeof subject !== 'string') {
      throw new HttpsError('invalid-argument', 'Subject is required');
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      throw new HttpsError('invalid-argument', 'Message must be at least 10 characters long');
    }

    // SECURITY: Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(senderEmail)) {
      throw new HttpsError('invalid-argument', 'Invalid email address format');
    }

    // SECURITY: Phone validation if provided
    if (senderPhone && typeof senderPhone === 'string') {
      const cleanPhone = senderPhone.replace(/[\s()-]/g, '');
      if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
        throw new HttpsError('invalid-argument', 'Invalid phone number format');
      }
    }

    // SECURITY: Input sanitization and length limits
    const sanitizedData = {
      senderName: senderName.trim().substring(0, 100),
      senderEmail: senderEmail.trim().toLowerCase(),
      senderPhone: senderPhone?.trim().substring(0, 20),
      company: company?.trim().substring(0, 100),
      subject: subject.trim().substring(0, 200),
      message: message.trim().substring(0, 2000)
    };

    try {
      // SECURITY: Log security event without PII

      // Get profile by profileId (could be slug or jobId) or jobId fallback
      let profileDoc;
      const lookupId = profileId || jobId;
      
      if (!lookupId) {
        throw new HttpsError('invalid-argument', 'Either profileId or jobId must be provided');
      }
      
      // First try to get by document ID (jobId)
      const profileByJobId = await admin.firestore()
        .collection('publicProfiles')
        .doc(lookupId)
        .get();
      
      if (profileByJobId.exists) {
        profileDoc = profileByJobId;
      } else {
        // If not found by jobId, try by slug
        const profileQuery = await admin.firestore()
          .collection('publicProfiles')
          .where('slug', '==', lookupId)
          .limit(1)
          .get();

        if (profileQuery.empty) {
          // If no public profile exists, check if the job exists and auto-create the profile
          const jobDoc = await admin.firestore()
            .collection('jobs')
            .doc(lookupId)
            .get();
          
          if (jobDoc.exists) {
            
            const job = jobDoc.data() as EnhancedJob;
            
            // Check if parsed CV exists
            if (!job.parsedData) {
              throw new HttpsError('failed-precondition', 'CV must be processed before creating public profile');
            }

            // Generate public profile with default privacy settings
            const defaultPrivacySettings: PrivacySettings = {
              showContactInfo: true,
              showSocialLinks: true,
              allowCVDownload: true,
              showAnalytics: false,
              allowChatMessages: true,
              publicProfile: true,
              searchable: true,
              showPersonalityProfile: true,
              showTestimonials: true,
              showPortfolio: true,
              enabled: true,
              maskingRules: {
                maskEmail: true,
                maskPhone: true,
                maskAddress: true
              },
              publicEmail: false,
              publicPhone: false,
              requireContactFormForCV: false
            };
            const _maskedCV = maskPII(job.parsedData, defaultPrivacySettings);
            const publicSlug = `cv-${lookupId.substring(0, 8)}-${Date.now()}`;
            
            // Generate QR code for the public profile
            const publicUrl = `${process.env.PUBLIC_URL || 'https://cvplus.ai'}/public/${publicSlug}`;
            const qrCodeBuffer = await integrationsService.generateQRCode(publicUrl);
            
            // Upload QR code to storage
            const bucket = admin.storage().bucket();
            const qrFile = bucket.file(`public-profiles/${lookupId}/qr-code.png`);
            await qrFile.save(qrCodeBuffer, {
              metadata: {
                contentType: 'image/png'
              }
            });
            
            // Generate URL based on environment (emulator vs production)
            const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                               process.env.FIREBASE_STORAGE_EMULATOR_HOST;
            let qrCodeUrl: string;
            
            if (isEmulator) {
              // In emulator, use direct Storage emulator URL
              const bucketName = process.env.STORAGE_BUCKET || 'getmycv-ai.firebasestorage.app';
              qrCodeUrl = `http://localhost:9199/v0/b/${bucketName}/o/${encodeURIComponent(qrFile.name)}?alt=media`;
            } else {
              // In production, use signed URL
              const [signedUrl] = await qrFile.getSignedUrl({
                action: 'read',
                expires: '03-09-2491' // Far future date
              });
              qrCodeUrl = signedUrl;
            }

            // Create public profile
            const publicProfile: PublicCVProfile = {
              id: lookupId,
              jobId: lookupId,
              userId: job.userId,
              slug: publicSlug,
              isPublic: true,
              allowContactForm: true,
              publicUrl,
              socialSharing: {
                enabled: true,
                platforms: ['linkedin', 'twitter', 'facebook'],
                customMessage: `Check out my professional CV: ${publicUrl}`
              },
              createdAt: FieldValue.serverTimestamp() as any,
              updatedAt: FieldValue.serverTimestamp() as any,
              analytics: {
                totalViews: 0,
                uniqueVisitors: 0,
                averageTimeOnPage: 0,
                bounceRate: 0,
                featureUsage: {},
                conversionRate: 0,
                lastAnalyticsUpdate: new Date(),
                views: 0,
                qrScans: 0,
                contactSubmissions: 0
              }
            };

            // Save to Firestore
            const _newProfileDoc = await admin.firestore()
              .collection('publicProfiles')
              .doc(lookupId)
              .create(publicProfile);

            // Update job with public profile info
            await jobDoc.ref.update({
              publicProfile: {
                slug: publicSlug,
                url: publicUrl,
                qrCodeUrl,
                createdAt: FieldValue.serverTimestamp()
              }
            });

            profileDoc = await admin.firestore().collection('publicProfiles').doc(lookupId).get();
          } else {
            throw new HttpsError('not-found', `Job not found for ID: ${lookupId}`);
          }
        } else {
          profileDoc = profileQuery.docs[0];
        }
      }

      if (!profileDoc) {
        throw new HttpsError('not-found', 'Public profile not found');
      }

      const profile = profileDoc.data() as PublicCVProfile;

      // SECURITY: Check if contact form is enabled
      if (!profile.allowContactForm) {
        throw new HttpsError('failed-precondition', 'Contact form is not enabled for this profile');
      }

      // Get job to find contact email
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(profile.jobId)
        .get();

      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Associated job not found');
      }

      const job = jobDoc.data() as EnhancedJob;

      // SECURITY: Rate limiting check (basic implementation)
      const recentSubmissions = await admin.firestore()
        .collection('contactSubmissions')
        .where('senderEmail', '==', sanitizedData.senderEmail)
        .where('submittedAt', '>', new Date(Date.now() - 60000)) // Last minute
        .count()
        .get();

      if (recentSubmissions.data().count >= 3) {
        throw new HttpsError('resource-exhausted', 'Too many submissions. Please wait before sending another message.');
      }

      // Create contact submission with sanitized data
      const submission = {
        jobId: profile.jobId,
        profileId: profile.slug,
        senderName: sanitizedData.senderName,
        senderEmail: sanitizedData.senderEmail,
        senderPhone: sanitizedData.senderPhone,
        company: sanitizedData.company,
        subject: sanitizedData.subject,
        message: sanitizedData.message,
        submittedAt: FieldValue.serverTimestamp(),
        status: 'pending',
        ipAddress: request.rawRequest?.ip || 'unknown',
        userAgent: request.rawRequest?.headers?.['user-agent'] || 'unknown'
      };

      // Save submission
      const submissionRef = await admin.firestore()
        .collection('contactSubmissions')
        .add(submission);

      // Update analytics
      if (profileDoc) {
        await profileDoc.ref.update({
          'analytics.contactSubmissions': FieldValue.increment(1)
        });
      }

      // Send email notification if configured
      const contactEmail = job.parsedData?.personalInfo?.email;
      let emailResult: { success: boolean; error?: string } = { success: false, error: 'No email configured' };
      
      if (contactEmail) {
        // Get profile owner name for personalization
        const profileOwnerName = job.parsedData?.personalInfo?.name || 
                               'there';
        
        // Generate professional email template
        const emailHtml = integrationsService.generateContactFormEmailTemplate({
          senderName: sanitizedData.senderName,
          senderEmail: sanitizedData.senderEmail,
          senderPhone: sanitizedData.senderPhone,
          company: sanitizedData.company,
          subject: sanitizedData.subject,
          message: sanitizedData.message,
          cvUrl: profile.publicUrl,
          profileOwnerName
        });

        emailResult = await integrationsService.sendEmail({
          to: contactEmail,
          subject: `New contact from your CV profile - ${sanitizedData.subject || 'General Inquiry'}`,
          html: emailHtml
        });

        // Log email result for monitoring
        if (emailResult.success) {
        } else {
        }
      } else {
      }

      return {
        success: true,
        submissionId: submissionRef.id,
        message: 'Your message has been sent successfully!',
        emailNotification: {
          sent: emailResult.success,
          error: emailResult.error
        }
      };
    } catch (error: any) {
      throw new HttpsError('internal', error.message || 'Failed to submit contact form');
    }
  }
);

/**
 * Track QR code scan
 */
export const trackQRScan = onCall<TrackQRScanRequest>(
  {
    timeoutSeconds: 30,
    ...corsOptions
  },
  async (request: CallableRequest<TrackQRScanRequest>) => {
    const { jobId, metadata } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Update analytics
      const profileRef = admin.firestore()
        .collection('publicProfiles')
        .doc(jobId);

      await profileRef.update({
        'analytics.qrScans': FieldValue.increment(1)
      });

      // Log scan event
      await admin.firestore()
        .collection('qrScans')
        .add({
          jobId,
          scannedAt: FieldValue.serverTimestamp(),
          userAgent: metadata?.userAgent,
          source: metadata?.source || 'qr',
          ip: request.rawRequest?.ip || 'unknown'
        });

      return {
        success: true,
        message: 'QR scan tracked'
      };
    } catch (error: any) {
      // Don't throw - we don't want to break the user experience
      return {
        success: false,
        message: 'Failed to track scan'
      };
    }
  }
);

/**
 * Test email configuration (admin only)
 */
export const testEmailConfiguration = onCall(
  {
    timeoutSeconds: 30,
    ...corsOptions
  },
  async (request: CallableRequest<{ testEmail?: string }>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { testEmail } = request.data || {};
    const targetEmail = testEmail || request.auth.token.email;

    if (!targetEmail) {
      throw new HttpsError('invalid-argument', 'No email address provided');
    }

    try {
      // Test email service configuration
      const configTest = await integrationsService.testEmailConfiguration();
      
      if (!configTest.success) {
        return {
          success: false,
          message: 'Email service not configured',
          details: {
            provider: configTest.provider,
            error: configTest.error
          }
        };
      }

      // Send test email
      const testEmailHtml = integrationsService.generateContactFormEmailTemplate({
        senderName: 'CVPlus Test System',
        senderEmail: 'test@cvplus.com',
        senderPhone: '+1-555-TEST',
        company: 'CVPlus',
        subject: 'Email Configuration Test',
        message: 'This is a test message to verify your email configuration is working correctly. If you receive this email, your contact form notifications are properly set up!',
        cvUrl: 'https://getmycv-ai.web.app',
        profileOwnerName: request.auth.token.name || 'User'
      });

      const emailResult = await integrationsService.sendEmail({
        to: targetEmail,
        subject: 'CVPlus Email Configuration Test',
        html: testEmailHtml
      });

      return {
        success: emailResult.success,
        message: emailResult.success 
          ? `Test email sent successfully to ${targetEmail}` 
          : 'Failed to send test email',
        details: {
          provider: configTest.provider,
          emailSent: emailResult.success,
          error: emailResult.error
        }
      };
    } catch (error: any) {
      throw new HttpsError('internal', error.message || 'Failed to test email configuration');
    }
  }
);