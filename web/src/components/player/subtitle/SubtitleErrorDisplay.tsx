/**
 * SubtitleErrorDisplay Component
 * Displays error states for subtitle-related failures with categorization
 */

import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { Icon } from '@olorin/shared-icons/web'

interface SubtitleErrorDisplayProps {
  error: Error | string | null
  onRetry?: () => void
  className?: string
}

type ErrorCategory = 'network' | 'server' | 'client' | 'unknown'

interface ErrorInfo {
  category: ErrorCategory
  icon: string
  titleKey: string
  messageKey: string
}

function categorizeError(error: Error | string): ErrorInfo {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorLower = errorMessage.toLowerCase()

  // Network errors
  if (
    errorLower.includes('network') ||
    errorLower.includes('fetch') ||
    errorLower.includes('connection') ||
    errorLower.includes('timeout') ||
    errorLower.includes('offline')
  ) {
    return {
      category: 'network',
      icon: 'broadcast',
      titleKey: 'subtitles.error.networkTitle',
      messageKey: 'subtitles.error.networkError',
    }
  }

  // Server errors (5xx)
  if (errorLower.includes('500') || errorLower.includes('502') || errorLower.includes('503') || errorLower.includes('504') || errorLower.includes('server error')) {
    return {
      category: 'server',
      icon: 'settings',
      titleKey: 'subtitles.error.serverTitle',
      messageKey: 'subtitles.error.serverError',
    }
  }

  // Client errors (4xx)
  if (errorLower.includes('400') || errorLower.includes('401') || errorLower.includes('403') || errorLower.includes('404') || errorLower.includes('not found')) {
    return {
      category: 'client',
      icon: 'x',
      titleKey: 'subtitles.error.clientTitle',
      messageKey: 'subtitles.error.clientError',
    }
  }

  // Unknown/generic errors
  return {
    category: 'unknown',
    icon: 'alertTriangle',
    titleKey: 'subtitles.error.title',
    messageKey: 'subtitles.error.loadFailed',
  }
}

export default function SubtitleErrorDisplay({
  error,
  onRetry,
  className = '',
}: SubtitleErrorDisplayProps) {
  const { t } = useTranslation()

  const errorInfo = useMemo(() => {
    if (!error) return null
    return categorizeError(error)
  }, [error])

  if (!error || !errorInfo) return null

  const errorMessage = typeof error === 'string' ? error : error.message

  const bgColor = errorInfo.category === 'network' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'
  const textColor = errorInfo.category === 'network' ? 'text-amber-400' : 'text-red-400'
  const secondaryTextColor = errorInfo.category === 'network' ? 'text-amber-300' : 'text-red-300'

  return (
    <div
      className={`${bgColor} border rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon
          name={errorInfo.icon}
          size="lg"
          color={errorInfo.category === 'network' ? '#fbbf24' : '#f87171'}
          className="flex-shrink-0"
          aria-hidden="true"
        />
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${textColor} mb-1`}>
            {t(errorInfo.titleKey, 'Subtitle Error')}
          </h3>
          <p className={`text-xs ${secondaryTextColor} mb-2`}>
            {t(errorInfo.messageKey, errorMessage)}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`text-xs ${
                errorInfo.category === 'network'
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
              } px-3 py-1.5 rounded transition-colors min-h-[44px] min-w-[44px]`}
              aria-label={t('subtitles.error.retry', 'Retry loading subtitles')}
            >
              {t('subtitles.error.retry', 'Try Again')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
