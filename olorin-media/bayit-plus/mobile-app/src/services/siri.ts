/**
 * Siri Service - Siri Shortcuts Bridge
 *
 * Wraps native SiriModule for Siri Shortcuts integration:
 * - Donate intents to Siri for voice shortcuts
 * - "Add to Siri" functionality
 * - Intent management
 */

import { NativeModules, Platform } from 'react-native';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('siri');

const { SiriModule } = NativeModules;

class SiriService {
  /**
   * Donate "Play Content" intent to Siri
   * Call this when user plays content to teach Siri
   */
  async donatePlayIntent(contentId: string, contentTitle: string, contentType: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donatePlayIntent(contentId, contentTitle, contentType);
      moduleLogger.debug('[SiriService] Play intent donated:', contentTitle);
    } catch (error) {
      moduleLogger.error('Failed to donate play intent:', error', error);
    }
  }

  /**
   * Donate "Search Content" intent to Siri
   * Call this when user performs a search
   */
  async donateSearchIntent(query: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateSearchIntent(query);
      moduleLogger.debug('[SiriService] Search intent donated:', query);
    } catch (error) {
      moduleLogger.error('Failed to donate search intent:', error', error);
    }
  }

  /**
   * Donate "Open Widget" intent to Siri
   * Call this when user opens a widget
   */
  async donateWidgetIntent(widgetType: string, channelId: string, channelName: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateWidgetIntent(widgetType, channelId, channelName);
      moduleLogger.debug('[SiriService] Widget intent donated:', channelName);
    } catch (error) {
      moduleLogger.error('Failed to donate widget intent:', error', error);
    }
  }

  /**
   * Donate "Resume Watching" intent to Siri
   * Call this when user resumes watching
   */
  async donateResumeIntent(): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateResumeIntent();
      moduleLogger.debug('[SiriService] Resume watching intent donated');
    } catch (error) {
      moduleLogger.error('Failed to donate resume watching intent:', error', error);
    }
  }

  /**
   * Delete all Siri shortcuts
   */
  async deleteAllShortcuts(): Promise<number> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return 0;
    }

    try {
      const result = await SiriModule.deleteAllShortcuts();
      moduleLogger.debug(`[SiriService] Deleted ${result.deleted} shortcuts`);
      return result.deleted;
    } catch (error) {
      moduleLogger.error('Failed to delete shortcuts:', error', error);
      return 0;
    }
  }

  /**
   * Get all user's Siri shortcuts
   */
  async getSuggestedShortcuts(): Promise<any[]> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return [];
    }

    try {
      const result = await SiriModule.getSuggestedShortcuts();
      return result.shortcuts || [];
    } catch (error) {
      moduleLogger.error('Failed to get shortcuts:', error', error);
      return [];
    }
  }
}

// Export singleton instance
export const siriService = new SiriService();
