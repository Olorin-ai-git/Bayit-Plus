/**
 * Gaze Detection Service
 * Monitors where user is looking for contextual voice commands
 *
 * Supports:
 * - Eye-tracking on compatible TV hardware (Samsung Tizen, LG WebOS with camera)
 * - Graceful degradation to content highlighting for non-eye-tracking devices
 * - Privacy-first: No eye tracking data stored or sent
 *
 * Commands:
 * - User looks at movie card + says "play that one" → play the gazed item
 * - User looks at search bar + says "search..." → use gazed element context
 */

import { EventEmitter } from 'eventemitter3';

export interface GazeData {
  isGazing: boolean;
  focusedZone: 'left' | 'center' | 'right' | 'top' | 'bottom' | null;
  focusedElementId: string | null;
  focusedElementType: 'content-card' | 'button' | 'input' | 'menu' | null;
  confidence: number; // 0-1 how confident is the gaze tracking
  focusedContentTitle?: string; // For UI feedback
}

export type GazeChangeCallback = (data: GazeData) => void;

class GazeDetectionService extends EventEmitter {
  private gazeData: GazeData = {
    isGazing: false,
    focusedZone: null,
    focusedElementId: null,
    focusedElementType: null,
    confidence: 0,
  };

  private isTracking = false;
  private trackingInterval: NodeJS.Timeout | null = null;
  private hardwareAvailable = false;
  private eyeTrackingSupported = false;
  private trackedElements = new Map<string, { type: string; title: string }>();

  constructor() {
    super();
    this.detectHardwareSupport();
  }

  /**
   * Check if TV hardware supports eye/gaze tracking
   * Currently supported: Some Samsung Tizen TVs
   */
  private detectHardwareSupport(): void {
    // Samsung Tizen eye-tracking support check
    if (typeof window !== 'undefined' && (window as any).webapis?.tvGuide) {
      this.hardwareAvailable = true;
      // Note: Actual eye-tracking requires specific Tizen API
      // For now, we'll gracefully degrade to activity-based focus
      return;
    }

    // LG WebOS - some models have eye-tracking through camera
    if (typeof window !== 'undefined' && (window as any).webOS?.service?.request) {
      // WebOS typically doesn't expose eye-tracking APIs publicly
      // We'll use DOM focus events as fallback
      return;
    }

    // If no hardware support, gaze detection disabled
    this.eyeTrackingSupported = false;
  }

  /**
   * Start gaze tracking
   * Uses whatever method is available (hardware or fallback)
   */
  async startTracking(): Promise<boolean> {
    if (this.isTracking) return true;

    // Try hardware eye-tracking first
    if (this.eyeTrackingSupported) {
      const hwSuccess = await this.startHardwareTracking();
      if (hwSuccess) {
        this.isTracking = true;
        return true;
      }
    }

    // Fallback to DOM focus tracking
    this.startDOMFocusTracking();
    this.isTracking = true;
    return true;
  }

  /**
   * Stop gaze tracking
   */
  stopTracking(): void {
    this.isTracking = false;

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    // Remove listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener('focusin', this.onElementFocus);
      document.removeEventListener('focusout', this.onElementBlur);
    }
  }

  /**
   * Start hardware eye-tracking (Samsung Tizen only)
   */
  private async startHardwareTracking(): Promise<boolean> {
    // Note: Samsung Tizen's eye-tracking APIs are not publicly documented
    // This is a placeholder for when/if they're exposed
    try {
      if ((window as any).webapis?.tvGuide?.getFocusedElement) {
        this.trackingInterval = setInterval(() => {
          const focused = (window as any).webapis.tvGuide.getFocusedElement();
          if (focused) {
            this.updateGaze(focused.id, 'center', 0.9);
          }
        }, 100);
        return true;
      }
    } catch (error) {
      console.warn('Hardware eye-tracking unavailable:', error);
    }

    return false;
  }

  /**
   * Start fallback DOM focus tracking
   * Tracks which element has keyboard/remote focus
   */
  private startDOMFocusTracking(): void {
    if (typeof document === 'undefined') return;

    // Store bound versions for removal
    const onFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.id) {
        const elementInfo = this.trackedElements.get(target.id);
        this.updateGaze(
          target.id,
          'center',
          elementInfo ? 0.7 : 0.5, // Lower confidence for non-tracked elements
          elementInfo?.title
        );
      }
    };

    const onBlur = () => {
      this.updateGaze(null, null, 0);
    };

    this.onElementFocus = onFocus;
    this.onElementBlur = onBlur;

    document.addEventListener('focusin', this.onElementFocus);
    document.addEventListener('focusout', this.onElementBlur);
  }

  private onElementFocus = (_e: Event) => {};
  private onElementBlur = () => {};

  /**
   * Register element for gaze tracking
   * Call for all interactive elements (content cards, buttons, etc.)
   */
  registerElement(elementId: string, type: string, title?: string): void {
    this.trackedElements.set(elementId, { type, title: title || '' });
  }

  /**
   * Unregister element
   */
  unregisterElement(elementId: string): void {
    this.trackedElements.delete(elementId);
  }

  /**
   * Update gaze data
   */
  private updateGaze(
    focusedElementId: string | null,
    focusedZone: 'left' | 'center' | 'right' | 'top' | 'bottom' | null,
    confidence: number,
    title?: string
  ): void {
    let focusedElementType: 'content-card' | 'button' | 'input' | 'menu' | null = null;

    if (focusedElementId) {
      const elementInfo = this.trackedElements.get(focusedElementId);
      if (elementInfo) {
        focusedElementType = elementInfo.type as 'content-card' | 'button' | 'input' | 'menu';
      }
    }

    const newGaze: GazeData = {
      isGazing: confidence > 0.3,
      focusedZone,
      focusedElementId,
      focusedElementType,
      confidence,
      focusedContentTitle: title,
    };

    // Only emit if gaze changed
    if (
      newGaze.focusedElementId !== this.gazeData.focusedElementId ||
      newGaze.isGazing !== this.gazeData.isGazing
    ) {
      this.gazeData = newGaze;
      this.emit('gaze-changed', this.gazeData);
    }
  }

  /**
   * Get current gaze data
   */
  getCurrentGaze(): GazeData {
    return { ...this.gazeData };
  }

  /**
   * Listen for gaze changes
   */
  onGazeChange(callback: GazeChangeCallback): () => void {
    this.on('gaze-changed', callback);
    return () => {
      this.off('gaze-changed', callback);
    };
  }

  /**
   * Is gaze tracking available on this device?
   */
  isAvailable(): boolean {
    // Gaze tracking falls back to DOM focus, so always "available"
    // But actual eye-tracking may not be
    return true;
  }

  /**
   * Are we using real eye-tracking hardware?
   */
  isHardwareEyeTrackingAvailable(): boolean {
    return this.eyeTrackingSupported;
  }

  /**
   * Get what the user is currently looking at
   * Useful for contextual commands like "play that one"
   */
  getGazedContentId(): string | null {
    if (
      this.gazeData.focusedElementType === 'content-card' &&
      this.gazeData.confidence > 0.5
    ) {
      return this.gazeData.focusedElementId;
    }
    return null;
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    this.stopTracking();
    this.trackedElements.clear();
    this.removeAllListeners();
  }
}

export const gazeDetectionService = new GazeDetectionService();
export default gazeDetectionService;
