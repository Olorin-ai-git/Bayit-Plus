/**
 * SubtitleLoadingState Component
 * Loading indicator for subtitle operations
 */

import { useTranslation } from 'react-i18next'

interface SubtitleLoadingStateProps {
  message?: string
  className?: string
}

export default function SubtitleLoadingState({
  message,
  className = '',
}: SubtitleLoadingStateProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-white/5 rounded-lg ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full" />
      <span className="text-sm text-gray-400">
        {message || t('subtitles.loading', 'Loading subtitles...')}
      </span>
    </div>
  )
}
