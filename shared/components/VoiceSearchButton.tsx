import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { getCurrentLanguage } from '../i18n';
import { colors, spacing, borderRadius } from '../theme';

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
}

// Language codes for speech recognition
const speechLanguageCodes: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
  es: 'es-ES',
};

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({ onResult }) => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showModal, setShowModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

  // Pulse animation for recording state
  useEffect(() => {
    if (isListening) {
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
  }, [isListening]);

  const startListening = () => {
    // Web Speech API (for web/browser)
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && typeof globalThis === 'object' && ('SpeechRecognition' in globalThis || 'webkitSpeechRecognition' in globalThis)) {
      const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        const currentLang = getCurrentLanguage();
        recognition.lang = speechLanguageCodes[currentLang.code] || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsListening(true);
          setShowModal(true);
          setTranscript('');
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const text = result[0].transcript;
          setTranscript(text);

          if (result.isFinal) {
            setIsListening(false);
            setTimeout(() => {
              setShowModal(false);
              if (text.trim()) {
                onResult(text.trim());
              }
            }, 500);
          }
        };

        recognition.onerror = (event: any) => {
          console.log('Speech recognition error:', event.error);
          setIsListening(false);
          setShowModal(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } else {
        console.log('Speech recognition not supported');
        // Show error or fallback
      }
    } else {
      // For native platforms, we would use @react-native-voice/voice
      // For now, show a message that it's not supported
      console.log('Voice search not supported on this platform yet');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handlePress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.button,
          isFocused && styles.buttonFocused,
          isListening && styles.buttonActive,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
          <Text style={[styles.icon, isListening && styles.iconActive]}>🎤</Text>
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          stopListening();
          setShowModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <GlassView intensity="high" style={styles.modalContent}>
            <Animated.View
              style={[
                styles.micContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={[styles.micCircle, isListening && styles.micCircleActive]}>
                <Text style={styles.micIcon}>🎤</Text>
              </View>
            </Animated.View>

            <Text style={styles.statusText}>
              {isListening ? t('voice.listening') : t('voice.processing')}
            </Text>

            {transcript ? (
              <Text style={styles.transcript}>"{transcript}"</Text>
            ) : (
              <Text style={styles.hint}>{t('voice.tapToSpeak')}</Text>
            )}

            <TouchableOpacity
              onPress={() => {
                stopListening();
                setShowModal(false);
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </GlassView>
        </View>
      </Modal>
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
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  buttonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: colors.error,
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    // Active state styling
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
  micIcon: {
    fontSize: 40,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  transcript: {
    fontSize: 18,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
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
});

export default VoiceSearchButton;
