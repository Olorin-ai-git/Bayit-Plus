import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Loader2, Square } from 'lucide-react'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'

export default function VoiceSearchButton({
  onTranscribed,
  onError,
  className = '',
  size = 'md',
}) {
  const { t } = useTranslation()
  const {
    isRecording,
    isTranscribing,
    error,
    hasPermission,
    isSupported,
    toggleRecording,
    cancelRecording,
  } = useVoiceRecording({
    onTranscribed,
    onError,
  })

  // Size variants
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }

  if (!isSupported) {
    return null
  }

  const getTooltip = () => {
    if (isTranscribing) return t('voice.transcribing')
    if (isRecording) return t('voice.stopRecording')
    if (error === 'noMicrophone') return t('voice.noMicrophone')
    return t('voice.startRecording')
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleRecording}
        disabled={isTranscribing}
        title={getTooltip()}
        className={`
          ${sizeClasses[size]}
          rounded-full flex items-center justify-center
          transition-all duration-300
          ${isRecording
            ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
            : isTranscribing
              ? 'glass text-primary-400'
              : hasPermission === false
                ? 'glass text-red-400 opacity-50 cursor-not-allowed'
                : 'glass hover:bg-white/10 text-white hover:text-primary-400'
          }
        `}
      >
        {isTranscribing ? (
          <Loader2 size={iconSizes[size]} className="animate-spin" />
        ) : isRecording ? (
          <Square size={iconSizes[size] - 4} fill="currentColor" />
        ) : hasPermission === false ? (
          <MicOff size={iconSizes[size]} />
        ) : (
          <Mic size={iconSizes[size]} />
        )}
      </button>

      {/* Recording indicator ring */}
      {isRecording && (
        <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" />
      )}

      {/* Status text for accessibility */}
      {isRecording && (
        <span className="sr-only">{t('voice.recording')}</span>
      )}
    </div>
  )
}
