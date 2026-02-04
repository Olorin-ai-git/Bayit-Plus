/**
 * AISubtitlesPicker Component (Web)
 * Modal for selecting Hebrew AI subtitle display modes (regular, nikud, shoresh)
 * Uses TailwindCSS for styling and web-native modal implementation
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Icon } from '@olorin/shared-icons/web'
import { Sparkles } from 'lucide-react'
import { HebrewMode } from '@/types/subtitle'
import { storageHelpers, STORAGE_KEYS } from '@/utils/storage'
import { subtitlesService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import logger from '@/utils/logger'

interface JobStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message?: string
}

interface ActiveJobsResponse {
  content_id: string
  nikud_job: JobStatus | null
  shoresh_job: JobStatus | null
  heblish_job: JobStatus | null
  engrew_job: JobStatus | null
}

interface AISubtitlesPickerProps {
  visible: boolean
  currentMode: HebrewMode
  isLoading?: boolean  // Whether subtitle track info is being loaded
  hasHebrew?: boolean  // Whether Hebrew subtitles exist at all
  hasNikud: boolean
  hasShoresh: boolean
  hasEngrew: boolean
  contentId?: string
  portalContainer?: HTMLElement | null  // Container for portal (for fullscreen support)
  onClose: () => void
  onModeSelect: (mode: HebrewMode) => void
  onGenerationComplete?: () => void
  adminTabSwitcher?: React.ReactNode  // Optional tab switcher for admin context
}

interface ModeOption {
  mode: HebrewMode
  icon: string
  titleKey: string
  descriptionKey: string
  example: string
  isAI: boolean  // Whether this mode uses AI
}

/** Type guard for AI-generatable Hebrew modes */
type GeneratableMode = 'nikud' | 'shoresh' | 'engrew'

function isGeneratableMode(mode: HebrewMode): mode is GeneratableMode {
  return mode === 'nikud' || mode === 'shoresh' || mode === 'engrew'
}

const HEBREW_MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'regular',
    icon: 'settings',
    titleKey: 'subtitles.hebrewMode.regular.title',
    descriptionKey: 'subtitles.hebrewMode.regular.description',
    example: 'הילדים הולכים לבית הספר',
    isAI: false,
  },
  {
    mode: 'nikud',
    icon: 'א׳',
    titleKey: 'subtitles.hebrewMode.nikud.title',
    descriptionKey: 'subtitles.hebrewMode.nikud.description',
    example: 'הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר',
    isAI: true,
  },
  {
    mode: 'shoresh',
    icon: 'stories',
    titleKey: 'subtitles.hebrewMode.shoresh.title',
    descriptionKey: 'subtitles.hebrewMode.shoresh.description',
    example: 'הי⟨ל⟩דים הו⟨ל⟩כים לבית הספר',  // Angle brackets indicate bold root letters
    isAI: true,
  },
  {
    mode: 'engrew',
    icon: 'translate',
    titleKey: 'subtitles.hebrewMode.engrew.title',
    descriptionKey: 'subtitles.hebrewMode.engrew.description',
    example: 'אני הולך לסרף (Surf) על הווייבס (Waves)',
    isAI: true,
  },
]

const HEBREW_MODE_FIRST_TIME_KEY = 'hebrew_mode_first_time_seen'

export default function AISubtitlesPicker({
  visible,
  currentMode,
  isLoading = false,
  hasHebrew = true,  // Default true for player context where modal only shows if Hebrew exists
  hasNikud,
  hasShoresh,
  hasEngrew,
  contentId,
  portalContainer,
  onClose,
  onModeSelect,
  onGenerationComplete,
  adminTabSwitcher,
}: AISubtitlesPickerProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false)
  const [generatingMode, setGeneratingMode] = useState<'nikud' | 'shoresh' | 'engrew' | null>(null)
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

  // Poll job status callback - defined early since it's used by useEffects
  const pollJobStatus = useCallback(async (jobId: string, mode: 'nikud' | 'shoresh' | 'engrew') => {
    try {
      const status = await subtitlesService.getJobStatus(jobId) as JobStatus
      logger.debug(`Job status: ${status.status}`, 'AISubtitlesPicker', { jobId, progress: status.progress })

      // CRITICAL: Stop polling immediately for terminal states
      if (status.status === 'completed' || status.status === 'failed') {
        clearPolling()
        setGeneratingMode(null)
        setJobProgress(0)
        setCurrentJobId(null)

        if (status.status === 'completed') {
          logger.info(`${mode} generation completed`, 'AISubtitlesPicker', { contentId })
          onGenerationComplete?.()
        } else {
          setGenerationError(status.error_message || `${mode} generation failed`)
          logger.error(`${mode} generation failed`, 'AISubtitlesPicker', { contentId, error: status.error_message })
        }
        return // Exit early - don't update progress for terminal states
      }

      setJobProgress(status.progress)
    } catch (error) {
      logger.error('Failed to poll job status', 'AISubtitlesPicker', { jobId, error })
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
      logger.info('Job cancelled', 'AISubtitlesPicker', { jobId: currentJobId })
    } catch (error) {
      logger.error('Failed to cancel job', 'AISubtitlesPicker', { jobId: currentJobId, error })
      setGenerationError('Failed to cancel job')
    } finally {
      setIsCancelling(false)
    }
  }, [currentJobId, isCancelling, clearPolling])

  // Restart a stuck job (cancel and regenerate)
  const handleRestartJob = useCallback(async (mode: 'nikud' | 'shoresh' | 'engrew') => {
    if (!contentId || isCancelling) return

    // Stop any existing polling FIRST
    clearPolling()

    // First cancel the current job if exists
    if (currentJobId) {
      setIsCancelling(true)
      try {
        await subtitlesService.cancelJob(currentJobId)
      } catch (error) {
        logger.error('Failed to cancel job for restart', 'AISubtitlesPicker', { error })
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
      if (mode === 'nikud') {
        result = await subtitlesService.generateNikud(contentId, 'he', true)
      } else if (mode === 'shoresh') {
        result = await subtitlesService.generateShoresh(contentId, 'he', true)
      } else {
        result = await subtitlesService.generateEngrew(contentId, 'he', true)
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
      logger.error(`Failed to restart ${mode} generation`, 'AISubtitlesPicker', { contentId, error: errorMessage })
      setGenerationError(`Failed to restart: ${errorMessage}`)
      setGeneratingMode(null)
    }
  }, [contentId, currentJobId, isCancelling, onGenerationComplete, pollJobStatus, clearPolling])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [clearPolling])

  // Check if this is the user's first time seeing the Hebrew mode picker
  useEffect(() => {
    if (visible) {
      const checkFirstTime = async () => {
        const hasSeenBefore = await storageHelpers.getBoolean(HEBREW_MODE_FIRST_TIME_KEY, false)
        if (!hasSeenBefore) {
          setShowFirstTimeHint(true)
          await storageHelpers.setBoolean(HEBREW_MODE_FIRST_TIME_KEY, true)
        }
      }
      checkFirstTime()
    }
  }, [visible])

  // Check for active generation jobs when modal opens
  useEffect(() => {
    if (!visible || !contentId || isLoading) return

    const checkActiveJobs = async () => {
      try {
        // Always clear existing polling before checking for new jobs
        clearPolling()

        const activeJobs = await subtitlesService.getActiveJobs(contentId) as ActiveJobsResponse
        logger.debug('Checked active jobs', 'AISubtitlesPicker', { contentId, activeJobs })

        // Check for nikud job
        if (activeJobs.nikud_job) {
          const job = activeJobs.nikud_job
          if (job.status === 'failed') {
            // Show error from failed job - but DON'T start polling
            setGenerationError(job.error_message || 'Nikud generation failed')
            setGeneratingMode(null)
            setCurrentJobId(null)
          } else if (job.status === 'completed') {
            // Job completed - don't poll
            setGeneratingMode(null)
            setCurrentJobId(null)
          } else if (['pending', 'processing'].includes(job.status)) {
            // Resume tracking in-progress job
            setGeneratingMode('nikud')
            setJobProgress(job.progress || 0)
            setCurrentJobId(job.job_id)
            // Clear again to be safe before setting new interval
            clearPolling()
            pollingRef.current = setInterval(() => {
              pollJobStatus(job.job_id, 'nikud')
            }, 2000)
            return
          }
        }

        // Check for shoresh job (only if no nikud job is being tracked)
        if (activeJobs.shoresh_job) {
          const job = activeJobs.shoresh_job
          if (job.status === 'failed') {
            // Show error from failed job - but DON'T start polling
            setGenerationError(job.error_message || 'Shoresh generation failed')
            setGeneratingMode(null)
            setCurrentJobId(null)
          } else if (job.status === 'completed') {
            // Job completed - don't poll
            setGeneratingMode(null)
            setCurrentJobId(null)
          } else if (['pending', 'processing'].includes(job.status)) {
            // Resume tracking in-progress job
            setGeneratingMode('shoresh')
            setJobProgress(job.progress || 0)
            setCurrentJobId(job.job_id)
            // Clear again to be safe before setting new interval
            clearPolling()
            pollingRef.current = setInterval(() => {
              pollJobStatus(job.job_id, 'shoresh')
            }, 2000)
            return
          }
        }

        // Check for engrew job (only if no other job is being tracked)
        if (activeJobs.engrew_job) {
          const job = activeJobs.engrew_job
          if (job.status === 'failed') {
            // Show error from failed job - but DON'T start polling
            setGenerationError(job.error_message || 'Engrew generation failed')
            setGeneratingMode(null)
            setCurrentJobId(null)
          } else if (job.status === 'completed') {
            // Job completed - don't poll
            setGeneratingMode(null)
            setCurrentJobId(null)
          } else if (['pending', 'processing'].includes(job.status)) {
            // Resume tracking in-progress job
            setGeneratingMode('engrew')
            setJobProgress(job.progress || 0)
            setCurrentJobId(job.job_id)
            // Clear again to be safe before setting new interval
            clearPolling()
            pollingRef.current = setInterval(() => {
              pollJobStatus(job.job_id, 'engrew')
            }, 2000)
          }
        }
      } catch (error) {
        logger.error('Failed to check active jobs', 'AISubtitlesPicker', { contentId, error })
      }
    }

    checkActiveJobs()

    // Cleanup polling when modal closes or dependencies change
    return () => {
      clearPolling()
    }
  }, [visible, contentId, isLoading, pollJobStatus, clearPolling])

  // Close on Escape key
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

  // Focus trap with focus restoration
  useEffect(() => {
    if (visible && modalRef.current) {
      // Store previous focus
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
        // Restore previous focus when modal closes
        previousFocusRef.current?.focus()
      }
    }
  }, [visible])

  const handleModePress = (mode: HebrewMode) => {
    onModeSelect(mode)
    onClose()
  }

  const isModeAvailable = (mode: HebrewMode): boolean => {
    if (mode === 'regular') return true
    if (mode === 'nikud') return hasNikud
    if (mode === 'shoresh') return hasShoresh
    if (mode === 'engrew') return hasEngrew
    return false
  }

  const handleGenerateMode = async (mode: 'nikud' | 'shoresh' | 'engrew', e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    logger.info(`Generate ${mode} clicked`, 'AISubtitlesPicker', { contentId, isAdmin, generatingMode })

    if (!contentId) {
      logger.error('No contentId provided', 'AISubtitlesPicker')
      setGenerationError('Content ID is missing')
      return
    }

    if (generatingMode) {
      logger.info('Generation already in progress', 'AISubtitlesPicker')
      return
    }

    setGeneratingMode(mode)
    setGenerationError(null)
    setJobProgress(0)

    try {
      logger.info(`Starting ${mode} generation`, 'AISubtitlesPicker', { contentId })

      let result
      if (mode === 'nikud') {
        result = await subtitlesService.generateNikud(contentId, 'he', false)
      } else if (mode === 'shoresh') {
        result = await subtitlesService.generateShoresh(contentId, 'he', false)
      } else {
        result = await subtitlesService.generateEngrew(contentId, 'he', false)
      }

      logger.info(`${mode} job started`, 'AISubtitlesPicker', { contentId, result })

      // Check if already completed (e.g., was already generated)
      if (result.status === 'completed') {
        setGeneratingMode(null)
        onGenerationComplete?.()
        return
      }

      // Start polling for job status
      const jobId = result.job_id
      if (jobId) {
        setCurrentJobId(jobId)
        // Clear any existing polling before starting new one
        clearPolling()
        pollingRef.current = setInterval(() => {
          pollJobStatus(jobId, mode)
        }, 2000) // Poll every 2 seconds
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      logger.error(`Failed to start ${mode} generation`, 'AISubtitlesPicker', { contentId, error: errorMessage })
      setGenerationError(`Failed to start ${mode} generation: ${errorMessage}`)
      setGeneratingMode(null)
      setCurrentJobId(null)
    }
  }

  // Memoize options to avoid re-rendering on every state change
  const memoizedOptions = useMemo(
    () => HEBREW_MODE_OPTIONS,
    [] // Static options, never change
  )

  // Determine portal target - use provided container (for fullscreen) or document.body
  const portalTarget = portalContainer || document.body

  if (!visible) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hebrew-mode-modal-title"
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

        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2
            id="hebrew-mode-modal-title"
            className="text-xl font-bold text-white"
          >
            {t('subtitles.hebrewMode.title', 'Hebrew Display Mode')}
          </h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <Icon name="x" size="lg" color="currentColor" />
          </button>
        </div>

        {/* First-time hint */}
        {showFirstTimeHint && (
          <div className="mb-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Icon name="info" size="md" color="#818cf8" className="flex-shrink-0" />
              <p className="text-sm text-indigo-200">
                {t('subtitles.hebrewMode.firstTimeHint', 'Choose how you want Hebrew subtitles displayed. Nikud adds vowel marks for easier reading, while Shoresh shows root words for language learning.')}
              </p>
              <button
                onClick={() => setShowFirstTimeHint(false)}
                className="text-indigo-300 hover:text-indigo-100 transition-colors flex-shrink-0"
                aria-label="Dismiss hint"
              >
                <Icon name="x" size="md" color="currentColor" />
              </button>
            </div>
          </div>
        )}

        {/* Generation Error */}
        {generationError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Icon name="error" size="md" color="#ef4444" className="flex-shrink-0" />
              <p className="text-sm text-red-200">{generationError}</p>
              <button
                onClick={() => setGenerationError(null)}
                className="text-red-300 hover:text-red-100 transition-colors flex-shrink-0"
                aria-label="Dismiss error"
              >
                <Icon name="x" size="md" color="currentColor" />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-4 flex items-center justify-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">
              {t('common.loading', 'Loading...')}
            </span>
          </div>
        )}

        {/* No Hebrew Subtitles Warning */}
        {!isLoading && !hasHebrew && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon name="warning" size="md" color="#f59e0b" className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-200">
                  {t('subtitles.hebrewMode.noHebrewSubtitles', 'No Hebrew Subtitles')}
                </p>
                <p className="text-sm text-amber-200/70 mt-1">
                  {t('subtitles.hebrewMode.uploadHebrewFirst', 'Upload Hebrew subtitles first to enable AI features like Nikud and Shoresh.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="space-y-2 sm:space-y-3">
          {memoizedOptions.map((option) => {
            const isAvailable = isModeAvailable(option.mode)
            const isSelected = option.mode === currentMode
            const canShowGenerateButton = !isAvailable && option.mode !== 'regular' && isAdmin && contentId && hasHebrew

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
                aria-label={`${t(option.titleKey)} mode${!isAvailable ? ', currently unavailable - requires AI generation' : ''}${isSelected ? ', currently selected' : ''}`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable && !canShowGenerateButton}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  {/* Top row on mobile: icon + title + status */}
                  <div className="flex items-center gap-3 sm:contents">
                    {/* Icon */}
                    <div className="w-10 sm:w-12 flex-shrink-0 flex items-center justify-center">
                      {option.mode === 'nikud' ? (
                        <span className="text-3xl sm:text-4xl">{option.icon}</span>
                      ) : (
                        <Icon name={option.icon} size="xl" color="#FFFFFF" />
                      )}
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

                    {/* Status indicator - sparkle for AI modes, check for regular */}
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
                      className={`text-xs sm:text-sm ${
                        isAvailable ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {t(option.descriptionKey, 'Description')}
                    </p>
                  </div>

                  {/* Warning - only show when not available AND not currently generating */}
                  {!isAvailable && generatingMode !== option.mode && option.mode !== 'regular' && (
                    <div className="sm:w-32 sm:flex-shrink-0">
                      <p className="text-xs text-amber-500/90 italic">
                        {option.mode === 'nikud'
                          ? t('subtitles.hebrewMode.nikud.unavailableReason', 'AI processing not available for this content')
                          : option.mode === 'shoresh'
                            ? t('subtitles.hebrewMode.shoresh.unavailableReason', 'Root word analysis not available for this content')
                            : t('subtitles.hebrewMode.engrew.unavailableReason', 'Engrew not available for this content')
                        }
                      </p>
                    </div>
                  )}

                  {/* Example - hidden on mobile */}
                  <div className="hidden sm:block w-36 flex-shrink-0">
                    <p
                      className="text-sm text-gray-500 font-mono text-right"
                      dir="rtl"
                      lang="he"
                    >
                      {option.example}
                    </p>
                  </div>
                  {!isAvailable && option.mode !== 'regular' && (
                    <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
                      {isAdmin && contentId ? (
                        <div className="flex items-center gap-2">
                          {generatingMode === option.mode ? (
                            <>
                              {/* Progress display */}
                              <span className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/70 rounded-xl text-sm font-semibold text-white">
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {jobProgress > 0 ? `${jobProgress}%` : t('common.generating', 'Generating...')}
                              </span>
                              {/* Cancel button */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCancelJob(); }}
                                disabled={isCancelling}
                                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                                aria-label={t('common.cancel', 'Cancel')}
                              >
                                {isCancelling ? (
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                ) : (
                                  t('common.cancel', 'Cancel')
                                )}
                              </button>
                              {/* Restart button (shown when job seems stuck - progress > 50% and job has been running) */}
                              {jobProgress > 50 && isGeneratableMode(option.mode) && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRestartJob(option.mode); }}
                                  disabled={isCancelling}
                                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
                                  aria-label={t('common.restart', 'Restart')}
                                >
                                  {t('common.restart', 'Restart')}
                                </button>
                              )}
                            </>
                          ) : isGeneratableMode(option.mode) ? (
                            <button
                              type="button"
                              onClick={(e) => handleGenerateMode(option.mode, e)}
                              disabled={generatingMode !== null}
                              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-white cursor-pointer"
                              style={{
                                backgroundColor: '#a855f7',
                                cursor: generatingMode !== null ? 'not-allowed' : 'pointer',
                                opacity: generatingMode !== null ? 0.5 : 1,
                              }}
                              aria-label={`Generate ${option.mode} subtitles for this content`}
                            >
                              {t('subtitles.hebrewMode.generate', 'Generate')}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div
                          className="bg-red-500/20 rounded px-2 py-1"
                          aria-hidden="true"
                        >
                          <span className="text-xs text-red-400 font-semibold">
                            {t('subtitles.hebrewMode.unavailable', 'Unavailable')}
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

  // Render modal in portal (to container for fullscreen support)
  return createPortal(modalContent, portalTarget)
}
