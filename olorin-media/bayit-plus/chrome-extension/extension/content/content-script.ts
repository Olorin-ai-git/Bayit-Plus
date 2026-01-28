/**
 * Content Script
 *
 * Injected on supported streaming sites
 * Handles:
 * - Site detection
 * - Video element finding
 * - UI overlay display
 * - Audio control
 * - Communication with service worker and offscreen document
 */

import { createLogger, generateCorrelationId } from '@/lib/logger';
import { detectSite, isSupportedSite } from './site-detector';
import { VideoFinder } from './video-finder';
import { AudioController } from './audio-controller';
import { UIOverlay } from './ui-overlay';

const logger = createLogger('ContentScript');

class ContentScriptManager {
  private videoFinder: VideoFinder | null = null;
  private audioController: AudioController | null = null;
  private uiOverlay: UIOverlay | null = null;
  private currentVideo: HTMLVideoElement | null = null;
  private sessionId: string | null = null;
  private isActive = false;

  constructor() {
    logger.info('Content script loaded', { url: window.location.href });
    this.initialize();
  }

  /**
   * Initialize content script
   */
  private async initialize(): Promise<void> {
    try {
      // Check if site is supported
      if (!isSupportedSite()) {
        logger.debug('Site not supported, exiting');
        return;
      }

      const siteInfo = detectSite();
      if (!siteInfo) {
        return;
      }

      logger.info('Initializing on supported site', { site: siteInfo.name });

      // Wait for page to load
      if (document.readyState === 'loading') {
        await new Promise((resolve) => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize video finder
      this.videoFinder = new VideoFinder();
      this.videoFinder.start(
        siteInfo,
        this.handleVideoFound.bind(this),
        this.handleVideoRemoved.bind(this)
      );

      // Listen for messages from service worker and offscreen
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

      // Mark content script as ready
      document.documentElement.setAttribute('data-bayit-translator-ready', 'true');

      logger.info('Content script initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize content script', { error: String(error) });
    }
  }

  /**
   * Handle video element found
   */
  private handleVideoFound(video: HTMLVideoElement): void {
    logger.info('Video element found');

    // Use first video found
    if (!this.currentVideo) {
      this.currentVideo = video;

      // Initialize audio controller
      this.audioController = new AudioController();
      this.audioController.attach(video);

      // Show UI overlay
      this.showUIOverlay();
    }
  }

  /**
   * Handle video element removed
   */
  private handleVideoRemoved(video: HTMLVideoElement): void {
    logger.info('Video element removed');

    if (this.currentVideo === video) {
      // Stop dubbing if active
      if (this.isActive) {
        this.stopDubbing();
      }

      // Cleanup
      if (this.audioController) {
        this.audioController.detach();
        this.audioController = null;
      }

      if (this.uiOverlay) {
        this.uiOverlay.hide();
        this.uiOverlay = null;
      }

      this.currentVideo = null;
    }
  }

  /**
   * Show UI overlay
   */
  private showUIOverlay(): void {
    if (!this.currentVideo) return;

    this.uiOverlay = new UIOverlay({
      onStartDubbing: this.startDubbing.bind(this),
      onStopDubbing: this.stopDubbing.bind(this),
      onLanguageChange: (language) => {
        logger.info('Language changed', { language });
      },
      onVolumeChange: (originalVolume, dubbedVolume) => {
        logger.info('Volume changed', { originalVolume, dubbedVolume });

        // Update original volume
        if (this.audioController) {
          this.audioController.setVolume(originalVolume);
        }

        // Update dubbed volume (send to offscreen)
        chrome.runtime.sendMessage({
          type: 'SET_VOLUME',
          dubbedVolume,
        });
      },
    });

    this.uiOverlay.show(this.currentVideo);
  }

  /**
   * Start dubbing
   */
  private async startDubbing(targetLanguage: string): Promise<void> {
    try {
      logger.info('Starting dubbing', { targetLanguage });

      // Check authentication
      const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });

      if (!authStatus.authenticated) {
        logger.warn('User not authenticated');
        alert('Please log in to use the Bayit+ Translator');
        chrome.runtime.openOptionsPage();
        return;
      }

      // Check quota
      const usageData = await chrome.runtime.sendMessage({ type: 'GET_USAGE_DATA' });

      if (usageData.usage.dailyMinutesUsed >= 5.0 && authStatus.user.subscription_tier === 'free') {
        logger.warn('Quota exhausted');
        alert('Daily quota of 5 minutes exhausted. Upgrade to premium for unlimited dubbing.');
        chrome.runtime.openOptionsPage();
        return;
      }

      // Create dubbing session on backend
      this.sessionId = generateCorrelationId();

      // Get auth token
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Create offscreen document if needed
      await this.ensureOffscreenDocument();

      // Start dubbing session
      const response = await chrome.runtime.sendMessage({
        type: 'START_DUBBING',
        sessionId: this.sessionId,
        tabId: await this.getTabId(),
        targetLanguage,
        token,
      });

      if (!response.success) {
        throw new Error('Failed to start dubbing session');
      }

      // Update state
      this.isActive = true;

      // Fade out original audio
      if (this.audioController) {
        await this.audioController.fadeOut(500);
      }

      // Update UI
      if (this.uiOverlay) {
        this.uiOverlay.updateState(true, 'Connected');
      }

      // Notify service worker
      await chrome.runtime.sendMessage({
        type: 'START_DUBBING_SESSION',
        sessionId: this.sessionId,
      });

      logger.info('Dubbing started successfully', { sessionId: this.sessionId });
    } catch (error) {
      logger.error('Failed to start dubbing', { error: String(error) });
      alert('Failed to start dubbing. Please try again.');
    }
  }

  /**
   * Stop dubbing
   */
  private async stopDubbing(): Promise<void> {
    try {
      logger.info('Stopping dubbing');

      // Stop dubbing session
      await chrome.runtime.sendMessage({
        type: 'STOP_DUBBING',
      });

      // Update state
      this.isActive = false;
      this.sessionId = null;

      // Fade in original audio
      if (this.audioController) {
        await this.audioController.fadeIn(1.0, 500);
      }

      // Update UI
      if (this.uiOverlay) {
        this.uiOverlay.updateState(false);
      }

      // Notify service worker
      await chrome.runtime.sendMessage({
        type: 'END_DUBBING_SESSION',
      });

      logger.info('Dubbing stopped successfully');
    } catch (error) {
      logger.error('Failed to stop dubbing', { error: String(error) });
    }
  }

  /**
   * Handle messages from other extension contexts
   */
  private handleMessage(
    message: Record<string, unknown>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean {
    logger.debug('Message received', { type: message.type });

    switch (message.type) {
      case 'TRANSCRIPT_RECEIVED':
        logger.debug('Transcript received', { transcript: message.transcript });
        // TODO: Display transcript in UI
        break;

      case 'CONNECTION_STATUS_CHANGED':
        logger.info('Connection status changed', { status: message.status });
        if (this.uiOverlay) {
          this.uiOverlay.showStatus(message.status as string);
        }
        break;

      case 'DUBBING_ERROR':
        logger.error('Dubbing error', { error: message.error });
        if (this.isActive) {
          this.stopDubbing();
        }
        alert(`Dubbing error: ${message.error}`);
        break;

      case 'AUTH_STATE_CHANGED':
        logger.info('Auth state changed', { authenticated: message.authenticated });
        break;

      default:
        logger.warn('Unknown message type', { type: message.type });
    }

    return false;
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string | null> {
    const result = await chrome.storage.local.get('jwt_enc');
    if (!result.jwt_enc) return null;

    // Decrypt token
    const { decryptToken, getEncryptionKey } = await import('@/background/auth-manager');
    const key = await getEncryptionKey();
    return await decryptToken(result.jwt_enc, key);
  }

  /**
   * Get current tab ID
   */
  private async getTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id || 0;
  }

  /**
   * Ensure offscreen document exists
   */
  private async ensureOffscreenDocument(): Promise<void> {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });

    if (existingContexts.length > 0) {
      logger.debug('Offscreen document already exists');
      return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['USER_MEDIA'],
      justification: 'Audio capture and processing for real-time dubbing',
    });

    logger.info('Offscreen document created');
  }
}

// Initialize content script manager
const contentScriptManager = new ContentScriptManager();

// Export for testing
export { ContentScriptManager };
