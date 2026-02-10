/**
 * Type definitions for Channel Chat Service
 * Field names use snake_case to match the backend WebSocket protocol.
 */

export interface ConnectedData {
  channel_id: string
  user_count: number
  is_beta_user: boolean
  translation_enabled: boolean
  session_token: string
  recent_messages: ChatMessageData[]
}

export type ChatMessageType = 'message' | 'system_join' | 'system_leave'

export interface ChatMessageData {
  id: string
  user_id: string
  user_name: string
  user_role?: string
  message: string
  original_language: string
  timestamp: string
  is_pinned: boolean
  reactions?: Record<string, number>
  type?: ChatMessageType
  translated_text?: string
}

export interface UserJoinData {
  user_id: string
  user_name: string
  user_count: number
}

export interface UserLeftData {
  user_id: string
  user_name?: string
  user_count: number
}

export interface ReactionUpdateData {
  message_id: string
  user_id: string
  reaction: string
}

export interface MessageDeletedData {
  message_id: string
  deleted_by: string
  reason?: string
}

export interface UserMutedData {
  user_id: string
  muted_by: string
  reason?: string
}

export interface UserUnmutedData {
  user_id: string
  unmuted_by: string
}

export interface ChannelChatCallbacks {
  onConnected: (data: ConnectedData) => void
  onMessage: (message: ChatMessageData) => void
  onUserJoined: (data: UserJoinData) => void
  onUserLeft: (data: UserLeftData) => void
  onReactionUpdate: (data: ReactionUpdateData) => void
  onMessageDeleted?: (data: MessageDeletedData) => void
  onUserMuted?: (data: UserMutedData) => void
  onUserUnmuted?: (data: UserUnmutedData) => void
  onError: (code: string, message: string, recoverable: boolean) => void
  onDisconnect: () => void
}

export interface ChatHistoryResponse {
  messages: ChatMessageData[]
  has_more: boolean
  next_cursor: string | null
}
