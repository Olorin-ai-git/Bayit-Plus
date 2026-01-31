/**
 * HebrewSubtitleActionsModal Component
 * Admin modal for managing Hebrew subtitle AI features (nikud/shoresh generation)
 */

import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { X, Check, AlertCircle, Sparkles } from 'lucide-react'
import { GlassButton, GlassCard } from '@bayit/shared/ui'
import { subtitlesService } from '@/services/api'
import { SubtitleTrack } from '@/types/subtitle'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import logger from '@/utils/logger'

interface JobStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message?: string
}

interface HebrewSubtitleActionsModalProps {
  visible: boolean
  contentId: string
  contentTitle: string
  onClose: () => void
  onGenerated?: () => void
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error'

export default function HebrewSubtitleActionsModal({
  visible,
  contentId,
  contentTitle,
  onClose,
  onGenerated,
}: HebrewSubtitleActionsModalProps) {
  const { t } = useTranslation()
  const nikudPollingRef = useRef<NodeJS.Timeout | null>(null)
  const shoreshPollingRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoadingTracks, setIsLoadingTracks] = useState(true)
  const [hebrewTrack, setHebrewTrack] = useState<SubtitleTrack | null>(null)
  const [nikudStatus, setNikudStatus] = useState<GenerationStatus>('idle')
  const [shoreshStatus, setShoreshStatus] = useState<GenerationStatus>('idle')
  const [nikudProgress, setNikudProgress] = useState(0)
  const [shoreshProgress, setShoreshProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [nikudError, setNikudError] = useState<string | null>(null)
  const [shoreshError, setShoreshError] = useState<string | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (nikudPollingRef.current) clearInterval(nikudPollingRef.current)
      if (shoreshPollingRef.current) clearInterval(shoreshPollingRef.current)
    }
  }, [])

  const loadSubtitleTracks = useCallback(async () => {
    setIsLoadingTracks(true)
    setError(null)
    try {
      const response = await subtitlesService.getTracks(contentId)
      const heTrack = response.tracks.find(track => track.language === 'he')
      setHebrewTrack(heTrack || null)
      logger.info('Subtitle tracks loaded for admin', 'HebrewSubtitleActionsModal', {
        contentId,
        hasHebrew: !!heTrack,
        hasNikud: heTrack?.has_nikud_version,
        hasShoresh: heTrack?.has_shoresh_version,
      })
    } catch (err) {
      logger.error('Failed to load subtitle tracks', 'HebrewSubtitleActionsModal', { contentId, err })
      setError(t('admin.subtitles.loadError', 'Failed to load subtitle information'))
    } finally {
      setIsLoadingTracks(false)
    }
  }, [contentId, t])

  useEffect(() => {
    if (visible && contentId) {
      loadSubtitleTracks()
    }
  }, [visible, contentId, loadSubtitleTracks])

  const pollNikudStatus = useCallback(async (jobId: string) => {
    try {
      const status = await subtitlesService.getJobStatus(jobId) as JobStatus
      setNikudProgress(status.progress)
      logger.info('Nikud job status', 'HebrewSubtitleActionsModal', { jobId, status: status.status, progress: status.progress })

      if (status.status === 'completed') {
        if (nikudPollingRef.current) clearInterval(nikudPollingRef.current)
        setNikudStatus('success')
        setNikudProgress(0)
        onGenerated?.()
        await loadSubtitleTracks()
      } else if (status.status === 'failed') {
        if (nikudPollingRef.current) clearInterval(nikudPollingRef.current)
        setNikudStatus('error')
        setNikudProgress(0)
        setNikudError(status.error_message || 'Nikud generation failed')
      }
    } catch (err) {
      logger.error('Failed to poll nikud status', 'HebrewSubtitleActionsModal', { jobId, error: err })
    }
  }, [loadSubtitleTracks, onGenerated])

  const pollShoreshStatus = useCallback(async (jobId: string) => {
    try {
      const status = await subtitlesService.getJobStatus(jobId) as JobStatus
      setShoreshProgress(status.progress)
      logger.info('Shoresh job status', 'HebrewSubtitleActionsModal', { jobId, status: status.status, progress: status.progress })

      if (status.status === 'completed') {
        if (shoreshPollingRef.current) clearInterval(shoreshPollingRef.current)
        setShoreshStatus('success')
        setShoreshProgress(0)
        onGenerated?.()
        await loadSubtitleTracks()
      } else if (status.status === 'failed') {
        if (shoreshPollingRef.current) clearInterval(shoreshPollingRef.current)
        setShoreshStatus('error')
        setShoreshProgress(0)
        setShoreshError(status.error_message || 'Shoresh generation failed')
      }
    } catch (err) {
      logger.error('Failed to poll shoresh status', 'HebrewSubtitleActionsModal', { jobId, error: err })
    }
  }, [loadSubtitleTracks, onGenerated])

  const handleGenerateNikud = async () => {
    logger.info('Generate nikud clicked', 'HebrewSubtitleActionsModal', { contentId, nikudStatus })

    if (nikudStatus === 'generating') return

    setNikudStatus('generating')
    setNikudError(null)
    setNikudProgress(0)

    try {
      const result = await subtitlesService.generateNikud(contentId, 'he') as JobStatus & { status?: string }

      // Check if already completed
      if (result.status === 'completed') {
        setNikudStatus('success')
        onGenerated?.()
        await loadSubtitleTracks()
        return
      }

      // Start polling
      if (result.job_id) {
        nikudPollingRef.current = setInterval(() => pollNikudStatus(result.job_id), 2000)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Nikud generation failed'
      logger.error('Failed to start nikud generation', 'HebrewSubtitleActionsModal', { contentId, error: errorMessage })
      setNikudStatus('error')
      setNikudError(errorMessage)
    }
  }

  const handleGenerateShoresh = async () => {
    logger.info('Generate shoresh clicked', 'HebrewSubtitleActionsModal', { contentId, shoreshStatus })

    if (shoreshStatus === 'generating') return

    setShoreshStatus('generating')
    setShoreshError(null)
    setShoreshProgress(0)

    try {
      const result = await subtitlesService.generateShoresh(contentId, 'he') as JobStatus & { status?: string }

      // Check if already completed
      if (result.status === 'completed') {
        setShoreshStatus('success')
        onGenerated?.()
        await loadSubtitleTracks()
        return
      }

      // Start polling
      if (result.job_id) {
        shoreshPollingRef.current = setInterval(() => pollShoreshStatus(result.job_id), 2000)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Shoresh generation failed'
      logger.error('Failed to start shoresh generation', 'HebrewSubtitleActionsModal', { contentId, error: errorMessage })
      setShoreshStatus('error')
      setShoreshError(errorMessage)
    }
  }

  if (!visible) return null

  const handleBackdropClick = () => onClose()
  const stopPropagation = (e: MouseEvent) => e.stopPropagation()

  const modalContent = (
    <View style={styles.overlay} onClick={handleBackdropClick}>
      <View style={styles.modalContainer} onClick={stopPropagation}>
        <GlassCard style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Sparkles size={24} color={colors.primary.DEFAULT} />
              <Text style={styles.title}>{t('admin.subtitles.hebrewAI', 'Hebrew AI Features')}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Content Title */}
          <Text style={styles.contentTitle} numberOfLines={2}>
            {contentTitle}
          </Text>

          {/* Body */}
          <View style={styles.body}>
            {isLoadingTracks ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={24} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <GlassButton
                  title={t('common.retry', 'Retry')}
                  onPress={loadSubtitleTracks}
                  variant="secondary"
                  size="small"
                />
              </View>
            ) : !hebrewTrack ? (
              <View style={styles.noHebrewContainer}>
                <AlertCircle size={24} color={colors.warning} />
                <Text style={styles.noHebrewText}>
                  {t('admin.subtitles.noHebrew', 'No Hebrew subtitles found for this content.')}
                </Text>
                <Text style={styles.noHebrewHint}>
                  {t('admin.subtitles.uploadHint', 'Upload Hebrew subtitles first to enable AI features.')}
                </Text>
              </View>
            ) : (
              <>
                {/* Hebrew Track Status */}
                <View style={styles.statusSection}>
                  <Text style={styles.sectionTitle}>
                    {t('admin.subtitles.hebrewStatus', 'Hebrew Subtitle Status')}
                  </Text>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>🇮🇱 {t('subtitles.languages.hebrew', 'Hebrew')}</Text>
                    <View style={styles.statusBadge}>
                      <Check size={14} color={colors.success} />
                      <Text style={styles.statusBadgeText}>{t('common.available', 'Available')}</Text>
                    </View>
                  </View>
                </View>

                {/* Nikud Generation */}
                <View style={styles.featureSection}>
                  <View style={styles.featureHeader}>
                    <View>
                      <Text style={styles.featureTitle}>
                        {t('subtitles.hebrewMode.nikud.title', 'Nikud (Vocalization)')}
                      </Text>
                      <Text style={styles.featureDescription}>
                        {t('subtitles.hebrewMode.nikud.description', 'Add vowel marks for easier reading')}
                      </Text>
                    </View>
                    {hebrewTrack.has_nikud_version ? (
                      <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
                        <Check size={14} color={colors.success} />
                        <Text style={[styles.statusBadgeText, { color: colors.success }]}>
                          {t('common.generated', 'Generated')}
                        </Text>
                      </View>
                    ) : (
                      <GlassButton
                        title={nikudStatus === 'generating'
                          ? nikudProgress > 0 ? `${nikudProgress}%` : t('common.generating', 'Generating...')
                          : nikudStatus === 'success'
                            ? t('common.done', 'Done')
                            : nikudStatus === 'error'
                              ? t('common.retry', 'Retry')
                              : t('common.generate', 'Generate')
                        }
                        onPress={handleGenerateNikud}
                        variant={nikudStatus === 'success' ? 'success' : 'primary'}
                        size="small"
                        disabled={nikudStatus === 'generating'}
                        loading={nikudStatus === 'generating'}
                      />
                    )}
                  </View>
                  <Text style={styles.exampleText} dir="rtl">
                    {t('admin.subtitles.nikudExample', 'Example: הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר')}
                  </Text>
                  {nikudError && (
                    <View style={styles.featureError}>
                      <AlertCircle size={14} color={colors.error} />
                      <Text style={styles.featureErrorText}>{nikudError}</Text>
                    </View>
                  )}
                </View>

                {/* Shoresh Generation */}
                <View style={styles.featureSection}>
                  <View style={styles.featureHeader}>
                    <View>
                      <Text style={styles.featureTitle}>
                        {t('subtitles.hebrewMode.shoresh.title', 'Shoresh (Root Words)')}
                      </Text>
                      <Text style={styles.featureDescription}>
                        {t('subtitles.hebrewMode.shoresh.description', 'Highlight word roots for learning')}
                      </Text>
                    </View>
                    {hebrewTrack.has_shoresh_version ? (
                      <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
                        <Check size={14} color={colors.success} />
                        <Text style={[styles.statusBadgeText, { color: colors.success }]}>
                          {t('common.generated', 'Generated')}
                        </Text>
                      </View>
                    ) : (
                      <GlassButton
                        title={shoreshStatus === 'generating'
                          ? shoreshProgress > 0 ? `${shoreshProgress}%` : t('common.generating', 'Generating...')
                          : shoreshStatus === 'success'
                            ? t('common.done', 'Done')
                            : shoreshStatus === 'error'
                              ? t('common.retry', 'Retry')
                              : t('common.generate', 'Generate')
                        }
                        onPress={handleGenerateShoresh}
                        variant={shoreshStatus === 'success' ? 'success' : 'primary'}
                        size="small"
                        disabled={shoreshStatus === 'generating'}
                        loading={shoreshStatus === 'generating'}
                      />
                    )}
                  </View>
                  <Text style={styles.exampleText} dir="rtl">
                    {t('admin.subtitles.shoreshExample', 'Example: הילדים [ילד] הולכים [הלך] לבית [בית]')}
                  </Text>
                  {shoreshError && (
                    <View style={styles.featureError}>
                      <AlertCircle size={14} color={colors.error} />
                      <Text style={styles.featureErrorText}>{shoreshError}</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <GlassButton
              title={t('common.close', 'Close')}
              onPress={onClose}
              variant="ghost"
            />
          </View>
        </GlassCard>
      </View>
    </View>
  )

  return createPortal(modalContent, document.body)
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    padding: spacing.lg,
  },
  modal: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  contentTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  body: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  errorContainer: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  noHebrewContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  noHebrewText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  noHebrewHint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  statusSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  featureSection: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  featureDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exampleText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: 'monospace',
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.sm,
  },
  featureError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.sm,
  },
  featureErrorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
})
