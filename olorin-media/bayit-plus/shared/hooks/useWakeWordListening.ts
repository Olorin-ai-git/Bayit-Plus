/**
 * useWakeWordListening Hook
 *
 * Enhanced constant listening with wake word detection.
 * Uses Picovoice Porcupine for "Hey Buyit" wake word activation.
 * Audio is only sent to transcription API after wake word is detected.
 *
 * Wake word: "Hey Buyit" (English) - phonetically identical to "הי בית" (Hebrew)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { WakeWordDetector, WakeWordConfig, WakeWordResult, createWakeWordDetector } from '../utils/wakeWordDetector';
import { VADDetector, AudioLevel, calculateAudioLevel, createVADDetector } from '../utils/vadDetector';
import { AudioBufferManager, createAudioBuffer } from '../utils/audioBufferManager';
import { VADSensitivity } from '../services/api';
import { ttsService } from '../services/ttsService';
import {
  PorcupineWakeWordDetector,
  createPorcupineDetector,
  getPicovoiceAccessKey,
  isPorcupineSupported,
  VoiceSystemType,
  getWakeWordConfig,
} from '../utils/porcupineWakeWordDetector';

/**
 * Log audio context state for debugging
 */
function logAudioContextState(context: AudioContext | null, label: string): void {
  if (!context) {
    console.log(`[WakeWordListening] ${label}: AudioContext is null`);
    return;
  }
  console.log(`[WakeWordListening] ${label}:`, {
    state: context.state,
    sampleRate: context.sampleRate,
    baseLatency: context.baseLatency,
    currentTime: context.currentTime.toFixed(3),
  });
}

// Type for transcription service
type TranscribeFunction = (audioBlob: Blob) => Promise<{ text: string; language?: string }>;

export interface UseWakeWordListeningOptions {
  enabled: boolean;
  wakeWordEnabled: boolean;
  wakeWord?: string;
  wakeWordSensitivity?: number;
  wakeWordCooldownMs?: number;
  onTranscript: (text: string, language?: string) => void;
  onWakeWordDetected?: () => void;
  onError: (error: Error) => void;
  silenceThresholdMs?: number;
  vadSensitivity?: VADSensitivity;
  transcribeAudio?: TranscribeFunction;
  modelPath?: string;
}

export interface UseWakeWordListeningReturn {
  isListening: boolean;         // Always listening for wake word
  isAwake: boolean;             // Wake word detected, actively recording
  isProcessing: boolean;        // Processing speech
  isSendingToServer: boolean;   // Sending to transcription API
  wakeWordDetected: boolean;    // Visual feedback for wake word
  isTTSSpeaking: boolean;       // TTS is currently playing (audio processing paused)
  audioLevel: AudioLevel;
  start: () => Promise<void>;
  stop: () => void;
  resumeAudioContext: () => Promise<void>; // Call on user tap to resume suspended audio
  error: Error | null;
  isSupported: boolean;
  wakeWordReady: boolean;       // Vosk model loaded and ready
  audioContextState: AudioContextState | null; // Current audio context state for debugging
}

/**
 * useWakeWordListening hook
 *
 * Provides continuous listening with wake word detection.
 * Only activates recording and transcription after "Hi Bayit" is detected.
 */
export function useWakeWordListening(options: UseWakeWordListeningOptions): UseWakeWordListeningReturn {
  const {
    enabled,
    wakeWordEnabled,
    wakeWord = 'hey buyit',
    wakeWordSensitivity = 0.7,
    wakeWordCooldownMs = 2000,
    onTranscript,
    onWakeWordDetected,
    onError,
    silenceThresholdMs = 2000,
    vadSensitivity = 'medium',
    transcribeAudio,
    modelPath = '/vosk/model',
  } = options;

  // State
  const [isListening, setIsListening] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingToServer, setIsSendingToServer] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({ average: 0, peak: 0 });
  const [error, setError] = useState<Error | null>(null);
  const [wakeWordReady, setWakeWordReady] = useState(false);
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
  const [audioContextState, setAudioContextState] = useState<AudioContextState | null>(null);

  // Refs for audio capture
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Refs for wake word, VAD, and buffering
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const porcupineDetectorRef = useRef<PorcupineWakeWordDetector | null>(null);
  const vadRef = useRef<VADDetector | null>(null);
  const bufferRef = useRef<AudioBufferManager | null>(null);
  const isListeningRef = useRef(false);
  const isAwakeRef = useRef(false);
  const isSendingToServerRef = useRef(false);
  const isTTSSpeakingRef = useRef(false);
  const lastTTSLogRef = useRef<number>(0);
  const pendingTranscriptionRef = useRef<Promise<any> | null>(null);
  const lastTranscribedBlobRef = useRef<Blob | null>(null);
  const porcupineInitializedRef = useRef(false);

  // Check platform support with verbose logging
  const isWeb = Platform.OS === 'web';
  const hasAudioContext = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';
  const hasMediaDevices = hasNavigator && !!navigator.mediaDevices;
  const hasGetUserMedia = hasMediaDevices && !!(navigator.mediaDevices.getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia);

  const isSupported = isWeb && hasAudioContext && hasGetUserMedia;

  // Log support status on mount (for debugging Tizen)
  useEffect(() => {
    console.log('[WakeWordListening] Platform support check:', {
      isWeb,
      hasAudioContext,
      hasNavigator,
      hasMediaDevices,
      hasGetUserMedia,
      isSupported,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    });
  }, []);

  /**
   * Handle wake word detection from Porcupine
   */
  const handlePorcupineDetection = useCallback((keywordIndex: number, system: VoiceSystemType) => {
    // Only respond to voiceSearch system wake word
    if (system !== 'voiceSearch') {
      console.log('[WakeWordListening] Ignoring wake word - not for voiceSearch system:', system);
      return;
    }

    const wakeWordConfig = getWakeWordConfig('voiceSearch');
    console.log(`[WakeWordListening] Voice Search wake word "${wakeWordConfig.builtInKeyword}" detected!`);

    // Set wake word detected state
    setWakeWordDetected(true);
    setIsAwake(true);
    isAwakeRef.current = true;

    // Play feedback sound
    playWakeWordFeedback();

    // Callback to parent
    if (onWakeWordDetected) {
      onWakeWordDetected();
    }

    // Reset wake word visual feedback after a delay
    setTimeout(() => {
      setWakeWordDetected(false);
    }, 1500);
  }, [onWakeWordDetected, playWakeWordFeedback]);

  /**
   * Initialize wake word detector (Porcupine) for Voice Search system
   */
  const initializeWakeWord = useCallback(async () => {
    // Skip if already initialized
    if (porcupineInitializedRef.current) {
      console.log('[WakeWordListening] Porcupine already initialized');
      return;
    }

    // Skip if wake word detection is disabled
    if (!wakeWordEnabled) {
      console.log('[WakeWordListening] Wake word detection disabled');
      return;
    }

    // Check if Porcupine is supported
    if (!isPorcupineSupported()) {
      console.warn('[WakeWordListening] Porcupine not supported in this environment, using VAD-only mode');
      return;
    }

    // Get Picovoice access key
    const accessKey = getPicovoiceAccessKey();
    if (!accessKey) {
      console.warn('[WakeWordListening] Picovoice access key not configured, using VAD-only mode');
      return;
    }

    try {
      // Get Voice Search wake word config
      const voiceSearchConfig = getWakeWordConfig('voiceSearch');
      console.log('[WakeWordListening] Initializing Porcupine for Voice Search system...');
      console.log(`[WakeWordListening] Wake word: "${voiceSearchConfig.builtInKeyword}" (intended: "${voiceSearchConfig.customPhrase}")`);

      // Create Porcupine detector
      porcupineDetectorRef.current = createPorcupineDetector('voiceSearch');

      // Use custom model path from config if available
      const customModelPath = voiceSearchConfig.customModelPath || '/porcupine/hey_buyit_wasm.ppn';

      // Initialize with access key, model path, sensitivity, and system type
      await porcupineDetectorRef.current.initialize(
        accessKey,
        customModelPath,
        wakeWordSensitivity,
        'voiceSearch'
      );

      // Set cooldown
      porcupineDetectorRef.current.setCooldown(wakeWordCooldownMs);

      // Start listening for wake word
      await porcupineDetectorRef.current.start(handlePorcupineDetection);

      porcupineInitializedRef.current = true;
      setWakeWordReady(true);
      console.log(`[WakeWordListening] Voice Search ready - say "${voiceSearchConfig.builtInKeyword}" to activate`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[WakeWordListening] Failed to initialize Porcupine:', errorMessage);
      console.warn('[WakeWordListening] Falling back to VAD-only mode');
      // Don't throw - allow VAD-only fallback
      porcupineInitializedRef.current = false;
      setWakeWordReady(false);
    }
  }, [wakeWordEnabled, wakeWordSensitivity, wakeWordCooldownMs, handlePorcupineDetection]);

  /**
   * Initialize VAD and buffer
   */
  const initializeVAD = useCallback(() => {
    vadRef.current = createVADDetector(vadSensitivity, silenceThresholdMs);
    bufferRef.current = createAudioBuffer({ maxDurationMs: 15000 });
  }, [vadSensitivity, silenceThresholdMs]);

  /**
   * Play feedback sound when wake word is detected
   */
  const playWakeWordFeedback = useCallback(() => {
    try {
      // Create a simple beep sound
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.stop(audioContext.currentTime + 0.2);

      setTimeout(() => audioContext.close(), 300);
    } catch (err) {
      console.warn('[WakeWordListening] Failed to play feedback:', err);
    }
  }, []);

  /**
   * Send buffered audio to transcription API
   * Implements deduplication to prevent duplicate requests
   */
  const sendToTranscription = useCallback(async () => {
    if (!bufferRef.current || !transcribeAudio) return;

    const audioBlob = bufferRef.current.exportAsWav();

    // Skip if audio is too short (less than 0.5 seconds)
    if (audioBlob.size < 16000) {
      console.log('[WakeWordListening] Audio blob too short, skipping transcription');
      vadRef.current?.reset();
      bufferRef.current.clear();
      setIsAwake(false);
      isAwakeRef.current = false;
      setIsProcessing(false);
      return;
    }

    // DEDUPLICATION: Skip if we're already transcribing the exact same audio blob
    if (lastTranscribedBlobRef.current === audioBlob) {
      console.log('[WakeWordListening] Duplicate audio blob detected, skipping transcription');
      return;
    }

    // DEDUPLICATION: Skip if a transcription request is already in flight
    if (pendingTranscriptionRef.current) {
      console.log('[WakeWordListening] Transcription already in flight, skipping duplicate request');
      return;
    }

    setIsSendingToServer(true);
    console.log('[WakeWordListening] Sending audio to transcription API, blob size:', audioBlob.size);

    // Create a promise to track the in-flight request
    const transcriptionPromise = (async () => {
      try {
        const result = await transcribeAudio(audioBlob);

        if (result.text && result.text.trim()) {
          console.log('[WakeWordListening] Transcription received:', result.text.substring(0, 100));
          onTranscript(result.text.trim(), result.language);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Transcription failed');
        console.error('[WakeWordListening] Transcription error:', error);
        onError(error);
      } finally {
        setIsSendingToServer(false);
        isSendingToServerRef.current = false;
        // Keep isProcessing true - it will be reset by onTranscript or after timeout
        // Don't reset it here to avoid flickering
        console.log('[WakeWordListening] Transcription complete, waiting for response');
        vadRef.current?.reset();
        bufferRef.current?.clear();
        setIsAwake(false);
        isAwakeRef.current = false;
        setWakeWordDetected(false);

        // Reset processing state after a short delay to ensure UI updates
        setTimeout(() => {
          setIsProcessing(false);
        }, 500);

        // Clear the pending request reference
        pendingTranscriptionRef.current = null;
      }
    })();

    // Store the pending promise and blob to prevent duplicates
    pendingTranscriptionRef.current = transcriptionPromise;
    lastTranscribedBlobRef.current = audioBlob;

    await transcriptionPromise;
  }, [transcribeAudio, onTranscript, onError]);

  /**
   * Process audio level and check wake word/VAD state
   */
  const processAudioLevel = useCallback(async (level: AudioLevel, samples?: Float32Array) => {
    if (!vadRef.current || !bufferRef.current || !isListeningRef.current) return;

    // Update audio level for visualization
    setAudioLevel(level);

    // SKIP audio processing while TTS is speaking (prevent feedback loops)
    if (isTTSSpeakingRef.current) {
      // Log only once per second to avoid flooding console
      const now = Date.now();
      if (now - lastTTSLogRef.current > 1000) {
        console.log('[WakeWordListening] TTS speaking, audio processing paused');
        lastTTSLogRef.current = now;
      }
      return;
    }

    // SKIP audio processing if request is already being sent/processed (prevent overlapping requests)
    if (isSendingToServerRef.current) {
      return;
    }

    // If Porcupine is active, only process audio when wake word has been detected
    // This prevents transcription until user says "Hey Buyit"
    if (porcupineInitializedRef.current && wakeWordEnabled && !isAwakeRef.current) {
      // Porcupine handles wake word detection separately via WebVoiceProcessor
      // Just update audio level for visualization but don't buffer or transcribe
      return;
    }

    // Add samples to buffer (only after wake word detected or if wake word disabled)
    if (samples) {
      bufferRef.current.addChunk(samples);
    }

    const vadState = vadRef.current.process(level);
    const energyThreshold = vadRef.current.getEnergyThreshold();
    const speechDuration = vadRef.current.getSpeechDuration();
    const silenceDuration = vadRef.current.getSilenceDuration();

    // Only log when audio exceeds threshold or state changes
    if (level.average >= energyThreshold || vadState !== 'silence') {
      // console.log('[WakeWordListening] THRESHOLD REACHED:', {
      //   average: level.average.toFixed(4),
      //   peak: level.peak.toFixed(4),
      //   threshold: energyThreshold.toFixed(4),
      //   exceeded: level.average >= energyThreshold,
      //   state: vadState,
      //   speechDuration,
      //   silenceDuration,
      // });
    }

    if (vadState === 'speech') {
      // Speech detected - continue recording
      if (!bufferRef.current.isRecording()) {
        console.log('[WakeWordListening] Speech detected! Setting isProcessing=true');
        bufferRef.current.startSpeech();
        setIsProcessing(true);
      }
    } else if (vadState === 'silence_after_speech' && vadRef.current.shouldSendToAPI() && !isSendingToServerRef.current) {
      // Silence after speech - send to API (prevent concurrent requests)
      console.log('[WakeWordListening] Silence after speech detected! Sending to transcription API');
      bufferRef.current.endSpeech();
      // Keep isProcessing true while transcribing - shows "Processing" status in UI
      setIsSendingToServer(true);
      isSendingToServerRef.current = true;

      await sendToTranscription();
    }
  }, [sendToTranscription]);

  /**
   * Start audio capture
   */
  const startWebAudio = useCallback(async () => {
    try {
      console.log('[WakeWordListening] Requesting microphone permission...');

      // Check secure context (HTTPS or localhost required for getUserMedia)
      const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
      console.log('[WakeWordListening] Secure context:', isSecureContext);
      console.log('[WakeWordListening] Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');

      if (!isSecureContext) {
        throw new Error('Microphone requires HTTPS. Please access this page over HTTPS or localhost.');
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices) {
        throw new Error('mediaDevices API not available. Your browser may not support microphone access.');
      }
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not available. Your browser may not support microphone access.');
      }

      console.log('[WakeWordListening] mediaDevices available, requesting mic...');

      // First, try to get microphone permission - this triggers the browser permission prompt
      // Device enumeration may be empty until permission is granted
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          },
        });
        console.log('[WakeWordListening] Got stream with constraints');
      } catch (constraintErr: any) {
        console.warn('[WakeWordListening] Constraints failed:', constraintErr?.message || constraintErr, 'name:', constraintErr?.name);

        // Enumerate devices to provide better diagnostics
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(d => d.kind === 'audioinput');
          console.log('[WakeWordListening] Available audio input devices:', audioInputs.length);
          audioInputs.forEach((device, i) => {
            console.log(`[WakeWordListening] Device ${i}: ${device.label || '(no label - permission not granted yet)'} (${device.deviceId ? device.deviceId.slice(0, 8) + '...' : 'no-id'})`);
          });

          if (audioInputs.length === 0) {
            console.warn('[WakeWordListening] No audio input devices detected. This could mean:');
            console.warn('  - No microphone is connected');
            console.warn('  - The browser does not have permission to access microphone');
            console.warn('  - The microphone is in use by another application');
          }
        } catch (enumErr) {
          console.warn('[WakeWordListening] Could not enumerate devices:', enumErr);
        }

        // Fallback for devices that don't support specific constraints (e.g., Samsung TV)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('[WakeWordListening] Got stream with simple audio:true');
        } catch (simpleErr: any) {
          console.error('[WakeWordListening] Simple audio also failed:', simpleErr?.message || simpleErr, 'name:', simpleErr?.name);

          // Provide more specific error message based on error type
          const errorName = simpleErr?.name || '';
          const errorMessage = simpleErr?.message || '';

          if (errorName === 'NotFoundError' || errorMessage.includes('not found') || errorMessage.includes('Requested device')) {
            throw new Error('No microphone detected. Please ensure a microphone is connected, enabled in system settings, and not in use by another application. Then refresh the page.');
          } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
            throw new Error('Microphone access denied. Please click the lock icon in the address bar and allow microphone access, then refresh.');
          } else if (errorName === 'NotReadableError' || errorName === 'AbortError') {
            throw new Error('Microphone is in use by another application. Please close other apps using the microphone and try again.');
          } else if (errorName === 'OverconstrainedError') {
            throw new Error('Microphone does not support required settings. Try a different microphone.');
          } else {
            throw new Error(`Microphone error: ${errorMessage || errorName || 'Unknown error'}. Please check your microphone and browser settings.`);
          }
        }
      }

      console.log('[WakeWordListening] Microphone granted, stream active:', stream.active);

      // Log successful stream info
      const audioTracks = stream.getAudioTracks();
      console.log('[WakeWordListening] Audio tracks:', audioTracks.length);
      audioTracks.forEach((track, i) => {
        console.log(`[WakeWordListening] Track ${i}: ${track.label} (enabled: ${track.enabled}, muted: ${track.muted})`);
      });
      streamRef.current = stream;

      // Create audio context - use default sample rate if 16kHz not supported
      let audioContext: AudioContext;
      try {
        audioContext = new AudioContext({ sampleRate: 16000 });
      } catch (audioCtxErr) {
        console.warn('[WakeWordListening] 16kHz AudioContext failed, using default:', audioCtxErr);
        audioContext = new AudioContext();
      }
      audioContextRef.current = audioContext;
      logAudioContextState(audioContext, 'AudioContext created');

      // CRITICAL: Resume audio context if suspended (browsers suspend until user interaction)
      if (audioContext.state === 'suspended') {
        console.log('[WakeWordListening] AudioContext is suspended, attempting to resume...');
        try {
          await audioContext.resume();
          logAudioContextState(audioContext, 'AudioContext after resume()');
        } catch (resumeErr) {
          console.error('[WakeWordListening] Failed to resume AudioContext:', resumeErr);
          throw new Error('AudioContext could not be resumed. Please tap the screen to enable voice.');
        }
      }

      // Double-check context is running
      if (audioContext.state !== 'running') {
        console.warn('[WakeWordListening] AudioContext state is not running:', audioContext.state);
      }

      // Create analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Create AudioWorklet processor for audio level monitoring
      const workletCode = `
class AudioProcessorWorklet extends AudioWorkletProcessor {
  process(inputs) {
    if (inputs[0] && inputs[0][0]) {
      this.port.postMessage({
        samples: inputs[0][0]
      });
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessorWorklet);
`;

      try {
        const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(workletBlob);

        await audioContext.audioWorklet.addModule(workletUrl);

        const audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor');

        audioWorkletNode.port.onmessage = (event) => {
          if (!isListeningRef.current) return;

          const samples = new Float32Array(event.data.samples);
          const level = calculateAudioLevel(samples);

          processAudioLevel(level, samples);
        };

        source.connect(audioWorkletNode);
        audioWorkletNode.connect(audioContext.destination);
      } catch (err) {
        console.warn('[WakeWordListening] AudioWorklet not supported, falling back to ScriptProcessor:', err);
        // Fallback to ScriptProcessorNode if AudioWorklet is not available
        const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

        scriptProcessor.onaudioprocess = (event) => {
          if (!isListeningRef.current) return;

          const inputData = event.inputBuffer.getChannelData(0);
          const samples = new Float32Array(inputData);
          const level = calculateAudioLevel(samples);

          processAudioLevel(level, samples);
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
      }

      // Start animation frame for UI updates
      const updateUI = () => {
        if (!isListeningRef.current) return;

        if (analyserRef.current) {
          const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getFloatTimeDomainData(dataArray);
          const level = calculateAudioLevel(dataArray);
          setAudioLevel(level);
        }

        animationFrameRef.current = requestAnimationFrame(updateUI);
      };

      animationFrameRef.current = requestAnimationFrame(updateUI);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start audio capture');
      console.error('[WakeWordListening] Failed to start web audio:', error.message);
      console.error('[WakeWordListening] Error details:', err);
      throw error;
    }
  }, [processAudioLevel]);

  /**
   * Stop audio capture
   */
  const stopWebAudio = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  /**
   * Start listening
   */
  const start = useCallback(async () => {
    console.log('[WakeWordListening] start() called with:', { isListening, enabled, isWeb, isSupported });

    if (isListening || !enabled) {
      console.log('[WakeWordListening] start() skipped - isListening:', isListening, 'enabled:', enabled);
      return;
    }

    setError(null);
    initializeVAD();
    await initializeWakeWord();

    try {
      console.log('[WakeWordListening] Starting audio capture...');
      if (!isWeb) {
        throw new Error('Not a web platform');
      }
      if (!hasAudioContext) {
        throw new Error('AudioContext not available');
      }
      if (!hasMediaDevices) {
        throw new Error('mediaDevices not available');
      }
      if (!hasGetUserMedia) {
        throw new Error('getUserMedia not available');
      }
      if (isSupported) {
        await startWebAudio();
      } else {
        throw new Error(`Audio not supported`);
      }

      isListeningRef.current = true;
      setIsListening(true);
      console.log('[WakeWordListening] Started listening successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start listening');
      console.error('[WakeWordListening] Failed to start:', error.message);
      setError(error);
      onError(error);
    }
  }, [isListening, enabled, isWeb, isSupported, hasAudioContext, hasMediaDevices, hasGetUserMedia, startWebAudio, initializeVAD, initializeWakeWord, onError]);

  /**
   * Stop listening
   */
  const stop = useCallback(() => {
    isListeningRef.current = false;
    isAwakeRef.current = false;
    setIsListening(false);
    setIsAwake(false);
    setIsProcessing(false);
    setWakeWordDetected(false);
    setAudioLevel({ average: 0, peak: 0 });

    if (isWeb) {
      stopWebAudio();
    }

    // Cleanup wake word detector (Vosk)
    if (wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current.destroy();
      wakeWordDetectorRef.current = null;
    }

    // Cleanup Porcupine wake word detector
    if (porcupineDetectorRef.current) {
      porcupineDetectorRef.current.release().catch((err) => {
        console.warn('[WakeWordListening] Error releasing Porcupine:', err);
      });
      porcupineDetectorRef.current = null;
      porcupineInitializedRef.current = false;
    }

    // Reset VAD and clear buffer
    vadRef.current?.reset();
    bufferRef.current?.clear();
    setWakeWordReady(false);

    console.log('[WakeWordListening] Stopped listening');
  }, [isWeb, stopWebAudio]);

  // Auto-start/stop based on enabled state
  // Note: Do NOT include isListening in dependencies to avoid circular dependency
  // isListening changes are triggered by start()/stop() which are called here
  useEffect(() => {
    console.log('[WakeWordListening] useEffect triggered:', { enabled, isListening, isSupported });

    if (enabled && !isListening && isSupported) {
      console.log('[WakeWordListening] Triggering start()...');
      start();
    } else if (!enabled && isListening) {
      console.log('[WakeWordListening] Triggering stop()...');
      stop();
    }

    return () => {
      // Cleanup: stop listening if still active when effect unmounts or dependencies change
      if (isListeningRef.current) {
        console.log('[WakeWordListening] Cleanup: stopping...');
        stop();
      }
    };
  }, [enabled, isSupported]);

  // Subscribe to TTS events to prevent feedback loops
  useEffect(() => {
    const handleTTSPlaying = () => {
      console.log('[WakeWordListening] TTS playing - pausing audio processing');
      isTTSSpeakingRef.current = true;
      setIsTTSSpeaking(true);
    };

    const handleTTSCompleted = () => {
      console.log('[WakeWordListening] TTS completed - resuming audio processing');
      isTTSSpeakingRef.current = false;
      setIsTTSSpeaking(false);
    };

    const handleTTSError = () => {
      console.log('[WakeWordListening] TTS error - resuming audio processing');
      isTTSSpeakingRef.current = false;
      setIsTTSSpeaking(false);
    };

    // Subscribe to TTS events
    ttsService.on('playing', handleTTSPlaying);
    ttsService.on('completed', handleTTSCompleted);
    ttsService.on('error', handleTTSError);

    return () => {
      // Cleanup event listeners
      ttsService.off('playing', handleTTSPlaying);
      ttsService.off('completed', handleTTSCompleted);
      ttsService.off('error', handleTTSError);
    };
  }, []);

  // Update wake word config when settings change
  useEffect(() => {
    // Update Vosk wake word detector (legacy)
    if (wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current.setConfig({
        wakeWord,
        sensitivity: wakeWordSensitivity,
        cooldownMs: wakeWordCooldownMs,
        enabled: wakeWordEnabled,
      });
    }

    // Update Porcupine wake word detector cooldown
    if (porcupineDetectorRef.current) {
      porcupineDetectorRef.current.setCooldown(wakeWordCooldownMs);
    }
  }, [wakeWord, wakeWordSensitivity, wakeWordCooldownMs, wakeWordEnabled]);

  // Update VAD settings when they change
  useEffect(() => {
    if (vadRef.current) {
      vadRef.current.setSensitivity(vadSensitivity);
      vadRef.current.setSilenceThreshold(silenceThresholdMs);
    }
  }, [vadSensitivity, silenceThresholdMs]);

  // Track audio context state changes
  useEffect(() => {
    const context = audioContextRef.current;
    if (!context) {
      setAudioContextState(null);
      return;
    }

    // Update state on context state change
    const handleStateChange = () => {
      logAudioContextState(context, 'AudioContext state changed');
      setAudioContextState(context.state);
    };

    context.addEventListener('statechange', handleStateChange);
    setAudioContextState(context.state);

    return () => {
      context.removeEventListener('statechange', handleStateChange);
    };
  }, [isListening]);

  /**
   * Resume audio context after user interaction
   * Call this when user taps the screen/modal to ensure audio works
   */
  const resumeAudioContext = useCallback(async () => {
    const context = audioContextRef.current;
    if (!context) {
      console.log('[WakeWordListening] resumeAudioContext: No audio context');
      return;
    }

    logAudioContextState(context, 'resumeAudioContext called');

    if (context.state === 'suspended') {
      try {
        await context.resume();
        logAudioContextState(context, 'resumeAudioContext: After resume()');
        setAudioContextState(context.state);
      } catch (err) {
        console.error('[WakeWordListening] Failed to resume audio context:', err);
      }
    }
  }, []);

  return {
    isListening,
    isAwake,
    isProcessing,
    isSendingToServer,
    wakeWordDetected,
    isTTSSpeaking,
    audioLevel,
    start,
    stop,
    resumeAudioContext,
    error,
    isSupported,
    wakeWordReady,
    audioContextState,
  };
}

export default useWakeWordListening;
