import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { colors, spacing, borderRadius } from '../theme';
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
    wakeWordEnabled: false,
    wakeWord: 'hi bayit',
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
        style={[
          styles.button,
          isFocused && styles.buttonFocused,
          isListeningToggle && styles.buttonToggleActive,
          buttonState === 'recording' && styles.buttonRecording,
          buttonState === 'wakeword' && styles.buttonWakeWord,
          buttonState === 'processing' && styles.buttonProcessing,
          buttonState === 'listening' && styles.buttonListening,
          debugFlash && styles.buttonDebugFlash,
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [
                { scale: isRecording || isAwake ? pulseAnim : wakeWordPulseAnim },
              ],
            },
          ]}
        >
          {/* Glow effect for listening state */}
          {isConstantListening && (
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  opacity: glowAnim,
                  backgroundColor: wakeWordDetected ? colors.primary : colors.textSecondary,
                },
              ]}
            />
          )}

          {(isTranscribing || isSendingToServer) ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.icon,
                buttonState === 'recording' && styles.iconRecording,
                buttonState === 'wakeword' && styles.iconWakeWord,
                buttonState === 'listening' && styles.iconListening,
              ]}
            >
              🎤
            </Text>
          )}
        </Animated.View>

        {/* Audio level indicator for wake word listening */}
        {isConstantListening && audioLevel.average > 0.01 && (
          <View style={styles.audioLevelContainer}>
            <View
              style={[
                styles.audioLevelBar,
                { width: `${Math.min(100, audioLevel.average * 500)}%` },
              ]}
            />
          </View>
        )}

        {/* Status indicator dot */}
        {isConstantListening && (
          <View
            style={[
              styles.statusDot,
              buttonState === 'recording' && styles.statusDotRecording,
              buttonState === 'listening' && styles.statusDotListening,
              buttonState === 'wakeword' && styles.statusDotWakeWord,
            ]}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <GlassView intensity="high" style={styles.modalContent}>
            <Animated.View
              style={[
                styles.micContainer,
                { transform: [{ scale: isRecording ? pulseAnim : 1 }] },
              ]}
            >
              <View style={[
                styles.micCircle,
                isRecording && styles.micCircleActive,
                isTranscribing && styles.micCircleTranscribing,
              ]}>
                {isTranscribing ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <Text style={styles.micIcon}>🎤</Text>
                )}
              </View>
            </Animated.View>

            <Text style={styles.statusText}>
              {isRecording
                ? t('voice.listening', 'Listening...')
                : isTranscribing
                  ? t('voice.transcribing', 'Transcribing...')
                  : t('voice.processing', 'Processing...')}
            </Text>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hint}>
                {isRecording
                  ? t('voice.tapToStop', 'Tap to stop recording')
                  : t('voice.pleaseWait', 'Please wait...')}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </GlassView>
        </View>
      </Modal>

      {/* Voice listening status indicator */}
      {isListeningToggle && (
        <View style={[styles.listeningIndicator, tvMode && styles.listeningIndicatorTV]}>
          <Text style={[styles.listeningText, tvMode && styles.listeningTextTV]}>
            {error ? `Error: ${error}` :
             wakeWordError ? `Mic Error: ${wakeWordError.message}` :
             isConstantListening ? t('voice.active', 'Voice Active') :
             'Starting...'}
          </Text>
          {isConstantListening && !error && !wakeWordError && (
            <View style={styles.readyIndicator}>
              <Text style={styles.readyText}>✓</Text>
            </View>
          )}
          {(error || wakeWordError) && (
            <View style={[styles.readyIndicator, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.readyText}>!</Text>
            </View>
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: IS_TV_BUILD ? 60 : 44,
    height: IS_TV_BUILD ? 60 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  buttonDebugFlash: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  buttonToggleActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: colors.primary,
  },
  buttonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: colors.error,
  },
  buttonWakeWord: {
    backgroundColor: 'rgba(168, 85, 247, 0.6)',
    borderColor: colors.primary,
  },
  buttonProcessing: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: '#FBBF24',
  },
  buttonListening: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconWrapper: {
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 40,
    // @ts-ignore - Web CSS property
    filter: 'blur(15px)',
  },
  icon: {
    fontSize: 20,
  },
  iconRecording: {
    // Red tint handled by button background
  },
  iconWakeWord: {
    // Highlight for wake word detection
  },
  iconListening: {
    opacity: 0.7,
  },
  audioLevelContainer: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  audioLevelBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  statusDotRecording: {
    backgroundColor: colors.error,
  },
  statusDotListening: {
    backgroundColor: colors.success,
  },
  statusDotWakeWord: {
    backgroundColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 300,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  micContainer: {
    marginBottom: spacing.lg,
  },
  micCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  micCircleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: colors.error,
  },
  micCircleTranscribing: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: colors.primary,
  },
  micIcon: {
    fontSize: 40,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listeningIndicator: {
    position: 'absolute',
    bottom: -28,
    left: '50%',
    transform: [{ translateX: -100 }] as any,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
    minWidth: 120,
    maxWidth: 200,
  } as any,
  listeningIndicatorTV: {
    bottom: -36,
    paddingVertical: spacing.xs,
    minWidth: 150,
    maxWidth: 300,
  },
  listeningText: {
    fontSize: 10,
    color: colors.text,
    flexShrink: 1,
  },
  listeningTextTV: {
    fontSize: 12,
  },
  readyIndicator: {
    marginLeft: spacing.xs,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyText: {
    fontSize: 8,
    color: colors.text,
    fontWeight: 'bold',
  },
});

export default VoiceSearchButton;
