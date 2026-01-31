/**
 * HebrewModePickerModal Component (Web)
 * Modal for selecting Hebrew subtitle display mode (regular, nikud, shoresh)
 * Uses TailwindCSS for styling and web-native modal implementation
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { HebrewMode } from '@/types/subtitle'

interface HebrewModePickerModalProps {
  visible: boolean
  currentMode: HebrewMode
  hasNikud: boolean
  hasShoresh: boolean
  onClose: () => void
  onModeSelect: (mode: HebrewMode) => void
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
    icon: '🔤',
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
    icon: '📖',
    titleKey: 'subtitles.hebrewMode.shoresh.title',
    descriptionKey: 'subtitles.hebrewMode.shoresh.description',
    example: 'הילדים [ילד] הולכים [הלך] לבית [בית] הספר [ספר]',
  },
]

export default function HebrewModePickerModal({
  visible,
  currentMode,
  hasNikud,
  hasShoresh,
  onClose,
  onModeSelect,
}: HebrewModePickerModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)

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

  // Focus trap
  useEffect(() => {
    if (visible && modalRef.current) {
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
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {HEBREW_MODE_OPTIONS.map((option) => {
            const isAvailable = isModeAvailable(option.mode)
            const isSelected = option.mode === currentMode

            return (
              <button
                key={option.mode}
                onClick={() => isAvailable && handleModePress(option.mode)}
                disabled={!isAvailable}
                className={`
                  w-full rounded-lg p-4 border-2 transition-all
                  ${
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500'
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                  }
                  ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                aria-label={`${t(option.titleKey)} mode${!isAvailable ? ' (unavailable)' : ''}${isSelected ? ' (selected)' : ''}`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <span className="text-4xl flex-shrink-0">{option.icon}</span>

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
                        isAvailable ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {t(option.descriptionKey, 'Description')}
                    </p>
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
                      <span className="text-white text-base font-bold">✓</span>
                    </div>
                  )}
                  {!isAvailable && (
                    <div
                      className="bg-red-500/20 rounded px-2 py-1 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <span className="text-xs text-red-400 font-semibold">
                        {t('subtitles.hebrewMode.unavailable', 'Unavailable')}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // Render modal in portal
  return createPortal(modalContent, document.body)
}
