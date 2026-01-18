/**
 * Chat Components
 *
 * Refactored chatbot with modular architecture:
 * - Chatbot: Main orchestration component
 * - ChatMessageList: Message rendering and scrolling
 * - ChatInputBar: Input controls (text, voice, send)
 * - ChatSuggestionsPanel: Quick action suggestions
 * - ChatRecommendations: Content recommendations grid
 *
 * Custom hooks:
 * - useChatMessages: Message state and API communication
 * - useChatVoice: Voice recording and transcription
 * - useChatActions: Action handler registration
 */

export { default as Chatbot } from './Chatbot'
export { ChatMessageList } from './ChatMessageList'
export { ChatInputBar } from './ChatInputBar'
export { ChatSuggestionsPanel } from './ChatSuggestionsPanel'
export { ChatRecommendations } from './ChatRecommendations'

export { useChatMessages } from './hooks/useChatMessages'
export { useChatVoice } from './hooks/useChatVoice'
export { useChatActions } from './hooks/useChatActions'

export type { Message, ChatbotProps, ContentRecommendation } from './types'

export { default } from './Chatbot'
