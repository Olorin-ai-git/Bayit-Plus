import React, { useState, useEffect } from 'react'
import { X, Check, Clock, HardDrive, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { EPGProgram } from '@/services/epgApi'
import { recordingApi } from '@/services/recordingApi'
import { useAuthStore } from '@/stores/authStore'

interface EPGRecordModalProps {
  program: EPGProgram
  channelName: string
  onClose: () => void
  onConfirm: (settings: RecordingSettings) => Promise<void>
}

export interface RecordingSettings {
  enableSubtitles: boolean
  language: string
}

const AVAILABLE_LANGUAGES = [
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

const EPGRecordModal: React.FC<EPGRecordModalProps> = ({
  program,
  channelName,
  onClose,
  onConfirm
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  // Recording settings
  const [enableSubtitles, setEnableSubtitles] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState<any>(null)

  // Load user's default subtitle language and quota
  useEffect(() => {
    const defaultLang = user?.preferences?.default_subtitle_language || 'en'
    setSelectedLanguage(defaultLang)

    // Fetch quota information
    fetchQuota()
  }, [user])

  const fetchQuota = async () => {
    try {
      const quota = await recordingApi.getQuotaStatus()
      setQuotaInfo(quota)
    } catch (err) {
      console.error('Failed to fetch quota:', err)
    }
  }

  // Calculate program details
  const startTime = DateTime.fromISO(program.start_time)
  const endTime = DateTime.fromISO(program.end_time)
  const durationMinutes = endTime.diff(startTime, 'minutes').minutes
  const durationFormatted = formatDuration(program.duration_seconds)

  // Estimate file size (rough: 1 minute ≈ 5 MB for HD)
  const estimatedSizeMB = Math.ceil(durationMinutes * 5)
  const estimatedSizeGB = (estimatedSizeMB / 1024).toFixed(2)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm({
        enableSubtitles,
        language: selectedLanguage
      })
      onClose()
    } catch (err) {
      console.error('Failed to schedule recording:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{t('epg.recordProgram')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={t('common.close')}
          >
            <X size={24} className="text-white/80" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Program Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">{program.title}</h3>
            <div className="space-y-1 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white/80">{t('epg.channel')}:</span>
                <span>{channelName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>
                  {startTime.toFormat('HH:mm')} - {endTime.toFormat('HH:mm')}
                </span>
                <span className="text-white/40">•</span>
                <span>{durationFormatted}</span>
              </div>
            </div>
          </div>

          {/* Subtitle Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="enable-subtitles" className="text-white font-medium">
                {t('epg.enableSubtitles')}
              </label>
              <button
                onClick={() => setEnableSubtitles(!enableSubtitles)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  enableSubtitles ? 'bg-primary' : 'bg-white/20'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    enableSubtitles ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {enableSubtitles && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  {t('epg.subtitleLanguage')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        selectedLanguage === lang.code
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.label}</span>
                      {selectedLanguage === lang.code && (
                        <Check size={16} className="ml-auto text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Storage Info */}
          <div className="bg-white/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <HardDrive size={16} />
              <span className="font-medium">{t('epg.storageEstimate')}</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ~{estimatedSizeMB < 1024 ? `${estimatedSizeMB} MB` : `${estimatedSizeGB} GB`}
            </div>
            {quotaInfo && (
              <div className="text-xs text-white/60">
                {t('epg.availableSpace')}: {quotaInfo.storage_available_formatted}
              </div>
            )}
          </div>

          {/* Warning for low storage */}
          {quotaInfo && quotaInfo.storage_usage_percentage > 80 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-400 text-sm font-medium">{t('epg.lowStorage')}</p>
                <p className="text-yellow-300/80 text-xs mt-1">
                  {t('epg.lowStorageMessage')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : t('epg.scheduleRecording')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EPGRecordModal
