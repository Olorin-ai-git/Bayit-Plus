/**
 * LiveTriviaSettings Component
 *
 * Settings panel for live trivia preferences.
 * Allows users to enable/disable and adjust frequency.
 *
 * Features:
 * - Enable/disable toggle
 * - Frequency selector (off, low, normal, high)
 * - Quota display (remaining facts)
 * - Premium upgrade prompt for non-premium users
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard, GlassButton, GlassToggle, GlassSelect } from '@bayit/shared/ui'
import { logger } from '@/utils/logger'
import { LiveTriviaQuotaDisplay } from './LiveTriviaQuotaDisplay'
import { LiveTriviaAlerts } from './LiveTriviaAlerts'

interface LiveTriviaSettingsProps {
  onClose?: () => void
}

interface TriviaPreferences {
  enabled: boolean
  frequency: 'off' | 'low' | 'normal' | 'high'
  quota_remaining_hour: number
  quota_remaining_day: number
  quota_remaining_month: number
  quota_limit_hour: number
  quota_limit_day: number
  quota_limit_month: number
}

export function LiveTriviaSettings({ onClose }: LiveTriviaSettingsProps) {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState<TriviaPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/live-trivia/preferences', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load preferences')
      }

      const data = await response.json()
      setPreferences(data)
    } catch (err) {
      setError(t('liveTrivia.errorLoadingPreferences'))
      logger.error('Failed to load live trivia preferences', 'LiveTriviaSettings', err)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async (newPreferences: Partial<TriviaPreferences>) => {
    if (!preferences) return

    try {
      setSaving(true)
      const response = await fetch('/api/v1/live-trivia/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          enabled: newPreferences.enabled ?? preferences.enabled,
          frequency: newPreferences.frequency ?? preferences.frequency,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      const data = await response.json()
      setPreferences(data)
    } catch (err) {
      setError(t('liveTrivia.errorSavingPreferences'))
      logger.error('Failed to save live trivia preferences', 'LiveTriviaSettings', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <GlassCard className="flex flex-col gap-4 p-6">
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse w-1/2" />
        </div>
        <span className="text-white/60 text-sm">{t('liveTrivia.loading')}</span>
      </GlassCard>
    )
  }

  if (!preferences) {
    return (
      <GlassCard className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/20 rounded-lg">
          <span className="text-red-300 text-sm">
            {error || t('liveTrivia.errorLoading')}
          </span>
        </div>
        <GlassButton variant="primary" onClick={loadPreferences}>
          {t('common.retry')}
        </GlassButton>
      </GlassCard>
    )
  }

  const frequencyOptions = [
    { value: 'off', label: t('liveTrivia.frequency.off') },
    { value: 'low', label: t('liveTrivia.frequency.low') },
    { value: 'normal', label: t('liveTrivia.frequency.normal') },
    { value: 'high', label: t('liveTrivia.frequency.high') },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <h2 className="text-white text-xl font-bold">
        {t('liveTrivia.settings.title')}
      </h2>

      {/* Enable/Disable Toggle */}
      <GlassCard className="p-4">
        <GlassToggle
          value={preferences.enabled}
          onValueChange={(enabled) => savePreferences({ enabled })}
          label={t('liveTrivia.settings.enable')}
          disabled={saving}
        />
      </GlassCard>

      {/* Frequency Selector */}
      {preferences.enabled && (
        <GlassCard className="p-4">
          <GlassSelect
            label={t('liveTrivia.settings.frequency')}
            options={frequencyOptions}
            value={preferences.frequency}
            onChange={(value) => savePreferences({ frequency: value as 'off' | 'low' | 'normal' | 'high' })}
            disabled={saving}
          />
        </GlassCard>
      )}

      {/* Quota Display */}
      <LiveTriviaQuotaDisplay
        quotaRemainingHour={preferences.quota_remaining_hour}
        quotaLimitHour={preferences.quota_limit_hour}
        quotaRemainingDay={preferences.quota_remaining_day}
        quotaLimitDay={preferences.quota_limit_day}
        quotaRemainingMonth={preferences.quota_remaining_month}
        quotaLimitMonth={preferences.quota_limit_month}
      />

      {/* Alerts */}
      <LiveTriviaAlerts error={error} onDismissError={() => setError(null)} />
    </div>
  )
}
