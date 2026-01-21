import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { chatService } from '@/services/api'
import { useChatbotStore } from '@/stores/chatbotStore'
import { useConversationContext } from '@bayit/shared-hooks/voice'
import logger from '@/utils/logger'
import type { Message } from '../types'

interface UseChatMessagesOptions {
  onResponse?: (response: any) => void
  onError?: (error: Error) => void
}

export function useChatMessages(options: UseChatMessagesOptions = {}) {
  const { t, i18n } = useTranslation()
  const { context } = useChatbotStore()
  const {
    mentionContent,
    recordCommand,
    recordSearchQuery,
  } = useConversationContext()

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('chatbot.welcome'),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const sendMessage = useCallback(async (
    messageText: string,
    language?: string | null
  ) => {
    if (!messageText.trim()) return

    const userMessage = messageText.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(
        userMessage,
        conversationId,
        context,
        language || i18n.language
      )
      setConversationId(response.conversation_id)

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message },
      ])

      // Track mentioned content for context
      if (response.content_ids && response.content_ids.length > 0) {
        mentionContent(response.content_ids)
      }

      // Track search queries for context
      if (response.action?.type === 'search' && response.action?.payload?.query) {
        recordSearchQuery(response.action.payload.query)
      }

      // Display recommendations if provided
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

      options.onResponse?.(response)

      return response
    } catch (error) {
      logger.error('Failed to send message:', 'useChatMessages', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('chatbot.errors.general'),
          isError: true,
        },
      ])
      options.onError?.(error as Error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, context, i18n.language, mentionContent, recordSearchQuery, t, options])

  const sendVoiceMessage = useCallback(async (
    transcript: string,
    language?: string | null
  ) => {
    recordCommand(transcript)
    return sendMessage(transcript, language)
  }, [sendMessage, recordCommand])

  const addErrorMessage = useCallback((errorMessage: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: errorMessage,
        isError: true,
      },
    ])
  }, [])

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    conversationId,
    sendMessage,
    sendVoiceMessage,
    addErrorMessage,
  }
}
