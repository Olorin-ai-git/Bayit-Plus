import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Users, MessageSquare } from 'lucide-react'
import { clsx } from 'clsx'
import GlassButton from '../ui/GlassButton'
import WatchPartyHeader from './WatchPartyHeader'
import WatchPartyParticipants from './WatchPartyParticipants'
import WatchPartyChat from './WatchPartyChat'

const TABS = ['participants', 'chat']

export default function WatchPartyOverlay({
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
  const [activeTab, setActiveTab] = useState('participants')

  if (!party || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 overlay-backdrop" onClick={onClose} />

      <div className="relative mt-auto max-h-[70vh] flex flex-col glass rounded-t-3xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">{t('watchParty.title')}</h2>
          <GlassButton variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={18} />
          </GlassButton>
        </div>

        <div className="p-4 border-b border-white/10">
          <WatchPartyHeader
            roomCode={party.room_code}
            isHost={isHost}
            isSynced={isSynced}
            hostPaused={hostPaused}
            onLeave={onLeave}
            onEnd={onEnd}
          />
        </div>

        <div className="flex border-b border-white/10">
          {TABS.map((tab) => {
            const Icon = tab === 'participants' ? Users : MessageSquare
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'text-primary-400 border-b-2 border-primary-400 bg-primary-500/10'
                    : 'text-dark-400 hover:text-white'
                )}
              >
                <Icon size={16} />
                <span>
                  {tab === 'participants'
                    ? `${t('watchParty.participants')} (${participants.length})`
                    : t('watchParty.chat')}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[300px]">
          {activeTab === 'participants' ? (
            <WatchPartyParticipants
              participants={participants}
              hostId={party.host_id}
              currentUserId={currentUserId}
            />
          ) : (
            <WatchPartyChat
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={onSendMessage}
              chatEnabled={party.chat_enabled}
            />
          )}
        </div>
      </div>
    </div>
  )
}
