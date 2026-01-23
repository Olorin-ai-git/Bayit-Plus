import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { Check, Clock, HardDrive, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { GlassModal, GlassToggle } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { EPGProgram } from '@/services/epgApi'
import { recordingApi } from '@/services/recordingApi'
import { useAuthStore } from '@/stores/authStore'
import { useDirection } from '@/hooks/useDirection'
import logger from '@/utils/logger'

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
  visible,
  onClose,
  onConfirm
}) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { isRTL, flexDirection, textAlign } = useDirection()

  // Recording settings
  const [enableSubtitles, setEnableSubtitles] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState<any>(null)

  // Load user's default subtitle language and quota
  useEffect(() => {
    if (visible) {
      const defaultLang = user?.preferences?.default_subtitle_language || 'en'
      setSelectedLanguage(defaultLang)
      fetchQuota()
    }
  }, [user, visible])

  const fetchQuota = async () => {
    try {
      const quota = await recordingApi.getQuotaStatus()
      setQuotaInfo(quota)
    } catch (err) {
      logger.error('Failed to fetch quota', 'EPGRecordModal', err)
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
      logger.error('Failed to schedule recording', 'EPGRecordModal', err)
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <GlassModal
      visible={visible}
      title={t('epg.recordProgram')}
      onClose={onClose}
      dismissable
    >
      {/* Program Info */}
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
          <Text style={styles.timeDivider}>•</Text>
          <Text style={styles.timeText}>{durationFormatted}</Text>
        </View>
      </View>

      {/* Subtitle Settings */}
      <View style={styles.section}>
        <View style={[styles.toggleRow, { flexDirection }]}>
          <Text style={[styles.toggleLabel, { textAlign }]}>
            {t('epg.enableSubtitles')}
          </Text>
          <GlassToggle
            value={enableSubtitles}
            onValueChange={setEnableSubtitles}
            size="small"
            isRTL={isRTL}
          />
        </View>

        {enableSubtitles && (
          <View style={styles.languageSection}>
            <Text style={[styles.languageLabel, { textAlign }]}>
              {t('epg.subtitleLanguage')}
            </Text>
            <View style={styles.languageGrid}>
              {AVAILABLE_LANGUAGES.map(lang => (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    selectedLanguage === lang.code && styles.languageButtonSelected
                  ]}
                  onPress={() => setSelectedLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageText,
                    selectedLanguage === lang.code && styles.languageTextSelected
                  ]}>
                    {lang.label}
                  </Text>
                  {selectedLanguage === lang.code && (
                    <Check size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Storage Info */}
      <View style={styles.storageCard}>
        <View style={[styles.storageHeader, { flexDirection }]}>
          <HardDrive size={16} color={colors.textMuted} />
          <Text style={styles.storageLabel}>{t('epg.storageEstimate')}</Text>
        </View>
        <Text style={styles.storageValue}>
          ~{estimatedSizeMB < 1024 ? `${estimatedSizeMB} MB` : `${estimatedSizeGB} GB`}
        </Text>
        {quotaInfo && (
          <Text style={styles.storageAvailable}>
            {t('epg.availableSpace')}: {quotaInfo.storage_available_formatted}
          </Text>
        )}
      </View>

      {/* Warning for low storage */}
      {quotaInfo && quotaInfo.storage_usage_percentage > 80 && (
        <View style={[styles.warningCard, { flexDirection }]}>
          <AlertCircle size={20} color={colors.warning} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>{t('epg.lowStorage')}</Text>
            <Text style={styles.warningText}>{t('epg.lowStorageMessage')}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actions, { flexDirection }]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            pressed && styles.buttonPressed
          ]}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.confirmButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled
          ]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.confirmButtonText}>{t('epg.scheduleRecording')}</Text>
          )}
        </Pressable>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  programMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  metaValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  timeDivider: {
    fontSize: 14,
    color: colors.textMuted,
    opacity: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  languageSection: {
    marginTop: spacing.sm,
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: '45%',
    flex: 1,
  },
  languageButtonSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: colors.primary,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    flex: 1,
  },
  languageTextSelected: {
    color: colors.text,
  },
  storageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  storageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  storageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  storageAvailable: {
    fontSize: 12,
    color: colors.textMuted,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(245, 158, 11, 0.8)',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
})

export default EPGRecordModal
