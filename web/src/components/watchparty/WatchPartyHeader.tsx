import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, LogOut, X, Share2 } from 'lucide-react'
import GlassButton from '../ui/GlassButton'
import WatchPartySyncIndicator from './WatchPartySyncIndicator'

export default function WatchPartyHeader({
  roomCode,
  isHost,
  isSynced,
  hostPaused,
  onLeave,
  onEnd,
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const shareData = {
      title: t('watchParty.title'),
      text: `${t('watchParty.joinTitle')}: ${roomCode}`,
      url: `${window.location.origin}/party/${roomCode}`,
    }

    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData)
    } else {
      handleCopyCode()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {t('watchParty.title')}
        </h2>
        <WatchPartySyncIndicator
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
          <span className="text-xs text-dark-400">{t('watchParty.roomCode')}:</span>
          <span className="font-mono font-semibold text-white tracking-wider">
            {roomCode}
          </span>
        </div>

        <GlassButton
          variant="ghost"
          size="icon-sm"
          onClick={handleCopyCode}
          aria-label={t('watchParty.copyCode')}
        >
          {copied ? (
            <Check size={16} className="text-emerald-400" />
          ) : (
            <Copy size={16} />
          )}
        </GlassButton>

        <GlassButton
          variant="ghost"
          size="icon-sm"
          onClick={handleShare}
          aria-label={t('common.share')}
        >
          <Share2 size={16} />
        </GlassButton>
      </div>

      <div className="flex items-center gap-2">
        {isHost ? (
          <GlassButton
            variant="danger"
            size="sm"
            onClick={onEnd}
            icon={<X size={16} />}
            className="flex-1"
          >
            {t('watchParty.end')}
          </GlassButton>
        ) : (
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={onLeave}
            icon={<LogOut size={16} />}
            className="flex-1"
          >
            {t('watchParty.leave')}
          </GlassButton>
        )}
      </div>
    </div>
  )
}
