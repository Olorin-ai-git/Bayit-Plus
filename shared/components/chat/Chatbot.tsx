import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
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
      <View className="flex-1 bg-black/70 justify-center items-center p-8">
        <GlassView intensity="high" className="w-full max-w-[600px] h-4/5 max-h-[700px] rounded-3xl overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10 bg-purple-700/20">
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-[22px] bg-purple-600 justify-center items-center">
                <Text className="text-[22px]">✨</Text>
              </View>
              <View>
                <Text className="text-lg font-bold text-white">{t('chat.title', 'עוזר בית+')}</Text>
                <Text className="text-xs text-white/60">{t('chat.subtitle', 'מופעל בינה מלאכותית')}</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={clearChat} className="w-10 h-10 rounded-full bg-white/10 justify-center items-center">
                <Text className="text-lg">🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-white/10 justify-center items-center">
                <Text className="text-xl text-white">✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          >
            {messages.map((message, index) => (
              <View
                key={index}
                className={`mb-2 ${message.role === 'user' ? 'items-start' : 'items-end'}`}
              >
                {message.type === 'recommendations' ? (
                  <View className="w-full">
                    <Text className="text-sm text-white/60 mb-4 text-right">
                      {t('chat.recommendations', 'הנה כמה המלצות:')}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(message.content as any[]).slice(0, 4).map((item: any) => (
                        <Pressable
                          key={item.id}
                          onPress={() => handleRecommendationPress(item)}
                          className={({ focused }) => `w-[48%] bg-white/5 rounded-lg overflow-hidden border-2 ${focused ? 'border-purple-600 border-[3px] scale-[1.02]' : 'border-transparent'}`}
                        >
                          {item.thumbnail ? (
                            <Image
                              source={{ uri: item.thumbnail }}
                              className="w-full aspect-video"
                            />
                          ) : (
                            <View className="w-full aspect-video bg-white/10 justify-center items-center">
                              <Text className="text-2xl">🎬</Text>
                            </View>
                          )}
                          <Text className="text-xs text-white p-2 text-right" numberOfLines={2}>
                            {item.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <GlassCard
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-purple-700/30 rounded-tl'
                        : 'bg-white/10 rounded-tr'
                    } ${message.isError ? 'bg-red-500/20 border border-red-500' : ''}`}
                  >
                    <Text className="text-base text-white leading-6 text-right">{message.content as string}</Text>
                  </GlassCard>
                )}
              </View>
            ))}

            {isLoading && (
              <View className="mb-2 items-end">
                <GlassCard className="max-w-[80%] p-4 rounded-2xl bg-white/10 rounded-tr">
                  <ActivityIndicator size="small" color={colors.primary} />
                </GlassCard>
              </View>
            )}
          </ScrollView>

          {/* Suggestions (show only at start) */}
          {messages.length <= 1 && (
            <View className="flex-row flex-wrap gap-2 p-4 border-t border-white/5">
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSuggestion(question)}
                  className="px-4 py-2 bg-purple-700/20 rounded-full border border-purple-700/30"
                >
                  <Text className="text-[13px] text-purple-400">{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recording Status */}
          {(isRecording || isTranscribing) && (
            <View className="p-4 items-center bg-red-500/10">
              {isRecording && (
                <Animated.View className="flex-row items-center gap-2" style={{ transform: [{ scale: pulseAnim }] }}>
                  <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <Text className="text-sm text-red-500 font-semibold">{t('voice.listening', 'מאזין...')}</Text>
                </Animated.View>
              )}
              {transcript && (
                <Text className="text-sm text-purple-600 italic mt-2">"{transcript}"</Text>
              )}
              {isTranscribing && (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="text-sm text-purple-600">{t('voice.processing', 'מתמלל...')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Input Area */}
          <View className="flex-row items-center p-4 gap-2 border-t border-white/10">
            {/* Voice Button - Primary for TV */}
            <Pressable
              onPress={toggleRecording}
              disabled={isLoading || isTranscribing}
              className={({ focused }) => `w-14 h-14 rounded-full bg-purple-600 justify-center items-center border-[3px] ${
                focused ? 'border-purple-600 scale-110' : 'border-transparent'
              } ${isRecording ? 'bg-red-500' : ''}`}
            >
              <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                <Text className="text-2xl">{isRecording ? '⏹️' : '🎤'}</Text>
              </Animated.View>
            </Pressable>

            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder={t('chat.placeholder', 'או הקלד כאן...')}
              placeholderTextColor={colors.textMuted}
              className="flex-1 h-12 bg-white/10 rounded-full px-6 text-base text-white text-right"
              editable={!isLoading && !isRecording && !isTranscribing}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={!input.trim() || isLoading || isRecording || isTranscribing}
              className={({ focused }) => `w-12 h-12 rounded-full bg-purple-600 justify-center items-center border-2 ${
                focused ? 'border-purple-600 border-[3px] scale-110' : 'border-transparent'
              } ${(!input.trim() || isLoading) ? 'opacity-50' : ''}`}
            >
              <Text className="text-lg text-white" style={{ transform: [{ scaleX: -1 }] }}>➤</Text>
            </Pressable>
          </View>
        </GlassView>
      </View>
    </Modal>
  );
};

export default Chatbot;
