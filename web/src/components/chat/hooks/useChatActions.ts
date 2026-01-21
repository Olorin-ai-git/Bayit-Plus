import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChatbotStore, type ChatbotAction } from '@/stores/chatbotStore'
import { useWidgetStore, type VoiceContentItem } from '@/stores/widgetStore'
import { chatService } from '@/services/api'

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
        console.warn(`[useChatActions] Unknown action type: ${type}`)
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
      console.log('[useChatActions] Pause action triggered')
    })

    registerActionHandler('resume', () => {
      console.log('[useChatActions] Resume action triggered')
    })

    registerActionHandler('skip', () => {
      console.log('[useChatActions] Skip action triggered')
    })

    // Watchlist/Favorites
    registerActionHandler('add_to_watchlist', () => {
      console.log('[useChatActions] Added to watchlist')
    })

    registerActionHandler('add_to_favorites', () => {
      console.log('[useChatActions] Added to favorites')
    })

    // Settings
    registerActionHandler('volume', (payload) => {
      console.log('[useChatActions] Volume', payload.change)
    })

    registerActionHandler('language', (payload) => {
      console.log('[useChatActions] Switching to language:', payload.language)
    })

    registerActionHandler('subtitles', (payload) => {
      console.log('[useChatActions] Subtitles', payload.enabled ? 'enabled' : 'disabled')
    })

    // Info
    registerActionHandler('info', (payload) => {
      console.log('[useChatActions] Getting info for:', payload.query)
    })

    // Help
    registerActionHandler('help', () => {
      console.log('[useChatActions] Help requested')
    })

    // Flows
    registerActionHandler('create_flow', (payload) => {
      navigate('/flows', { state: { createFlow: true, template: payload.template } })
      setOpen(false)
      optionsRef.current.onClose?.()
    })

    registerActionHandler('start_flow', (payload) => {
      navigate('/flows', { state: { startFlowId: payload.flowId } })
      setOpen(false)
      optionsRef.current.onClose?.()
    })

    // Show Multiple
    registerActionHandler('show_multiple', async (payload) => {
      if (!payload.items || payload.items.length === 0) {
        console.warn('[useChatActions] show_multiple called with no items')
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
        console.error('[useChatActions] Error resolving content:', error)
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
        'subtitles', 'info', 'help', 'create_flow', 'start_flow',
        'show_multiple', 'chess_invite'
      ]
      actionTypes.forEach(type => unregisterActionHandler(type))
    }
  }, [navigate, i18n.language, t])

  return {
    convertBackendActionToChatbotAction,
  }
}
