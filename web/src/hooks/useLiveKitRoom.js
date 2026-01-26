import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  ConnectionState,
} from 'livekit-client'
import logger from '@/utils/logger'

/**
 * useLiveKitRoom hook
 * Provides LiveKit room connection for audio-only watch party audio bridge
 */
export function useLiveKitRoom(options = {}) {
  const {
    serverUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://bayit-livekit.livekit.cloud',
    onParticipantJoined,
    onParticipantLeft,
    onSpeakingChanged,
    onConnectionStateChanged,
    onError,
  } = options

  const [room, setRoom] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [participants, setParticipants] = useState([])
  const [error, setError] = useState(null)
  const [connectionState, setConnectionState] = useState(ConnectionState.Disconnected)

  const localTrackRef = useRef(null)
  const roomRef = useRef(null)

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!roomRef.current) return

    const participantList = []
    roomRef.current.remoteParticipants.forEach((participant) => {
      participantList.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isMuted: !participant.isMicrophoneEnabled,
        audioTracks: Array.from(participant.audioTrackPublications.values()),
      })
    })

    // Add local participant
    const localParticipant = roomRef.current.localParticipant
    if (localParticipant) {
      participantList.unshift({
        identity: localParticipant.identity,
        name: localParticipant.name || localParticipant.identity,
        isSpeaking: localParticipant.isSpeaking,
        isMuted: !localParticipant.isMicrophoneEnabled,
        isLocal: true,
      })
    }

    setParticipants(participantList)
  }, [])

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (localTrackRef.current) {
      localTrackRef.current.stop()
      localTrackRef.current = null
    }

    if (roomRef.current) {
      await roomRef.current.disconnect()
      roomRef.current = null
    }

    setRoom(null)
    setIsConnected(false)
    setIsMuted(true)
    setIsSpeaking(false)
    setParticipants([])
    setConnectionState(ConnectionState.Disconnected)
  }, [])

  // Connect to room
  const connect = useCallback(async (token) => {
    if (roomRef.current) {
      await disconnect()
    }

    setIsConnecting(true)
    setError(null)

    try {
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      roomRef.current = newRoom

      // Set up event listeners
      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        updateParticipants()
        onParticipantJoined?.(participant)
      })

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        updateParticipants()
        onParticipantLeft?.(participant)
      })

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakerIdentities = speakers.map((s) => s.identity)
        const localSpeaking = speakerIdentities.includes(newRoom.localParticipant?.identity)
        setIsSpeaking(localSpeaking)
        onSpeakingChanged?.(speakers)
        updateParticipants()
      })

      newRoom.on(RoomEvent.TrackSubscribed, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.TrackUnsubscribed, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.LocalTrackPublished, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state)
        setIsConnected(state === ConnectionState.Connected)
        onConnectionStateChanged?.(state)
      })

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false)
        setParticipants([])
      })

      // Connect to room
      await newRoom.connect(serverUrl, token)
      setRoom(newRoom)
      setIsConnected(true)
      updateParticipants()

    } catch (err) {
      logger.error('Failed to connect to LiveKit room', 'useLiveKitRoom', err)
      setError(err.message || 'Connection failed')
      onError?.(err)
    } finally {
      setIsConnecting(false)
    }
  }, [serverUrl, onParticipantJoined, onParticipantLeft, onSpeakingChanged, onConnectionStateChanged, onError, updateParticipants, disconnect])

  // Toggle microphone
  const toggleMute = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return

    const localParticipant = roomRef.current.localParticipant

    if (isMuted) {
      // Unmute - create and publish track
      try {
        const track = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        })
        localTrackRef.current = track
        await localParticipant.publishTrack(track)
        setIsMuted(false)
      } catch (err) {
        logger.error('Failed to enable microphone', 'useLiveKitRoom', err)
        setError('Failed to enable microphone')
        onError?.(err)
      }
    } else {
      // Mute - unpublish and stop track
      if (localTrackRef.current) {
        await localParticipant.unpublishTrack(localTrackRef.current)
        localTrackRef.current.stop()
        localTrackRef.current = null
      }
      setIsMuted(true)
      setIsSpeaking(false)
    }

    updateParticipants()
  }, [isMuted, onError, updateParticipants])

  // Set mute state directly
  const setMuted = useCallback(async (muted) => {
    if (muted !== isMuted) {
      await toggleMute()
    }
  }, [isMuted, toggleMute])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // State
    room,
    isConnected,
    isConnecting,
    isMuted,
    isSpeaking,
    participants,
    error,
    connectionState,

    // Actions
    connect,
    disconnect,
    toggleMute,
    setMuted,
  }
}

export default useLiveKitRoom
