import { useTranslation } from 'react-i18next'
import { RefreshCw, Check, Pause } from 'lucide-react'
import { clsx } from 'clsx'

export default function WatchPartySyncIndicator({ isHost, isSynced, hostPaused }) {
  const { t } = useTranslation()

  if (isHost) return null

  const getState = () => {
    if (hostPaused) {
      return {
        icon: <Pause size={14} />,
        text: t('watchParty.hostPaused'),
        className: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      }
    }
    if (isSynced) {
      return {
        icon: <Check size={14} />,
        text: t('watchParty.synced'),
        className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      }
    }
    return {
      icon: <RefreshCw size={14} className="animate-spin" />,
      text: t('watchParty.syncing'),
      className: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    }
  }

  const state = getState()

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
        state.className
      )}
    >
      {state.icon}
      <span>{state.text}</span>
    </div>
  )
}
