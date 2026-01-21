// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Social Media Integration Functions for Firebase Cloud Functions
 * 
 * These functions handle social media integration and analytics for public profiles.
 */

import { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Types
export interface GenerateSocialMediaIntegrationRequest {
  profileId: string;
  platforms: string[];
}

export interface SocialProfileRequest {
  profileId: string;
  platform: string;
  handle: string;
  url: string;
  displayName?: string;
}

export interface TrackSocialClickRequest {
  profileId: string;
  platform: string;
  clickType: 'profile' | 'share' | 'follow';
}

export interface GetSocialAnalyticsRequest {
  profileId: string;
  timeRange?: '7d' | '30d' | '90d';
}

export interface UpdateSocialDisplaySettingsRequest {
  profileId: string;
  settings: {
    showSocialLinks?: boolean;
    socialButtonStyle?: 'icons' | 'buttons' | 'minimal';
    displayOrder?: string[];
  };
}

/**
 * Generate social media integration for a profile
 */
export async function generateSocialMediaIntegration(request: CallableRequest<GenerateSocialMediaIntegrationRequest>): Promise<any> {
  const { profileId, platforms } = request.data;

  if (!profileId || !platforms || !Array.isArray(platforms)) {
    throw new HttpsError('invalid-argument', 'Profile ID and platforms array are required');
  }

  try {
    const integrationData = {
      profileId,
      platforms,
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
      settings: {
        showSocialLinks: true,
        socialButtonStyle: 'icons',
        displayOrder: platforms
      }
    };

    const docRef = await admin.firestore()
      .collection('socialIntegrations')
      .add(integrationData);

    return {
      success: true,
      integrationId: docRef.id,
      platforms,
      message: 'Social media integration created successfully'
    };

  } catch (error) {
    console.error('Error generating social media integration:', error);
    throw new HttpsError('internal', 'Failed to generate social media integration');
  }
}

/**
 * Add a social profile to a public profile
 */
export async function addSocialProfile(request: CallableRequest<SocialProfileRequest>): Promise<any> {
  const { profileId, platform, handle, url, displayName } = request.data;

  if (!profileId || !platform || !handle || !url) {
    throw new HttpsError('invalid-argument', 'Profile ID, platform, handle, and URL are required');
  }

  try {
    const socialProfileData = {
      profileId,
      platform,
      handle,
      url,
      displayName: displayName || handle,
      addedAt: FieldValue.serverTimestamp(),
      isActive: true,
      clicks: 0
    };

    const docRef = await admin.firestore()
      .collection('socialProfiles')
      .add(socialProfileData);

    return {
      success: true,
      socialProfileId: docRef.id,
      message: 'Social profile added successfully'
    };

  } catch (error) {
    console.error('Error adding social profile:', error);
    throw new HttpsError('internal', 'Failed to add social profile');
  }
}

/**
 * Update a social profile
 */
export async function updateSocialProfile(request: CallableRequest<SocialProfileRequest & { socialProfileId: string }>): Promise<any> {
  const { socialProfileId, handle, url, displayName } = request.data;

  if (!socialProfileId) {
    throw new HttpsError('invalid-argument', 'Social profile ID is required');
  }

  try {
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (handle) updateData.handle = handle;
    if (url) updateData.url = url;
    if (displayName) updateData.displayName = displayName;

    await admin.firestore()
      .collection('socialProfiles')
      .doc(socialProfileId)
      .update(updateData);

    return {
      success: true,
      message: 'Social profile updated successfully'
    };

  } catch (error) {
    console.error('Error updating social profile:', error);
    throw new HttpsError('internal', 'Failed to update social profile');
  }
}

/**
 * Remove a social profile
 */
export async function removeSocialProfile(request: CallableRequest<{ socialProfileId: string }>): Promise<any> {
  const { socialProfileId } = request.data;

  if (!socialProfileId) {
    throw new HttpsError('invalid-argument', 'Social profile ID is required');
  }

  try {
    await admin.firestore()
      .collection('socialProfiles')
      .doc(socialProfileId)
      .update({
        isActive: false,
        removedAt: FieldValue.serverTimestamp()
      });

    return {
      success: true,
      message: 'Social profile removed successfully'
    };

  } catch (error) {
    console.error('Error removing social profile:', error);
    throw new HttpsError('internal', 'Failed to remove social profile');
  }
}

/**
 * Track social media click
 */
export async function trackSocialClick(request: CallableRequest<TrackSocialClickRequest>): Promise<any> {
  const { profileId, platform, clickType } = request.data;

  if (!profileId || !platform || !clickType) {
    throw new HttpsError('invalid-argument', 'Profile ID, platform, and click type are required');
  }

  try {
    // Track the click event
    await admin.firestore()
      .collection('socialClicks')
      .add({
        profileId,
        platform,
        clickType,
        clickedAt: FieldValue.serverTimestamp(),
        ipAddress: request.rawRequest.ip || 'unknown',
        userAgent: request.rawRequest.get('user-agent') || 'unknown'
      });

    // Update click counter on the social profile
    const socialProfileQuery = await admin.firestore()
      .collection('socialProfiles')
      .where('profileId', '==', profileId)
      .where('platform', '==', platform)
      .limit(1)
      .get();

    if (!socialProfileQuery.empty) {
      const socialProfileDoc = socialProfileQuery.docs[0];
      if (socialProfileDoc) {
        await socialProfileDoc.ref.update({
          clicks: FieldValue.increment(1)
        });
      }
    }

    return {
      success: true,
      message: 'Social click tracked successfully'
    };

  } catch (error) {
    console.error('Error tracking social click:', error);
    throw new HttpsError('internal', 'Failed to track social click');
  }
}

/**
 * Get social media analytics
 */
export async function getSocialAnalytics(request: CallableRequest<GetSocialAnalyticsRequest>): Promise<any> {
  const { profileId, timeRange = '30d' } = request.data;

  if (!profileId) {
    throw new HttpsError('invalid-argument', 'Profile ID is required');
  }

  try {
    // Calculate date range
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get click data
    const clicksQuery = await admin.firestore()
      .collection('socialClicks')
      .where('profileId', '==', profileId)
      .where('clickedAt', '>=', startDate)
      .get();

    const clicksByPlatform: { [key: string]: number } = {};
    const clicksByType: { [key: string]: number } = {};

    clicksQuery.docs.forEach(doc => {
      const data = doc.data();
      clicksByPlatform[data.platform] = (clicksByPlatform[data.platform] || 0) + 1;
      clicksByType[data.clickType] = (clicksByType[data.clickType] || 0) + 1;
    });

    return {
      success: true,
      analytics: {
        timeRange,
        totalClicks: clicksQuery.size,
        clicksByPlatform,
        clicksByType,
        period: {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        }
      }
    };

  } catch (error) {
    console.error('Error getting social analytics:', error);
    throw new HttpsError('internal', 'Failed to get social analytics');
  }
}

/**
 * Update social display settings
 */
export async function updateSocialDisplaySettings(request: CallableRequest<UpdateSocialDisplaySettingsRequest>): Promise<any> {
  const { profileId, settings } = request.data;

  if (!profileId || !settings) {
    throw new HttpsError('invalid-argument', 'Profile ID and settings are required');
  }

  try {
    // Find the social integration for this profile
    const integrationQuery = await admin.firestore()
      .collection('socialIntegrations')
      .where('profileId', '==', profileId)
      .limit(1)
      .get();

    if (integrationQuery.empty) {
      throw new HttpsError('not-found', 'Social integration not found for profile');
    }

    const integrationDoc = integrationQuery.docs[0];
    if (integrationDoc) {
      await integrationDoc.ref.update({
        settings: {
          ...integrationDoc.data().settings,
          ...settings
        },
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    return {
      success: true,
      message: 'Social display settings updated successfully'
    };

  } catch (error) {
    console.error('Error updating social display settings:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to update social display settings');
  }
}