import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native'
import { X, Send, Sparkles, Mic, Square } from 'lucide-react'
import { chatService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import logger from '@/utils/logger'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView, GlassCard, GlassButton, GlassBadge } from '@bayit/shared/ui'

interface Message {
  role: 'user' | 'assistant'
  content: string | Array<{ id: string; title: string; thumbnail: string }>
  type?: 'recommendations'
  isError?: boolean
}

export default function Chatbot() {
  const { isAuthenticated } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'שלום! אני העוזר החכם של בית+. איך אוכל לעזור לך היום? לחץ על המיקרופון ודבר אליי בעברית, או הקלד הודעה.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const messagesEndRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const slideAnim = useRef(new Animated.Value(100)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
      inputRef.current?.focus()
    } else {
      slideAnim.setValue(100)
      opacityAnim.setValue(0)
    }
  }, [isOpen])

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      logger.error('Failed to start recording', 'Chatbot', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'לא הצלחתי לגשת למיקרופון. אנא בדוק את הרשאות המיקרופון בדפדפן.',
          isError: true,
        },
      ])
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const response = await chatService.transcribeAudio(audioBlob)
      const transcribedText = response.text

      if (transcribedText) {
        setInput('')
        setMessages((prev) => [...prev, { role: 'user', content: transcribedText }])
        setIsLoading(true)

        try {
          const chatResponse = await chatService.sendMessage(transcribedText, conversationId)
          setConversationId(chatResponse.conversation_id)
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: chatResponse.message },
          ])

          if (chatResponse.recommendations) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                type: 'recommendations',
                content: chatResponse.recommendations,
              },
            ])
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'מצטער, משהו השתבש. אנא נסה שוב.',
              isError: true,
            },
          ])
        } finally {
          setIsLoading(false)
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'לא הצלחתי לתמלל את ההקלטה. אנא נסה שוב.',
          isError: true,
        },
      ])
    } finally {
      setIsTranscribing(false)
    }
  }

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(userMessage, conversationId)
      setConversationId(response.conversation_id)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message },
      ])

      if (response.recommendations) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'recommendations',
            content: response.recommendations,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'מצטער, משהו השתבש. אנא נסה שוב.',
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    'מה לראות היום?',
    'סרטים ישראליים מומלצים',
    'מה משודר עכשיו?',
    'פודקאסטים פופולריים',
  ]

  const handleSuggestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Pressable
          onPress={() => setIsOpen(true)}
          style={({ hovered }) => [
            styles.chatButton,
            hovered && styles.chatButtonHovered,
          ]}
          accessibilityLabel="פתח צ'אט"
        >
          <View style={styles.chatButtonInner}>
            <Sparkles size={24} color={colors.text} />
          </View>
        </Pressable>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatWindow,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <GlassView style={styles.chatContainer} intensity="high">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Sparkles size={16} color={colors.text} />
                </View>
                <Text style={styles.headerTitle}>עוזר בית+</Text>
              </View>
              <Pressable
                onPress={() => setIsOpen(false)}
                style={({ hovered }) => [
                  styles.closeButton,
                  hovered && styles.closeButtonHovered,
                ]}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={messagesEndRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message, i) => (
                <View
                  key={i}
                  style={[
                    styles.messageRow,
                    message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {message.type === 'recommendations' ? (
                    <View style={styles.recommendationsContainer}>
                      <Text style={styles.recommendationsTitle}>הנה כמה המלצות:</Text>
                      <View style={styles.recommendationsGrid}>
                        {Array.isArray(message.content) && message.content.map((item) => (
                          <Pressable
                            key={item.id}
                            onPress={() => window.location.href = `/vod/${item.id}`}
                            style={styles.recommendationCard}
                          >
                            <GlassCard style={styles.recommendationCardInner}>
                              <Image
                                source={{ uri: item.thumbnail }}
                                style={styles.recommendationImage}
                                resizeMode="cover"
                              />
                              <Text style={styles.recommendationTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                            </GlassCard>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.messageBubble,
                        message.role === 'user' && styles.messageBubbleUser,
                        message.role === 'assistant' && !message.isError && styles.messageBubbleAssistant,
                        message.isError && styles.messageBubbleError,
                      ]}
                    >
                      <Text style={[
                        styles.messageText,
                        message.isError && styles.messageTextError,
                      ]}>
                        {typeof message.content === 'string' ? message.content : ''}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {isLoading && (
                <View style={[styles.messageRow, styles.messageRowAssistant]}>
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsList}>
                  {suggestedQuestions.map((q, i) => (
                    <Pressable
                      key={i}
                      onPress={() => handleSuggestion(q)}
                      style={({ hovered }) => [
                        styles.suggestionButton,
                        hovered && styles.suggestionButtonHovered,
                      ]}
                    >
                      <Text style={styles.suggestionText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
              {/* Recording/Transcribing Status */}
              {(isRecording || isTranscribing) && (
                <View style={styles.statusContainer}>
                  {isRecording && (
                    <GlassBadge variant="danger" dot dotColor="danger" size="sm">
                      מקליט... לחץ שוב לסיום
                    </GlassBadge>
                  )}
                  {isTranscribing && (
                    <GlassBadge
                      variant="primary"
                      size="sm"
                      icon={<ActivityIndicator size="small" color={colors.primary} />}
                    >
                      מתמלל...
                    </GlassBadge>
                  )}
                </View>
              )}

              <View style={styles.inputRow}>
                {/* Microphone Button */}
                <Pressable
                  onPress={toggleRecording}
                  disabled={isLoading || isTranscribing}
                  style={({ hovered }) => [
                    styles.micButton,
                    isRecording && styles.micButtonRecording,
                    hovered && !isRecording && styles.micButtonHovered,
                  ]}
                  accessibilityLabel={isRecording ? 'עצור הקלטה' : 'התחל הקלטה קולית'}
                >
                  {isRecording ? (
                    <Square size={16} fill={colors.text} color={colors.text} />
                  ) : (
                    <Mic size={18} color={colors.text} />
                  )}
                </Pressable>

                {/* Text Input */}
                <View style={styles.textInputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    value={input}
                    onChangeText={setInput}
                    placeholder="או הקלד כאן..."
                    placeholderTextColor={colors.textMuted}
                    editable={!isLoading && !isRecording && !isTranscribing}
                    onSubmitEditing={handleSubmit}
                  />
                </View>

                {/* Send Button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={!input.trim() || isLoading || isRecording || isTranscribing}
                  style={({ hovered }) => [
                    styles.sendButton,
                    (!input.trim() || isLoading) && styles.sendButtonDisabled,
                    hovered && input.trim() && !isLoading && styles.sendButtonHovered,
                  ]}
                >
                  <Send size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </GlassView>
        </Animated.View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  chatButton: {
    position: 'fixed' as any,
    bottom: spacing.lg,
    left: spacing.lg,
    zIndex: 50,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  chatButtonHovered: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.5,
  },
  chatButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatWindow: {
    position: 'fixed' as any,
    bottom: spacing.lg,
    left: spacing.lg,
    zIndex: 50,
    width: 384,
    maxWidth: 'calc(100vw - 3rem)' as any,
    height: 500,
    maxHeight: '70vh' as any,
  },
  chatContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundImage: 'linear-gradient(to left, rgba(0, 217, 255, 0.2), rgba(138, 43, 226, 0.2))' as any,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  closeButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderTopRightRadius: borderRadius.sm,
  },
  messageBubbleAssistant: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: borderRadius.sm,
  },
  messageBubbleError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderTopLeftRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  messageTextError: {
    color: colors.error,
  },
  loadingBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: borderRadius.sm,
  },
  recommendationsContainer: {
    width: '100%',
  },
  recommendationsTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recommendationCard: {
    width: '48%',
  },
  recommendationCardInner: {
    padding: spacing.sm,
  },
  recommendationImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  recommendationTitle: {
    fontSize: 14,
    color: colors.text,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  suggestionButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: colors.primary,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  inputContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  micButton: {
    width: 48,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  micButtonHovered: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  textInputContainer: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonHovered: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
})
