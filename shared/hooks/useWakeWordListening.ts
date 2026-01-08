/**
 * useWakeWordListening Hook
 *
 * Enhanced constant listening with wake word detection.
 * Wraps useConstantListening to add "Hi Bayit" wake word activation.
 * Audio is only sent to transcription API after wake word is detected.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { WakeWordDetector, WakeWordConfig, WakeWordResult, createWakeWordDetector } from '../utils/wakeWordDetector';
import { VADDetector, AudioLevel, calculateAudioLevel, createVADDetector } from '../utils/vadDetector';
import { AudioBufferManager, createAudioBuffer } from '../utils/audioBufferManager';
import { VADSensitivity } from '../services/api';

// Type for transcription service
type TranscribeFunction = (audioBlob: Blob) => Promise<{ text: string }>;

export interface UseWakeWordListeningOptions {
  enabled: boolean;
  wakeWordEnabled: boolean;
  wakeWord?: string;
  wakeWordSensitivity?: number;
  wakeWordCooldownMs?: number;
  onTranscript: (text: string) => void;
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
  audioLevel: AudioLevel;
  start: () => Promise<void>;
  stop: () => void;
  error: Error | null;
  isSupported: boolean;
  wakeWordReady: boolean;       // Vosk model loaded and ready
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
    wakeWord = 'hi bayit',
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

  // Refs for audio capture
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Refs for wake word, VAD, and buffering
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const vadRef = useRef<VADDetector | null>(null);
  const bufferRef = useRef<AudioBufferManager | null>(null);
  const isListeningRef = useRef(false);
  const isAwakeRef = useRef(false);

  // Check platform support
  const isWeb = Platform.OS === 'web';
  const isSupported = isWeb &&
    typeof AudioContext !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  /**
   * Initialize wake word detector
   */
  const initializeWakeWord = useCallback(async () => {
    if (!wakeWordEnabled) return;

    try {
      const detector = createWakeWordDetector({
        wakeWord,
        sensitivity: wakeWordSensitivity,
        cooldownMs: wakeWordCooldownMs,
        enabled: true,
      });

      // Try to initialize with Vosk model
      try {
        await detector.initialize(modelPath);
        setWakeWordReady(true);
        console.log('[WakeWordListening] Vosk model loaded');
      } catch (err) {
        console.warn('[WakeWordListening] Vosk model not available, using fallback');
        // Continue without Vosk - will use simplified detection
      }

      wakeWordDetectorRef.current = detector;
    } catch (err) {
      console.error('[WakeWordListening] Failed to initialize wake word detector:', err);
    }
  }, [wakeWordEnabled, wakeWord, wakeWordSensitivity, wakeWordCooldownMs, modelPath]);

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
   */
  const sendToTranscription = useCallback(async () => {
    if (!bufferRef.current || !transcribeAudio) return;

    const audioBlob = bufferRef.current.exportAsWav();

    // Skip if audio is too short (less than 0.5 seconds)
    if (audioBlob.size < 16000) {
      vadRef.current?.reset();
      bufferRef.current.clear();
      setIsAwake(false);
      isAwakeRef.current = false;
      return;
    }

    setIsSendingToServer(true);

    try {
      const result = await transcribeAudio(audioBlob);

      if (result.text && result.text.trim()) {
        onTranscript(result.text.trim());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transcription failed');
      console.error('[WakeWordListening] Transcription error:', error);
      onError(error);
    } finally {
      setIsSendingToServer(false);
      vadRef.current?.reset();
      bufferRef.current?.clear();
      setIsAwake(false);
      isAwakeRef.current = false;
      setWakeWordDetected(false);
    }
  }, [transcribeAudio, onTranscript, onError]);

  /**
   * Process audio level and check wake word/VAD state
   */
  const processAudioLevel = useCallback(async (level: AudioLevel, samples?: Float32Array) => {
    if (!vadRef.current || !bufferRef.current || !isListeningRef.current) return;

    // Update audio level for visualization
    setAudioLevel(level);

    // If wake word is enabled and not yet awake, check for wake word
    if (wakeWordEnabled && !isAwakeRef.current && samples && wakeWordDetectorRef.current) {
      const result = await wakeWordDetectorRef.current.processAudio(samples);

      if (result.detected) {
        console.log('[WakeWordListening] Wake word detected!', result);

        // Wake up!
        isAwakeRef.current = true;
        setIsAwake(true);
        setWakeWordDetected(true);

        // Play feedback
        playWakeWordFeedback();

        // Notify callback
        onWakeWordDetected?.();

        // Start recording
        bufferRef.current.startSpeech();
        setIsProcessing(true);

        // Reset wake word detected visual after 1 second
        setTimeout(() => setWakeWordDetected(false), 1000);

        return;
      }
    }

    // If awake (or wake word disabled), process normally with VAD
    if (isAwakeRef.current || !wakeWordEnabled) {
      // Add samples to buffer
      if (samples) {
        bufferRef.current.addChunk(samples);
      }

      const vadState = vadRef.current.process(level);

      if (vadState === 'speech') {
        // Speech detected - continue recording
        if (!bufferRef.current.isRecording()) {
          bufferRef.current.startSpeech();
          setIsProcessing(true);
        }
      } else if (vadState === 'silence_after_speech' && vadRef.current.shouldSendToAPI()) {
        // Silence after speech - send to API
        bufferRef.current.endSpeech();
        setIsProcessing(false);

        await sendToTranscription();
      }
    }
  }, [wakeWordEnabled, onWakeWordDetected, playWakeWordFeedback, sendToTranscription]);

  /**
   * Start audio capture
   */
  const startWebAudio = useCallback(async () => {
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Create analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Create script processor for audio level monitoring
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
      console.error('[WakeWordListening] Failed to start web audio:', error);
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
    if (isListening || !enabled) return;

    setError(null);
    initializeVAD();
    await initializeWakeWord();

    try {
      if (isWeb && isSupported) {
        await startWebAudio();
      } else {
        throw new Error('Audio capture not supported on this platform');
      }

      isListeningRef.current = true;
      setIsListening(true);
      console.log('[WakeWordListening] Started listening');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start listening');
      setError(error);
      onError(error);
    }
  }, [isListening, enabled, isWeb, isSupported, startWebAudio, initializeVAD, initializeWakeWord, onError]);

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

    // Cleanup wake word detector
    if (wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current.destroy();
      wakeWordDetectorRef.current = null;
    }

    // Reset VAD and clear buffer
    vadRef.current?.reset();
    bufferRef.current?.clear();

    console.log('[WakeWordListening] Stopped listening');
  }, [isWeb, stopWebAudio]);

  // Auto-start/stop based on enabled state
  useEffect(() => {
    if (enabled && !isListening && isSupported) {
      start();
    } else if (!enabled && isListening) {
      stop();
    }

    return () => {
      if (isListening) {
        stop();
      }
    };
  }, [enabled]);

  // Update wake word config when settings change
  useEffect(() => {
    if (wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current.setConfig({
        wakeWord,
        sensitivity: wakeWordSensitivity,
        cooldownMs: wakeWordCooldownMs,
        enabled: wakeWordEnabled,
      });
    }
  }, [wakeWord, wakeWordSensitivity, wakeWordCooldownMs, wakeWordEnabled]);

  // Update VAD settings when they change
  useEffect(() => {
    if (vadRef.current) {
      vadRef.current.setSensitivity(vadSensitivity);
      vadRef.current.setSilenceThreshold(silenceThresholdMs);
    }
  }, [vadSensitivity, silenceThresholdMs]);

  return {
    isListening,
    isAwake,
    isProcessing,
    isSendingToServer,
    wakeWordDetected,
    audioLevel,
    start,
    stop,
    error,
    isSupported,
    wakeWordReady,
  };
}

export default useWakeWordListening;
