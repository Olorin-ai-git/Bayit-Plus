import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors } from '@bayit/shared/theme';
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

  // Pulse animation for recording
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
  }, [isRecording]);

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

    // Get language code
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
    } catch (error) {
      logger.error('[VoiceLibrarian] Failed to start recognition:', error);
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
    } catch (error) {
      logger.error('[VoiceLibrarian] Command execution failed:', error);
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
      className="mb-6"
      rightElement={
        onToggleMute ? (
          <Pressable onPress={onToggleMute} className="p-1">
            {isMuted ? (
              <VolumeX size={20} color={colors.textMuted} />
            ) : (
              <Volume2 size={20} color={colors.primary} />
            )}
          </Pressable>
        ) : undefined
      }
    >

      <View className="flex-row justify-center mb-4">
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <GlassButton
            title={isRecording ? t('admin.librarian.voice.listening') : t('admin.librarian.voice.pressToSpeak')}
            icon={isRecording ? <MicOff size={20} color={colors.error} /> : <Mic size={20} color={colors.primary} />}
            variant={isRecording ? 'destructive' : 'primary'}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className="min-w-[200px]"
          />
        </Animated.View>
      </View>

      {transcript && (
        <View className="bg-white/5 rounded-lg p-4 mb-4">
          <Text className="text-xs font-semibold uppercase mb-1" style={{ color: colors.textMuted }}>
            {t('admin.librarian.voice.transcript')}:
          </Text>
          <Text className="text-sm leading-5" style={{ color: colors.text }}>{transcript}</Text>
        </View>
      )}

      {error && (
        <View className="bg-red-500/10 rounded-lg p-4 mb-4 border" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <Text className="text-[13px]" style={{ color: colors.error }}>{error}</Text>
        </View>
      )}

      {isProcessing && (
        <View className="bg-purple-700/20 rounded-lg p-2 mb-4 items-center">
          <Text className="text-[13px] font-medium" style={{ color: colors.primary }}>
            {t('admin.librarian.voice.processing')}
          </Text>
        </View>
      )}

      {isSpeaking && (
        <View className="flex-row items-center gap-1 bg-green-500/10 rounded-lg p-2 mb-4 justify-center">
          <Volume2 size={16} color={colors.primary} />
          <Text className="text-[13px] font-medium" style={{ color: colors.success }}>
            {t('admin.librarian.voice.speaking')}
          </Text>
        </View>
      )}

      <View className="bg-white/[0.03] rounded-lg p-4 mt-2">
        <Text className="text-[13px] font-semibold mb-2" style={{ color: colors.text }}>
          {t('admin.librarian.voice.examples')}:
        </Text>
        <Text className="text-xs mb-1 pl-1" style={{ color: colors.textMuted }}>
          • "{t('admin.librarian.voice.example1')}"
        </Text>
        <Text className="text-xs mb-1 pl-1" style={{ color: colors.textMuted }}>
          • "{t('admin.librarian.voice.example2')}"
        </Text>
        <Text className="text-xs mb-1 pl-1" style={{ color: colors.textMuted }}>
          • "{t('admin.librarian.voice.example3')}"
        </Text>
        <Text className="text-xs pl-1" style={{ color: colors.textMuted }}>
          • "{t('admin.librarian.voice.example4')}"
        </Text>
      </View>
    </GlassDraggableExpander>
  );
};
