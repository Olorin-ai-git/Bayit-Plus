import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassModal } from './ui';
import { colors, spacing, borderRadius } from '../theme';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { useWakeWordListening } from '../hooks/useWakeWordListening';
import { VoiceListeningContext } from '../contexts/VoiceListeningContext';
import { get_logger } from '../core/logging';

const logger = get_logger('VoiceSearchButton');

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

// Platform-specific sizes
const BUTTON_SIZE = Platform.select({
  ios: 44,
  android: 44,
  default: IS_TV_BUILD ? 80 : 44,
});

const MODAL_ICON_SIZE = Platform.select({
  ios: 96,
  android: 96,
  default: IS_TV_BUILD ? 128 : 96,
});

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
  const shouldEnableConstantListening = isListeningToggle;

  // Memoize transcript handler to set processing state
  const handleTranscriptReceived = useCallback((text: string) => {
    logger.info('Transcript received', { textLength: text.length });
    setIsProcessingTranscription(true);
    onResult(text);
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
      logger.error('Voice listening error', { error: err.message });
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
  const setListeningStateRef = useRef(voiceContext?.setListeningState);

  useEffect(() => {
    if (voiceContext?.setListeningState) {
      setListeningStateRef.current = voiceContext.setListeningState;
    }
  }, [voiceContext?.setListeningState]);

  // Update context with listening and processing states
  useEffect(() => {
    const isProcessing = isRecording || isTranscribing || isProcessingTranscription;
    if (setListeningStateRef.current) {
      logger.debug('Updating listening context', {
        isListening: isListeningToggle && isConstantListening,
        isProcessing,
      });
      setListeningStateRef.current({
        isListening: isListeningToggle && isConstantListening,
        isProcessing,
      });
    }
  }, [isRecording, isTranscribing, isProcessingTranscription, isListeningToggle, isConstantListening]);

  const handleTranscription = useCallback(async (audioBlob: Blob) => {
    if (!transcribeAudio) {
      logger.error('No transcribeAudio function provided');
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
      logger.error('Transcription failed', { error: err });
      setError(t('voice.transcriptionFailed', 'Transcription failed'));
    } finally {
      setIsTranscribing(false);
    }
  }, [transcribeAudio, onResult, t]);

  const startRecording = useCallback(async () => {
    if (Platform.OS !== 'web') {
      logger.info('Voice recording not supported on this platform');
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
      logger.error('Failed to start recording', { error: err });
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
    logger.info('Voice button pressed');
    setDebugFlash(true);
    setTimeout(() => setDebugFlash(false), 500);

    setIsListeningToggle(prev => {
      const newValue = !prev;
      logger.info('Voice listening toggled', { enabled: newValue });
      return newValue;
    });
  }, []);

  // Listen for custom event from TV remote (Red button triggers voice)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleRemoteVoiceTrigger = () => {
      logger.info('Remote voice trigger received');
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
    if (event.keyCode === 13 || event.keyCode === 32) {
      event.preventDefault();
      event.stopPropagation();
      handlePress();
    }
  }, [handlePress]);

  // Native click handler for Tizen compatibility
  const handleClick = useCallback((event: any) => {
    event.preventDefault();
    event.stopPropagation();
    handlePress();
  }, [handlePress]);

  // Get button style based on state
  const getButtonStyle = () => {
    if (debugFlash) {
      return [styles.button, styles.buttonDebug];
    } else if (buttonState === 'recording') {
      return [styles.button, styles.buttonRecording];
    } else if (buttonState === 'wakeword') {
      return [styles.button, styles.buttonWakeWord];
    } else if (buttonState === 'processing') {
      return [styles.button, styles.buttonProcessing];
    } else if (isListeningToggle) {
      return [styles.button, styles.buttonListeningActive];
    } else if (isFocused) {
      return [styles.button, styles.buttonFocused];
    } else if (buttonState === 'listening') {
      return [styles.button, styles.buttonListening];
    }
    return styles.button;
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
        style={getButtonStyle()}
      >
        <Animated.View
          style={[
            styles.iconContainer,
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
                styles.glow,
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
                {
                  width: `${Math.min(100, audioLevel.average * 500)}%`,
                  backgroundColor: colors.primary,
                },
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
              buttonState === 'wakeword' && styles.statusDotWakeWord,
              buttonState === 'listening' && styles.statusDotListening,
            ]}
          />
        )}
      </TouchableOpacity>

      <GlassModal
        visible={showModal}
        onClose={handleCancel}
        title=""
        showCloseButton={false}
      >
        <View style={styles.modalContent}>
          <Animated.View
            style={[
              styles.modalIconContainer,
              { transform: [{ scale: isRecording ? pulseAnim : 1 }] },
            ]}
          >
            <View
              style={[
                styles.modalIcon,
                isRecording && styles.modalIconRecording,
                isTranscribing && styles.modalIconTranscribing,
              ]}
            >
              {isTranscribing ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Text style={styles.modalIconText}>🎤</Text>
              )}
            </View>
          </Animated.View>

          <Text style={styles.modalTitle}>
            {isRecording
              ? t('voice.listening', 'Listening...')
              : isTranscribing
                ? t('voice.transcribing', 'Transcribing...')
                : t('voice.processing', 'Processing...')}
          </Text>

          {error ? (
            <Text style={styles.modalError}>{error}</Text>
          ) : (
            <Text style={styles.modalDescription}>
              {isRecording
                ? t('voice.tapToStop', 'Tap to stop recording')
                : t('voice.pleaseWait', 'Please wait...')}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      </GlassModal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonDebug: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  buttonRecording: {
    backgroundColor: colors.glassOverlayPurple,
    borderColor: colors.error,
  },
  buttonWakeWord: {
    backgroundColor: colors.glassPurple,
    borderColor: colors.primary,
  },
  buttonProcessing: {
    backgroundColor: colors.glassOverlay,
    borderColor: colors.warning,
  },
  buttonListeningActive: {
    backgroundColor: colors.glassPurpleLight,
    borderColor: colors.primary,
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.glassPurpleLight,
  },
  buttonListening: {
    backgroundColor: colors.glassLight,
    borderColor: 'transparent',
  },
  iconContainer: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 100,
  },
  icon: {
    fontSize: 20,
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
    backgroundColor: colors.glassLight,
    borderRadius: 1,
    overflow: 'hidden',
  },
  audioLevelBar: {
    height: '100%',
    borderRadius: 1,
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  statusDotRecording: {
    backgroundColor: colors.error,
  },
  statusDotWakeWord: {
    backgroundColor: colors.primary,
  },
  statusDotListening: {
    backgroundColor: colors.success,
  },
  modalContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  modalIconContainer: {
    marginBottom: spacing.md,
  },
  modalIcon: {
    width: MODAL_ICON_SIZE,
    height: MODAL_ICON_SIZE,
    borderRadius: MODAL_ICON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    backgroundColor: colors.glassPurpleLight,
    borderColor: colors.primary,
  },
  modalIconRecording: {
    backgroundColor: colors.glassOverlayPurple,
    borderColor: colors.error,
  },
  modalIconTranscribing: {
    backgroundColor: colors.glassPurpleLight,
    borderColor: colors.primary,
  },
  modalIconText: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalError: {
    fontSize: 14,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassLight,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default VoiceSearchButton;
