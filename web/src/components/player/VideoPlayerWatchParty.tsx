import { View, StyleSheet } from 'react-native'
import { borderRadius } from '@olorin/design-tokens'
import {
  WatchPartyPanel,
  WatchPartyOverlay,
  WatchPartyCreateModal,
  WatchPartyJoinModal,
} from '@/components/watchparty'
import { WatchParty, WatchPartyParticipant, WatchPartyMessage } from '@/types/watchparty'

interface VideoPlayerWatchPartyProps {
  // Mobile detection
  isMobile: boolean

  // Panel state
  showPartyPanel: boolean
  setShowPartyPanel: (show: boolean) => void

  // Modal states
  showCreateModal: boolean
  showJoinModal: boolean
  setShowCreateModal: (show: boolean) => void
  setShowJoinModal: (show: boolean) => void

  // Party data
  party: WatchParty | null
  participants: WatchPartyParticipant[]
  messages: WatchPartyMessage[]
  isHost: boolean
  isSynced: boolean
  hostPaused: boolean
  currentUserId?: string

  // Actions
  handleCreateParty: (options: any, token?: string) => void
  handleJoinParty: (code: string, token?: string) => void
  handleLeaveParty: () => void
  handleEndParty: () => void
  sendMessage: (message: string) => void

  // Content info
  title: string
}

export default function VideoPlayerWatchParty({
  isMobile,
  showPartyPanel,
  setShowPartyPanel,
  showCreateModal,
  showJoinModal,
  setShowCreateModal,
  setShowJoinModal,
  party,
  participants,
  messages,
  isHost,
  isSynced,
  hostPaused,
  currentUserId,
  handleCreateParty,
  handleJoinParty,
  handleLeaveParty,
  handleEndParty,
  sendMessage,
  title,
}: VideoPlayerWatchPartyProps) {
  return (
    <>
      {/* Watch Party Panel/Overlay */}
      {!isMobile ? (
        <WatchPartyPanel
          isOpen={showPartyPanel && !!party}
          onClose={() => setShowPartyPanel(false)}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          currentUserId={currentUserId}
          onLeave={handleLeaveParty}
          onEnd={handleEndParty}
          onSendMessage={sendMessage}
        />
      ) : (
        <WatchPartyOverlay
          isOpen={showPartyPanel && !!party}
          onClose={() => setShowPartyPanel(false)}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          currentUserId={currentUserId}
          onLeave={handleLeaveParty}
          onEnd={handleEndParty}
          onSendMessage={sendMessage}
        />
      )}

      {/* Modals */}
      <WatchPartyCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(options) => handleCreateParty(options, undefined)}
        contentTitle={title}
      />

      <WatchPartyJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={(code) => handleJoinParty(code, undefined)}
      />

      {/* Party Active Indicator Border */}
      {party && (
        <View style={styles.partyIndicator} pointerEvents="none" />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  partyIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: borderRadius.lg,
  },
})
