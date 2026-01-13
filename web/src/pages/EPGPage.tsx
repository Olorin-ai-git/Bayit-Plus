import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { AlertCircle } from 'lucide-react'
import epgApi, { Channel, EPGProgram } from '@/services/epgApi'
import EPGViewToggle, { EPGViewMode } from '@/components/epg/EPGViewToggle'
import EPGTimeControls, { Timezone } from '@/components/epg/EPGTimeControls'
import EPGGrid from '@/components/epg/EPGGrid'
import EPGList from '@/components/epg/EPGList'
import EPGRecordModal, { RecordingSettings } from '@/components/epg/EPGRecordModal'
import { RecordingStatus } from '@/components/epg/EPGRecordingIndicator'
import { useAuthStore } from '@/stores/authStore'
import { recordingApi } from '@/services/recordingApi'

const EPGPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  // View state
  const [viewMode, setViewMode] = useState<EPGViewMode>('grid')
  const [timezone, setTimezone] = useState<Timezone>('israel')

  // Time window state
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [timeWindow, setTimeWindow] = useState(() => {
    const now = new Date()
    return {
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000)    // 4 hours from now
    }
  })

  // Data state
  const [channels, setChannels] = useState<Channel[]>([])
  const [programs, setPrograms] = useState<EPGProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Recording state
  const [recordModal, setRecordModal] = useState<{
    isOpen: boolean
    program: EPGProgram | null
    channelName: string
  }>({
    isOpen: false,
    program: null,
    channelName: ''
  })
  const [activeRecordings, setActiveRecordings] = useState<Set<string>>(new Set())
  const [scheduledRecordings, setScheduledRecordings] = useState<Set<string>>(new Set())

  // Check if user is premium
  const isPremium = useMemo(() => {
    return user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'
  }, [user])

  // Calculate timezone string for API
  const timezoneString = useMemo(() => {
    return timezone === 'israel' ? 'Asia/Jerusalem' : DateTime.local().zoneName
  }, [timezone])

  // Fetch EPG data
  const fetchEPGData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await epgApi.getEPGData({
        startTime: timeWindow.start.toISOString(),
        endTime: timeWindow.end.toISOString(),
        timezone: timezoneString
      })

      setChannels(response.channels)
      setPrograms(response.programs)
    } catch (err: any) {
      console.error('Failed to fetch EPG data:', err)
      setError(err.message || t('epg.errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [timeWindow, timezoneString, t])

  // Load data on mount and when time window changes
  useEffect(() => {
    fetchEPGData()
  }, [fetchEPGData])

  // Update current time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Time navigation handlers
  const handleTimeShift = useCallback((hours: number) => {
    const shiftMs = hours * 60 * 60 * 1000
    setTimeWindow(prev => ({
      start: new Date(prev.start.getTime() + shiftMs),
      end: new Date(prev.end.getTime() + shiftMs)
    }))
  }, [])

  const handleJumpToNow = useCallback(() => {
    const now = new Date()
    setTimeWindow({
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000)
    })
    setCurrentTime(now)
  }, [])

  const handleTimezoneToggle = useCallback(() => {
    setTimezone(prev => prev === 'israel' ? 'local' : 'israel')
  }, [])

  // Fetch active recordings to update status
  const fetchActiveRecordings = useCallback(async () => {
    try {
      const sessions = await recordingApi.getActiveRecordings()
      const activeIds = new Set(sessions.map(s => s.channel_id))
      setActiveRecordings(activeIds)
    } catch (err) {
      console.error('Failed to fetch active recordings:', err)
    }
  }, [])

  // Load active recordings on mount
  useEffect(() => {
    if (user) {
      fetchActiveRecordings()
    }
  }, [user, fetchActiveRecordings])

  // Get recording status for a program
  const getRecordingStatus = useCallback((program: EPGProgram): RecordingStatus => {
    if (program.is_now && activeRecordings.has(program.channel_id)) {
      return 'active'
    }
    if (scheduledRecordings.has(program.id)) {
      return 'scheduled'
    }
    return 'none'
  }, [activeRecordings, scheduledRecordings])

  // Program click handler
  const handleProgramClick = useCallback((program: EPGProgram) => {
    // Program detail modal not yet implemented
    // Would show: full description, cast, genres, trailer, related programs
    // For now, users can see program info in the EPG cell tooltip
    console.log('Program clicked:', program)
  }, [])

  // Recording handlers
  const handleRecordClick = useCallback((program: EPGProgram, event: React.MouseEvent) => {
    event.stopPropagation()

    // Get channel name
    const channel = channels.find(c => c.id === program.channel_id)
    const channelName = channel?.name || 'Unknown Channel'

    // Open record modal
    setRecordModal({
      isOpen: true,
      program,
      channelName
    })
  }, [channels])

  const handleRecordConfirm = useCallback(async (settings: RecordingSettings) => {
    if (!recordModal.program) return

    const program = recordModal.program

    try {
      if (program.is_now) {
        // Start immediate recording for current program
        await recordingApi.startRecording({
          channel_id: program.channel_id,
          subtitle_enabled: settings.enableSubtitles,
          subtitle_target_language: settings.language
        })

        // Add to active recordings
        setActiveRecordings(prev => new Set([...prev, program.channel_id]))

        console.log('Started recording:', program.title)
      } else if (program.is_future) {
        // Future recording scheduling is not yet implemented on backend
        // Implementation requires: Backend endpoint to store scheduled recordings
        // and cron job to start recordings at scheduled time
        // For now, only immediate recordings are supported
        throw new Error(t('epg.scheduledRecordingNotSupported'))
      }

      // Close modal
      setRecordModal({
        isOpen: false,
        program: null,
        channelName: ''
      })
    } catch (err: any) {
      console.error('Failed to start/schedule recording:', err)
      alert(err.message || t('epg.recordingFailed'))
    }
  }, [recordModal, t])

  const handleRecordModalClose = useCallback(() => {
    setRecordModal({
      isOpen: false,
      program: null,
      channelName: ''
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('epg.title')}</h1>
            <p className="text-white/60">{t('epg.subtitle')}</p>
          </div>

          {/* View Toggle */}
          <EPGViewToggle view={viewMode} onViewChange={setViewMode} />
        </div>

        {/* Time Controls */}
        <EPGTimeControls
          currentTime={currentTime}
          timezone={timezone}
          onTimeShift={handleTimeShift}
          onJumpToNow={handleJumpToNow}
          onTimezoneToggle={handleTimezoneToggle}
        />

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold mb-1">{t('epg.errorTitle')}</h3>
              <p className="text-red-300/80 text-sm mb-3">{error}</p>
              <button
                onClick={fetchEPGData}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm font-medium"
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {/* Skeleton timeline */}
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />

            {/* Skeleton rows */}
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* EPG Content */}
        {!loading && !error && (
          <>
            {viewMode === 'grid' ? (
              <EPGGrid
                channels={channels}
                programs={programs}
                startTime={timeWindow.start}
                endTime={timeWindow.end}
                timezone={timezone}
                onProgramClick={handleProgramClick}
                isPremium={isPremium}
                getRecordingStatus={getRecordingStatus}
                onRecordClick={handleRecordClick}
              />
            ) : (
              <EPGList
                channels={channels}
                programs={programs}
                timezone={timezone}
                onProgramClick={handleProgramClick}
              />
            )}
          </>
        )}

        {/* Recording Modal */}
        {recordModal.isOpen && recordModal.program && (
          <EPGRecordModal
            program={recordModal.program}
            channelName={recordModal.channelName}
            onClose={handleRecordModalClose}
            onConfirm={handleRecordConfirm}
          />
        )}
      </div>
    </div>
  )
}

export default EPGPage
