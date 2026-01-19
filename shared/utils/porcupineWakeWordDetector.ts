/**
 * Porcupine Wake Word Detector
 *
 * Provides wake word detection using Picovoice Porcupine SDK.
 * Listens for "Hey Buyit" (phonetically identical to Hebrew "הי בית")
 * to activate voice commands.
 *
 * This service wraps the Porcupine Web SDK for browser-based wake word detection.
 * For React Native (iOS/Android), use the @picovoice/porcupine-react-native package.
 * 
 * NOTE: This module is web-only. React Native apps should use native wake word modules.
 */

import { supportConfig, WakeWordSystemConfig } from '../config/supportConfig';

// Check if we're in React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// Web-only imports - these will be undefined in React Native
let PorcupineWorker: any;
let WebVoiceProcessor: any;
type PorcupineKeyword = any;
type BuiltInKeyword = any;

// Only import web modules in browser environment
if (!isReactNative && typeof window !== 'undefined') {
  try {
    // Dynamic require for web modules
    const porcupineWeb = require('@picovoice/porcupine-web');
    const webVoiceProcessor = require('@picovoice/web-voice-processor');
    PorcupineWorker = porcupineWeb.PorcupineWorker;
    WebVoiceProcessor = webVoiceProcessor.WebVoiceProcessor;
  } catch (e) {
    console.warn('[PorcupineWakeWord] Web SDK not available:', e);
  }
}

/**
 * Voice system types for wake word detection
 */
export type VoiceSystemType = 'support' | 'voiceSearch';

export interface PorcupineWakeWordConfig {
  accessKey: string;
  modelPath?: string;
  keywordPath?: string;
  sensitivity?: number;
  enabled?: boolean;
}

export interface PorcupineWakeWordResult {
  detected: boolean;
  keywordIndex: number;
  timestamp: number;
  system: VoiceSystemType;
}

/**
 * Detection callback with system information
 */
type DetectionCallback = (keywordIndex: number, system: VoiceSystemType) => void;

/**
 * Get wake word config for a specific system
 */
export function getWakeWordConfig(system: VoiceSystemType): WakeWordSystemConfig {
  return system === 'support'
    ? supportConfig.voiceAssistant.supportWakeWord
    : supportConfig.voiceAssistant.voiceSearchWakeWord;
}

/**
 * Get the active wake word for a system (custom if available, built-in otherwise)
 */
export function getActiveWakeWord(system: VoiceSystemType): string {
  const config = getWakeWordConfig(system);
  // For now, always use built-in until custom models are trained
  return config.builtInKeyword;
}

/**
 * Map wake word string to BuiltInKeyword enum
 * Returns the enum value dynamically since we use dynamic imports
 */
function getBuiltInKeyword(wakeWord: string): any {
  // Get BuiltInKeyword from the dynamically imported module
  try {
    const porcupineWeb = require('@picovoice/porcupine-web');
    const BuiltInKeywordEnum = porcupineWeb.BuiltInKeyword;
    
    const wakeWordMap: Record<string, any> = {
      'Alexa': BuiltInKeywordEnum?.Alexa,
      'Americano': BuiltInKeywordEnum?.Americano,
      'Blueberry': BuiltInKeywordEnum?.Blueberry,
      'Bumblebee': BuiltInKeywordEnum?.Bumblebee,
      'Computer': BuiltInKeywordEnum?.Computer,
      'Grapefruit': BuiltInKeywordEnum?.Grapefruit,
      'Grasshopper': BuiltInKeywordEnum?.Grasshopper,
      'Hey Google': BuiltInKeywordEnum?.HeyGoogle,
      'HeyGoogle': BuiltInKeywordEnum?.HeyGoogle,
      'Hey Siri': BuiltInKeywordEnum?.HeySiri,
      'HeySiri': BuiltInKeywordEnum?.HeySiri,
      'Jarvis': BuiltInKeywordEnum?.Jarvis,
      'Okay Google': BuiltInKeywordEnum?.OkayGoogle,
      'OkayGoogle': BuiltInKeywordEnum?.OkayGoogle,
      'Picovoice': BuiltInKeywordEnum?.Picovoice,
      'Porcupine': BuiltInKeywordEnum?.Porcupine,
      'Terminator': BuiltInKeywordEnum?.Terminator,
    };

    return wakeWordMap[wakeWord] || BuiltInKeywordEnum?.Jarvis;
  } catch {
    // Return a placeholder for React Native - wake word won't work without native module
    return wakeWord;
  }
}

/**
 * PorcupineWakeWordDetector class
 *
 * Handles wake word detection using Picovoice Porcupine SDK.
 * Runs locally in the browser via WebAssembly for privacy.
 * Supports separate wake words for Support (Olorin) and Voice Search systems.
 */
export class PorcupineWakeWordDetector {
  private porcupine: PorcupineWorker | null = null;
  private webVoiceProcessor: typeof WebVoiceProcessor | null = null;
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private detectionCallback: DetectionCallback | null = null;
  private accessKey: string = '';
  private sensitivity: number = 0.5;
  private lastDetectionTime: number = 0;
  private cooldownMs: number = 2000;
  private systemType: VoiceSystemType = 'voiceSearch';

  /**
   * Initialize the Porcupine wake word detector
   * @param accessKey - Picovoice access key from console.picovoice.ai
   * @param keywordPath - Path to custom wake word .ppn model (optional, uses built-in if not provided)
   * @param sensitivity - Wake word sensitivity 0-1 (default 0.5)
   * @param system - Voice system type: 'support' (Olorin) or 'voiceSearch' (default)
   */
  async initialize(
    accessKey: string,
    keywordPath?: string,
    sensitivity: number = 0.5,
    system: VoiceSystemType = 'voiceSearch'
  ): Promise<void> {
    // React Native check - use native wake word module instead
    if (isReactNative) {
      console.warn('[PorcupineWakeWord] Web SDK not available in React Native. Use native WakeWordModule instead.');
      throw new Error('Porcupine Web SDK is not available in React Native. Use the native WakeWordModule.');
    }

    // Check if web modules are available
    if (!PorcupineWorker || !WebVoiceProcessor) {
      console.error('[PorcupineWakeWord] Web SDK modules not loaded');
      throw new Error('Porcupine Web SDK not available. Ensure @picovoice/porcupine-web is installed.');
    }

    if (this.isInitialized) {
      console.log('[PorcupineWakeWord] Already initialized');
      return;
    }

    if (!accessKey) {
      throw new Error('[PorcupineWakeWord] Access key is required');
    }

    this.accessKey = accessKey;
    this.sensitivity = Math.max(0, Math.min(1, sensitivity));
    this.systemType = system;

    try {
      console.log('[PorcupineWakeWord] Initializing Porcupine...');

      // Determine keyword configuration
      let keyword: PorcupineKeyword | BuiltInKeyword;

      // Check if custom model exists by trying to fetch it
      let useCustomModel = false;
      if (keywordPath) {
        try {
          const response = await fetch(keywordPath, { method: 'HEAD' });
          useCustomModel = response.ok;
        } catch {
          useCustomModel = false;
        }
      }

      if (useCustomModel && keywordPath) {
        // Use custom wake word model "Hey Buyit"
        console.log('[PorcupineWakeWord] Using custom keyword model:', keywordPath);
        keyword = {
          publicPath: keywordPath,
          label: 'hey_buyit',
          sensitivity: this.sensitivity,
        };
      } else {
        // Fallback to configured built-in wake word based on system type
        const wakeWordConfig = getWakeWordConfig(this.systemType);
        const configuredWakeWord = wakeWordConfig.builtInKeyword;
        const builtInKeyword = getBuiltInKeyword(configuredWakeWord);
        const systemLabel = this.systemType === 'support' ? 'Support (Olorin)' : 'Voice Search';
        console.log(`[PorcupineWakeWord] ${systemLabel}: Using built-in "${configuredWakeWord}" (say "${configuredWakeWord}" to activate)`);
        console.log(`[PorcupineWakeWord] ${systemLabel}: Custom phrase will be "${wakeWordConfig.customPhrase}" once trained`);
        keyword = {
          builtin: builtInKeyword,
          sensitivity: this.sensitivity,
        };
      }

      // Define the model configuration
      // The model file must be served from the public directory
      const modelPath = '/porcupine/porcupine_params.pv';

      // Verify model file is accessible
      try {
        const modelCheck = await fetch(modelPath, { method: 'HEAD' });
        if (!modelCheck.ok) {
          throw new Error(`Model file not found at ${modelPath} (status: ${modelCheck.status})`);
        }
        console.log('[PorcupineWakeWord] Model file verified at:', modelPath);
      } catch (fetchError) {
        console.error('[PorcupineWakeWord] Cannot access model file:', fetchError);
        throw new Error(`Porcupine model file not accessible at ${modelPath}`);
      }

      const porcupineModel = {
        publicPath: modelPath,
        forceWrite: false,
        version: 1,
      };

      // Create Porcupine worker with model
      console.log('[PorcupineWakeWord] Creating PorcupineWorker with:', {
        keywordType: useCustomModel ? 'custom' : 'built-in Computer',
        modelPath: porcupineModel.publicPath,
        sensitivity: this.sensitivity,
      });

      this.porcupine = await PorcupineWorker.create(
        this.accessKey,
        [keyword],
        (detection) => {
          console.log('[PorcupineWakeWord] 🎉 Detection callback fired:', detection);
          this.handleDetection(detection.index);
        },
        porcupineModel
      );

      this.isInitialized = true;
      const wakeWordConfig = getWakeWordConfig(this.systemType);
      const activeWakeWord = wakeWordConfig.builtInKeyword;
      const systemLabel = this.systemType === 'support' ? 'Support (Olorin)' : 'Voice Search';
      console.log(`[PorcupineWakeWord] ✅ ${systemLabel} initialized - say "${activeWakeWord}" to activate`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to initialize:', errorMessage);
      this.isInitialized = false;
      throw new Error(`Failed to initialize Porcupine: ${errorMessage}`);
    }
  }

  /**
   * Handle wake word detection event
   */
  private handleDetection(keywordIndex: number): void {
    const now = Date.now();

    // Check cooldown to prevent rapid re-triggering
    if (now - this.lastDetectionTime < this.cooldownMs) {
      console.log('[PorcupineWakeWord] Detection ignored (cooldown)');
      return;
    }

    this.lastDetectionTime = now;
    const systemLabel = this.systemType === 'support' ? 'Support (Olorin)' : 'Voice Search';
    const wakeWordConfig = getWakeWordConfig(this.systemType);
    console.log(`[PorcupineWakeWord] 🎤 ${systemLabel} wake word "${wakeWordConfig.builtInKeyword}" detected!`);

    if (this.detectionCallback) {
      this.detectionCallback(keywordIndex, this.systemType);
    }
  }

  /**
   * Start listening for wake word
   * @param onDetection - Callback function when wake word is detected
   */
  async start(onDetection: DetectionCallback): Promise<void> {
    if (!this.isInitialized || !this.porcupine) {
      throw new Error('[PorcupineWakeWord] Not initialized. Call initialize() first.');
    }

    if (this.isListening) {
      console.log('[PorcupineWakeWord] Already listening');
      return;
    }

    this.detectionCallback = onDetection;

    try {
      console.log('[PorcupineWakeWord] Starting audio capture via WebVoiceProcessor...');

      // Check if microphone is accessible first
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = testStream.getAudioTracks();
        console.log('[PorcupineWakeWord] Microphone test passed:', {
          tracks: tracks.length,
          label: tracks[0]?.label,
          enabled: tracks[0]?.enabled,
        });
        // Stop test stream before WebVoiceProcessor takes over
        testStream.getTracks().forEach(t => t.stop());
      } catch (micError) {
        const errorMsg = micError instanceof Error ? micError.message : String(micError);
        console.error('[PorcupineWakeWord] Microphone access failed:', errorMsg);
        throw new Error(`Microphone access denied: ${errorMsg}`);
      }

      // Start WebVoiceProcessor to capture microphone audio
      await WebVoiceProcessor.subscribe(this.porcupine);

      this.isListening = true;
      const wakeWordConfig = getWakeWordConfig(this.systemType);
      const systemLabel = this.systemType === 'support' ? 'Support (Olorin)' : 'Voice Search';
      console.log(`[PorcupineWakeWord] ✅ ${systemLabel} listening for "${wakeWordConfig.builtInKeyword}"...`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to start listening:', errorMessage);
      throw new Error(`Failed to start wake word detection: ${errorMessage}`);
    }
  }

  /**
   * Stop listening for wake word
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      console.log('[PorcupineWakeWord] Not listening');
      return;
    }

    try {
      console.log('[PorcupineWakeWord] Stopping audio capture...');

      if (this.porcupine) {
        await WebVoiceProcessor.unsubscribe(this.porcupine);
      }

      this.isListening = false;
      this.detectionCallback = null;
      console.log('[PorcupineWakeWord] Stopped listening');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to stop listening:', errorMessage);
    }
  }

  /**
   * Release all resources
   */
  async release(): Promise<void> {
    try {
      console.log('[PorcupineWakeWord] Releasing resources...');

      await this.stop();

      if (this.porcupine) {
        this.porcupine.terminate();
        this.porcupine = null;
      }

      this.isInitialized = false;
      console.log('[PorcupineWakeWord] Resources released');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to release resources:', errorMessage);
    }
  }

  /**
   * Check if detector is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if detector is currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Set cooldown period between detections
   */
  setCooldown(ms: number): void {
    this.cooldownMs = Math.max(500, Math.min(10000, ms));
  }

  /**
   * Get time since last detection
   */
  getTimeSinceLastDetection(): number {
    if (this.lastDetectionTime === 0) return Infinity;
    return Date.now() - this.lastDetectionTime;
  }

  /**
   * Get the system type this detector is configured for
   */
  getSystemType(): VoiceSystemType {
    return this.systemType;
  }

  /**
   * Get the active wake word for this detector
   */
  getActiveWakeWord(): string {
    return getActiveWakeWord(this.systemType);
  }
}

/**
 * Get Picovoice access key from environment
 * Supports web (Vite), Node.js (process.env), and React Native (Config)
 */
export function getPicovoiceAccessKey(): string {
  // Check if we're in React Native environment
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  
  if (isReactNative) {
    // React Native: use react-native-config or return empty
    // The mobile app should set this via native modules or config
    // Note: This code path is only executed at runtime in React Native,
    // webpack should tree-shake it out for web builds
    try {
      // Try to get from global config if set by native side
      const globalConfig = (globalThis as any).__REACT_NATIVE_CONFIG__;
      if (globalConfig?.PICOVOICE_ACCESS_KEY) {
        const key = globalConfig.PICOVOICE_ACCESS_KEY;
        console.log('[PorcupineWakeWord] Access key found (React Native global):', key ? `${key.slice(0, 10)}...` : 'empty');
        return key;
      }
    } catch {
      // Global config not available
    }
    console.warn('[PorcupineWakeWord] React Native: No Picovoice access key found');
    return '';
  }

  // Web: Try Vite env (must check at runtime without using import.meta directly in module scope)
  try {
    // Use indirect eval to avoid bundler issues with import.meta
    const viteEnv = (globalThis as any).__VITE_ENV__ || (typeof window !== 'undefined' && (window as any).__VITE_ENV__);
    if (viteEnv?.VITE_PICOVOICE_ACCESS_KEY) {
      const key = viteEnv.VITE_PICOVOICE_ACCESS_KEY;
      console.log('[PorcupineWakeWord] Access key found (Vite global):', key ? `${key.slice(0, 10)}...` : 'empty');
      return key;
    }
  } catch {
    // Vite env not available
  }

  // Try process.env (Node/build time / webpack DefinePlugin)
  try {
    if (typeof process !== 'undefined' && process.env?.VITE_PICOVOICE_ACCESS_KEY) {
      const key = process.env.VITE_PICOVOICE_ACCESS_KEY;
      console.log('[PorcupineWakeWord] Access key found (process.env):', key ? `${key.slice(0, 10)}...` : 'empty');
      return key;
    }
  } catch {
    // process.env not available
  }

  console.warn('[PorcupineWakeWord] No Picovoice access key found in environment');
  return '';
}

/**
 * Check if Porcupine is supported in the current environment
 * Note: Returns false for React Native - use native WakeWordModule instead
 */
export function isPorcupineSupported(): boolean {
  // React Native uses native wake word modules, not web SDK
  if (isReactNative) {
    console.log('[PorcupineWakeWord] React Native detected - use native WakeWordModule');
    return false;
  }

  // Check for browser environment
  if (typeof window === 'undefined') {
    console.log('[PorcupineWakeWord] Not browser environment');
    return false;
  }

  // Check if web modules were loaded
  if (!PorcupineWorker || !WebVoiceProcessor) {
    console.log('[PorcupineWakeWord] Web SDK modules not available');
    return false;
  }

  // Check for AudioContext support
  const hasAudioContext = typeof AudioContext !== 'undefined' ||
    typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== 'undefined';

  // Check for Web Workers support
  const hasWorkers = typeof Worker !== 'undefined';

  // Check for MediaDevices support
  const hasMediaDevices = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia;

  // Check for SharedArrayBuffer (required for optimal performance)
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Check secure context
  const isSecureContext = window.isSecureContext;

  console.log('[PorcupineWakeWord] Support check:', {
    hasAudioContext,
    hasWorkers,
    hasMediaDevices,
    hasSharedArrayBuffer,
    isSecureContext,
    crossOriginIsolated: (window as any).crossOriginIsolated,
  });

  // SharedArrayBuffer is preferred but not strictly required (falls back to ArrayBuffer)
  if (!hasSharedArrayBuffer) {
    console.warn('[PorcupineWakeWord] SharedArrayBuffer not available - Porcupine will use slower ArrayBuffer fallback');
    console.warn('[PorcupineWakeWord] To enable SharedArrayBuffer, server must send COOP/COEP headers');
  }

  return hasAudioContext && hasWorkers && hasMediaDevices;
}

/**
 * Create a Porcupine wake word detector instance for a specific system
 * @param system - Voice system type: 'support' (Olorin) or 'voiceSearch' (default)
 */
export function createPorcupineDetector(system: VoiceSystemType = 'voiceSearch'): PorcupineWakeWordDetector {
  const detector = new PorcupineWakeWordDetector();
  // System type will be set during initialize() call
  return detector;
}

/**
 * Create a Porcupine detector for the Support system (Olorin wizard)
 */
export function createSupportDetector(): PorcupineWakeWordDetector {
  return createPorcupineDetector('support');
}

/**
 * Create a Porcupine detector for Voice Search
 */
export function createVoiceSearchDetector(): PorcupineWakeWordDetector {
  return createPorcupineDetector('voiceSearch');
}

export default PorcupineWakeWordDetector;
