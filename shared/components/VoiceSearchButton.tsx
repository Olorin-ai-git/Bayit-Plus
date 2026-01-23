import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { colors } from '../theme';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { useWakeWordListening } from '../hooks/useWakeWordListening';
import { VoiceListeningContext } from '../contexts/VoiceListeningContext';

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  transcribeAudio?: (audioBlob: Blob) => Promise<{ text: string }>;
  showConstantListening?: boolean;
  /** Show larger UI for TV mode */
  tvMode?: boolean;
}

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
  onResult,
  transcribeAudio,
  showConstantListening,
  tvMode = IS_TV_BUILD,
}) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingTranscription, setIsProcessingTranscription] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListeningToggle, setIsListeningToggle] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wakeWordPulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice settings
  const { preferences } = useVoiceSettingsStore();

  // Get the global voice listening context (optional, gracefully handles if not available)
  const voiceContext = useContext(VoiceListeningContext);

  // Determine if wake word listening should be enabled
  // Only enable if the toggle button is pressed
  const shouldEnableConstantListening = isListeningToggle;

  // Memoize transcript handler to set processing state
  const handleTranscriptReceived = useCallback((text: string) => {
    console.log('[VoiceSearchButton] Transcript received:', text.substring(0, 50));
    // Set processing state to show "Processing..." on soundwave
    setIsProcessingTranscription(true);

    // Call the parent's result handler
    onResult(text);

    // Clear processing state after 2 seconds (allows backend to take over)
    setTimeout(() => {
      setIsProcessingTranscription(false);
    }, 2000);
  }, [onResult]);

  // Wake word listening (for wake word mode - works on web and TV)
  const {
    isListening: isConstantListening,
    isAwake,
    isProcessing: isWakeWordProcessing,
    isSendingToServer,
    wakeWordDetected,
    audioLevel,
    error: wakeWordError,
    wakeWordReady,
  } = useWakeWordListening({
    enabled: shouldEnableConstantListening,
    wakeWordEnabled: preferences.wake_word_enabled ?? true,
    wakeWord: preferences.wake_word || 'hey buyit',
    wakeWordSensitivity: 0.7,
    wakeWordCooldownMs: 2000,
    silenceThresholdMs: preferences.silence_threshold_ms || 2000,
    vadSensitivity: preferences.vad_sensitivity || 'medium',
    onTranscript: handleTranscriptReceived,
    onWakeWordDetected: () => {
      // Trigger visual feedback
    },
    onError: (err) => {
      console.error('[VoiceSearchButton] Voice listening error:', err);
      setError(err.message || 'Microphone error');
    },
    transcribeAudio,
  });

  // Pulse animation for recording state
  useEffect(() => {
    if (isRecording || isAwake) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isAwake, pulseAnim]);

  // Wake word detection animation
  useEffect(() => {
    if (wakeWordDetected) {
      // Flash animation for wake word detection
      Animated.sequence([
        Animated.parallel([
          Animated.timing(wakeWordPulseAnim, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(wakeWordPulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [wakeWordDetected, wakeWordPulseAnim, glowAnim]);

  // Subtle listening animation when wake word listening is active
  useEffect(() => {
    if (isConstantListening && !isAwake && !isRecording) {
      // Subtle glow pulse for idle wake word listening
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isConstantListening, isAwake, isRecording, glowAnim]);

  // Update global voice listening context when this button's state changes
  // This ensures the soundwave indicator updates when the user clicks the voice button
  // Store the setListeningState function in a ref to avoid dependency loops
  const setListeningStateRef = useRef(voiceContext?.setListeningState);

  // Update the ref when context changes (stable due to useCallback in context)
  useEffect(() => {
    if (voiceContext?.setListeningState) {
      setListeningStateRef.current = voiceContext.setListeningState;
    }
  }, [voiceContext?.setListeningState]);

  // Update context with listening and processing states
  useEffect(() => {
    const isProcessing = isRecording || isTranscribing || isProcessingTranscription;
    if (setListeningStateRef.current) {
      console.log('[VoiceSearchButton] Updating context:', {
        isListening: isListeningToggle && isConstantListening,
        isProcessing,
        isRecording,
        isTranscribing,
        isProcessingTranscription,
        isListeningToggle,
        isConstantListening,
      });
      setListeningStateRef.current({
        isListening: isListeningToggle && isConstantListening,
        isProcessing,
      });
    }
  }, [isRecording, isTranscribing, isProcessingTranscription, isListeningToggle, isConstantListening]);

  const handleTranscription = useCallback(async (audioBlob: Blob) => {
    if (!transcribeAudio) {
      console.error('No transcribeAudio function provided');
      setError(t('voice.transcriptionNotAvailable', 'Transcription not available'));
      setShowModal(false);
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const response = await transcribeAudio(audioBlob);
      const transcribedText = response.text;

      if (transcribedText?.trim()) {
        onResult(transcribedText.trim());
      }
      setShowModal(false);
    } catch (err) {
      console.error('Transcription failed:', err);
      setError(t('voice.transcriptionFailed', 'Transcription failed'));
    } finally {
      setIsTranscribing(false);
    }
  }, [transcribeAudio, onResult, t]);

  const startRecording = useCallback(async () => {
    if (Platform.OS !== 'web') {
      console.log('Voice recording not supported on this platform yet');
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try with opus codec first, fall back to basic webm for Samsung TV compatibility
      let mediaRecorder: MediaRecorder;
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
      } else {
        // Fallback - let browser choose format
        mediaRecorder = new MediaRecorder(stream);
      }

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(t('voice.micPermissionDenied', 'Microphone permission denied'));
      setShowModal(true);
    }
  }, [handleTranscription, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Visual debug state - shows if button was pressed
  const [debugFlash, setDebugFlash] = useState(false);

  const handlePress = useCallback(() => {
    console.log('[VoiceSearchButton] handlePress called!');

    // Visual feedback - flash the button to confirm press was received
    setDebugFlash(true);
    setTimeout(() => setDebugFlash(false), 500);

    // Toggle voice listening on/off - always enabled
    setIsListeningToggle(prev => {
      const newValue = !prev;
      console.log('[VoiceSearchButton] Voice listening toggled to:', newValue);
      return newValue;
    });
  }, []);

  // Listen for custom event from TV remote (Red button triggers voice)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleRemoteVoiceTrigger = () => {
      console.log('[VoiceSearchButton] Remote voice trigger received');
      handlePress();
    };

    window.addEventListener('bayit:toggle-voice', handleRemoteVoiceTrigger);
    return () => {
      window.removeEventListener('bayit:toggle-voice', handleRemoteVoiceTrigger);
    };
  }, [handlePress]);

  const handleCancel = () => {
    if (isRecording && mediaRecorderRef.current) {
      const stream = mediaRecorderRef.current.stream;
      stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
    setShowModal(false);
    setError(null);
    setIsTranscribing(false);
  };

  // Get the current state for styling
  const getButtonState = () => {
    if (isRecording || isAwake) return 'recording';
    if (isTranscribing || isSendingToServer) return 'processing';
    if (wakeWordDetected) return 'wakeword';
    if (isListeningToggle && isConstantListening) return 'listening';
    return 'idle';
  };

  const buttonState = getButtonState();

  // Handle keyboard events for TV remote (Enter/OK button)
  const handleKeyDown = useCallback((event: any) => {
    console.log('[VoiceSearchButton] keyDown event:', event.keyCode);
    // Enter key (13) or Space (32) triggers the button
    if (event.keyCode === 13 || event.keyCode === 32) {
      event.preventDefault();
      event.stopPropagation();
      handlePress();
    }
  }, [handlePress]);

  // Native click handler for Tizen compatibility
  const handleClick = useCallback((event: any) => {
    console.log('[VoiceSearchButton] click event received');
    event.preventDefault();
    event.stopPropagation();
    handlePress();
  }, [handlePress]);

  // Get button classes based on state
  const getButtonClasses = () => {
    let classes = 'w-11 h-11 justify-center items-center rounded-lg bg-white/5 border relative overflow-hidden';

    if (debugFlash) {
      classes += ' bg-green-500 border-green-500';
    } else if (buttonState === 'recording') {
      classes += ' bg-red-500/20 border-red-500';
    } else if (buttonState === 'wakeword') {
      classes += ' bg-purple-500/60 border-purple-500';
    } else if (buttonState === 'processing') {
      classes += ' bg-amber-500/20 border-amber-400';
    } else if (isListeningToggle) {
      classes += ' bg-purple-500/30 border-purple-500';
    } else if (isFocused) {
      classes += ' border-purple-500 bg-purple-500/30';
    } else if (buttonState === 'listening') {
      classes += ' bg-white/[0.08] border-transparent';
    } else {
      classes += ' border-transparent';
    }

    return classes;
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        // @ts-ignore - Web-specific props for TV remote support
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        accessibilityRole="button"
        accessibilityLabel="Toggle voice listening"
        className={getButtonClasses()}
      >
        <Animated.View
          className="relative"
          style={{
            transform: [
              { scale: isRecording || isAwake ? pulseAnim : wakeWordPulseAnim },
            ],
          }}
        >
          {/* Glow effect for listening state */}
          {isConstantListening && (
            <Animated.View
              className="absolute -inset-5 rounded-full blur-[15px]"
              style={{
                opacity: glowAnim,
                backgroundColor: wakeWordDetected ? colors.primary : colors.textSecondary,
              }}
            />
          )}

          {(isTranscribing || isSendingToServer) ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              className={`text-xl ${
                buttonState === 'listening' ? 'opacity-70' : ''
              }`}
            >
              🎤
            </Text>
          )}
        </Animated.View>

        {/* Audio level indicator for wake word listening */}
        {isConstantListening && audioLevel.average > 0.01 && (
          <View className="absolute bottom-0.5 left-1 right-1 h-0.5 bg-white/10 rounded-sm overflow-hidden">
            <View
              className="h-full rounded-sm"
              style={{
                width: `${Math.min(100, audioLevel.average * 500)}%`,
                backgroundColor: colors.primary,
              }}
            />
          </View>
        )}

        {/* Status indicator dot */}
        {isConstantListening && (
          <View
            className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
              buttonState === 'recording' ? 'bg-red-500' :
              buttonState === 'wakeword' ? 'bg-purple-500' :
              buttonState === 'listening' ? 'bg-green-500' :
              'bg-gray-400'
            }`}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View className="flex-1 bg-black/80 justify-center items-center">
          <GlassView intensity="high" className="w-[300px] p-6 rounded-xl items-center">
            <Animated.View
              className="mb-4"
              style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}
            >
              <View
                className={`w-24 h-24 rounded-full justify-center items-center border-[3px] ${
                  isRecording ? 'bg-red-500/20 border-red-500' :
                  isTranscribing ? 'bg-purple-500/30 border-purple-500' :
                  'bg-purple-500/30 border-purple-500'
                }`}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <Text className="text-[40px]">🎤</Text>
                )}
              </View>
            </Animated.View>

            <Text className="text-xl font-bold text-white mb-3">
              {isRecording
                ? t('voice.listening', 'Listening...')
                : isTranscribing
                  ? t('voice.transcribing', 'Transcribing...')
                  : t('voice.processing', 'Processing...')}
            </Text>

            {error ? (
              <Text className="text-sm text-red-500 mb-4 text-center">{error}</Text>
            ) : (
              <Text className="text-sm text-gray-400 mb-4 text-center">
                {isRecording
                  ? t('voice.tapToStop', 'Tap to stop recording')
                  : t('voice.pleaseWait', 'Please wait...')}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleCancel}
              className="py-2 px-6 rounded-md bg-white/10"
            >
              <Text className="text-base text-gray-400">{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </GlassView>
        </View>
      </Modal>

      {/* Voice listening status indicator - removed as SoundwaveParticles panel shows status */}
    </>
  );
};

export default VoiceSearchButton;
