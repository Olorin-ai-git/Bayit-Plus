import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react'

export default function AudioControls({
  isMuted = true,
  isSpeaking = false,
  isConnecting = false,
  isConnected = false,
  onToggleMute,
  className = '',
}) {
  const { t } = useTranslation()

  if (!isConnected && !isConnecting) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} dir="rtl">
      {/* Mute/Unmute Button */}
      <button
        onClick={onToggleMute}
        disabled={isConnecting}
        title={isMuted ? t('watchParty.audio.unmute') : t('watchParty.audio.mute')}
        className={`
          relative p-2 rounded-lg transition-all duration-300
          ${isConnecting
            ? 'glass opacity-50 cursor-wait'
            : isMuted
              ? 'glass hover:bg-white/10 text-dark-400'
              : isSpeaking
                ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500/50'
                : 'bg-primary-500/20 text-primary-400'
          }
        `}
      >
        {isConnecting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isMuted ? (
          <MicOff size={18} />
        ) : (
          <Mic size={18} />
        )}

        {/* Speaking indicator pulse */}
        {isSpeaking && !isMuted && (
          <span className="absolute inset-0 rounded-lg bg-green-500/30 animate-ping" />
        )}
      </button>

      {/* Connection status */}
      {isConnecting && (
        <span className="text-xs text-dark-400">
          {t('watchParty.audio.connecting')}
        </span>
      )}

      {/* Speaking indicator text */}
      {!isMuted && isSpeaking && (
        <span className="text-xs text-green-400 animate-pulse">
          {t('watchParty.audio.speaking')}
        </span>
      )}
    </div>
  )
}
