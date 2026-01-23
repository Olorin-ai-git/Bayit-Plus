/**
 * Dubbing Service Error Types and Handling
 *
 * Structured error codes with user-friendly messages and recovery suggestions.
 */

export enum DubbingErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  PREMIUM_REQUIRED = 'PREMIUM_REQUIRED',
  CHANNEL_UNAVAILABLE = 'CHANNEL_UNAVAILABLE',
  AUDIO_CAPTURE_FAILED = 'AUDIO_CAPTURE_FAILED',
  STT_SERVICE_ERROR = 'STT_SERVICE_ERROR',
  TTS_SERVICE_ERROR = 'TTS_SERVICE_ERROR',
  TRANSLATION_TIMEOUT = 'TRANSLATION_TIMEOUT',
  WEBSOCKET_CLOSED = 'WEBSOCKET_CLOSED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
}

export interface ErrorDetails {
  title: string
  message: string
  action?: string
  recoverable: boolean
  actionButton?: {
    text: string
    href?: string
  }
}

export class DubbingError extends Error {
  constructor(
    public code: DubbingErrorCode,
    message: string,
    public recoverable: boolean = true
  ) {
    super(message)
    this.name = 'DubbingError'
  }
}

export function getErrorDetails(error: DubbingError, t: (key: string, fallback: string) => string): ErrorDetails {
  const errorMap: Record<DubbingErrorCode, ErrorDetails> = {
    [DubbingErrorCode.CONNECTION_FAILED]: {
      title: t('dubbing.errors.connectionFailed.title', 'Connection Failed'),
      message: t(
        'dubbing.errors.connectionFailed.message',
        'Unable to connect to dubbing service'
      ),
      action: t(
        'dubbing.errors.connectionFailed.action',
        'Check your internet connection and try again'
      ),
      recoverable: true,
    },
    [DubbingErrorCode.AUTHENTICATION_FAILED]: {
      title: t('dubbing.errors.authFailed.title', 'Authentication Error'),
      message: t(
        'dubbing.errors.authFailed.message',
        'Your session expired'
      ),
      action: t(
        'dubbing.errors.authFailed.action',
        'Please sign in again to continue'
      ),
      recoverable: true,
      actionButton: {
        text: t('common.signIn', 'Sign In'),
        href: '/login',
      },
    },
    [DubbingErrorCode.PREMIUM_REQUIRED]: {
      title: t('dubbing.errors.premiumRequired.title', 'Premium Feature'),
      message: t(
        'dubbing.errors.premiumRequired.message',
        'Live dubbing requires a Premium subscription'
      ),
      action: t(
        'dubbing.errors.premiumRequired.action',
        'Upgrade to Premium to access this feature'
      ),
      recoverable: false,
      actionButton: {
        text: t('common.upgrade', 'Upgrade Now'),
        href: '/upgrade',
      },
    },
    [DubbingErrorCode.CHANNEL_UNAVAILABLE]: {
      title: t('dubbing.errors.channelUnavailable.title', 'Channel Not Available'),
      message: t(
        'dubbing.errors.channelUnavailable.message',
        'Dubbing is not available for this channel'
      ),
      action: t(
        'dubbing.errors.channelUnavailable.action',
        'Try another channel with dubbing support'
      ),
      recoverable: false,
    },
    [DubbingErrorCode.AUDIO_CAPTURE_FAILED]: {
      title: t('dubbing.errors.audioCaptureTitle', 'Microphone Access Denied'),
      message: t(
        'dubbing.errors.audioCapture',
        'Unable to access your microphone'
      ),
      action: t(
        'dubbing.errors.audioCaptureAction',
        'Check browser permissions and reload'
      ),
      recoverable: true,
    },
    [DubbingErrorCode.STT_SERVICE_ERROR]: {
      title: t('dubbing.errors.sttTitle', 'Speech Recognition Error'),
      message: t(
        'dubbing.errors.stt',
        'Speech recognition service is temporarily unavailable'
      ),
      recoverable: true,
    },
    [DubbingErrorCode.TTS_SERVICE_ERROR]: {
      title: t('dubbing.errors.ttsTitle', 'Text-to-Speech Error'),
      message: t(
        'dubbing.errors.tts',
        'Text-to-speech service is temporarily unavailable'
      ),
      recoverable: true,
    },
    [DubbingErrorCode.TRANSLATION_TIMEOUT]: {
      title: t('dubbing.errors.translationTitle', 'Translation Timeout'),
      message: t(
        'dubbing.errors.translation',
        'Translation took too long to process'
      ),
      action: t('dubbing.errors.translationAction', 'The system will continue with original audio'),
      recoverable: true,
    },
    [DubbingErrorCode.WEBSOCKET_CLOSED]: {
      title: t('dubbing.errors.websocketTitle', 'Connection Lost'),
      message: t(
        'dubbing.errors.websocket',
        'Connection to dubbing service was lost'
      ),
      action: t(
        'dubbing.errors.websocketAction',
        'Attempting to reconnect...'
      ),
      recoverable: true,
    },
    [DubbingErrorCode.RATE_LIMIT_EXCEEDED]: {
      title: t('dubbing.errors.rateLimitTitle', 'Too Many Requests'),
      message: t(
        'dubbing.errors.rateLimit',
        'You have made too many connection attempts'
      ),
      action: t(
        'dubbing.errors.rateLimitAction',
        'Please wait a few minutes before trying again'
      ),
      recoverable: true,
    },
    [DubbingErrorCode.SESSION_TIMEOUT]: {
      title: t('dubbing.errors.sessionTitle', 'Session Expired'),
      message: t(
        'dubbing.errors.session',
        'Your dubbing session has expired due to inactivity'
      ),
      action: t(
        'dubbing.errors.sessionAction',
        'Start a new session to continue'
      ),
      recoverable: true,
    },
  }

  return (
    errorMap[error.code] || {
      title: t('common.error', 'Error'),
      message: error.message,
      recoverable: error.recoverable,
    }
  )
}
