/**
 * LiveTriviaAlerts Component
 *
 * Info and error alerts for live trivia settings.
 */

import React from 'react'
import { useTranslation } from 'react-i18next'

interface AlertsProps {
  error: string | null
  onDismissError: () => void
}

export function LiveTriviaAlerts({ error, onDismissError }: AlertsProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Info Alert */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/20 rounded-lg">
        <svg
          className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-blue-200 text-sm">
          {t('liveTrivia.settings.info')}
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/20 rounded-lg">
          <svg
            className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-red-200 text-sm">{error}</span>
            <button
              onClick={onDismissError}
              className="text-red-300 text-xs underline hover:text-red-200 self-start"
            >
              {t('common.dismiss')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
