/**
 * Custom hook for Watch Party integration
 */

import { useState, useEffect, useRef } from 'react'
import { useWatchPartyStore } from '@/stores/watchPartyStore'

interface UseWatchPartyOptions {
  contentId?: string
  contentType?: string
  title?: string
  videoRef: React.RefObject<HTMLVideoElement>
  isPlaying: boolean
  currentTime: number
}

export function useWatchParty({
  contentId,
  contentType = 'vod',
  title,
  videoRef,
  isPlaying,
  currentTime,
}: UseWatchPartyOptions) {
  const {
    party,
    participants,
    messages,
    isHost,
    isConnected,
    syncedPosition,
    isPlaying: partySyncPlaying,
    createParty,
    joinByCode,
    connect,
    sendMessage,
    syncPlayback,
    leaveParty,
    endParty,
  } = useWatchPartyStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showPartyPanel, setShowPartyPanel] = useState(false)
  const [isSynced, setIsSynced] = useState(true)
  const lastSyncRef = useRef(0)

  // Sync playback as guest
  useEffect(() => {
    if (!party || isHost || !isConnected) return
    const video = videoRef.current
    if (!video) return

    const diff = Math.abs(video.currentTime - syncedPosition)
    if (diff > 2) {
      video.currentTime = syncedPosition
      setIsSynced(false)
      setTimeout(() => setIsSynced(true), 500)
    }

    if (partySyncPlaying && video.paused) {
      video.play()
    } else if (!partySyncPlaying && !video.paused) {
      video.pause()
    }
  }, [syncedPosition, partySyncPlaying, party, isHost, isConnected])

  // Sync playback as host
  useEffect(() => {
    if (!party || !isHost || !isConnected) return
    const video = videoRef.current
    if (!video) return

    const now = Date.now()
    if (now - lastSyncRef.current < 1000) return
    lastSyncRef.current = now

    syncPlayback(video.currentTime, !video.paused)
  }, [currentTime, isPlaying, party, isHost, isConnected, syncPlayback])

  // Party handlers
  const handleCreateParty = async (options: { chatEnabled: boolean; syncPlayback: boolean }, userToken?: string) => {
    if (!contentId) return
    const newParty = await createParty(contentId, contentType, {
      title,
      chatEnabled: options.chatEnabled,
      syncPlayback: options.syncPlayback,
    })
    connect(newParty.id, userToken)
    setShowPartyPanel(true)
  }

  const handleJoinParty = async (roomCode: string, userToken?: string) => {
    const joinedParty = await joinByCode(roomCode)
    connect(joinedParty.id, userToken)
    setShowPartyPanel(true)
  }

  const handleLeaveParty = async () => {
    await leaveParty()
    setShowPartyPanel(false)
  }

  const handleEndParty = async () => {
    await endParty()
    setShowPartyPanel(false)
  }

  return {
    party,
    participants,
    messages,
    isHost,
    isConnected,
    isSynced,
    hostPaused: party && !partySyncPlaying,
    showCreateModal,
    showJoinModal,
    showPartyPanel,
    setShowCreateModal,
    setShowJoinModal,
    setShowPartyPanel,
    handleCreateParty,
    handleJoinParty,
    handleLeaveParty,
    handleEndParty,
    sendMessage,
  }
}
