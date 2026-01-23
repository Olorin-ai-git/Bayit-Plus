/**
 * VideoWatchParty - Watch Party panels, overlays, and modals
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View } from 'react-native'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
import {
  WatchPartyCreateModal,
  WatchPartyJoinModal,
  WatchPartyPanel,
  WatchPartyOverlay,
} from '@/components/watchparty'

// Zod schema for prop validation
const VideoWatchPartyPropsSchema = z.object({
  isMobile: z.boolean(),
  showPartyPanel: z.boolean(),
  showCreateModal: z.boolean(),
  showJoinModal: z.boolean(),
  hasActiveParty: z.boolean(),
  isHost: z.boolean(),
  isSynced: z.boolean(),
  hostPaused: z.boolean(),
  title: z.string().optional(),
  currentUserId: z.string().optional(),
  userToken: z.string().optional().nullable(),
})

export type VideoWatchPartyProps = z.infer<typeof VideoWatchPartyPropsSchema> & {
  party: any // WatchParty type
  participants: any[]
  messages: any[]
  onClosePanel: () => void
  onCloseCreateModal: () => void
  onCloseJoinModal: () => void
  onCreate: (options: any, token?: string) => void
  onJoin: (code: string, token?: string) => void
  onLeave: () => void
  onEnd: () => void
  onSendMessage: (message: string) => void
}

export default function VideoWatchParty({
  isMobile,
  showPartyPanel,
  showCreateModal,
  showJoinModal,
  hasActiveParty,
  party,
  participants,
  messages,
  isHost,
  isSynced,
  hostPaused,
  currentUserId,
  title,
  userToken,
  onClosePanel,
  onCloseCreateModal,
  onCloseJoinModal,
  onCreate,
  onJoin,
  onLeave,
  onEnd,
  onSendMessage,
}: VideoWatchPartyProps) {
  return (
    <>
      {/* Watch Party Panel (Desktop) */}
      {!isMobile && (
        <WatchPartyPanel
          isOpen={showPartyPanel && hasActiveParty}
          onClose={onClosePanel}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          currentUserId={currentUserId}
          onLeave={onLeave}
          onEnd={onEnd}
          onSendMessage={onSendMessage}
        />
      )}

      {/* Watch Party Overlay (Mobile) */}
      {isMobile && (
        <WatchPartyOverlay
          isOpen={showPartyPanel && hasActiveParty}
          onClose={onClosePanel}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          currentUserId={currentUserId}
          onLeave={onLeave}
          onEnd={onEnd}
          onSendMessage={onSendMessage}
        />
      )}

      {/* Modals */}
      <WatchPartyCreateModal
        isOpen={showCreateModal}
        onClose={onCloseCreateModal}
        onCreate={(options) => onCreate(options, userToken ?? undefined)}
        contentTitle={title}
      />

      <WatchPartyJoinModal
        isOpen={showJoinModal}
        onClose={onCloseJoinModal}
        onJoin={(code) => onJoin(code, userToken ?? undefined)}
      />

      {/* Party Active Indicator Border */}
      {hasActiveParty && (
        <View
          className={platformClass(
            'absolute inset-0 border-2 border-emerald-500/50 rounded-2xl pointer-events-none',
            'absolute inset-0 border-2 border-emerald-500/50 pointer-events-none'
          )}
          pointerEvents="none"
        />
      )}
    </>
  )
}
