/**
 * HebrewModePickerModal Component (Web)
 * Modal for selecting Hebrew subtitle display mode (regular, nikud, shoresh)
 * Uses TailwindCSS for styling and web-native modal implementation
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Icon } from '@olorin/shared-icons/web'
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

interface HebrewModePickerModalProps {
  visible: boolean
  currentMode: HebrewMode
  hasNikud: boolean
  hasShoresh: boolean
  contentId?: string
  onClose: () => void
  onModeSelect: (mode: HebrewMode) => void
  onGenerationComplete?: () => void
}

interface ModeOption {
  mode: HebrewMode
  icon: string
  titleKey: string
  descriptionKey: string
  example: string
}

const HEBREW_MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'regular',
    icon: 'settings',
    titleKey: 'subtitles.hebrewMode.regular.title',
    descriptionKey: 'subtitles.hebrewMode.regular.description',
    example: 'הילדים הולכים לבית הספר',
  },
  {
    mode: 'nikud',
    icon: 'א׳',
    titleKey: 'subtitles.hebrewMode.nikud.title',
    descriptionKey: 'subtitles.hebrewMode.nikud.description',
    example: 'הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר',
  },
  {
    mode: 'shoresh',
    icon: 'stories',
    titleKey: 'subtitles.hebrewMode.shoresh.title',
    descriptionKey: 'subtitles.hebrewMode.shoresh.description',
    example: 'הילדים [ילד] הולכים [הלך] לבית [בית] הספר [ספר]',
  },
]

const HEBREW_MODE_FIRST_TIME_KEY = 'hebrew_mode_first_time_seen'

export default function HebrewModePickerModal({
  visible,
  currentMode,
  hasNikud,
  hasShoresh,
  contentId,
  onClose,
  onModeSelect,
  onGenerationComplete,
}: HebrewModePickerModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false)
  const [generatingMode, setGeneratingMode] = useState<'nikud' | 'shoresh' | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<number>(0)
  const isAdmin = useAuthStore((s) => s.isAdmin())

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

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
    return false
  }

  const pollJobStatus = useCallback(async (jobId: string, mode: 'nikud' | 'shoresh') => {
    try {
      const status = await subtitlesService.getJobStatus(jobId) as JobStatus
      logger.info(`Job status: ${status.status}`, 'HebrewModePickerModal', { jobId, progress: status.progress })

      setJobProgress(status.progress)

      if (status.status === 'completed') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setGeneratingMode(null)
        setJobProgress(0)
        logger.info(`${mode} generation completed`, 'HebrewModePickerModal', { contentId })
        onGenerationComplete?.()
      } else if (status.status === 'failed') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setGeneratingMode(null)
        setJobProgress(0)
        setGenerationError(status.error_message || `${mode} generation failed`)
        logger.error(`${mode} generation failed`, 'HebrewModePickerModal', { contentId, error: status.error_message })
      }
    } catch (error) {
      logger.error('Failed to poll job status', 'HebrewModePickerModal', { jobId, error })
    }
  }, [contentId, onGenerationComplete])

  const handleGenerateMode = async (mode: 'nikud' | 'shoresh', e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    logger.info(`Generate ${mode} clicked`, 'HebrewModePickerModal', { contentId, isAdmin, generatingMode })

    if (!contentId) {
      logger.error('No contentId provided', 'HebrewModePickerModal')
      setGenerationError('Content ID is missing')
      return
    }

    if (generatingMode) {
      logger.info('Generation already in progress', 'HebrewModePickerModal')
      return
    }

    setGeneratingMode(mode)
    setGenerationError(null)
    setJobProgress(0)

    try {
      logger.info(`Starting ${mode} generation`, 'HebrewModePickerModal', { contentId })

      const result = mode === 'nikud'
        ? await subtitlesService.generateNikud(contentId, 'he', false)
        : await subtitlesService.generateShoresh(contentId, 'he', false)

      logger.info(`${mode} job started`, 'HebrewModePickerModal', { contentId, result })

      // Check if already completed (e.g., was already generated)
      if (result.status === 'completed') {
        setGeneratingMode(null)
        onGenerationComplete?.()
        return
      }

      // Start polling for job status
      const jobId = result.job_id
      if (jobId) {
        pollingRef.current = setInterval(() => {
          pollJobStatus(jobId, mode)
        }, 2000) // Poll every 2 seconds
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      logger.error(`Failed to start ${mode} generation`, 'HebrewModePickerModal', { contentId, error: errorMessage })
      setGenerationError(`Failed to start ${mode} generation: ${errorMessage}`)
      setGeneratingMode(null)
    }
  }

  // Memoize options to avoid re-rendering on every state change
  const memoizedOptions = useMemo(
    () => HEBREW_MODE_OPTIONS,
    [] // Static options, never change
  )

  if (!visible) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hebrew-mode-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
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

        {/* Options */}
        <div className="space-y-3">
          {memoizedOptions.map((option) => {
            const isAvailable = isModeAvailable(option.mode)
            const isSelected = option.mode === currentMode
            const canShowGenerateButton = !isAvailable && option.mode !== 'regular' && isAdmin && contentId

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
                  w-full rounded-lg p-4 border-2 transition-all
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
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  {option.mode === 'nikud' ? (
                    <span className="text-4xl flex-shrink-0">{option.icon}</span>
                  ) : (
                    <Icon name={option.icon} size="xl" color="#FFFFFF" className="flex-shrink-0" />
                  )}

                  {/* Text content */}
                  <div className="flex-1 text-left">
                    <h3
                      className={`text-base font-semibold mb-1 ${
                        isAvailable ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {t(option.titleKey, option.mode)}
                    </h3>
                    <p
                      className={`text-sm mb-1 ${
                        isAvailable ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {t(option.descriptionKey, 'Description')}
                    </p>
                    {!isAvailable && (
                      <p className="text-xs text-amber-500/90 mb-2 italic">
                        {option.mode === 'nikud'
                          ? t('subtitles.hebrewMode.nikud.unavailableReason', 'AI processing not available for this content')
                          : t('subtitles.hebrewMode.shoresh.unavailableReason', 'Root word analysis not available for this content')
                        }
                      </p>
                    )}
                    <p
                      className="text-sm text-gray-500 font-mono"
                      dir="rtl"
                      lang="he"
                    >
                      {option.example}
                    </p>
                  </div>

                  {/* Status indicator */}
                  {isSelected && (
                    <div
                      className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <Icon name="check" size="sm" color="#FFFFFF" />
                    </div>
                  )}
                  {!isAvailable && option.mode !== 'regular' && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isAdmin && contentId ? (
                        <div
                          onClick={(e) => handleGenerateMode(option.mode as 'nikud' | 'shoresh', e)}
                          onKeyDown={(e) => {
                            if (generatingMode === null && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault()
                              e.stopPropagation()
                              handleGenerateMode(option.mode as 'nikud' | 'shoresh', e as unknown as React.MouseEvent)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-disabled={generatingMode !== null}
                          className={`
                            px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                            ${generatingMode === option.mode
                              ? 'bg-indigo-500/30 text-indigo-300 cursor-wait'
                              : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 hover:text-indigo-300 cursor-pointer'
                            }
                            ${generatingMode !== null && generatingMode !== option.mode ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                          aria-label={`Generate ${option.mode}`}
                        >
                          {generatingMode === option.mode ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              {jobProgress > 0
                                ? `${jobProgress}%`
                                : t('common.generating', 'Generating...')
                              }
                            </span>
                          ) : (
                            t('subtitles.hebrewMode.generate', 'Generate')
                          )}
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

  // Render modal in portal
  return createPortal(modalContent, document.body)
}
