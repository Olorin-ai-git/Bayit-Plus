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
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

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

  const handlePress = () => {
    // Toggle voice listening on/off - always enabled
    setIsListeningToggle(!isListeningToggle);
    console.log('[VoiceSearchButton] Voice listening toggled:', !isListeningToggle);
  };

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

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.button,
          isFocused && styles.buttonFocused,
          isListeningToggle && styles.buttonToggleActive,
          buttonState === 'recording' && styles.buttonRecording,
          buttonState === 'wakeword' && styles.buttonWakeWord,
          buttonState === 'processing' && styles.buttonProcessing,
          buttonState === 'listening' && styles.buttonListening,
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
      {isListeningToggle && isConstantListening && (
        <View style={[styles.listeningIndicator, tvMode && styles.listeningIndicatorTV]}>
          <Text style={[styles.listeningText, tvMode && styles.listeningTextTV]}>
            {t('voice.active', 'Voice Active')}
          </Text>
          {wakeWordReady && (
            <View style={styles.readyIndicator}>
              <Text style={styles.readyText}>✓</Text>
            </View>
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  buttonToggleActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: colors.primary,
  },
  buttonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: colors.error,
  },
  buttonWakeWord: {
    backgroundColor: 'rgba(0, 217, 255, 0.3)',
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
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
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
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
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
    bottom: -24,
    left: '50%',
    transform: [{ translateX: -50 }] as any,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
  } as any,
  listeningIndicatorTV: {
    bottom: -30,
    paddingVertical: spacing.xs,
  },
  listeningText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  listeningTextTV: {
    fontSize: 10,
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
