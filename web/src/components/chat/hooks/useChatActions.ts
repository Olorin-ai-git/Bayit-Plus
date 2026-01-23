import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChatbotStore, type ChatbotAction } from '@/stores/chatbotStore'
import { useWidgetStore, type VoiceContentItem } from '@/stores/widgetStore'
import { chatService } from '@/services/api'
import logger from '@/utils/logger'

interface UseChatActionsOptions {
  onClose?: () => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function useChatActions(options: UseChatActionsOptions = {}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // Use refs for callbacks to avoid dependency changes
  const optionsRef = useRef(options)
  optionsRef.current = options

  const convertBackendActionToChatbotAction = (backendAction: any): ChatbotAction | null => {
    if (!backendAction) return null

    const { type, payload } = backendAction

    switch (type) {
      case 'navigate':
        return { type: 'navigate', payload: { target: payload?.target || 'home' } }
      case 'play':
        return { type: 'play', payload: { content_id: payload?.content_id } }
      case 'pause':
        return { type: 'pause', payload: {} }
      case 'resume':
        return { type: 'resume', payload: {} }
      case 'skip':
        return { type: 'skip', payload: {} }
      case 'search':
        return { type: 'search', payload: { query: payload?.query } }
      case 'add_to_watchlist':
        return { type: 'add_to_watchlist', payload: {} }
      case 'add_to_favorites':
        return { type: 'add_to_favorites', payload: {} }
      case 'volume':
        return { type: 'volume', payload: { change: payload?.change } }
      case 'language':
        return { type: 'language', payload: { language: payload?.language } }
      case 'subtitles':
        return { type: 'subtitles', payload: { enabled: payload?.enabled } }
      case 'info':
        return { type: 'info', payload: { query: payload?.query } }
      case 'help':
        return { type: 'help', payload: {} }
      case 'show_multiple':
        return { type: 'show_multiple', payload: { items: payload?.items || [] } }
      case 'chess_invite':
        return { type: 'chess_invite', payload: { friendName: payload?.friend_name || payload?.friendName } }
      default:
        logger.warn(`Unknown action type: ${type}`, 'useChatActions')
        return null
    }
  }

  useEffect(() => {
    // Get store methods without subscribing to state changes
    const { registerActionHandler, unregisterActionHandler, setOpen } = useChatbotStore.getState()
    const { createVoiceWidgets } = useWidgetStore.getState()

    // Navigation
    registerActionHandler('navigate', (payload) => {
      const navigationMap: Record<string, string> = {
        movies: '/vod?category=movies',
        series: '/vod?category=series',
        channels: '/live',
        radio: '/radio',
        podcasts: '/podcasts',
        home: '/',
        chess: '/games/chess',
        games: '/games',
      }
      navigate(navigationMap[payload.target] || '/')
      setOpen(false)
      optionsRef.current.onClose?.()
    })

    // Search
    registerActionHandler('search', (payload) => {
      navigate(`/search?q=${encodeURIComponent(payload.query)}`)
      setOpen(false)
      optionsRef.current.onClose?.()
    })

    // Playback
    registerActionHandler('play', (payload) => {
      if (payload.content_id) {
        navigate(`/vod/${payload.content_id}`)
      }
      setOpen(false)
      optionsRef.current.onClose?.()
    })

    registerActionHandler('pause', () => {
      logger.debug('Pause action triggered', 'useChatActions')
    })

    registerActionHandler('resume', () => {
      logger.debug('Resume action triggered', 'useChatActions')
    })

    registerActionHandler('skip', () => {
      logger.debug('Skip action triggered', 'useChatActions')
    })

    // Watchlist/Favorites
    registerActionHandler('add_to_watchlist', () => {
      logger.debug('Added to watchlist', 'useChatActions')
    })

    registerActionHandler('add_to_favorites', () => {
      logger.debug('Added to favorites', 'useChatActions')
    })

    // Settings
    registerActionHandler('volume', (payload) => {
      logger.debug('Volume', 'useChatActions', payload.change)
    })

    registerActionHandler('language', (payload) => {
      logger.debug('Switching to language', 'useChatActions', payload.language)
    })

    registerActionHandler('subtitles', (payload) => {
      logger.debug('Subtitles', 'useChatActions', payload.enabled ? 'enabled' : 'disabled')
    })

    // Info
    registerActionHandler('info', (payload) => {
      logger.debug('Getting info for', 'useChatActions', payload.query)
    })

    // Help
    registerActionHandler('help', () => {
      logger.debug('Help requested', 'useChatActions')
    })

    // Show Multiple
    registerActionHandler('show_multiple', async (payload) => {
      if (!payload.items || payload.items.length === 0) {
        logger.warn('show_multiple called with no items', 'useChatActions')
        return
      }

      try {
        const resolveResponse = await chatService.resolveContent(
          payload.items.map((item: any) => ({
            name: item.name,
            type: item.type || 'any'
          })),
          i18n.language
        )

        if (resolveResponse.items && resolveResponse.items.length > 0) {
          const voiceItems: VoiceContentItem[] = resolveResponse.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type as VoiceContentItem['type'],
            thumbnail: item.thumbnail,
            streamUrl: item.stream_url,
            matchedName: item.matched_name,
            confidence: item.confidence,
          }))

          useWidgetStore.getState().createVoiceWidgets(voiceItems)

          optionsRef.current.onSuccess?.(t('chatbot.showMultipleSuccess', {
            count: voiceItems.length,
            defaultValue: `Showing ${voiceItems.length} content items`,
          }))
        } else {
          optionsRef.current.onError?.(t('chatbot.showMultipleNotFound', {
            defaultValue: 'Could not find the requested content. Please try different names.',
          }))
        }
      } catch (error) {
        logger.error('Error resolving content', 'useChatActions', error)
        optionsRef.current.onError?.(t('chatbot.errors.general'))
      }

      useChatbotStore.getState().setOpen(false)
      optionsRef.current.onClose?.()
    })

    // Chess Invite
    registerActionHandler('chess_invite', async (payload) => {
      navigate('/games/chess', {
        state: {
          startGame: true,
          inviteFriend: payload.friendName
        }
      })
      useChatbotStore.getState().setOpen(false)
      optionsRef.current.onClose?.()
    })

    // Cleanup: unregister all handlers on unmount
    return () => {
      const actionTypes = [
        'navigate', 'search', 'play', 'pause', 'resume', 'skip',
        'add_to_watchlist', 'add_to_favorites', 'volume', 'language',
        'subtitles', 'info', 'help', 'show_multiple', 'chess_invite'
      ]
      actionTypes.forEach(type => unregisterActionHandler(type))
    }
  }, [navigate, i18n.language, t])

  return {
    convertBackendActionToChatbotAction,
  }
}
