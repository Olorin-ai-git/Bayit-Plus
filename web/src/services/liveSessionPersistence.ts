/**
 * Live Session Persistence Service
 * Persists live feature states (translation, dubbing, trivia) across browser refreshes.
 * Uses sessionStorage so state is cleared when the browser tab is closed.
 */

import logger from '@/utils/logger'

const LOG_CONTEXT = 'liveSessionPersistence'
const STORAGE_KEY = 'bayit-live-session'

export interface LiveSessionState {
  channelId: string
  // Live Translation (Subtitles)
  liveTranslation?: {
    enabled: boolean
    targetLang: string
    sourceLang: string
  }
  // Live Dubbing
  liveDubbing?: {
    enabled: boolean
    targetLang: string
    voiceId?: string
  }
  // Live Trivia
  liveTrivia?: {
    enabled: boolean
  }
  // Timestamp for session expiry (1 hour max)
  timestamp: number
}

const SESSION_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

/**
 * Get the current persisted session state.
 * Returns null if no session or session expired.
 */
export function getPersistedSession(): LiveSessionState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const session: LiveSessionState = JSON.parse(stored)

    // Check expiry
    if (Date.now() - session.timestamp > SESSION_EXPIRY_MS) {
      logger.debug('Session expired, clearing', LOG_CONTEXT)
      clearPersistedSession()
      return null
    }

    return session
  } catch (error) {
    logger.warn('Failed to parse persisted session', LOG_CONTEXT, error)
    return null
  }
}

/**
 * Get persisted session for a specific channel.
 * Returns null if no session or session is for a different channel.
 */
export function getPersistedSessionForChannel(channelId: string): LiveSessionState | null {
  const session = getPersistedSession()
  if (!session || session.channelId !== channelId) {
    return null
  }
  return session
}

/**
 * Save or update the session state.
 */
export function saveSession(state: Partial<LiveSessionState> & { channelId: string }): void {
  try {
    const existing = getPersistedSession()

    // If switching channels, clear the old session
    if (existing && existing.channelId !== state.channelId) {
      logger.debug('Channel changed, clearing old session', LOG_CONTEXT, {
        old: existing.channelId,
        new: state.channelId,
      })
    }

    const newSession: LiveSessionState = {
      ...existing,
      ...state,
      channelId: state.channelId,
      timestamp: Date.now(),
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession))
    logger.debug('Session saved', LOG_CONTEXT, {
      channelId: newSession.channelId,
      liveTranslation: !!newSession.liveTranslation?.enabled,
      liveDubbing: !!newSession.liveDubbing?.enabled,
      liveTrivia: !!newSession.liveTrivia?.enabled,
    })
  } catch (error) {
    logger.warn('Failed to save session', LOG_CONTEXT, error)
  }
}

/**
 * Update just the live translation state.
 */
export function saveLiveTranslationState(
  channelId: string,
  enabled: boolean,
  targetLang: string,
  sourceLang: string
): void {
  if (enabled) {
    saveSession({
      channelId,
      liveTranslation: { enabled, targetLang, sourceLang },
    })
  } else {
    // Clear translation state but keep other states
    const existing = getPersistedSession()
    if (existing && existing.channelId === channelId) {
      saveSession({
        ...existing,
        liveTranslation: undefined,
      })
    }
  }
}

/**
 * Update just the live dubbing state.
 */
export function saveLiveDubbingState(
  channelId: string,
  enabled: boolean,
  targetLang: string,
  voiceId?: string
): void {
  if (enabled) {
    saveSession({
      channelId,
      liveDubbing: { enabled, targetLang, voiceId },
    })
  } else {
    // Clear dubbing state but keep other states
    const existing = getPersistedSession()
    if (existing && existing.channelId === channelId) {
      saveSession({
        ...existing,
        liveDubbing: undefined,
      })
    }
  }
}

/**
 * Update just the live trivia state.
 */
export function saveLiveTriviaState(channelId: string, enabled: boolean): void {
  if (enabled) {
    saveSession({
      channelId,
      liveTrivia: { enabled },
    })
  } else {
    // Clear trivia state but keep other states
    const existing = getPersistedSession()
    if (existing && existing.channelId === channelId) {
      saveSession({
        ...existing,
        liveTrivia: undefined,
      })
    }
  }
}

/**
 * Clear all persisted session data.
 */
export function clearPersistedSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    logger.debug('Session cleared', LOG_CONTEXT)
  } catch (error) {
    logger.warn('Failed to clear session', LOG_CONTEXT, error)
  }
}

/**
 * Check if any live feature was active for a channel.
 */
export function hasActiveSession(channelId: string): boolean {
  const session = getPersistedSessionForChannel(channelId)
  if (!session) return false

  return !!(
    session.liveTranslation?.enabled ||
    session.liveDubbing?.enabled ||
    session.liveTrivia?.enabled
  )
}
