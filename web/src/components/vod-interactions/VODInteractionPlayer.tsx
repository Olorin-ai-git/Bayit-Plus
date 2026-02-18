/**
 * VOD Interaction Player (Phase 2/3)
 *
 * Non-blocking overlay integrating all three interaction phases:
 *   Phase 1 - Curated moment prompts at timestamps
 *   Phase 2 - User-initiated free dialogue with character selection + volume ducking
 *   Phase 3 - Voice WebSocket input, multi-character, shared Watch Party sessions
 *
 * Video never pauses. Volume ducks to 15% while dialogue is active.
 */

import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@bayit/shared-stores/authStore'
import { GlassButton, GlassIcon } from '@bayit/glass'
import { useTranslation } from 'react-i18next'
import { useVODInteraction } from '../../hooks/useVODInteraction'
import { useVoiceInteractionWS } from '../../hooks/useVoiceInteractionWS'
import { useSharedInteraction } from '../../hooks/useSharedInteraction'
import { InteractiveMomentPrompt } from './InteractiveMomentPrompt'
import { AvatarDialoguePanel } from './AvatarDialoguePanel'
import { CharacterSelectBar } from './CharacterSelectBar'
import { VoiceInteractionInput } from './VoiceInteractionInput'
import { SharedInteractionOverlay } from './SharedInteractionOverlay'

interface Props {
  contentId: string
  currentTimestamp: number
  playerRef: React.RefObject<HTMLVideoElement>
  avatarImageUrl?: string
}

export function VODInteractionPlayer({
  contentId,
  currentTimestamp,
  playerRef,
  avatarImageUrl,
}: Props) {
  const { t } = useTranslation()
  const interaction = useVODInteraction(contentId)
  const voiceWS = useVoiceInteractionWS()
  const shared = useSharedInteraction()
  const currentUserId = useAuthStore.getState().user?.id ?? null

  // Wire player ref so the hook can duck/restore volume
  useEffect(() => {
    interaction.setPlayerRef(playerRef.current)
  }, [playerRef, interaction.setPlayerRef])

  // Detect interactive moments on every timestamp tick
  useEffect(() => {
    interaction.checkForMoment(currentTimestamp)
  }, [currentTimestamp, interaction.checkForMoment])

  // Connect / disconnect voice WS with the active session
  useEffect(() => {
    if (interaction.isSessionActive && interaction.sessionId) {
      voiceWS.connect(interaction.sessionId)
    } else {
      voiceWS.disconnect()
    }
    return () => { voiceWS.disconnect() }
  }, [interaction.isSessionActive, interaction.sessionId])

  const handleSendAudio = useCallback(
    (data: ArrayBuffer) => { voiceWS.sendAudioData(data) },
    [voiceWS.sendAudioData]
  )

  const handleVoiceFallback = useCallback(
    (text: string) => { voiceWS.sendTextFallback(text) },
    [voiceWS.sendTextFallback]
  )

  const handleEndSession = useCallback(async () => {
    voiceWS.endSession()
    voiceWS.disconnect()
    await interaction.endSession()
  }, [voiceWS.endSession, voiceWS.disconnect, interaction.endSession])

  return (
    <div className="absolute inset-0 pointer-events-none">

      {/* Phase 1: Curated moment prompt */}
      {interaction.isShowingPrompt && interaction.currentMoment && (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2">
          <InteractiveMomentPrompt
            moment={interaction.currentMoment}
            onAccept={() =>
              interaction.startInteraction(interaction.currentMoment!._id)
            }
            onDismiss={interaction.dismissPrompt}
          />
        </div>
      )}

      {/* Phase 2: Character selection bar */}
      {interaction.isShowingCharacterSelect && (
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0">
          <CharacterSelectBar
            characters={interaction.characters}
            onSelect={(char) =>
              interaction.startFreeInteraction(char._id, currentTimestamp)
            }
            onClose={interaction.hideCharacterSelect}
          />
        </div>
      )}

      {/* Phase 2/3: Active dialogue panel + voice input */}
      {interaction.isSessionActive && (
        <div className="pointer-events-auto absolute top-0 right-0 flex h-full flex-col">
          <AvatarDialoguePanel
            characterName={interaction.characterName}
            messages={interaction.messages}
            isLoading={interaction.isLoading || voiceWS.isProcessing}
            onSendMessage={interaction.sendMessage}
            onClose={handleEndSession}
            avatarImageUrl={avatarImageUrl}
          />
          <VoiceInteractionInput
            onSendAudio={handleSendAudio}
            onFallbackText={handleVoiceFallback}
            isProcessing={voiceWS.isProcessing}
            processingStage={voiceWS.processingStage}
          />
        </div>
      )}

      {/* Phase 2: Talk-to-character button (shown when characters available) */}
      {interaction.showTalkButton && (
        <div className="pointer-events-auto absolute bottom-8 right-8">
          <GlassButton
            variant="floating"
            onClick={interaction.showCharacterSelect}
            aria-label={t('player.talkToCharacter')}
          >
            <GlassIcon name="microphone" />
            {t('player.talk')}
          </GlassButton>
        </div>
      )}

      {/* Phase 3 WS4: Shared Watch Party interaction */}
      {shared.session && (
        <div className="pointer-events-auto absolute bottom-0 left-1/2 -translate-x-1/2">
          <SharedInteractionOverlay
            session={shared.session}
            participants={shared.participants}
            currentTurnUserId={shared.currentTurnUserId}
            currentUserId={currentUserId}
            isMyTurn={shared.isMyTurn}
            turnCountdown={shared.turnCountdown}
            conversation={shared.conversation}
            isSending={shared.isSending}
            onSendMessage={(text) => shared.sendMessage(text)}
            onEnd={() => shared.endSharedInteraction()}
          />
        </div>
      )}
    </div>
  )
}
