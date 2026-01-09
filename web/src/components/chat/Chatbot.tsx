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

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
import { useNavigate } from 'react-router-dom'
import { X, Send, Sparkles, Mic, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { chatService } from '@/services/api'
import { SoundwaveVisualizer, VoiceStatusOverlay } from '@bayit/shared'
import { useAuthStore } from '@/stores/authStore'
import { useChatbotStore, type ChatbotAction } from '@/stores/chatbotStore'
import { useVoiceSettingsStore, VoiceMode } from '@bayit/shared-stores/voiceSettingsStore'
import { useModeEnforcement, useVoiceResponseCoordinator, useConversationContext, useWakeWordListening } from '@bayit/shared-hooks'
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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { preferences, loadPreferences } = useVoiceSettingsStore()
  const { currentMode } = useModeEnforcement()
  const {
    isOpen,
    setOpen,
    pendingMessage,
    clearPendingMessage,
    context,
    loadContext,
    registerActionHandler,
    executeAction,
  } = useChatbotStore()

  // Voice response orchestration hooks
  const {
    isProcessing: isVoiceProcessing,
    handleVoiceResponse,
  } = useVoiceResponseCoordinator({
    onNavigate: (path) => navigate(path),
    onSearch: (query) => navigate(`/search?q=${encodeURIComponent(query)}`),
    onPlay: (contentId) => navigate(`/vod/${contentId}`),
    onProcessingStart: () => setIsLoading(true),
    onProcessingEnd: () => setIsLoading(false),
  })

  const {
    registerVisibleContent,
    mentionContent,
    recordCommand,
    recordSearchQuery,
  } = useConversationContext()

  // Memoize the transcript handler for wake word listening
  const handleWakeWordTranscript = useCallback(async (transcript: string) => {
    // Hook has already transcribed the audio - just process the result
    if (transcript && transcript.trim()) {
      setCurrentTranscript(transcript)
      setVoiceStatusVisible(true)
      recordCommand(transcript)

      // Add user message and get AI response
      setMessages((prev) => [...prev, { role: 'user', content: transcript }])
      setIsLoading(true)

      try {
        const chatResponse = await chatService.sendMessage(
          transcript,
          conversationId,
          context
        )
        setConversationId(chatResponse.conversation_id)

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: chatResponse.message },
        ])

        if (chatResponse.content_ids && chatResponse.content_ids.length > 0) {
          mentionContent(chatResponse.content_ids)
        }

        if (chatResponse.action?.type === 'search' && chatResponse.action?.payload?.query) {
          recordSearchQuery(chatResponse.action.payload.query)
        }

        await handleVoiceResponse({
          message: chatResponse.message,
          conversation_id: chatResponse.conversation_id,
          recommendations: chatResponse.recommendations,
          spoken_response: chatResponse.spoken_response,
          action: chatResponse.action,
          content_ids: chatResponse.content_ids,
          visual_action: chatResponse.visual_action,
          confidence: chatResponse.confidence,
        })
      } catch (error) {
        logger.error('Failed to process voice command:', 'Chatbot', error)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: t('chatbot.errors.general'),
            isError: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }
  }, [conversationId, context, recordCommand, mentionContent, recordSearchQuery, handleVoiceResponse, t])

  // Initialize wake word listening for Voice Only mode
  const {
    isListening,
    isAwake,
    isProcessing,
    wakeWordDetected,
    audioLevel,
    error: wakeWordError,
  } = useWakeWordListening({
    enabled: currentMode === VoiceMode.VOICE_ONLY, // Only listen in Voice Only mode
    wakeWordEnabled: preferences.wake_word_enabled, // Use actual setting from preferences (default: false)
    wakeWord: preferences.wake_word || 'hi bayit',
    wakeWordSensitivity: preferences.wake_word_sensitivity,
    wakeWordCooldownMs: preferences.wake_word_cooldown_ms,
    onTranscript: handleWakeWordTranscript,
    onWakeWordDetected: () => {
      console.log('Wake word detected!')
      setVoiceStatusVisible(true)
    },
    onError: (error) => {
      logger.error('Wake word listening error:', 'Chatbot', error)
    },
    silenceThresholdMs: preferences.silence_threshold_ms,
    vadSensitivity: preferences.vad_sensitivity,
    transcribeAudio: async (audioBlob) => {
      const response = await chatService.transcribeAudio(audioBlob)
      return response
    },
  })

  const isRTL = i18n.language === 'he' || i18n.language === 'ar'
  const isVoiceOnlyMode = currentMode === VoiceMode.VOICE_ONLY
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [voiceStatusVisible, setVoiceStatusVisible] = useState(false)
  const messagesEndRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const slideAnim = useRef(new Animated.Value(100)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  // Initialize welcome message with translation
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: t('chatbot.welcome'),
      },
    ])
  }, [t])

  // Load context and preferences when component mounts
  useEffect(() => {
    loadContext()
    loadPreferences()
  }, [loadContext, loadPreferences])

  // Register action handlers for chatbot actions
  useEffect(() => {
    registerActionHandler('navigate', (payload) => {
      navigate(payload.path)
      setOpen(false)
    })
    registerActionHandler('search', (payload) => {
      navigate(`/search?q=${encodeURIComponent(payload.query)}`)
      setOpen(false)
    })
    registerActionHandler('create_flow', (payload) => {
      navigate('/flows', { state: { createFlow: true, template: payload.template } })
      setOpen(false)
    })
    registerActionHandler('start_flow', (payload) => {
      navigate('/flows', { state: { startFlowId: payload.flowId } })
      setOpen(false)
    })
  }, [registerActionHandler, navigate, setOpen])

  // Handle pending messages from voice input or external triggers
  useEffect(() => {
    if (pendingMessage) {
      handleExternalMessage(pendingMessage)
      clearPendingMessage()
    }
  }, [pendingMessage, clearPendingMessage])

  // Handle external message (from voice button)
  const handleExternalMessage = async (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(message, conversationId, context)
      setConversationId(response.conversation_id)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message },
      ])

      // Handle actions from the chatbot response
      if (response.action) {
        executeAction(response.action as ChatbotAction)
      }

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
          content: t('chatbot.errors.general'),
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

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
          content: t('chatbot.errors.micPermission'),
          isError: true,
        },
      ])
    }
  }, [t])

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
        setCurrentTranscript(transcribedText)
        setVoiceStatusVisible(true)
        setInput('')

        // Record the voice command for context tracking
        recordCommand(transcribedText)

        // Add user message to chat
        setMessages((prev) => [...prev, { role: 'user', content: transcribedText }])
        setIsLoading(true)

        try {
          // Get response from backend (with enhanced voice fields from Phase 5)
          const chatResponse = await chatService.sendMessage(
            transcribedText,
            conversationId,
            context
          )
          setConversationId(chatResponse.conversation_id)

          // Add assistant message to chat
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: chatResponse.message },
          ])

          // Track mentioned content for context (for "play that one" commands, etc.)
          if (chatResponse.content_ids && chatResponse.content_ids.length > 0) {
            mentionContent(chatResponse.content_ids)
          }

          // Track search queries for context
          if (chatResponse.action?.type === 'search' && chatResponse.action?.payload?.query) {
            recordSearchQuery(chatResponse.action.payload.query)
          }

          // Use voice response coordinator to orchestrate the full response
          // This handles: visual actions, TTS speaking, command execution
          await handleVoiceResponse({
            message: chatResponse.message,
            conversation_id: chatResponse.conversation_id,
            recommendations: chatResponse.recommendations,
            spoken_response: chatResponse.spoken_response,
            action: chatResponse.action,
            content_ids: chatResponse.content_ids,
            visual_action: chatResponse.visual_action,
            confidence: chatResponse.confidence,
          })

          // Display recommendations if provided
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
        } catch (error) {
          logger.error('Failed to process voice command:', 'Chatbot', error)
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: t('chatbot.errors.general'),
              isError: true,
            },
          ])
        } finally {
          setIsLoading(false)
        }
      }
    } catch (error) {
      logger.error('Failed to transcribe audio:', 'Chatbot', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('chatbot.errors.transcribeFailed'),
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
      const response = await chatService.sendMessage(userMessage, conversationId, context)
      setConversationId(response.conversation_id)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message },
      ])

      // Handle actions from the chatbot response
      if (response.action) {
        executeAction(response.action as ChatbotAction)
      }

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
          content: t('chatbot.errors.general'),
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    t('chatbot.suggestions.whatToWatch'),
    t('chatbot.suggestions.israeliMovies'),
    t('chatbot.suggestions.whatsOnNow'),
    t('chatbot.suggestions.popularPodcasts'),
  ]

  const handleSuggestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  // Check if this is a TV build (set by webpack)
  const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

  // On TV, show chatbot even without auth for voice interaction
  if (!isAuthenticated && !IS_TV_BUILD) {
    return null
  }

  // Voice Only Mode: Show voice status overlay
  if (isVoiceOnlyMode) {
    return (
      <VoiceStatusOverlay
        isListening={isListening && !isAwake && !isProcessing}
        isProcessing={isAwake || isProcessing}
        isSpeaking={isLoading}
        currentTranscript={currentTranscript}
        autoHideDuration={3000}
        onAutoHide={() => {
          setVoiceStatusVisible(false)
          setCurrentTranscript('')
        }}
      />
    )
  }

  // Hybrid/Classic Mode: Show full chat UI
  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ hovered }) => [
            styles.chatButton,
            hovered && styles.chatButtonHovered,
          ]}
          accessibilityLabel={t('chatbot.openChat')}
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
            <View style={[styles.header, isRTL && styles.headerRTL]}>
              <View style={[styles.headerLeft, isRTL && styles.headerLeftRTL]}>
                <View style={styles.headerIcon}>
                  <Sparkles size={16} color={colors.text} />
                </View>
                <Text style={styles.headerTitle}>{t('chatbot.title')}</Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
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
                      <Text style={[styles.recommendationsTitle, isRTL && styles.textRTL]}>{t('chatbot.recommendations')}</Text>
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

            {/* Input - TV uses constant listening, web uses manual input */}
            {IS_TV_BUILD ? (
              /* TV: Show listening status with soundwave animation */
              <View style={styles.tvListeningContainer}>
                <View style={styles.tvListeningIndicator}>
                  <SoundwaveVisualizer
                    audioLevel={0.5}
                    isListening={true}
                    isProcessing={isLoading}
                    isSendingToServer={isLoading}
                    compact={false}
                  />
                  <Text style={styles.tvListeningText}>
                    {isLoading ? t('chatbot.processing', 'Processing...') : t('chatbot.listening', 'Listening...')}
                  </Text>
                </View>
              </View>
            ) : (
              /* Web: Full input controls */
              <View style={styles.inputContainer}>
                {/* Recording/Transcribing Status */}
                {(isRecording || isTranscribing) && (
                  <View style={styles.statusContainer}>
                    {isRecording && (
                      <GlassBadge variant="danger" dot dotColor="danger" size="sm">
                        {t('chatbot.recording')}
                      </GlassBadge>
                    )}
                    {isTranscribing && (
                      <GlassBadge
                        variant="primary"
                        size="sm"
                        icon={<ActivityIndicator size="small" color={colors.primary} />}
                      >
                        {t('chatbot.transcribing')}
                      </GlassBadge>
                    )}
                  </View>
                )}

                <View style={[styles.inputRow, isRTL && styles.inputRowRTL]}>
                  {/* Microphone Button */}
                  <Pressable
                    onPress={toggleRecording}
                    disabled={isLoading || isTranscribing}
                    style={({ hovered }) => [
                      styles.micButton,
                      isRecording && styles.micButtonRecording,
                      hovered && !isRecording && styles.micButtonHovered,
                    ]}
                    accessibilityLabel={isRecording ? t('chatbot.stopRecording') : t('chatbot.startRecording')}
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
                      style={[styles.textInput, isRTL && styles.textInputRTL]}
                      value={input}
                      onChangeText={setInput}
                      placeholder={t('chatbot.placeholder')}
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
            )}
          </GlassView>
        </Animated.View>
      )}
    </>
  )
}

// Check if this is a TV build
const IS_TV = typeof __TV__ !== 'undefined' && __TV__;

const styles = StyleSheet.create({
  chatButton: {
    position: 'fixed' as any,
    bottom: IS_TV ? spacing.xl : spacing.lg,
    left: IS_TV ? spacing.xl : spacing.lg,
    zIndex: 50,
    width: IS_TV ? 80 : 56,
    height: IS_TV ? 80 : 56,
    borderRadius: IS_TV ? 40 : 28,
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
    bottom: IS_TV ? spacing.xl : spacing.lg,
    left: IS_TV ? spacing.xl : spacing.lg,
    zIndex: 50,
    width: IS_TV ? 600 : 384,
    maxWidth: 'calc(100vw - 3rem)' as any,
    height: IS_TV ? 700 : 500,
    maxHeight: IS_TV ? '80vh' as any : '70vh' as any,
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
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLeftRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: IS_TV ? 48 : 32,
    height: IS_TV ? 48 : 32,
    borderRadius: IS_TV ? 24 : 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: IS_TV ? 24 : 16,
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
    paddingHorizontal: IS_TV ? spacing.lg : spacing.md,
    paddingVertical: IS_TV ? spacing.md : spacing.sm + 2,
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
    fontSize: IS_TV ? 22 : 14,
    color: colors.text,
    lineHeight: IS_TV ? 32 : 20,
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
  },
  textRTL: {
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
    fontSize: IS_TV ? 18 : 12,
    color: colors.textSecondary,
  },
  inputContainer: {
    padding: IS_TV ? spacing.lg : spacing.md,
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
  inputRowRTL: {
    flexDirection: 'row-reverse',
  },
  micButton: {
    width: IS_TV ? 64 : 48,
    height: IS_TV ? 56 : 40,
    borderRadius: IS_TV ? 28 : 20,
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
    height: IS_TV ? 56 : 40,
    borderRadius: IS_TV ? 28 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: IS_TV ? 2 : 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: IS_TV ? spacing.lg : spacing.md,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: IS_TV ? 20 : 14,
    color: colors.text,
  },
  textInputRTL: {
    textAlign: 'right',
  },
  sendButton: {
    width: IS_TV ? 56 : 40,
    height: IS_TV ? 56 : 40,
    borderRadius: IS_TV ? 28 : 20,
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
  // TV Listening Mode Styles
  tvListeningContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvListeningIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  tvListeningText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
})
