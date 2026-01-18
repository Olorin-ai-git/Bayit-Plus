import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useVoiceListeningContext } from '@bayit/shared-contexts'
import { useAuthStore } from '@/stores/authStore'
import { useChatbotStore } from '@/stores/chatbotStore'
import { useVoiceSettingsStore, VoiceMode } from '@bayit/shared-stores/voiceSettingsStore'
import { useModeEnforcement, useWakeWordListening } from '@bayit/shared-hooks'
import { useVoiceResponseCoordinator } from '@bayit/shared-hooks/voice'
import { chatService } from '@/services/api'
import logger from '@/utils/logger'
import { colors, spacing } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import { ChatMessageList } from './ChatMessageList'
import { ChatInputBar } from './ChatInputBar'
import { ChatSuggestionsPanel } from './ChatSuggestionsPanel'
import { useChatMessages } from './hooks/useChatMessages'
import { useChatVoice } from './hooks/useChatVoice'
import { useChatActions } from './hooks/useChatActions'

declare const __TV__: boolean
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__

export default function Chatbot() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { preferences, loadPreferences } = useVoiceSettingsStore()
  const { currentMode } = useModeEnforcement()
  const { setListeningState } = useVoiceListeningContext()
  const {
    isOpen,
    setOpen,
    pendingMessage,
    clearPendingMessage,
    loadContext,
    executeAction,
  } = useChatbotStore()

  const inputRef = useRef<any>(null)
  const slideAnim = useRef(new Animated.Value(100)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const lastTranscriptRef = useRef<{ text: string; timestamp: number } | null>(null)
  const [voiceStatusVisible, setVoiceStatusVisible] = useState(false)

  const isRTL = i18n.language === 'he' || i18n.language === 'ar'
  const isVoiceOnlyMode = currentMode === VoiceMode.VOICE_ONLY

  // Voice response orchestration
  const { handleVoiceResponse } = useVoiceResponseCoordinator({
    onNavigate: (path) => navigate(path),
    onSearch: (query) => navigate(`/search?q=${encodeURIComponent(query)}`),
    onPlay: (contentId) => navigate(`/vod/${contentId}`),
    onProcessingStart: () => {},
    onProcessingEnd: () => {},
  })

  // Chat messages hook
  const {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    sendMessage,
    sendVoiceMessage,
    addErrorMessage,
  } = useChatMessages({
    onResponse: async (response) => {
      if (response.action) {
        const chatbotAction = convertBackendActionToChatbotAction(response.action)
        if (chatbotAction) {
          executeAction(chatbotAction)
        }
      }

      await handleVoiceResponse({
        message: response.message,
        conversation_id: response.conversation_id,
        recommendations: response.recommendations,
        spoken_response: response.spoken_response,
        action: response.action,
        content_ids: response.content_ids,
        visual_action: response.visual_action,
        confidence: response.confidence,
      })
    },
    onError: (error) => {
      logger.error('Chat error:', 'Chatbot', error)
    },
  })

  // Chat voice hook
  const {
    isRecording,
    isTranscribing,
    currentTranscript,
    currentLanguage,
    toggleRecording,
  } = useChatVoice({
    onTranscript: async (text, language) => {
      setVoiceStatusVisible(true)
      setInput('')

      if (currentMode !== VoiceMode.VOICE_ONLY) {
        setMessages((prev) => [...prev, { role: 'user', content: text }])
      }

      try {
        const response = await sendVoiceMessage(text, language)
        if (!response) return

        if (currentMode !== VoiceMode.VOICE_ONLY && response.recommendations) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              type: 'recommendations',
              content: response.recommendations,
            },
          ])
        }
      } catch (error) {
        logger.error('Voice message error:', 'Chatbot', error)
      }
    },
    onError: (error) => {
      addErrorMessage(t('chatbot.errors.micPermission'))
    },
  })

  // Chat actions hook
  const { convertBackendActionToChatbotAction } = useChatActions({
    onClose: () => setOpen(false),
    onSuccess: (message) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message },
      ])
    },
    onError: (message) => {
      addErrorMessage(message)
    },
  })

  // Wake word transcript handler
  const handleWakeWordTranscript = useCallback(async (transcript: string, language?: string) => {
    if (!transcript || !transcript.trim()) return

    const now = Date.now()
    if (
      lastTranscriptRef.current &&
      lastTranscriptRef.current.text === transcript &&
      now - lastTranscriptRef.current.timestamp < 2000
    ) {
      console.log('[Chatbot] Skipping duplicate transcript:', transcript)
      return
    }

    lastTranscriptRef.current = { text: transcript, timestamp: now }
    setVoiceStatusVisible(true)

    if (currentMode !== VoiceMode.VOICE_ONLY) {
      setMessages((prev) => [...prev, { role: 'user', content: transcript }])
    }

    try {
      await sendVoiceMessage(transcript, language)
    } catch (error) {
      logger.error('Wake word message error:', 'Chatbot', error)
    }
  }, [currentMode, sendVoiceMessage, setMessages])

  // Transcribe audio for wake word
  const transcribeAudioBlob = useCallback(async (audioBlob: Blob) => {
    try {
      const transcriptionLanguage = i18n.language || 'he'
      const response = await chatService.transcribeAudio(audioBlob, transcriptionLanguage)
      return response
    } catch (error) {
      console.error('[Chatbot] Transcription error:', error)
      throw error
    }
  }, [i18n.language])

  // Wake word listening
  const {
    isListening,
    isAwake,
    isProcessing,
    audioLevel,
  } = useWakeWordListening({
    enabled: false,
    wakeWordEnabled: false,
    wakeWord: preferences?.wake_word ?? 'hi bayit',
    wakeWordSensitivity: preferences?.wake_word_sensitivity ?? 0.7,
    wakeWordCooldownMs: preferences?.wake_word_cooldown_ms ?? 2000,
    onTranscript: handleWakeWordTranscript,
    onWakeWordDetected: () => setVoiceStatusVisible(true),
    onError: (error) => logger.error('Wake word error:', 'Chatbot', error),
    silenceThresholdMs: preferences?.silence_threshold_ms ?? 2000,
    vadSensitivity: preferences?.vad_sensitivity ?? 'low',
    transcribeAudio: transcribeAudioBlob,
  })

  // Share listening states with Layout via context
  useEffect(() => {
    const contextIsProcessing = isProcessing || isLoading
    setListeningState({
      isListening,
      isAwake,
      isProcessing: contextIsProcessing,
      audioLevel,
    })
  }, [isListening, isAwake, isProcessing, isLoading, audioLevel, setListeningState])

  // Load context and preferences
  useEffect(() => {
    loadContext()
    loadPreferences()
  }, [loadContext, loadPreferences])

  // Handle pending messages
  useEffect(() => {
    if (pendingMessage) {
      handleExternalMessage(pendingMessage)
      clearPendingMessage()
    }
  }, [pendingMessage, clearPendingMessage])

  const handleExternalMessage = async (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    try {
      await sendMessage(message)
    } catch (error) {
      logger.error('External message error:', 'Chatbot', error)
    }
  }

  // Open/close animations
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
  }, [isOpen, slideAnim, opacityAnim])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return
    await sendMessage(input)
  }

  const handleSuggestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  const handleRecommendationPress = (id: string) => {
    navigate(`/vod/${id}`)
  }

  if (!isAuthenticated && !IS_TV_BUILD) {
    return null
  }

  if (isVoiceOnlyMode) {
    return <></>
  }

  return (
    <>
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

            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              isRTL={isRTL}
              onRecommendationPress={handleRecommendationPress}
            />

            {messages.length <= 1 && (
              <ChatSuggestionsPanel onSuggestionPress={handleSuggestion} />
            )}

            <ChatInputBar
              input={input}
              isLoading={isLoading}
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              isRTL={isRTL}
              isTVMode={IS_TV_BUILD}
              audioLevel={audioLevel}
              inputRef={inputRef}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onToggleRecording={toggleRecording}
            />
          </GlassView>
        </Animated.View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  chatButton: {
    position: 'fixed' as any,
    bottom: IS_TV_BUILD ? spacing.xl : spacing.lg,
    left: IS_TV_BUILD ? spacing.xl : spacing.lg,
    zIndex: 50,
    width: IS_TV_BUILD ? 80 : 56,
    height: IS_TV_BUILD ? 80 : 56,
    borderRadius: IS_TV_BUILD ? 40 : 28,
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
    bottom: IS_TV_BUILD ? spacing.xl : spacing.lg,
    left: IS_TV_BUILD ? spacing.xl : spacing.lg,
    zIndex: 50,
    width: IS_TV_BUILD ? 600 : 384,
    maxWidth: 'calc(100vw - 3rem)' as any,
    height: IS_TV_BUILD ? 700 : 500,
    maxHeight: IS_TV_BUILD ? '80vh' as any : '70vh' as any,
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
    backgroundImage: 'linear-gradient(to left, rgba(107, 33, 168, 0.3), rgba(138, 43, 226, 0.2))' as any,
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
    width: IS_TV_BUILD ? 48 : 32,
    height: IS_TV_BUILD ? 48 : 32,
    borderRadius: IS_TV_BUILD ? 24 : 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: IS_TV_BUILD ? 24 : 16,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  closeButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
})
