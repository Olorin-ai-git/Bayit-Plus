/**
 * Subtitle Display
 *
 * Positioned above the Bayit+ Bar inside the video container.
 * Glassmorphism styling, centered white text, auto-fade after 5s of no new text.
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('SubtitleDisplay');

const FADE_TIMEOUT_MS = 5000;

export class SubtitleDisplay {
  private element: HTMLDivElement | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private barHeightPx: number;

  constructor(barHeightPx: number) {
    this.barHeightPx = barHeightPx;
  }

  /**
   * Create and return the subtitle overlay element (not yet attached to DOM)
   */
  create(): HTMLDivElement {
    if (this.element) {
      this.destroy();
    }

    this.element = document.createElement('div');
    this.element.setAttribute('data-bayit-companion-subtitles', 'true');
    this.element.style.cssText = [
      'position: absolute',
      `bottom: ${this.barHeightPx + 4}px`,
      'left: 10%',
      'right: 10%',
      'background: rgba(0, 0, 0, 0.8)',
      'backdrop-filter: blur(8px)',
      '-webkit-backdrop-filter: blur(8px)',
      'border-radius: 8px',
      'padding: 10px 16px',
      'color: white',
      'font-family: system-ui, -apple-system, sans-serif',
      'font-size: 16px',
      'line-height: 1.4',
      'text-align: center',
      'text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8)',
      'z-index: 999998',
      'transition: opacity 0.3s ease',
      'opacity: 0',
      'pointer-events: none',
    ].join('; ');

    logger.info('SubtitleDisplay created');
    return this.element;
  }

  /**
   * Show a subtitle line, resetting the auto-fade timer
   */
  showSubtitle(text: string): void {
    if (!this.element) return;

    this.element.textContent = text;
    this.element.style.opacity = '1';

    // Reset fade timer
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
    }

    this.fadeTimer = setTimeout(() => {
      if (this.element) {
        this.hide();
      }
    }, FADE_TIMEOUT_MS);
  }

  /**
   * Hide the subtitle overlay (fade out)
   */
  hide(): void {
    if (!this.element) return;
    this.element.style.opacity = '0';

    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  /**
   * Destroy the subtitle element
   */
  destroy(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    logger.info('SubtitleDisplay destroyed');
  }
}
