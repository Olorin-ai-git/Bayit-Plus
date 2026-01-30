/**
 * Type definitions for Channel Chat Service
 */

export interface ConnectedData {
  channelId: string
  userCount: number
  isBetaUser: boolean
  translationEnabled: boolean
  sessionToken: string
  recentMessages: ChatMessageData[]
}

export interface ChatMessageData {
  id: string
  userId: string
  userName: string
  message: string
  originalLanguage: string
  timestamp: number
  isPinned: boolean
  reactions?: Record<string, number>
}

export interface UserJoinData {
  userId: string
  userName: string
  userCount: number
}

export interface UserLeftData {
  userId: string
  userCount: number
}

export interface ReactionUpdateData {
  messageId: string
  reaction: string
  count: number
  totalReactions: Record<string, number>
}

export interface ChannelChatCallbacks {
  onConnected: (data: ConnectedData) => void
  onMessage: (message: ChatMessageData) => void
  onUserJoined: (data: UserJoinData) => void
  onUserLeft: (data: UserLeftData) => void
  onReactionUpdate: (data: ReactionUpdateData) => void
  onError: (code: string, message: string, recoverable: boolean) => void
  onDisconnect: () => void
}
