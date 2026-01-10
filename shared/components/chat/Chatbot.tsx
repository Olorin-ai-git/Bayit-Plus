import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView, GlassCard } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { chatService } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { getCurrentLanguage } from '../../i18n';
import { VoiceListeningContext } from '../../contexts/VoiceListeningContext';
import logger from '../../utils/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string | any[];
  type?: 'text' | 'recommendations';
  isError?: boolean;
}

interface ChatbotProps {
  visible: boolean;
  onClose: () => void;
}

// Language codes for speech recognition
const speechLanguageCodes: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
  es: 'es-ES',
};

export const Chatbot: React.FC<ChatbotProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const voiceContext = useContext(VoiceListeningContext);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('chat.greeting', 'שלום! אני העוזר החכם של בית+. איך אוכל לעזור לך היום? לחץ על כפתור המיקרופון ודבר אליי, או הקלד הודעה.'),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

  // Update voice listening context when processing state changes
  useEffect(() => {
    const isProcessing = isLoading || isTranscribing;
    if (voiceContext?.setListeningState) {
      voiceContext.setListeningState({ isProcessing });
    }
  }, [isLoading, isTranscribing]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

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

  // Voice recording - Web Speech API
  const startRecording = useCallback(() => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        const currentLang = getCurrentLanguage();
        recognition.lang = speechLanguageCodes[currentLang.code] || 'he-IL';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
          setTranscript('');
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const text = result[0].transcript;
          setTranscript(text);

          if (result.isFinal) {
            setIsRecording(false);
            if (text.trim()) {
              handleVoiceMessage(text.trim());
            }
          }
        };

        recognition.onerror = (event: any) => {
          logger.error('Speech recognition error', 'Chatbot', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } else {
        // Fallback: show error message
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'זיהוי קולי לא נתמך בדפדפן זה. אנא הקלד את ההודעה.',
            isError: true,
          },
        ]);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleVoiceMessage = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);
    setTranscript('');

    try {
      // Get current language from i18n
      const currentLang = getCurrentLanguage();
      const response = await chatService.sendMessage(text, conversationId || undefined, undefined, currentLang.code);
      setConversationId(response.conversation_id);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.message },
      ]);

      if (response.recommendations && response.recommendations.length > 0) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            type: 'recommendations',
            content: response.recommendations,
          },
        ]);
      }
    } catch (error) {
      logger.error('Failed to send message', 'Chatbot', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'מצטער, משהו השתבש. אנא נסה שוב.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get current language from i18n
      const currentLang = getCurrentLanguage();
      const response = await chatService.sendMessage(userMessage, conversationId || undefined, undefined, currentLang.code);
      setConversationId(response.conversation_id);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.message },
      ]);

      if (response.recommendations && response.recommendations.length > 0) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            type: 'recommendations',
            content: response.recommendations,
          },
        ]);
      }
    } catch (error) {
      logger.error('Failed to send message', 'Chatbot', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'מצטער, משהו השתבש. אנא נסה שוב.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommendationPress = (item: any) => {
    onClose();
    navigation.navigate('Watch', { contentId: item.id, contentType: 'vod' });
  };

  const suggestedQuestions = [
    'מה לראות היום?',
    'סרטים ישראליים מומלצים',
    'מה משודר עכשיו?',
    'פודקאסטים פופולריים',
  ];

  const handleSuggestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const clearChat = async () => {
    if (conversationId) {
      try {
        await chatService.clearConversation(conversationId);
      } catch (error) {
        logger.error('Failed to clear conversation', 'Chatbot', error);
      }
    }
    setConversationId(null);
    setMessages([
      {
        role: 'assistant',
        content: t('chat.greeting', 'שלום! אני העוזר החכם של בית+. איך אוכל לעזור לך היום?'),
      },
    ]);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassView intensity="high" style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarIcon}>✨</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>{t('chat.title', 'עוזר בית+')}</Text>
                <Text style={styles.headerSubtitle}>{t('chat.subtitle', 'מופעל בינה מלאכותית')}</Text>
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                ]}
              >
                {message.type === 'recommendations' ? (
                  <View style={styles.recommendationsContainer}>
                    <Text style={styles.recommendationsTitle}>
                      {t('chat.recommendations', 'הנה כמה המלצות:')}
                    </Text>
                    <View style={styles.recommendationsGrid}>
                      {(message.content as any[]).slice(0, 4).map((item: any) => (
                        <Pressable
                          key={item.id}
                          onPress={() => handleRecommendationPress(item)}
                          style={({ focused }) => [
                            styles.recommendationCard,
                            focused && styles.recommendationCardFocused,
                          ]}
                        >
                          {item.thumbnail ? (
                            <Image
                              source={{ uri: item.thumbnail }}
                              style={styles.recommendationImage}
                            />
                          ) : (
                            <View style={styles.recommendationImagePlaceholder}>
                              <Text style={styles.placeholderIcon}>🎬</Text>
                            </View>
                          )}
                          <Text style={styles.recommendationTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <GlassCard
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      message.isError && styles.errorBubble,
                    ]}
                  >
                    <Text style={styles.messageText}>{message.content as string}</Text>
                  </GlassCard>
                )}
              </View>
            ))}

            {isLoading && (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <GlassCard style={[styles.messageBubble, styles.assistantBubble]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </GlassCard>
              </View>
            )}
          </ScrollView>

          {/* Suggestions (show only at start) */}
          {messages.length <= 1 && (
            <View style={styles.suggestionsContainer}>
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSuggestion(question)}
                  style={styles.suggestionButton}
                >
                  <Text style={styles.suggestionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recording Status */}
          {(isRecording || isTranscribing) && (
            <View style={styles.recordingStatus}>
              {isRecording && (
                <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>{t('voice.listening', 'מאזין...')}</Text>
                </Animated.View>
              )}
              {transcript && (
                <Text style={styles.transcriptPreview}>"{transcript}"</Text>
              )}
              {isTranscribing && (
                <View style={styles.transcribingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.transcribingText}>{t('voice.processing', 'מתמלל...')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            {/* Voice Button - Primary for TV */}
            <Pressable
              onPress={toggleRecording}
              disabled={isLoading || isTranscribing}
              style={({ focused }) => [
                styles.voiceButton,
                focused && styles.voiceButtonFocused,
                isRecording && styles.voiceButtonRecording,
              ]}
            >
              <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                <Text style={styles.voiceButtonIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
              </Animated.View>
            </Pressable>

            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder={t('chat.placeholder', 'או הקלד כאן...')}
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              editable={!isLoading && !isRecording && !isTranscribing}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={!input.trim() || isLoading || isRecording || isTranscribing}
              style={({ focused }) => [
                styles.sendButton,
                focused && styles.sendButtonFocused,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
            >
              <Text style={styles.sendButtonIcon}>➤</Text>
            </Pressable>
          </View>
        </GlassView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    height: '80%',
    maxHeight: 700,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.text,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  messageRow: {
    marginBottom: spacing.sm,
  },
  messageRowUser: {
    alignItems: 'flex-start',
  },
  messageRowAssistant: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    borderTopLeftRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopRightRadius: 4,
  },
  errorBubble: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: colors.error,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'right',
  },
  recommendationsContainer: {
    width: '100%',
  },
  recommendationsTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recommendationCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recommendationCardFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.02 }],
  },
  recommendationImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  recommendationImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  recommendationTitle: {
    fontSize: 12,
    color: colors.text,
    padding: spacing.sm,
    textAlign: 'right',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  suggestionText: {
    fontSize: 13,
    color: colors.secondary,
  },
  recordingStatus: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  recordingText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  transcriptPreview: {
    fontSize: 14,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transcribingText: {
    fontSize: 14,
    color: colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  voiceButtonFocused: {
    borderColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  voiceButtonRecording: {
    backgroundColor: colors.error,
  },
  voiceButtonIcon: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sendButtonFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonIcon: {
    fontSize: 18,
    color: colors.text,
    transform: [{ scaleX: -1 }], // Mirror for RTL
  },
});

export default Chatbot;
