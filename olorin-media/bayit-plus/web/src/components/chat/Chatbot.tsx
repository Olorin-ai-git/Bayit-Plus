import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
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
      logger.debug('Skipping duplicate transcript', 'Chatbot', transcript)
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
      logger.error('Transcription error', 'Chatbot', error)
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
  // Use individual audioLevel values as dependencies to prevent infinite loops
  // (audioLevel object reference changes even when values are same)
  useEffect(() => {
    const contextIsProcessing = isProcessing || isLoading
    setListeningState({
      isListening,
      isAwake,
      isProcessing: contextIsProcessing,
      audioLevel: { average: audioLevel.average, peak: audioLevel.peak },
    })
  }, [isListening, isAwake, isProcessing, isLoading, audioLevel.average, audioLevel.peak, setListeningState])

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
    navigate(`/vod/\${id}`)
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
          className="fixed z-50 rounded-full bg-[#8a2be2]"
          style={[IS_TV_BUILD ? styles.fabTV : styles.fabMobile]}
          accessibilityLabel={t('chatbot.openChat')}
        >
          <View className="flex-1 items-center justify-center">
            <Sparkles size={24} color={colors.text} />
          </View>
        </Pressable>
      )}

      {isOpen && (
        <Animated.View
          className="fixed z-50"
          style={[
            IS_TV_BUILD ? styles.containerTV : styles.containerMobile,
            { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
          ]}
        >
          <GlassView className="flex-1 overflow-hidden" intensity="high">
            <View
              className="flex-row items-center justify-between px-4 border-b border-white/10 bg-gradient-to-l from-[rgba(107,33,168,0.3)] to-[rgba(138,43,226,0.2)]"
              style={[
                IS_TV_BUILD ? styles.headerTV : styles.headerMobile,
                isRTL && styles.rowReverse,
              ]}
            >
              <View className="flex-row items-center gap-2" style={[isRTL && styles.rowReverse]}>
                <View
                  className="bg-[#8a2be2] items-center justify-center"
                  style={[IS_TV_BUILD ? styles.iconTV : styles.iconMobile]}
                >
                  <Sparkles size={16} color={colors.text} />
                </View>
                <Text className="font-semibold text-white" style={[IS_TV_BUILD ? styles.titleTV : styles.titleMobile]}>
                  {t('chatbot.title')}
                </Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10"
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
  fabTV: {
    bottom: 32,
    left: 32,
    width: 80,
    height: 80,
    shadowColor: 'rgba(138, 43, 226, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  fabMobile: {
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    shadowColor: 'rgba(138, 43, 226, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  containerTV: {
    bottom: 32,
    left: 32,
    width: 600,
    height: 700,
    maxHeight: '80vh',
  },
  containerMobile: {
    bottom: 24,
    left: 24,
    width: 384,
    maxWidth: 'calc(100vw - 3rem)',
    height: 500,
    maxHeight: '70vh',
  },
  headerTV: {
    paddingVertical: 12,
  },
  headerMobile: {
    paddingVertical: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  iconTV: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  iconMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  titleTV: {
    fontSize: 24,
  },
  titleMobile: {
    fontSize: 16,
  },
})
