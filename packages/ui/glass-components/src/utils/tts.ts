/**
 * TTS Integration Utilities
 * Text-to-speech announcement queueing and audio ducking for notifications
 */

import type { NotificationLevel, Notification } from '../native/components/GlassToast/types';
import { sanitizeForTTS } from './sanitization';

interface TTSConfig {
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
}

const TTS_CONFIG: Record<NotificationLevel, TTSConfig> = {
  debug: { enabled: false, priority: 'low' },
  info: { enabled: true, priority: 'low' },
  warning: { enabled: true, priority: 'medium' },
  success: { enabled: true, priority: 'low' },
  error: { enabled: true, priority: 'high' },
};

interface AnnouncementQueueItem {
  id: string;
  text: string;
  priority: number;
  timestamp: number;
}

class TTSAnnouncementQueue {
  private queue: AnnouncementQueueItem[] = [];
  private isAnnouncing: boolean = false;
  private ttsService: any = null;
  private audioDuckingService: any = null;

  setTTSService(service: any) {
    this.ttsService = service;
  }

  setAudioDuckingService(service: any) {
    this.audioDuckingService = service;
  }

  async announce(notification: Notification): Promise<void> {
    const config = TTS_CONFIG[notification.level];

    if (!config.enabled || !this.ttsService) {
      return;
    }

    const text = notification.title
      ? `${notification.title}. ${notification.message}`
      : notification.message;

    const sanitized = sanitizeForTTS(text);

    const priority = config.priority === 'high' ? 3 : config.priority === 'medium' ? 2 : 1;

    const item: AnnouncementQueueItem = {
      id: notification.id,
      text: sanitized,
      priority,
      timestamp: Date.now(),
    };

    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

    if (!this.isAnnouncing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isAnnouncing = false;
      return;
    }

    this.isAnnouncing = true;
    const item = this.queue.shift();

    if (!item || !this.ttsService) {
      this.isAnnouncing = false;
      return;
    }

    try {
      // Duck background audio if available
      if (this.audioDuckingService) {
        await this.audioDuckingService.duck();
      }

      // Speak announcement
      await this.ttsService.speak(item.text, {
        priority: item.priority > 2 ? 'high' : 'normal',
        interruptible: item.priority < 3,
      });

      // Restore audio volume
      if (this.audioDuckingService) {
        await this.audioDuckingService.restore();
      }
    } catch (error) {
      console.error('[TTS] Announcement failed:', error);
    }

    // Process next item with small delay
    setTimeout(() => this.processQueue(), 100);
  }

  clear(): void {
    this.queue = [];
    this.isAnnouncing = false;
  }

  clearById(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
  }
}

// Global singleton instance
export const ttsAnnouncementQueue = new TTSAnnouncementQueue();

/**
 * Initialize TTS for notifications
 * Call this in app initialization to hook up TTS service
 */
export const initNotificationTTS = (
  ttsService: any,
  audioDuckingService?: any
): void => {
  ttsAnnouncementQueue.setTTSService(ttsService);
  if (audioDuckingService) {
    ttsAnnouncementQueue.setAudioDuckingService(audioDuckingService);
  }
};

/**
 * Announce notification via TTS
 */
export const announceNotification = async (
  notification: Notification
): Promise<void> => {
  await ttsAnnouncementQueue.announce(notification);
};

/**
 * Clear TTS announcement queue
 */
export const clearTTSQueue = (): void => {
  ttsAnnouncementQueue.clear();
};
