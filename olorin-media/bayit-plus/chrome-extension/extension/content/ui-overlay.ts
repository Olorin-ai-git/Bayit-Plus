/**
 * UI Overlay (Vanilla TypeScript - Temporary)
 *
 * Simple dubbing controls overlay
 * TODO: Replace with React + Glass components in Phase 1 Week 3
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('UIOverlay');

export interface UIOverlayCallbacks {
  onStartDubbing: (targetLanguage: string) => void;
  onStopDubbing: () => void;
  onLanguageChange: (language: string) => void;
  onVolumeChange: (originalVolume: number, dubbedVolume: number) => void;
}

export class UIOverlay {
  private container: HTMLDivElement | null = null;
  private callbacks: UIOverlayCallbacks;
  private isActive = false;
  private currentLanguage = 'en';

  constructor(callbacks: UIOverlayCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Create and show overlay
   */
  show(videoElement: HTMLVideoElement): void {
    if (this.container) {
      this.hide();
    }

    logger.info('Creating UI overlay');

    // Create container
    this.container = document.createElement('div');
    this.container.setAttribute('data-bayit-translator-overlay', 'true');
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      min-width: 280px;
    `;

    // Create content
    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="font-weight: 600; font-size: 16px;">🎙️ Bayit+ Translator</div>
          <button
            id="bayit-close-btn"
            style="background: transparent; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; line-height: 1;"
            aria-label="Close"
          >✕</button>
        </div>

        <!-- Language Selection -->
        <div>
          <label style="display: block; margin-bottom: 6px; font-size: 12px; opacity: 0.8;">Target Language</label>
          <select
            id="bayit-language-select"
            style="width: 100%; padding: 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); cursor: pointer;"
          >
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇸 Spanish</option>
          </select>
        </div>

        <!-- Control Button -->
        <button
          id="bayit-control-btn"
          style="width: 100%; padding: 12px; border-radius: 8px; background: #3b82f6; color: white; border: none; font-weight: 600; cursor: pointer; transition: background 0.2s;"
        >
          Start Dubbing
        </button>

        <!-- Status -->
        <div id="bayit-status" style="font-size: 12px; opacity: 0.6; text-align: center; display: none;">
          Ready
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(this.container);

    // Setup event listeners
    this.setupEventListeners();

    logger.info('UI overlay created');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    // Close button
    const closeBtn = this.container.querySelector('#bayit-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.hide();
    });

    // Language select
    const languageSelect = this.container.querySelector('#bayit-language-select') as HTMLSelectElement;
    languageSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentLanguage = target.value;
      this.callbacks.onLanguageChange(this.currentLanguage);
      logger.debug('Language changed', { language: this.currentLanguage });
    });

    // Control button
    const controlBtn = this.container.querySelector('#bayit-control-btn');
    controlBtn?.addEventListener('click', () => {
      if (this.isActive) {
        this.callbacks.onStopDubbing();
      } else {
        this.callbacks.onStartDubbing(this.currentLanguage);
      }
    });
  }

  /**
   * Update overlay state (active/inactive)
   */
  updateState(isActive: boolean, status?: string): void {
    if (!this.container) return;

    this.isActive = isActive;

    const controlBtn = this.container.querySelector('#bayit-control-btn') as HTMLButtonElement;
    const statusDiv = this.container.querySelector('#bayit-status') as HTMLDivElement;

    if (controlBtn) {
      controlBtn.textContent = isActive ? 'Stop Dubbing' : 'Start Dubbing';
      controlBtn.style.background = isActive ? '#ef4444' : '#3b82f6';
    }

    if (statusDiv && status) {
      statusDiv.style.display = 'block';
      statusDiv.textContent = status;
    } else if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  /**
   * Show connection status
   */
  showStatus(status: string): void {
    if (!this.container) return;

    const statusDiv = this.container.querySelector('#bayit-status') as HTMLDivElement;
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.textContent = status;
    }
  }

  /**
   * Hide overlay
   */
  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    logger.info('UI overlay hidden');
  }

  /**
   * Check if overlay is visible
   */
  isVisible(): boolean {
    return this.container !== null && document.body.contains(this.container);
  }
}
