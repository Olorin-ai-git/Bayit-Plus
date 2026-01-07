import { useTranslation } from 'react-i18next'
import { Crown, Mic, MicOff, User } from 'lucide-react'
import { clsx } from 'clsx'

export default function WatchPartyParticipants({ participants, hostId, currentUserId }) {
  const { t } = useTranslation()

  if (!participants?.length) return null

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.user_id === hostId) return -1
    if (b.user_id === hostId) return 1
    return 0
  })

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-dark-300 px-1">
        {t('watchParty.participants')} ({participants.length})
      </h3>
      <div className="space-y-1">
        {sortedParticipants.map((participant) => {
          const isHost = participant.user_id === hostId
          const isCurrentUser = participant.user_id === currentUserId

          return (
            <div
              key={participant.user_id}
              className={clsx(
                'flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200',
                'bg-white/5 hover:bg-white/10 border border-transparent',
                participant.is_speaking && 'border-emerald-500/50 bg-emerald-500/10'
              )}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  isHost
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/10 text-dark-300'
                )}
              >
                {isHost ? (
                  <Crown size={16} />
                ) : (
                  <User size={16} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {participant.user_name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-dark-400">
                      ({t('watchParty.you')})
                    </span>
                  )}
                </div>
                {isHost && (
                  <span className="text-xs text-amber-400">
                    {t('watchParty.host')}
                  </span>
                )}
              </div>

              <div className="text-dark-400">
                {participant.is_muted ? (
                  <MicOff size={16} className="text-red-400" />
                ) : (
                  <Mic
                    size={16}
                    className={clsx(
                      participant.is_speaking && 'text-emerald-400 animate-pulse'
                    )}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
