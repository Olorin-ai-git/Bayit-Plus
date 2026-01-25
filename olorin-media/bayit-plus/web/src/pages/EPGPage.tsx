import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
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
import { useModal } from '@/contexts/ModalContext'
import { GlassButton, GlassPageHeader } from '@bayit/shared/ui'
import logger from '@/utils/logger'

const EPGPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { showError } = useModal()

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
      logger.error('Failed to fetch EPG data', 'EPGPage', err)
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
      logger.error('Failed to fetch active recordings', 'EPGPage', err)
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
    logger.debug('Program clicked', 'EPGPage', program)
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

        logger.debug('Started recording', 'EPGPage', program.title)
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
      logger.error('Failed to start/schedule recording', 'EPGPage', err)
      showError(err.message || t('epg.recordingFailed'), t('common.error'))
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
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <GlassPageHeader
            title={t('epg.title')}
            pageType="epg"
            isRTL={false}
          />

          {/* View Toggle */}
          <EPGViewToggle view={viewMode} onViewChange={setViewMode} />
        </View>

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
          <View style={styles.errorContainer}>
            <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>{t('epg.errorTitle')}</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <GlassButton
                onPress={fetchEPGData}
                variant="secondary"
                style={styles.retryButton}
              >
                {t('common.retry')}
              </GlassButton>
            </View>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            {/* Skeleton timeline */}
            <View style={styles.skeletonTimeline} />

            {/* Skeleton rows */}
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.skeletonRow} />
              ))}
            </View>
          </View>
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
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #111827, #1f2937, #111827)',
    padding: 24,
  },
  contentWrapper: {
    maxWidth: 1920,
    marginLeft: 'auto',
    marginRight: 'auto',
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    color: '#f87171',
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
  },
  errorMessage: {
    color: 'rgba(252, 165, 165, 0.8)',
    fontSize: 13,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
  },
  loadingContainer: {
    gap: 16,
  },
  skeletonTimeline: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  skeletonGrid: {
    gap: 16,
  },
  skeletonRow: {
    height: 96,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
})

export default EPGPage
