/**
 * EnglishModePickerModal Component (Web)
 * Modal for selecting English subtitle display mode (regular, heblish)
 * Uses TailwindCSS for styling and web-native modal implementation
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Icon } from '@olorin/shared-icons/web'
import { Sparkles } from 'lucide-react'
import { GlassButton } from '@bayit/shared/ui'
import { EnglishMode } from '@/types/subtitle'
import { storageHelpers } from '@/utils/storage'
import { subtitlesService as _subtitlesService } from '@/services/api'
const subtitlesService = _subtitlesService as any
import { useAuthStore } from '@/stores/authStore'
import logger from '@/utils/logger'

interface JobStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message?: string
}

interface EnglishModePickerModalProps {
  visible: boolean
  currentMode: EnglishMode
  isLoading?: boolean  // Whether subtitle track info is being loaded
  hasEnglish?: boolean // Whether English subtitles exist at all
  hasHeblish: boolean
  hasGrammarFlip?: boolean  // Hebrew words with English syntax available
  hasSlangSynthesis?: boolean  // Israeli/American slang blend available
  contentId?: string
  portalContainer?: HTMLElement | null
  onClose: () => void
  onModeSelect: (mode: EnglishMode) => void
  onGenerationComplete?: () => void
  adminTabSwitcher?: React.ReactNode  // Optional tab switcher for admin context
}

interface ModeOption {
  mode: EnglishMode
  icon: string
  titleKey: string
  descriptionKey: string
  example: string
  isAI: boolean
}

const ENGLISH_MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'regular',
    icon: 'settings',
    titleKey: 'subtitles.englishMode.regular.title',
    descriptionKey: 'subtitles.englishMode.regular.description',
    example: 'Hello friends! Today we watch a great show.',
    isAI: false,
  },
  {
    mode: 'heblish',
    icon: 'translate',
    titleKey: 'subtitles.englishMode.heblish.title',
    descriptionKey: 'subtitles.englishMode.heblish.description',
    example: 'Shalom chaverim! Today we watch a sababa show.',
    isAI: true,
  },
  {
    mode: 'grammarFlip',
    icon: 'book',
    titleKey: 'subtitles.englishMode.grammarFlip.title',
    descriptionKey: 'subtitles.englishMode.grammarFlip.description',
    example: 'The yeled (boy) ate the tapuach (apple).',
    isAI: true,
  },
  {
    mode: 'slangSynthesis',
    icon: 'sparkles',
    titleKey: 'subtitles.englishMode.slangSynthesis.title',
    descriptionKey: 'subtitles.englishMode.slangSynthesis.description',
    example: 'That show was totally al hapane (terrible) but the ending was esh (fire)!',
    isAI: true,
  },
]

const ENGLISH_MODE_FIRST_TIME_KEY = 'english_mode_first_time_seen'

export default function EnglishModePickerModal({
  visible,
  currentMode,
  isLoading = false,
  hasEnglish = true,
  hasHeblish,
  hasGrammarFlip = false,
  hasSlangSynthesis = false,
  contentId,
  portalContainer,
  onClose,
  onModeSelect,
  onGenerationComplete,
  adminTabSwitcher,
}: EnglishModePickerModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false)
  const [generatingMode, setGeneratingMode] = useState<EnglishMode | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<number>(0)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const isAdmin = useAuthStore((s) => s.isAdmin())

  // Helper to safely clear polling interval
  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [clearPolling])

  useEffect(() => {
    if (visible) {
      const checkFirstTime = async () => {
        const hasSeenBefore = await storageHelpers.getBoolean(ENGLISH_MODE_FIRST_TIME_KEY, false)
        if (!hasSeenBefore) {
          setShowFirstTimeHint(true)
          await storageHelpers.setBoolean(ENGLISH_MODE_FIRST_TIME_KEY, true)
        }
      }
      checkFirstTime()
    }
  }, [visible])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose()
      }
    }

    if (visible) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [visible, onClose])

  useEffect(() => {
    if (visible && modalRef.current) {
      previousFocusRef.current = document.activeElement as HTMLElement

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }

      document.addEventListener('keydown', handleTab)
      firstElement?.focus()

      return () => {
        document.removeEventListener('keydown', handleTab)
        previousFocusRef.current?.focus()
      }
    }
  }, [visible])

  const handleModePress = (mode: EnglishMode) => {
    onModeSelect(mode)
    onClose()
  }

  const isModeAvailable = (mode: EnglishMode): boolean => {
    if (mode === 'regular') return true
    if (mode === 'heblish') return hasHeblish
    if (mode === 'grammarFlip') return hasGrammarFlip
    if (mode === 'slangSynthesis') return hasSlangSynthesis
    return false
  }

  const pollJobStatus = useCallback(async (jobId: string, mode: EnglishMode) => {
    try {
      const status = await subtitlesService.getJobStatus(jobId) as JobStatus
      logger.debug(`Job status: ${status.status}`, 'EnglishModePickerModal', { jobId, progress: status.progress })

      // CRITICAL: Stop polling immediately for terminal states
      if (status.status === 'completed' || status.status === 'failed') {
        clearPolling()
        setGeneratingMode(null)
        setJobProgress(0)
        setCurrentJobId(null)

        if (status.status === 'completed') {
          logger.info(`${mode} generation completed`, 'EnglishModePickerModal', { contentId })
          onGenerationComplete?.()
        } else {
          setGenerationError(status.error_message || `${mode} generation failed`)
          logger.error(`${mode} generation failed`, 'EnglishModePickerModal', { contentId, error: status.error_message })
        }
        return // Exit early - don't update progress for terminal states
      }

      setJobProgress(status.progress)
    } catch (error) {
      logger.error('Failed to poll job status', 'EnglishModePickerModal', { jobId, error })
      // On error, stop polling to prevent infinite error loops
      clearPolling()
      setGeneratingMode(null)
      setCurrentJobId(null)
    }
  }, [contentId, onGenerationComplete, clearPolling])

  // Cancel current job
  const handleCancelJob = useCallback(async () => {
    if (!currentJobId || isCancelling) return

    setIsCancelling(true)
    // Stop polling FIRST before any async operations
    clearPolling()

    try {
      await subtitlesService.cancelJob(currentJobId)
      setGeneratingMode(null)
      setJobProgress(0)
      setCurrentJobId(null)
      logger.info('Job cancelled', 'EnglishModePickerModal', { jobId: currentJobId })
    } catch (error) {
      logger.error('Failed to cancel job', 'EnglishModePickerModal', { jobId: currentJobId, error })
      setGenerationError('Failed to cancel job')
    } finally {
      setIsCancelling(false)
    }
  }, [currentJobId, isCancelling, clearPolling])

  // Restart a stuck job (cancel and regenerate)
  const handleRestartJob = useCallback(async (mode: EnglishMode) => {
    if (!contentId || isCancelling) return

    // Stop any existing polling FIRST
    clearPolling()

    // First cancel the current job if exists
    if (currentJobId) {
      setIsCancelling(true)
      try {
        await subtitlesService.cancelJob(currentJobId)
      } catch (error) {
        logger.error('Failed to cancel job for restart', 'EnglishModePickerModal', { error })
      }
      setIsCancelling(false)
    }

    // Reset state
    setGeneratingMode(null)
    setJobProgress(0)
    setCurrentJobId(null)
    setGenerationError(null)

    // Small delay before restarting
    await new Promise(resolve => setTimeout(resolve, 500))

    // Regenerate with force flag
    try {
      setGeneratingMode(mode)
      let result
      if (mode === 'heblish') {
        result = await subtitlesService.generateHeblish(contentId, 'en', true)
      } else if (mode === 'grammarFlip') {
        result = await subtitlesService.generateGrammarFlip(contentId, 'en', true)
      } else if (mode === 'slangSynthesis') {
        result = await subtitlesService.generateSlangSynthesis(contentId, 'en', true)
      } else {
        throw new Error(`Unknown mode: ${mode}`)
      }

      if (result.status === 'completed') {
        setGeneratingMode(null)
        onGenerationComplete?.()
        return
      }

      const jobId = result.job_id
      if (jobId) {
        setCurrentJobId(jobId)
        // Clear any stale interval before creating new one
        clearPolling()
        pollingRef.current = setInterval(() => {
          pollJobStatus(jobId, mode)
        }, 2000)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restart failed'
      logger.error(`Failed to restart ${mode} generation`, 'EnglishModePickerModal', { contentId, error: errorMessage })
      setGenerationError(`Failed to restart: ${errorMessage}`)
      setGeneratingMode(null)
    }
  }, [contentId, currentJobId, isCancelling, onGenerationComplete, pollJobStatus, clearPolling])

  const handleGenerate = async (e: React.MouseEvent, mode: EnglishMode) => {
    e.stopPropagation()
    e.preventDefault()

    logger.info(`Generate ${mode} clicked`, 'EnglishModePickerModal', { contentId, isAdmin, generatingMode, mode })

    if (!contentId) {
      logger.error('No contentId provided', 'EnglishModePickerModal')
      setGenerationError('Content ID is missing')
      return
    }

    if (generatingMode) {
      logger.info('Generation already in progress', 'EnglishModePickerModal')
      return
    }

    setGeneratingMode(mode)
    setGenerationError(null)
    setJobProgress(0)

    try {
      logger.info(`Starting ${mode} generation`, 'EnglishModePickerModal', { contentId, mode })

      // Call appropriate API based on mode
      let result
      if (mode === 'heblish') {
        result = await subtitlesService.generateHeblish(contentId, 'en', false)
      } else if (mode === 'grammarFlip') {
        result = await subtitlesService.generateGrammarFlip(contentId, 'en', false)
      } else if (mode === 'slangSynthesis') {
        result = await subtitlesService.generateSlangSynthesis(contentId, 'en', false)
      } else {
        throw new Error(`Unknown mode: ${mode}`)
      }

      logger.info(`${mode} job started`, 'EnglishModePickerModal', { contentId, result })

      if (result.status === 'completed') {
        setGeneratingMode(null)
        onGenerationComplete?.()
        return
      }

      const jobId = result.job_id
      if (jobId) {
        setCurrentJobId(jobId)
        // Clear any existing polling before starting new one
        clearPolling()
        pollingRef.current = setInterval(() => {
          pollJobStatus(jobId, mode)
        }, 2000)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      logger.error(`Failed to start ${mode} generation`, 'EnglishModePickerModal', { contentId, error: errorMessage })
      setGenerationError(`Failed to start ${mode} generation: ${errorMessage}`)
      setGeneratingMode(null)
      setCurrentJobId(null)
    }
  }

  const memoizedOptions = useMemo(
    () => ENGLISH_MODE_OPTIONS,
    []
  )

  const portalTarget = portalContainer || document.body

  if (!visible) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="english-mode-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 sm:p-6 w-[95%] max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Admin Tab Switcher (optional) */}
        {adminTabSwitcher && (
          <div className="mb-4">
            {adminTabSwitcher}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        )}

        {/* No English Subtitles Warning */}
        {!isLoading && !hasEnglish && (
          <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Icon name="warning" size="md" color="#eab308" className="flex-shrink-0" />
              <p className="text-sm text-yellow-200">
                {t('subtitles.noEnglishSubtitles', 'No English subtitles available for this content.')}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2
            id="english-mode-modal-title"
            className="text-xl font-bold text-white"
          >
            {t('subtitles.englishMode.title', 'English Display Mode')}
          </h2>
          <GlassButton
            onPress={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"
            aria-label="Close modal"
          >
            <Icon name="x" size="lg" color="currentColor" />
          </GlassButton>
        </div>

        {/* First-time hint */}
        {showFirstTimeHint && (
          <div className="mb-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Icon name="info" size="md" color="#818cf8" className="flex-shrink-0" />
              <p className="text-sm text-indigo-200">
                {t('subtitles.englishMode.firstTimeHint', 'Heblish mode injects Hebrew words into English subtitles for immersive language learning. Example: "Hello friends!" becomes "Shalom chaverim!"')}
              </p>
              <GlassButton
                onPress={() => setShowFirstTimeHint(false)}
                className="rounded-md p-1 bg-white/5 hover:bg-white/15 text-indigo-300 hover:text-indigo-100 transition-all border border-white/10 flex-shrink-0"
                aria-label="Dismiss hint"
              >
                <Icon name="x" size="md" color="currentColor" />
              </GlassButton>
            </div>
          </div>
        )}

        {/* Generation Error */}
        {generationError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Icon name="error" size="md" color="#ef4444" className="flex-shrink-0" />
              <p className="text-sm text-red-200">{generationError}</p>
              <GlassButton
                onPress={() => setGenerationError(null)}
                className="rounded-md p-1 bg-white/5 hover:bg-white/15 text-red-300 hover:text-red-100 transition-all border border-white/10 flex-shrink-0"
                aria-label="Dismiss error"
              >
                <Icon name="x" size="md" color="currentColor" />
              </GlassButton>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="space-y-2 sm:space-y-3">
          {memoizedOptions.map((option) => {
            const isAvailable = isModeAvailable(option.mode)
            const isSelected = option.mode === currentMode
            const isAIMode = option.mode === 'heblish' || option.mode === 'grammarFlip' || option.mode === 'slangSynthesis'
            const canShowGenerateButton = !isAvailable && isAIMode && isAdmin && contentId

            return (
              <div
                key={option.mode}
                onClick={() => isAvailable && handleModePress(option.mode)}
                onKeyDown={(e) => {
                  if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    handleModePress(option.mode)
                  }
                }}
                role="button"
                tabIndex={isAvailable ? 0 : -1}
                className={`
                  w-full rounded-lg p-3 sm:p-4 border-2 transition-all
                  ${
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500'
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                  }
                  ${!isAvailable && !canShowGenerateButton ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isAvailable ? 'cursor-pointer' : ''}
                `}
                aria-label={`${t(option.titleKey)} mode${!isAvailable ? ' (unavailable)' : ''}${isSelected ? ' (selected)' : ''}`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  {/* Top row on mobile: icon + title + status */}
                  <div className="flex items-center gap-3 sm:contents">
                    {/* Icon */}
                    <div className="w-10 sm:w-12 flex-shrink-0 flex items-center justify-center">
                      <Icon name={option.icon} size="xl" color="#FFFFFF" />
                    </div>

                    {/* Title */}
                    <div className="flex-1 sm:w-24 sm:flex-shrink-0 sm:flex-grow-0">
                      <h3
                        className={`text-sm sm:text-base font-semibold ${
                          isAvailable ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {t(option.titleKey, option.mode)}
                      </h3>
                    </div>

                    {/* Status indicator - inline on mobile */}
                    {isSelected && (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 sm:order-last ${
                          option.isAI ? 'bg-purple-500' : 'bg-indigo-500'
                        }`}
                        aria-hidden="true"
                      >
                        {option.isAI ? (
                          <Sparkles size={14} color="#FFFFFF" />
                        ) : (
                          <Icon name="check" size="sm" color="#FFFFFF" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs sm:text-sm whitespace-normal break-words ${
                        isAvailable ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {t(option.descriptionKey, 'Description')}
                    </p>
                  </div>

                  {/* Warning - only show when not available AND not currently generating */}
                  {!isAvailable && generatingMode !== option.mode && isAIMode && (
                    <div className="sm:w-32 sm:flex-shrink-0">
                      <p className="text-xs text-amber-500/90 italic">
                        {t(`subtitles.englishMode.${option.mode}.unavailableReason`, `${option.mode} processing not available for this content`)}
                      </p>
                    </div>
                  )}

                  {/* Example - hidden on mobile */}
                  <div className="hidden sm:block w-48 flex-shrink-0">
                    <p className="text-sm text-gray-500 font-mono text-left">
                      {option.example}
                    </p>
                  </div>

                  {!isAvailable && isAIMode && (
                    <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
                      {isAdmin && contentId ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {generatingMode === option.mode ? (
                            <>
                              {/* Progress display */}
                              <span className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/70 rounded-xl text-sm font-semibold text-white">
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {jobProgress > 0 ? `${jobProgress}%` : t('common.generating', 'Generating...')}
                              </span>
                              {/* Cancel button */}
                              <GlassButton
                                variant="ghost"
                                onPress={(e: any) => { e.stopPropagation(); handleCancelJob(); }}
                                disabled={isCancelling}
                                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-white bg-red-500/80 hover:bg-red-500 backdrop-blur-lg border border-red-400/30 disabled:opacity-50"
                                aria-label={t('common.cancel', 'Cancel')}
                              >
                                {isCancelling ? (
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                ) : (
                                  t('common.cancel', 'Cancel')
                                )}
                              </GlassButton>
                              {/* Restart button (shown when job seems stuck - progress > 50%) */}
                              {jobProgress > 50 && (
                                <GlassButton
                                  variant="ghost"
                                  onPress={(e: any) => { e.stopPropagation(); handleRestartJob(option.mode); }}
                                  disabled={isCancelling}
                                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-white bg-amber-500/80 hover:bg-amber-500 backdrop-blur-lg border border-amber-400/30 disabled:opacity-50"
                                  aria-label={t('common.restart', 'Restart')}
                                >
                                  {t('common.restart', 'Restart')}
                                </GlassButton>
                              )}
                            </>
                          ) : (
                            <GlassButton
                              variant="primary"
                              onPress={(e: any) => handleGenerate(e, option.mode)}
                              disabled={generatingMode !== null}
                              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-white bg-purple-500/80 hover:bg-purple-500 backdrop-blur-lg border border-purple-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              aria-label={`Generate ${option.mode}`}
                            >
                              {t('subtitles.englishMode.generate', 'Generate')}
                            </GlassButton>
                          )}
                        </div>
                      ) : (
                        <div
                          className="bg-red-500/20 rounded px-2 py-1"
                          aria-hidden="true"
                        >
                          <span className="text-xs text-red-400 font-semibold">
                            {t('subtitles.englishMode.unavailable', 'Unavailable')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, portalTarget)
}
