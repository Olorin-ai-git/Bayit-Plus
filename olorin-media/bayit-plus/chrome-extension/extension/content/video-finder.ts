/**
 * Video Finder
 *
 * Finds and monitors video elements on streaming sites
 */

import { createLogger } from '@/lib/logger';
import type { SiteInfo } from './site-detector';

const logger = createLogger('VideoFinder');

export class VideoFinder {
  private observer: MutationObserver | null = null;
  private videoElements: Set<HTMLVideoElement> = new Set();
  private onVideoFound: ((video: HTMLVideoElement) => void) | null = null;
  private onVideoRemoved: ((video: HTMLVideoElement) => void) | null = null;

  /**
   * Start finding video elements
   */
  start(
    siteInfo: SiteInfo,
    onVideoFound: (video: HTMLVideoElement) => void,
    onVideoRemoved: (video: HTMLVideoElement) => void
  ): void {
    this.onVideoFound = onVideoFound;
    this.onVideoRemoved = onVideoRemoved;

    logger.info('Starting video finder', {
      site: siteInfo.name,
      selector: siteInfo.videoSelector,
    });

    // Find existing videos
    this.findExistingVideos(siteInfo.videoSelector);

    // Watch for new videos (dynamic content)
    this.startObserver(siteInfo.videoSelector);
  }

  /**
   * Find existing video elements
   */
  private findExistingVideos(selector: string): void {
    const videos = document.querySelectorAll<HTMLVideoElement>(selector);

    logger.info('Found existing videos', { count: videos.length });

    videos.forEach((video) => {
      if (!this.videoElements.has(video)) {
        this.videoElements.add(video);

        if (this.onVideoFound) {
          this.onVideoFound(video);
        }
      }
    });
  }

  /**
   * Start mutation observer to watch for new videos
   */
  private startObserver(selector: string): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if node itself is a video
            if (element.matches(selector)) {
              const video = element as HTMLVideoElement;
              if (!this.videoElements.has(video)) {
                this.videoElements.add(video);
                logger.info('New video element found');

                if (this.onVideoFound) {
                  this.onVideoFound(video);
                }
              }
            }

            // Check for video elements within node
            const videos = element.querySelectorAll<HTMLVideoElement>(selector);
            videos.forEach((video) => {
              if (!this.videoElements.has(video)) {
                this.videoElements.add(video);
                logger.info('New video element found (nested)');

                if (this.onVideoFound) {
                  this.onVideoFound(video);
                }
              }
            });
          }
        });

        // Check removed nodes
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if node itself is a video
            if (element.matches(selector)) {
              const video = element as HTMLVideoElement;
              if (this.videoElements.has(video)) {
                this.videoElements.delete(video);
                logger.info('Video element removed');

                if (this.onVideoRemoved) {
                  this.onVideoRemoved(video);
                }
              }
            }

            // Check for video elements within node
            const videos = element.querySelectorAll<HTMLVideoElement>(selector);
            videos.forEach((video) => {
              if (this.videoElements.has(video)) {
                this.videoElements.delete(video);
                logger.info('Video element removed (nested)');

                if (this.onVideoRemoved) {
                  this.onVideoRemoved(video);
                }
              }
            });
          }
        });
      });
    });

    // Observe entire document
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    logger.info('Mutation observer started');
  }

  /**
   * Stop video finder
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.videoElements.clear();
    this.onVideoFound = null;
    this.onVideoRemoved = null;

    logger.info('Video finder stopped');
  }

  /**
   * Get all current video elements
   */
  getVideoElements(): HTMLVideoElement[] {
    return Array.from(this.videoElements);
  }

  /**
   * Get primary video element (first one)
   */
  getPrimaryVideo(): HTMLVideoElement | null {
    const videos = Array.from(this.videoElements);
    return videos.length > 0 ? videos[0] : null;
  }
}
