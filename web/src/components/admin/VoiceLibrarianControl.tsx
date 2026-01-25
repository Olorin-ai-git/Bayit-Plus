import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import logger from '@/utils/logger';

interface VoiceLibrarianControlProps {
  onCommand: (command: string) => Promise<void>;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  onToggleMute?: () => void;
  isMuted?: boolean;
}

export const VoiceLibrarianControl: React.FC<VoiceLibrarianControlProps> = ({
  onCommand,
  isProcessing = false,
  isSpeaking = false,
  onToggleMute,
  isMuted = false,
}) => {
  const { t, i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
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
  }, [isRecording, pulseAnim]);

  const startRecording = useCallback(() => {
    setError(null);

    if (typeof window === 'undefined') {
      setError(t('admin.librarian.voice.notAvailable'));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(t('admin.librarian.voice.notSupported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    const langMap: Record<string, string> = {
      he: 'he-IL',
      en: 'en-US',
      es: 'es-ES',
    };
    recognition.lang = langMap[i18n.language] || 'he-IL';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      logger.info('[VoiceLibrarian] Recording started');
      setIsRecording(true);
      setTranscript('');
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;

      logger.info('[VoiceLibrarian] Interim transcript:', text);
      setTranscript(text);

      if (result.isFinal) {
        logger.info('[VoiceLibrarian] Final transcript:', text);
        setIsRecording(false);
        if (text.trim()) {
          handleVoiceCommand(text.trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      logger.error('[VoiceLibrarian] Speech recognition error:', event.error);
      setIsRecording(false);

      if (event.error === 'no-speech') {
        setError(t('admin.librarian.voice.noSpeech'));
      } else if (event.error === 'audio-capture') {
        setError(t('admin.librarian.voice.noMicrophone'));
      } else if (event.error === 'not-allowed') {
        setError(t('admin.librarian.voice.microphoneBlocked'));
      } else {
        setError(t('admin.librarian.voice.error', { error: event.error }));
      }
    };

    recognition.onend = () => {
      logger.info('[VoiceLibrarian] Recording ended');
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (err) {
      logger.error('[VoiceLibrarian] Failed to start recognition:', err);
      setError(t('admin.librarian.voice.startFailed'));
      setIsRecording(false);
    }
  }, [i18n.language, t]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleVoiceCommand = async (command: string) => {
    try {
      await onCommand(command);
    } catch (err) {
      logger.error('[VoiceLibrarian] Command execution failed:', err);
      setError(t('admin.librarian.voice.commandFailed'));
    }
  };

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.voice.title')}
      subtitle={t('admin.librarian.voice.description')}
      icon={<Mic size={20} color={colors.primary} />}
      defaultExpanded={false}
      draggable={true}
      minHeight={200}
      maxHeight={600}
      style={styles.expander}
      rightElement={
        onToggleMute ? (
          <Pressable onPress={onToggleMute} style={styles.muteButton}>
            {isMuted ? (
              <VolumeX size={20} color={colors.textMuted} />
            ) : (
              <Volume2 size={20} color={colors.primary} />
            )}
          </Pressable>
        ) : undefined
      }
    >
      <View style={styles.buttonContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <GlassButton
            title={isRecording ? t('admin.librarian.voice.listening') : t('admin.librarian.voice.pressToSpeak')}
            icon={isRecording ? <MicOff size={20} color={colors.error} /> : <Mic size={20} color={colors.primary} />}
            variant={isRecording ? 'destructive' : 'primary'}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            style={styles.recordButton}
          />
        </Animated.View>
      </View>

      {transcript && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>
            {t('admin.librarian.voice.transcript')}:
          </Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isProcessing && (
        <View style={styles.processingContainer}>
          <Text style={styles.processingText}>
            {t('admin.librarian.voice.processing')}
          </Text>
        </View>
      )}

      {isSpeaking && (
        <View style={styles.speakingContainer}>
          <Volume2 size={16} color={colors.primary} />
          <Text style={styles.speakingText}>
            {t('admin.librarian.voice.speaking')}
          </Text>
        </View>
      )}

      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>
          {t('admin.librarian.voice.examples')}:
        </Text>
        <Text style={styles.exampleItem}>
          • "{t('admin.librarian.voice.example1')}"
        </Text>
        <Text style={styles.exampleItem}>
          • "{t('admin.librarian.voice.example2')}"
        </Text>
        <Text style={styles.exampleItem}>
          • "{t('admin.librarian.voice.example3')}"
        </Text>
        <Text style={styles.exampleItem}>
          • "{t('admin.librarian.voice.example4')}"
        </Text>
      </View>
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  expander: {
    marginBottom: spacing.md,
  },
  muteButton: {
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  recordButton: {
    minWidth: 200,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    color: colors.textMuted,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 13,
    color: colors.error.DEFAULT,
  },
  processingContainer: {
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
    borderRadius: borderRadius.md,
    padding: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary.DEFAULT,
  },
  speakingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: borderRadius.md,
    padding: 8,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  speakingText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.success.DEFAULT,
  },
  examplesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: 8,
  },
  examplesTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  exampleItem: {
    fontSize: 12,
    marginBottom: 4,
    paddingLeft: 4,
    color: colors.textMuted,
  },
});
