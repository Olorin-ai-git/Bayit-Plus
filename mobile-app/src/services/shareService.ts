/**
 * Share Service
 * Handles content sharing to social media and other apps
 * Uses React Native's built-in Share API
 */

import { Share, Platform } from 'react-native';
import { logger } from '../utils/logger';
import { API_BASE_URL } from './api';

const log = logger.scope('ShareService');

export interface ShareContent {
  contentId: string;
  title: string;
  contentType: 'movie' | 'series' | 'episode' | 'live' | 'radio' | 'podcast';
  description?: string;
  imageUrl?: string;
}

export interface ShareOptions {
  url?: string;
  message?: string;
  title?: string;
  subject?: string;
}

/**
 * Generate deep link for content
 */
export function generateDeepLink(content: ShareContent): string {
  const { contentId, contentType } = content;
  const baseUrl = Platform.select({
    ios: 'bayitplus://',
    android: 'bayitplus://',
    default: 'https://bayit.tv',
  });

  const paths: Record<string, string> = {
    movie: `/content/movie/${contentId}`,
    series: `/content/series/${contentId}`,
    episode: `/content/episode/${contentId}`,
    live: `/live/${contentId}`,
    radio: `/radio/${contentId}`,
    podcast: `/podcast/${contentId}`,
  };

  const path = paths[contentType] || `/content/${contentId}`;
  return `${baseUrl}${path}`;
}

/**
 * Generate shareable web link for content
 */
export function generateWebLink(content: ShareContent): string {
  const { contentId, contentType } = content;
  const webBase = 'https://bayit.tv';

  const paths: Record<string, string> = {
    movie: `/movies/${contentId}`,
    series: `/series/${contentId}`,
    episode: `/watch/${contentId}`,
    live: `/live/${contentId}`,
    radio: `/radio/${contentId}`,
    podcast: `/podcasts/${contentId}`,
  };

  const path = paths[contentType] || `/${contentId}`;
  return `${webBase}${path}`;
}

/**
 * Share content to social media or other apps
 */
export async function shareContent(content: ShareContent): Promise<boolean> {
  try {
    const webLink = generateWebLink(content);
    const deepLink = generateDeepLink(content);

    const message = Platform.select({
      ios: `${content.title}\n\nWatch on Bayit+:\n${webLink}`,
      android: `${content.title}\n\nWatch on Bayit+:\n${webLink}`,
      default: `Check out ${content.title} on Bayit+: ${webLink}`,
    });

    const shareOptions: ShareOptions = {
      title: `Bayit+ - ${content.title}`,
      message,
      url: Platform.OS === 'ios' ? webLink : undefined,
    };

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      log.info('Content shared successfully', {
        contentId: content.contentId,
        contentType: content.contentType,
        sharedWith: result.activityType || 'unknown',
      });
      return true;
    } else if (result.action === Share.dismissedAction) {
      log.info('Share dismissed by user');
      return false;
    }

    return false;
  } catch (error) {
    log.error('Failed to share content', error);
    throw new Error('Failed to share content. Please try again.');
  }
}

/**
 * Share Watch Party invite
 */
export async function shareWatchPartyInvite(
  roomCode: string,
  contentTitle?: string
): Promise<boolean> {
  try {
    const webLink = `https://bayit.tv/party/${roomCode}`;
    const deepLink = `bayitplus://party/${roomCode}`;

    const title = contentTitle
      ? `Join me to watch ${contentTitle} on Bayit+!`
      : 'Join my Watch Party on Bayit+!';

    const message = Platform.select({
      ios: `${title}\n\nRoom Code: ${roomCode}\n${webLink}`,
      android: `${title}\n\nRoom Code: ${roomCode}\n${webLink}`,
      default: `${title} Room Code: ${roomCode}. ${webLink}`,
    });

    const shareOptions: ShareOptions = {
      title: 'Bayit+ Watch Party Invite',
      message,
      url: Platform.OS === 'ios' ? webLink : undefined,
    };

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      log.info('Watch Party invite shared', { roomCode });
      return true;
    }

    return false;
  } catch (error) {
    log.error('Failed to share Watch Party invite', error);
    throw new Error('Failed to share invite. Please try again.');
  }
}

/**
 * Share app download link
 */
export async function shareAppInvite(): Promise<boolean> {
  try {
    const appStoreUrl = 'https://apps.apple.com/app/bayit-plus/id123456789';
    const playStoreUrl =
      'https://play.google.com/store/apps/details?id=tv.bayit.plus';
    const webUrl = 'https://bayit.tv';

    const storeUrl = Platform.select({
      ios: appStoreUrl,
      android: playStoreUrl,
      default: webUrl,
    });

    const message = `Watch premium Jewish content on Bayit+!\n\nDownload now:\n${storeUrl}`;

    const shareOptions: ShareOptions = {
      title: 'Bayit+ - Premium Jewish Streaming',
      message,
      url: Platform.OS === 'ios' ? storeUrl : undefined,
    };

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      log.info('App invite shared');
      return true;
    }

    return false;
  } catch (error) {
    log.error('Failed to share app invite', error);
    throw new Error('Failed to share. Please try again.');
  }
}

export default {
  shareContent,
  shareWatchPartyInvite,
  shareAppInvite,
  generateDeepLink,
  generateWebLink,
};
