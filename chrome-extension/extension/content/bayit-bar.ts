/**
 * Bayit+ Bar
 *
 * Full-width horizontal bar at bottom of video container.
 * Glassmorphism styling with blur backdrop.
 * Controls: Bayit+ logo | Translate toggle | Language select | Subtitle toggle | Status | Close
 */

import i18next from 'i18next';
import { createLogger } from '@/lib/logger';
import { SUPPORTED_LANGUAGES } from '@/config/constants';

const logger = createLogger('BayitBar');

const BAR_HEIGHT_PX = 56;

export interface BayitBarCallbacks {
  onStartDubbing: (targetLanguage: string) => void;
  onStopDubbing: () => void;
  onLanguageChange: (language: string) => void;
  onToggleSubtitles: (enabled: boolean) => void;
  onClose: () => void;
}

export class BayitBar {
  private element: HTMLDivElement | null = null;
  private callbacks: BayitBarCallbacks;
  private isActive = false;
  private subtitlesEnabled = true;
  private currentLanguage = 'en';
  private translateBtn: HTMLButtonElement | null = null;
  private statusSpan: HTMLSpanElement | null = null;
  private subtitleBtn: HTMLButtonElement | null = null;

  constructor(callbacks: BayitBarCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Create and return the bar element (not yet attached to DOM)
   */
  create(): HTMLDivElement {
    if (this.element) {
      this.destroy();
    }

    this.element = document.createElement('div');
    this.element.setAttribute('data-bayit-companion-bar', 'true');
    this.element.style.cssText = [
      'position: absolute',
      'bottom: 0',
      'left: 0',
      'right: 0',
      `height: ${BAR_HEIGHT_PX}px`,
      'background: rgba(0, 0, 0, 0.75)',
      'backdrop-filter: blur(12px)',
      '-webkit-backdrop-filter: blur(12px)',
      'display: flex',
      'align-items: center',
      'gap: 12px',
      'padding: 0 16px',
      'font-family: system-ui, -apple-system, sans-serif',
      'font-size: 13px',
      'color: white',
      'z-index: 999999',
      'transition: opacity 0.2s ease',
    ].join('; ');

    this.buildDOM(this.element);
    this.bindEvents();

    logger.info('Bayit+ Bar created');
    return this.element;
  }

  /**
   * Build bar DOM using safe DOM API (no innerHTML)
   */
  private buildDOM(parent: HTMLElement): void {
    const t = (key: string, fallback: string) => i18next.t(key, fallback);

    // Bayit+ text icon
    const logo = document.createElement('span');
    logo.textContent = t('bar.logo', 'Bayit+');
    Object.assign(logo.style, { fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', opacity: '0.9' });

    // Translate toggle button
    const translateBtn = document.createElement('button');
    translateBtn.setAttribute('data-role', 'translate');
    translateBtn.textContent = t('bar.translate', 'Translate');
    translateBtn.setAttribute('aria-label', t('bar.startTranslation', 'Start translation'));
    translateBtn.style.cssText = this.btnStyle('#3b82f6');

    // Language select
    const languageSelect = document.createElement('select');
    languageSelect.setAttribute('data-role', 'language');
    languageSelect.setAttribute('aria-label', t('bar.targetLanguage', 'Target language'));
    languageSelect.style.cssText = this.selectStyle();
    for (const lang of SUPPORTED_LANGUAGES) {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      languageSelect.appendChild(option);
    }

    // Subtitle toggle
    const subtitleBtn = document.createElement('button');
    subtitleBtn.setAttribute('data-role', 'subtitles');
    subtitleBtn.textContent = t('bar.subtitlesButton', 'CC');
    subtitleBtn.setAttribute('aria-label', t('bar.toggleSubtitles', 'Toggle subtitles'));
    subtitleBtn.style.cssText = this.btnStyle('rgba(255,255,255,0.25)');

    // Status text
    const statusSpan = document.createElement('span');
    statusSpan.setAttribute('data-role', 'status');
    Object.assign(statusSpan.style, {
      flex: '1', textAlign: 'center', fontSize: '12px', opacity: '0.7',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('data-role', 'close');
    closeBtn.textContent = t('bar.closeButton', '\u00D7');
    closeBtn.setAttribute('aria-label', t('bar.close', 'Close Bayit+ Bar'));
    Object.assign(closeBtn.style, {
      background: 'transparent', border: 'none', color: 'white', cursor: 'pointer',
      fontSize: '16px', padding: '12px 12px', opacity: '0.7', lineHeight: '1', minWidth: '44px', minHeight: '44px',
    });

    parent.appendChild(logo);
    parent.appendChild(translateBtn);
    parent.appendChild(languageSelect);
    parent.appendChild(subtitleBtn);
    parent.appendChild(statusSpan);
    parent.appendChild(closeBtn);
  }

  private btnStyle(bg: string): string {
    return [
      `background: ${bg}`,
      'border: none',
      'color: white',
      'cursor: pointer',
      'font-size: 12px',
      'font-weight: 600',
      'padding: 14px 14px',
      'border-radius: 6px',
      'transition: background 0.2s',
      'white-space: nowrap',
    ].join('; ');
  }

  private selectStyle(): string {
    return [
      'background: rgba(255, 255, 255, 0.1)',
      'border: 1px solid rgba(255, 255, 255, 0.2)',
      'color: white',
      'cursor: pointer',
      'font-size: 12px',
      'padding: 12px 8px',
      'border-radius: 6px',
      'outline: none',
      'min-height: 44px',
    ].join('; ');
  }

  private bindEvents(): void {
    if (!this.element) return;

    this.translateBtn = this.element.querySelector('[data-role="translate"]');
    this.statusSpan = this.element.querySelector('[data-role="status"]');
    this.subtitleBtn = this.element.querySelector('[data-role="subtitles"]');
    const languageSelect = this.element.querySelector('[data-role="language"]') as HTMLSelectElement | null;
    const closeBtn = this.element.querySelector('[data-role="close"]');

    this.translateBtn?.addEventListener('click', () => {
      if (this.isActive) {
        this.callbacks.onStopDubbing();
      } else {
        this.callbacks.onStartDubbing(this.currentLanguage);
      }
    });

    languageSelect?.addEventListener('change', (e) => {
      this.currentLanguage = (e.target as HTMLSelectElement).value;
      this.callbacks.onLanguageChange(this.currentLanguage);
    });

    this.subtitleBtn?.addEventListener('click', () => {
      this.subtitlesEnabled = !this.subtitlesEnabled;
      this.updateSubtitleButton();
      this.callbacks.onToggleSubtitles(this.subtitlesEnabled);
    });

    closeBtn?.addEventListener('click', () => {
      this.callbacks.onClose();
    });
  }

  private updateSubtitleButton(): void {
    if (!this.subtitleBtn) return;
    this.subtitleBtn.style.background = this.subtitlesEnabled
      ? 'rgba(59, 130, 246, 0.6)'
      : 'rgba(255, 255, 255, 0.25)';
  }

  /**
   * Update bar state (active/inactive dubbing)
   */
  updateState(active: boolean, status?: string): void {
    this.isActive = active;

    if (this.translateBtn) {
      this.translateBtn.textContent = active
        ? i18next.t('bar.stop', 'Stop')
        : i18next.t('bar.translate', 'Translate');
      this.translateBtn.style.background = active ? '#ef4444' : '#3b82f6';
    }

    if (status && this.statusSpan) {
      this.statusSpan.textContent = status;
    }
  }

  /**
   * Show a status message with level
   */
  showStatus(text: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    if (!this.statusSpan) return;

    this.statusSpan.textContent = text;

    const colorMap: Record<string, string> = {
      info: 'rgba(255, 255, 255, 0.7)',
      warn: 'rgba(251, 191, 36, 0.9)',
      error: 'rgba(239, 68, 68, 0.9)',
      success: 'rgba(34, 197, 94, 0.9)',
    };
    this.statusSpan.style.color = colorMap[level];

    logger.debug('Status shown', { text, level });
  }

  /**
   * Get bar height for subtitle positioning
   */
  getHeight(): number {
    return BAR_HEIGHT_PX;
  }

  /**
   * Destroy the bar element
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.translateBtn = null;
    this.statusSpan = null;
    this.subtitleBtn = null;
    logger.info('Bayit+ Bar destroyed');
  }
}
