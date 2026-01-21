/**
 * useConstantListening Hook
 *
 * Core orchestration hook for constant listening mode.
 * Manages continuous audio capture, VAD, buffering, and transcription.
 * Used in TV and tvOS apps for hands-free voice interaction.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { VADDetector, AudioLevel, calculateAudioLevel, createVADDetector } from '../utils/vadDetector';
import { AudioBufferManager, createAudioBuffer } from '../utils/audioBufferManager';
import { VADSensitivity } from '../services/api';

// Type for transcription service
type TranscribeFunction = (audioBlob: Blob) => Promise<{ text: string }>;

export interface UseConstantListeningOptions {
  enabled: boolean;
  onTranscript: (text: string) => void;
  onError: (error: Error) => void;
  silenceThresholdMs?: number;
  vadSensitivity?: VADSensitivity;
  transcribeAudio?: TranscribeFunction;
}

export interface UseConstantListeningReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSendingToServer: boolean;
  audioLevel: AudioLevel;
  start: () => Promise<void>;
  stop: () => void;
  error: Error | null;
  isSupported: boolean;
}

// Audio worklet processor code for real-time audio analysis (web only)
const AUDIO_WORKLET_CODE = `
class AudioLevelProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      const samples = input[0];
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < samples.length; i++) {
        const abs = Math.abs(samples[i]);
        sum += samples[i] * samples[i];
        if (abs > peak) peak = abs;
      }
      const rms = Math.sqrt(sum / samples.length);
      this.port.postMessage({ average: rms, peak, samples: new Float32Array(samples) });
    }
    return true;
  }
}
registerProcessor('audio-level-processor', AudioLevelProcessor);
`;

/**
 * useConstantListening hook
 *
 * Provides continuous voice listening with VAD and automatic transcription.
 * Detects when user speaks, waits for silence, then sends to API.
 */
export function useConstantListening(options: UseConstantListeningOptions): UseConstantListeningReturn {
  const {
    enabled,
    onTranscript,
    onError,
    silenceThresholdMs = 2000,
    vadSensitivity = 'medium',
    transcribeAudio,
  } = options;

  // State
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingToServer, setIsSendingToServer] = useState(false);
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({ average: 0, peak: 0 });
  const [error, setError] = useState<Error | null>(null);

  // Refs for audio capture
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Refs for VAD and buffering
  const vadRef = useRef<VADDetector | null>(null);
  const bufferRef = useRef<AudioBufferManager | null>(null);
  const isListeningRef = useRef(false);

  // Check platform support
  const isWeb = Platform.OS === 'web';
  const isSupported = isWeb &&
    typeof AudioContext !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  // Native module support check (for future native implementation)
  const hasNativeModule = !isWeb && NativeModules.AudioCaptureModule !== undefined;

  /**
   * Initialize VAD and buffer
   */
  const initializeVAD = useCallback(() => {
    vadRef.current = createVADDetector(vadSensitivity, silenceThresholdMs);
    bufferRef.current = createAudioBuffer({ maxDurationMs: 15000 });
  }, [vadSensitivity, silenceThresholdMs]);

  /**
   * Process audio level and check VAD state
   */
  const processAudioLevel = useCallback(async (level: AudioLevel, samples?: Float32Array) => {
    if (!vadRef.current || !bufferRef.current || !isListeningRef.current) return;

    // Update audio level for visualization
    setAudioLevel(level);

    // Add samples to buffer if provided
    if (samples) {
      bufferRef.current.addChunk(samples);
    }

    // Process VAD
    const vadState = vadRef.current.process(level);

    if (vadState === 'speech') {
      // Speech detected - mark buffer as recording speech
      if (!bufferRef.current.isRecording()) {
        bufferRef.current.startSpeech();
        setIsProcessing(true);
      }
    } else if (vadState === 'silence_after_speech' && vadRef.current.shouldSendToAPI()) {
      // Silence after speech - send to API
      bufferRef.current.endSpeech();
      setIsProcessing(false);

      // Export audio and send to transcription
      await sendToTranscription();
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
      console.error('[ConstantListening] Transcription error:', error);
      onError(error);
    } finally {
      setIsSendingToServer(false);
      vadRef.current?.reset();
      bufferRef.current?.clear();
    }
  }, [transcribeAudio, onTranscript, onError]);

  /**
   * Start web audio capture
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
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // AudioWorklet is preferred but has setup complexity
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

        // Get frequency data for more responsive visualization
        if (analyserRef.current) {
          const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getFloatTimeDomainData(dataArray);

          // Quick level calculation for visualization
          const level = calculateAudioLevel(dataArray);
          setAudioLevel(level);
        }

        animationFrameRef.current = requestAnimationFrame(updateUI);
      };

      animationFrameRef.current = requestAnimationFrame(updateUI);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start audio capture');
      console.error('[ConstantListening] Failed to start web audio:', error);
      throw error;
    }
  }, [processAudioLevel]);

  /**
   * Stop web audio capture
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
    workletNodeRef.current = null;
  }, []);

  /**
   * Start native audio capture (placeholder for future implementation)
   */
  const startNativeAudio = useCallback(async () => {
    if (!hasNativeModule) {
      throw new Error('Native audio module not available');
    }

    // This will be implemented when native modules are added
    const AudioCaptureModule = NativeModules.AudioCaptureModule;
    const eventEmitter = new NativeEventEmitter(AudioCaptureModule);

    // Subscribe to audio level events
    const subscription = eventEmitter.addListener('onAudioLevel', (data) => {
      const level: AudioLevel = {
        average: data.average,
        peak: data.peak,
      };
      processAudioLevel(level);
    });

    await AudioCaptureModule.startListening();

    return () => {
      subscription.remove();
      AudioCaptureModule.stopListening();
    };
  }, [hasNativeModule, processAudioLevel]);

  /**
   * Start listening
   */
  const start = useCallback(async () => {
    if (isListening || !enabled) return;

    setError(null);
    initializeVAD();

    try {
      if (isWeb && isSupported) {
        await startWebAudio();
      } else if (hasNativeModule) {
        await startNativeAudio();
      } else {
        throw new Error('Audio capture not supported on this platform');
      }

      isListeningRef.current = true;
      setIsListening(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start listening');
      setError(error);
      onError(error);
    }
  }, [isListening, enabled, isWeb, isSupported, hasNativeModule, startWebAudio, startNativeAudio, initializeVAD, onError]);

  /**
   * Stop listening
   */
  const stop = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setIsProcessing(false);
    setAudioLevel({ average: 0, peak: 0 });

    if (isWeb) {
      stopWebAudio();
    } else if (hasNativeModule) {
      NativeModules.AudioCaptureModule?.stopListening();
    }

    // Reset VAD and clear buffer
    vadRef.current?.reset();
    bufferRef.current?.clear();
  }, [isWeb, hasNativeModule, stopWebAudio]);

  // Auto-start/stop based on enabled state
  useEffect(() => {
    if (enabled && !isListening && (isSupported || hasNativeModule)) {
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

  // Update VAD settings when they change
  useEffect(() => {
    if (vadRef.current) {
      vadRef.current.setSensitivity(vadSensitivity);
      vadRef.current.setSilenceThreshold(silenceThresholdMs);
    }
  }, [vadSensitivity, silenceThresholdMs]);

  return {
    isListening,
    isProcessing,
    isSendingToServer,
    audioLevel,
    start,
    stop,
    error,
    isSupported: isSupported || hasNativeModule,
  };
}

export default useConstantListening;
