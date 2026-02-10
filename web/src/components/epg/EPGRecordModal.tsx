import React, { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { GlassLoadingSpinner } from '@bayit/shared/ui'
import { Check, Clock, HardDrive, AlertCircle, Volume2, Repeat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { GlassModal, GlassToggle } from '@bayit/shared/ui'
import { colors } from '@olorin/design-tokens'
import { EPGProgram } from '@/services/epgApi'
import { recordingApi } from '@/services/recordingApi'
import { useAuthStore } from '@/stores/authStore'
import { useDirection } from '@/hooks/useDirection'
import logger from '@/utils/logger'
import { styles } from './EPGRecordModal.styles'
import { EPGRecordLanguageGrid } from './record/EPGRecordLanguageGrid'
import { EPGRecordSeriesScope } from './record/EPGRecordSeriesScope'
import { EPGRecordStorageInfo } from './record/EPGRecordStorageInfo'

interface EPGRecordModalProps {
  program: EPGProgram
  channelName: string
  visible: boolean
  onClose: () => void
  onConfirm: (settings: RecordingSettings) => Promise<void>
}

export interface RecordingSettings {
  enableSubtitles: boolean
  language: string
  enableDubbing: boolean
  dubbingLanguage: string
  seriesScope: 'episode' | 'season' | 'all_seasons'
}

const AVAILABLE_LANGUAGES = [
  { code: 'he', label: '\u05E2\u05D1\u05E8\u05D9\u05EA', flag: '\uD83C\uDDEE\uD83C\uDDF1' },
  { code: 'en', label: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
  { code: 'es', label: 'Espa\u00F1ol', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'ru', label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', flag: '\uD83C\uDDF7\uD83C\uDDFA' },
  { code: 'fr', label: 'Fran\u00E7ais', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
]

const EPGRecordModal: React.FC<EPGRecordModalProps> = ({
  program, channelName, visible, onClose, onConfirm,
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { isRTL, flexDirection, textAlign } = useDirection()

  const [enableSubtitles, setEnableSubtitles] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [enableDubbing, setEnableDubbing] = useState(false)
  const [dubbingLanguage, setDubbingLanguage] = useState('en')
  const [seriesScope, setSeriesScope] = useState<'episode' | 'season' | 'all_seasons'>('episode')
  const [loading, setLoading] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState<any>(null)

  useEffect(() => {
    if (visible) {
      setSelectedLanguage(user?.preferences?.default_subtitle_language || 'en')
      recordingApi.getQuotaStatus().then(setQuotaInfo).catch(
        (err: unknown) => logger.error('Failed to fetch quota', 'EPGRecordModal', err)
      )
    }
  }, [user, visible])

  const startTime = DateTime.fromISO(program.start_time)
  const endTime = DateTime.fromISO(program.end_time)
  const durationMinutes = endTime.diff(startTime, 'minutes').minutes
  const durationFormatted = formatDuration(program.duration_seconds)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm({ enableSubtitles, language: selectedLanguage, enableDubbing, dubbingLanguage, seriesScope })
      onClose()
    } catch (err) {
      logger.error('Failed to schedule recording', 'EPGRecordModal', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassModal visible={visible} title={t('epg.recordProgram')} onClose={onClose} dismissable>
      <View style={styles.section}>
        <Text style={[styles.programTitle, { textAlign }]}>{program.title}</Text>
        <View style={[styles.programMeta, { flexDirection }]}>
          <Text style={styles.metaLabel}>{t('epg.channel')}:</Text>
          <Text style={styles.metaValue}>{channelName}</Text>
        </View>
        <View style={[styles.timeRow, { flexDirection }]}>
          <Clock size={14} color={colors.textMuted} />
          <Text style={styles.timeText}>
            {startTime.toFormat('HH:mm')} - {endTime.toFormat('HH:mm')}
          </Text>
          <Text style={styles.timeDivider}>{'\u2022'}</Text>
          <Text style={styles.timeText}>{durationFormatted}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.toggleRow, { flexDirection }]}>
          <Text style={[styles.toggleLabel, { textAlign }]}>{t('epg.enableSubtitles')}</Text>
          <GlassToggle value={enableSubtitles} onValueChange={setEnableSubtitles} size="small" isRTL={isRTL} />
        </View>
        {enableSubtitles && (
          <EPGRecordLanguageGrid
            languages={AVAILABLE_LANGUAGES}
            selected={selectedLanguage}
            onSelect={setSelectedLanguage}
            label={t('epg.subtitleLanguage')}
            textAlign={textAlign}
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.toggleRow, { flexDirection }]}>
          <View style={[styles.toggleLabelRow, { flexDirection }]}>
            <Volume2 size={16} color={colors.textMuted} />
            <Text style={[styles.toggleLabel, { textAlign }]}>{t('recordings.includeDubbedAudio')}</Text>
          </View>
          <GlassToggle value={enableDubbing} onValueChange={setEnableDubbing} size="small" isRTL={isRTL} />
        </View>
        {enableDubbing && (
          <EPGRecordLanguageGrid
            languages={AVAILABLE_LANGUAGES}
            selected={dubbingLanguage}
            onSelect={setDubbingLanguage}
            label={t('recordings.dubbingLanguage', 'Dubbing Language')}
            textAlign={textAlign}
            keyPrefix="dub-"
          />
        )}
      </View>

      <EPGRecordSeriesScope scope={seriesScope} onScopeChange={setSeriesScope} flexDirection={flexDirection} textAlign={textAlign} />
      <EPGRecordStorageInfo durationMinutes={durationMinutes} quotaInfo={quotaInfo} flexDirection={flexDirection} />

      <View style={[styles.actions, { flexDirection }]}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, styles.confirmButton, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <GlassLoadingSpinner size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>{t('epg.scheduleRecording')}</Text>
          )}
        </Pressable>
      </View>
    </GlassModal>
  )
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
}

export default EPGRecordModal
