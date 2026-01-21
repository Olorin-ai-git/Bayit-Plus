/**
 * Cloud Functions for public CV profiles
 */

import * as functions from 'firebase-functions';
import { enhancedDbService } from '../services/enhanced-db.service';
import { integrationsService } from '../services/integrations.service';
import { auth, firestore } from '../config/firebase';
import { EnhancedJob, PublicCVProfile } from '../types/enhanced-models';
import { maskPII } from '../utils/privacy';

/**
 * Create public profile for a CV
 */
export const createPublicProfile = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId } = data;
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  try {
    // Get job and verify ownership
    const jobDoc = await firestore.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to access this job');
    }

    // Check if profile already exists
    const existingProfile = await firestore
      .collection('publicProfiles')
      .doc(jobId)
      .get();

    if (existingProfile.exists) {
      return { 
        success: true, 
        profile: existingProfile.data(),
        message: 'Public profile already exists' 
      };
    }

    // Create public profile
    const profile = await enhancedDbService.createPublicProfile(jobId, context.auth.uid);

    // Generate QR code for the public URL
    const publicUrl = `https://cvplus.com/cv/${profile.slug}`;
    const qrCodeBuffer = await integrationsService.generateQRCode(publicUrl);
    const qrCodeUrl = await integrationsService.uploadQRCode(qrCodeBuffer, jobId);

    // Update job with QR code
    await firestore.collection('jobs').doc(jobId).update({
      'enhancedFeatures.qrCode': {
        enabled: true,
        data: { url: qrCodeUrl, publicUrl },
        status: 'completed'
      }
    });

    // Mask PII for public data
    if (job.parsedData && job.privacySettings?.enabled) {
      profile.publicData = maskPII(job.parsedData, job.privacySettings);
    } else {
      profile.publicData = job.parsedData;
    }

    // Update profile with public data
    await firestore.collection('publicProfiles').doc(jobId).update({
      publicData: profile.publicData
    });

    return {
      success: true,
      profile,
      publicUrl,
      qrCodeUrl
    };
  } catch (error: any) {
    console.error('Error creating public profile:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get public profile by slug
 */
export const getPublicProfile = functions.https.onCall(async (data) => {
  const { slug } = data;
  if (!slug) {
    throw new functions.https.HttpsError('invalid-argument', 'Slug is required');
  }

  try {
    const profile = await enhancedDbService.getPublicProfileBySlug(slug);
    if (!profile) {
      throw new functions.https.HttpsError('not-found', 'Profile not found');
    }

    // Track profile view
    await enhancedDbService.trackFeatureInteraction(profile.jobId, 'profile-view', {
      type: 'view',
      metadata: { slug }
    });

    // Increment view count
    await firestore.collection('jobs').doc(profile.jobId).update({
      'analytics.profileViews': firestore.FieldValue.increment(1),
      'analytics.lastViewedAt': new Date()
    });

    return {
      success: true,
      profile
    };
  } catch (error: any) {
    console.error('Error getting public profile:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Update public profile settings
 */
export const updatePublicProfileSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, settings } = data;
  if (!jobId || !settings) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID and settings are required');
  }

  try {
    // Verify ownership
    const jobDoc = await firestore.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to access this job');
    }

    // Update settings
    await firestore.collection('publicProfiles').doc(jobId).update({
      settings,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating profile settings:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Submit contact form
 */
export const submitContactForm = functions.https.onCall(async (data) => {
  const { jobId, senderName, senderEmail, senderPhone, company, message } = data;

  // Validate required fields
  if (!jobId || !senderName || !senderEmail || !message) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'Required fields: jobId, senderName, senderEmail, message'
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(senderEmail)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
  }

  try {
    // Get job to find owner's email
    const jobDoc = await firestore.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'CV not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    
    // Check if contact form is enabled
    if (!job.interactiveData?.contactFormEnabled) {
      throw new functions.https.HttpsError('failed-precondition', 'Contact form is not enabled');
    }

    // Get user's email
    const userRecord = await auth.getUser(job.userId);
    const recipientEmail = job.interactiveData?.contactEmail || userRecord.email;

    if (!recipientEmail) {
      throw new functions.https.HttpsError('failed-precondition', 'Recipient email not configured');
    }

    // Store submission
    const submissionId = await enhancedDbService.storeContactFormSubmission({
      jobId,
      senderName,
      senderEmail,
      senderPhone,
      company,
      message,
      status: 'pending',
      metadata: {
        userAgent: data.userAgent,
        source: data.source || 'public-profile'
      }
    });

    // Get public profile URL
    const profileDoc = await firestore.collection('publicProfiles').doc(jobId).get();
    const profile = profileDoc.data() as PublicCVProfile;
    const cvUrl = profile ? `https://cvplus.com/cv/${profile.slug}` : 'https://cvplus.com';

    // Send email
    try {
      await integrationsService.sendEmail({
        to: recipientEmail,
        subject: `New Contact from Your CV - ${senderName}`,
        html: integrationsService.generateContactFormEmailTemplate({
          senderName,
          senderEmail,
          senderPhone,
          company,
          message,
          cvUrl
        })
      });

      // Update submission status
      await firestore.collection('contactSubmissions').doc(submissionId).update({
        status: 'sent'
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Update submission status
      await firestore.collection('contactSubmissions').doc(submissionId).update({
        status: 'failed'
      });
      throw new functions.https.HttpsError('internal', 'Failed to send message');
    }

    return {
      success: true,
      message: 'Your message has been sent successfully!'
    };
  } catch (error: any) {
    console.error('Error submitting contact form:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Track QR code scan
 */
export const trackQRScan = functions.https.onCall(async (data) => {
  const { jobId, metadata } = data;
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  try {
    await enhancedDbService.trackQRCodeScan({
      jobId,
      location: metadata?.location,
      device: metadata?.device,
      referrer: metadata?.referrer
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error tracking QR scan:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});