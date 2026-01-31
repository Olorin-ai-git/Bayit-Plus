/**
 * SubtitleErrorDisplay Component
 * Displays error states for subtitle-related failures
 */

import { useTranslation } from 'react-i18next'

interface SubtitleErrorDisplayProps {
  error: Error | string | null
  onRetry?: () => void
  className?: string
}

export default function SubtitleErrorDisplay({
  error,
  onRetry,
  className = '',
}: SubtitleErrorDisplayProps) {
  const { t } = useTranslation()

  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <div
      className={`bg-red-500/10 border border-red-500/30 rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          ⚠️
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-400 mb-1">
            {t('subtitles.error.title', 'Subtitle Error')}
          </h3>
          <p className="text-xs text-red-300 mb-2">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded transition-colors min-h-[32px]"
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
