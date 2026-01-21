/**
 * Chat component types
 */

export interface Message {
  role: 'user' | 'assistant'
  content: string | Array<{ id: string; title: string; thumbnail: string }>
  type?: 'recommendations'
  isError?: boolean
}

export interface ChatbotProps {
  visible?: boolean
  onClose?: () => void
}

export interface ContentRecommendation {
  id: string
  title: string
  thumbnail: string
}

export interface VoiceRecordingState {
  isRecording: boolean
  isTranscribing: boolean
  currentTranscript: string
}

export interface ChatState {
  messages: Message[]
  input: string
  isLoading: boolean
  conversationId: string | null
}
