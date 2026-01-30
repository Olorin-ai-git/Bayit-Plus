/**
 * LiveTriviaQuotaDisplay Component
 *
 * Displays quota usage for live trivia feature.
 * Shows hourly, daily, and monthly quota limits with progress bars.
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@bayit/shared/ui'

interface QuotaDisplayProps {
  quotaRemainingHour: number
  quotaLimitHour: number
  quotaRemainingDay: number
  quotaLimitDay: number
  quotaRemainingMonth: number
  quotaLimitMonth: number
}

export function LiveTriviaQuotaDisplay({
  quotaRemainingHour,
  quotaLimitHour,
  quotaRemainingDay,
  quotaLimitDay,
  quotaRemainingMonth,
  quotaLimitMonth,
}: QuotaDisplayProps) {
  const { t } = useTranslation()

  const getQuotaPercentage = (remaining: number, total: number) => {
    if (total === 0) return 0
    return (remaining / total) * 100
  }

  return (
    <GlassCard className="flex flex-col gap-4 p-4">
      <h3 className="text-white text-base font-semibold">
        {t('liveTrivia.quota.title')}
      </h3>

      {/* Hour quota */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-sm">
            {t('liveTrivia.quota.hourly')}
          </span>
          <span className="text-white text-sm font-medium">
            {quotaRemainingHour} / {quotaLimitHour}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${getQuotaPercentage(quotaRemainingHour, quotaLimitHour)}%` }}
            role="progressbar"
            aria-valuenow={quotaRemainingHour}
            aria-valuemin={0}
            aria-valuemax={quotaLimitHour}
          />
        </div>
      </div>

      {/* Day quota */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-sm">
            {t('liveTrivia.quota.daily')}
          </span>
          <span className="text-white text-sm font-medium">
            {quotaRemainingDay} / {quotaLimitDay}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${getQuotaPercentage(quotaRemainingDay, quotaLimitDay)}%` }}
            role="progressbar"
            aria-valuenow={quotaRemainingDay}
            aria-valuemin={0}
            aria-valuemax={quotaLimitDay}
          />
        </div>
      </div>

      {/* Month quota */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-sm">
            {t('liveTrivia.quota.monthly')}
          </span>
          <span className="text-white text-sm font-medium">
            {quotaRemainingMonth} / {quotaLimitMonth}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${getQuotaPercentage(quotaRemainingMonth, quotaLimitMonth)}%` }}
            role="progressbar"
            aria-valuenow={quotaRemainingMonth}
            aria-valuemin={0}
            aria-valuemax={quotaLimitMonth}
          />
        </div>
      </div>
    </GlassCard>
  )
}
