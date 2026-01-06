import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import GlassButton from '../ui/GlassButton'
import WatchPartyHeader from './WatchPartyHeader'
import WatchPartyParticipants from './WatchPartyParticipants'
import WatchPartyChat from './WatchPartyChat'

export default function WatchPartyPanel({
  isOpen,
  onClose,
  party,
  participants,
  messages,
  isHost,
  isSynced,
  hostPaused,
  currentUserId,
  onLeave,
  onEnd,
  onSendMessage,
}) {
  const { t } = useTranslation()

  if (!party) return null

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 h-full w-80 z-40',
        'glass border-l border-white/10',
        'flex flex-col',
        'transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold">{t('watchParty.title')}</h2>
        <GlassButton
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
        >
          <X size={18} />
        </GlassButton>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
        <WatchPartyHeader
          roomCode={party.room_code}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          onLeave={onLeave}
          onEnd={onEnd}
        />

        <div className="border-t border-white/10 pt-4">
          <WatchPartyParticipants
            participants={participants}
            hostId={party.host_id}
            currentUserId={currentUserId}
          />
        </div>

        {party.chat_enabled && (
          <div className="flex-1 min-h-0 border-t border-white/10 pt-4">
            <WatchPartyChat
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={onSendMessage}
              chatEnabled={party.chat_enabled}
            />
          </div>
        )}
      </div>
    </div>
  )
}
