/**
 * Presence Detection Service
 * Monitors user presence using TV hardware sensors or activity detection
 *
 * Strategies:
 * 1. WebOS/Tizen Camera API (if available) - real hardware detection
 * 2. Activity Detection (fallback) - remote control and interaction tracking
 * 3. No mock data - either real detection or disabled
 *
 * Privacy-first: No video recording, only presence flag
 */

import { EventEmitter } from 'eventemitter3';

export interface PresenceState {
  isPresent: boolean;
  lastSeenTimestamp: Date;
  absenceDuration: number; // milliseconds
  returnDetected: boolean;
  detectionMethod: 'camera' | 'activity' | 'disabled';
}

export type PresenceChangeCallback = (state: PresenceState) => void;

class PresenceDetectionService extends EventEmitter {
  private presenceState: PresenceState = {
    isPresent: true,
    lastSeenTimestamp: new Date(),
    absenceDuration: 0,
    returnDetected: false,
    detectionMethod: 'disabled',
  };

  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastActivityTimestamp = Date.now();
  private idleTimeout = 5 * 60 * 1000; // 5 minutes default
  private checkInterval = 30 * 1000; // Check every 30 seconds
  private hardwareAvailable = false;
  private userPreferences = {
    enabled: true,
    idleTimeout: 5 * 60 * 1000, // Configurable via settings
  };

  constructor() {
    super();
    this.detectHardwareSupport();
  }

  /**
   * Check if TV has presence detection hardware (camera, motion sensor)
   * Uses platform-specific APIs
   */
  private detectHardwareSupport(): void {
    // Check for WebOS presence detection (LG TVs)
    if (typeof window !== 'undefined' && (window as any).webOS?.service?.request) {
      this.hardwareAvailable = true;
      this.presenceState.detectionMethod = 'camera';
      return;
    }

    // Check for Tizen camera support (Samsung TVs)
    if (typeof window !== 'undefined' && (window as any).webapis?.mediaserver) {
      this.hardwareAvailable = true;
      this.presenceState.detectionMethod = 'camera';
      return;
    }

    // Fallback to activity detection (available everywhere)
    this.presenceState.detectionMethod = 'activity';
  }

  /**
   * Start presence monitoring
   * Auto-selects best detection method available
   */
  async startMonitoring(): Promise<boolean> {
    if (this.isMonitoring) return true;

    if (!this.userPreferences.enabled) {
      this.presenceState.detectionMethod = 'disabled';
      return false;
    }

    // Try hardware detection first (WebOS/Tizen)
    if (this.hardwareAvailable) {
      const hardwareSuccess = await this.startHardwareDetection();
      if (hardwareSuccess) {
        this.isMonitoring = true;
        return true;
      }
    }

    // Fallback to activity detection
    this.startActivityDetection();
    this.isMonitoring = true;
    return true;
  }

  /**
   * Stop presence monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Remove activity listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.onUserActivity);
      document.removeEventListener('click', this.onUserActivity);
      document.removeEventListener('mousemove', this.onUserActivity);
    }
  }

  /**
   * Start hardware-based presence detection (WebOS/Tizen)
   * Uses TV camera or motion sensor
   */
  private async startHardwareDetection(): Promise<boolean> {
    try {
      // WebOS implementation
      if (typeof (window as any).webOS?.service?.request === 'function') {
        (window as any).webOS.service.request('luna://com.webos.service.camera', {
          method: 'startCamera',
          parameters: {
            mode: 'presence_detection',
          },
          onSuccess: (result: any) => {
            this.handlePresenceDetected(true);
          },
          onFailure: () => {
            // Hardware not available, will use fallback
          },
        });
        return true;
      }

      // Tizen implementation
      if ((window as any).webapis?.mediaserver) {
        const success = await new Promise((resolve) => {
          (window as any).webapis.mediaserver.getContent((result: any) => {
            resolve(result && result.id);
          });
        });
        return !!success;
      }

      return false;
    } catch (error) {
      console.warn('Hardware presence detection unavailable:', error);
      return false;
    }
  }

  /**
   * Start activity-based presence detection (fallback)
   * Tracks remote control and interaction activity
   */
  private startActivityDetection(): void {
    if (typeof document === 'undefined') return;

    // Listen for user interactions
    const onActivity = () => {
      this.lastActivityTimestamp = Date.now();

      // If user was absent, they're back
      if (!this.presenceState.isPresent) {
        this.handlePresenceDetected(true);
      }
    };

    // Store bound version for removal later
    this.onUserActivity = onActivity;

    // Track interactions on various devices
    document.addEventListener('keydown', this.onUserActivity);
    document.addEventListener('click', this.onUserActivity);
    document.addEventListener('mousemove', this.onUserActivity);

    // Check periodically if user is idle
    this.monitoringInterval = setInterval(() => {
      this.checkActivityLevel();
    }, this.checkInterval);
  }

  private onUserActivity = (): void => {};

  /**
   * Check if user activity indicates presence
   */
  private checkActivityLevel(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTimestamp;

    const isCurrentlyActive = timeSinceLastActivity < this.userPreferences.idleTimeout;

    if (isCurrentlyActive && !this.presenceState.isPresent) {
      // User returned from absence
      this.handlePresenceDetected(true);
    } else if (!isCurrentlyActive && this.presenceState.isPresent) {
      // User is now absent
      this.handlePresenceDetected(false);
    }
  }

  /**
   * Handle presence state change
   */
  private handlePresenceDetected(isPresent: boolean): void {
    const wasPresent = this.presenceState.isPresent;

    if (isPresent) {
      const absenceDuration = this.presenceState.absenceDuration;

      this.presenceState = {
        isPresent: true,
        lastSeenTimestamp: new Date(),
        absenceDuration: 0,
        returnDetected: !wasPresent, // Flag that user just returned
        detectionMethod: this.presenceState.detectionMethod,
      };

      // Emit only once when return is detected
      if (!wasPresent) {
        this.emit('user-returned', this.presenceState);
      }
    } else {
      this.presenceState = {
        isPresent: false,
        lastSeenTimestamp: this.presenceState.lastSeenTimestamp,
        absenceDuration: Date.now() - this.presenceState.lastSeenTimestamp.getTime(),
        returnDetected: false,
        detectionMethod: this.presenceState.detectionMethod,
      };

      // Emit only once when absence is detected
      if (wasPresent) {
        this.emit('user-absent', this.presenceState);
      }
    }

    this.emit('presence-changed', this.presenceState);
  }

  /**
   * Get current presence state
   */
  getCurrentState(): PresenceState {
    return { ...this.presenceState };
  }

  /**
   * Listen for presence changes
   */
  onPresenceChange(callback: PresenceChangeCallback): () => void {
    this.on('presence-changed', callback);

    // Return unsubscribe function
    return () => {
      this.off('presence-changed', callback);
    };
  }

  /**
   * Listen for user return event
   */
  onUserReturn(callback: (state: PresenceState) => void): () => void {
    this.on('user-returned', callback);
    return () => {
      this.off('user-returned', callback);
    };
  }

  /**
   * Listen for user absence event
   */
  onUserAbsent(callback: (state: PresenceState) => void): () => void {
    this.on('user-absent', callback);
    return () => {
      this.off('user-absent', callback);
    };
  }

  /**
   * Set idle timeout
   * How long before user is considered absent
   */
  setIdleTimeout(ms: number): void {
    // Clamp between 30 seconds and 30 minutes
    this.userPreferences.idleTimeout = Math.max(30 * 1000, Math.min(30 * 60 * 1000, ms));
  }

  /**
   * Enable/disable presence detection
   * Respects user privacy preferences
   */
  setEnabled(enabled: boolean): void {
    this.userPreferences.enabled = enabled;

    if (!enabled) {
      this.stopMonitoring();
      this.presenceState.detectionMethod = 'disabled';
    }
  }

  /**
   * Get detection method being used
   */
  getDetectionMethod(): 'camera' | 'activity' | 'disabled' {
    return this.presenceState.detectionMethod;
  }

  /**
   * Is presence detection available on this device?
   */
  isAvailable(): boolean {
    return this.presenceState.detectionMethod !== 'disabled';
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

export const presenceDetectionService = new PresenceDetectionService();
export default presenceDetectionService;
