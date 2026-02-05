/**
 * Bar Controller
 *
 * Positioning engine and lifecycle manager for the Bayit+ Bar
 * and SubtitleDisplay. Finds the appropriate video container,
 * manages ResizeObserver, and handles fullscreen changes.
 */

import { createLogger } from '@/lib/logger';
import { SUPPORTED_SITES } from '@/config/constants';
import { BayitBar } from './bayit-bar';
import { SubtitleDisplay } from './subtitle-display';
import type { BayitBarCallbacks } from './bayit-bar';

const logger = createLogger('BarController');

const MAX_PARENT_WALK = 3;

export class BarController {
  private bar: BayitBar;
  private subtitleDisplay: SubtitleDisplay;
  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(callbacks: BayitBarCallbacks) {
    this.bar = new BayitBar(callbacks);
    this.subtitleDisplay = new SubtitleDisplay(this.bar.getHeight());
  }

  /**
   * Attach bar and subtitles to the video's container element
   */
  attach(video: HTMLVideoElement): void {
    this.container = this.findVideoContainer(video);

    if (!this.container) {
      logger.warn('Could not find suitable video container, using parent');
      this.container = video.parentElement;
    }

    if (!this.container) {
      logger.error('No container available for bar');
      return;
    }

    // Ensure container has relative/absolute positioning for overlay children
    const containerStyle = getComputedStyle(this.container);
    if (containerStyle.position === 'static') {
      this.container.style.position = 'relative';
    }

    // Create and append bar + subtitles
    const barEl = this.bar.create();
    const subtitleEl = this.subtitleDisplay.create();

    this.container.appendChild(subtitleEl);
    this.container.appendChild(barEl);

    // Watch for container resizes (fullscreen, window changes)
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        logger.debug('Container resized', { width, height });
        this.ensureContainerPositioning();
      }
    });
    this.resizeObserver.observe(this.container);

    logger.info('BarController attached to video container');
  }

  /**
   * Walk up from <video> to find an appropriate positioned container.
   * Uses site-specific containerHint selectors first, then walks parents.
   */
  private findVideoContainer(video: HTMLVideoElement): HTMLElement | null {
    const hostname = window.location.hostname;

    // Try site-specific container hint
    const site = SUPPORTED_SITES.find((s) => hostname.includes(s.hostname));
    if (site) {
      const hint = site.containerHint;
      if (hint) {
        const hintEl = video.closest(hint) as HTMLElement | null;
        if (hintEl) {
          logger.info('Found container via site hint', { hint });
          return hintEl;
        }
      }
    }

    // Walk up parents looking for a positioned element
    let current: HTMLElement | null = video.parentElement;
    for (let i = 0; i < MAX_PARENT_WALK && current; i++) {
      const pos = getComputedStyle(current).position;
      if (pos === 'relative' || pos === 'absolute' || pos === 'fixed') {
        logger.info('Found positioned parent container', { depth: i, position: pos });
        return current;
      }
      current = current.parentElement;
    }

    // Fallback to direct parent
    return video.parentElement;
  }

  /**
   * Re-verify container positioning after resize (e.g. fullscreen toggle)
   */
  private ensureContainerPositioning(): void {
    if (!this.container) return;
    const containerStyle = getComputedStyle(this.container);
    if (containerStyle.position === 'static') {
      this.container.style.position = 'relative';
    }
  }

  /**
   * Show a subtitle line
   */
  showSubtitle(text: string): void {
    this.subtitleDisplay.showSubtitle(text);
  }

  /**
   * Hide subtitles
   */
  hideSubtitles(): void {
    this.subtitleDisplay.hide();
  }

  /**
   * Update bar state (active/inactive)
   */
  updateState(active: boolean, status?: string): void {
    this.bar.updateState(active, status);
  }

  /**
   * Show status message on bar
   */
  showStatus(text: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    this.bar.showStatus(text, level);
  }

  /**
   * Detach and clean up everything
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.subtitleDisplay.destroy();
    this.bar.destroy();
    this.container = null;

    logger.info('BarController destroyed');
  }
}
