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
import { EnglishMode } from '@/types/subtitle'
import { storageHelpers } from '@/utils/storage'
import { subtitlesService } from '@/services/api'
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
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false)
  const [generatingMode, setGeneratingMode] = useState<EnglishMode | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<number>(0)
  const isAdmin = useAuthStore((s) => s.isAdmin())

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

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

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const status = await subtitlesService.getJobStatus(jobId) as JobStatus
      logger.info(`Job status: ${status.status}`, 'EnglishModePickerModal', { jobId, progress: status.progress })

      setJobProgress(status.progress)

      if (status.status === 'completed') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setGeneratingMode(null)
        setJobProgress(0)
        logger.info('Heblish generation completed', 'EnglishModePickerModal', { contentId })
        onGenerationComplete?.()
      } else if (status.status === 'failed') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setGeneratingMode(null)
        setJobProgress(0)
        setGenerationError(status.error_message || 'Heblish generation failed')
        logger.error('Heblish generation failed', 'EnglishModePickerModal', { contentId, error: status.error_message })
      }
    } catch (error) {
      logger.error('Failed to poll job status', 'EnglishModePickerModal', { jobId, error })
    }
  }, [contentId, onGenerationComplete])

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
        pollingRef.current = setInterval(() => {
          pollJobStatus(jobId)
        }, 2000)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      logger.error(`Failed to start ${mode} generation`, 'EnglishModePickerModal', { contentId, error: errorMessage })
      setGenerationError(`Failed to start ${mode} generation: ${errorMessage}`)
      setGeneratingMode(null)
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
        className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 w-[95%] max-w-4xl shadow-2xl animate-scale-in"
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
        <div className="flex justify-between items-center mb-6">
          <h2
            id="english-mode-modal-title"
            className="text-xl font-bold text-white"
          >
            {t('subtitles.englishMode.title', 'English Display Mode')}
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
                {t('subtitles.englishMode.firstTimeHint', 'Heblish mode injects Hebrew words into English subtitles for immersive language learning. Example: "Hello friends!" becomes "Shalom chaverim!"')}
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
                <div className="flex items-center gap-5">
                  {/* Icon */}
                  <div className="w-12 flex-shrink-0 flex items-center justify-center">
                    <Icon name={option.icon} size="xl" color="#FFFFFF" />
                  </div>

                  {/* Title */}
                  <div className="w-24 flex-shrink-0">
                    <h3
                      className={`text-base font-semibold ${
                        isAvailable ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {t(option.titleKey, option.mode)}
                    </h3>
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm whitespace-normal break-words ${
                        isAvailable ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {t(option.descriptionKey, 'Description')}
                    </p>
                  </div>

                  {/* Warning - only show when not available AND not currently generating */}
                  {!isAvailable && generatingMode !== option.mode && isAIMode && (
                    <div className="w-32 flex-shrink-0">
                      <p className="text-xs text-amber-500/90 italic">
                        {t(`subtitles.englishMode.${option.mode}.unavailableReason`, `${option.mode} processing not available for this content`)}
                      </p>
                    </div>
                  )}

                  {/* Example */}
                  <div className="w-48 flex-shrink-0">
                    <p className="text-sm text-gray-500 font-mono text-left">
                      {option.example}
                    </p>
                  </div>

                  {/* Status indicator */}
                  {isSelected && (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
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
                  {!isAvailable && isAIMode && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isAdmin && contentId ? (
                        <button
                          type="button"
                          onClick={(e) => handleGenerate(e, option.mode)}
                          disabled={generatingMode !== null}
                          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-white cursor-pointer"
                          style={{
                            backgroundColor: generatingMode === option.mode ? 'rgba(168, 85, 247, 0.7)' : '#a855f7',
                            cursor: generatingMode === option.mode ? 'wait' : 'pointer',
                            opacity: generatingMode !== null && generatingMode !== option.mode ? 0.5 : 1,
                          }}
                          aria-label={`Generate ${option.mode}`}
                        >
                          {generatingMode === option.mode ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              {jobProgress > 0
                                ? `${jobProgress}%`
                                : t('common.generating', 'Generating...')
                              }
                            </span>
                          ) : (
                            t('subtitles.englishMode.generate', 'Generate')
                          )}
                        </button>
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
