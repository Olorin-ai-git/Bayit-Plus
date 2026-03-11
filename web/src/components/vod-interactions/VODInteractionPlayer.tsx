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

import React, { useEffect, useCallback } from "react";
import { useAuthStore } from "@bayit/shared-stores/authStore";
import { GlassButton } from "@bayit/glass";
import { Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useVODInteraction,
  ContentCharacter,
} from "../../hooks/useVODInteraction";
import { useVoiceInteractionWS } from "../../hooks/useVoiceInteractionWS";
import { useSharedInteraction } from "../../hooks/useSharedInteraction";
import { InteractiveMomentPrompt } from "./InteractiveMomentPrompt";
import { AvatarDialoguePanel } from "./AvatarDialoguePanel";
import { CharacterSelectBar } from "./CharacterSelectBar";
import { VoiceInteractionInput } from "./VoiceInteractionInput";
import { SharedInteractionOverlay } from "./SharedInteractionOverlay";

interface Props {
  contentId: string;
  currentTimestamp: number;
  playerRef: React.RefObject<HTMLVideoElement>;
  avatarImageUrl?: string;
}

export function VODInteractionPlayer({
  contentId,
  currentTimestamp,
  playerRef,
  avatarImageUrl,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const profileId = user?.id ?? "";
  const avatarId = user?.id ?? "";

  const interaction = useVODInteraction({
    contentId,
    profileId,
    avatarId,
    currentTime: currentTimestamp,
    onPauseRequested: () => {
      if (playerRef.current) playerRef.current.pause();
    },
    onResumeRequested: () => {
      if (playerRef.current) playerRef.current.play();
    },
  });
  const voiceWS = useVoiceInteractionWS();
  const shared = useSharedInteraction();
  const currentUserId = user?.id ?? null;

  // Connect / disconnect voice WS with the active session
  useEffect(() => {
    const sessionId = interaction.activeSession?.id;
    if (interaction.isInteracting && sessionId) {
      voiceWS.connect(sessionId);
    } else {
      voiceWS.disconnect();
    }
    return () => {
      voiceWS.disconnect();
    };
  }, [interaction.isInteracting, interaction.activeSession?.id]);

  const handleSendAudio = useCallback(
    (data: ArrayBuffer) => {
      voiceWS.sendAudioData(data);
    },
    [voiceWS.sendAudioData],
  );

  const handleVoiceFallback = useCallback(
    (text: string) => {
      voiceWS.sendTextFallback(text);
    },
    [voiceWS.sendTextFallback],
  );

  const handleEndSession = useCallback(async () => {
    voiceWS.endSession();
    voiceWS.disconnect();
    await interaction.completeInteraction();
  }, [voiceWS.endSession, voiceWS.disconnect, interaction.completeInteraction]);

  const handleSelectCharacter = useCallback(
    (char: ContentCharacter) => {
      interaction.startFreeInteraction(char);
    },
    [interaction.startFreeInteraction],
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Phase 1: Curated moment prompt */}
      {interaction.currentMoment && !interaction.isInteracting && (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2">
          <InteractiveMomentPrompt
            moment={interaction.currentMoment}
            onAccept={interaction.startInteraction}
            onDismiss={interaction.skipInteraction}
          />
        </div>
      )}

      {/* Phase 2: Character selection bar */}
      {!interaction.isInteracting &&
        interaction.availableCharacters.length > 0 && (
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0">
            <CharacterSelectBar
              characters={interaction.availableCharacters}
              onSelect={handleSelectCharacter}
              onClose={interaction.endFreeInteraction}
            />
          </div>
        )}

      {/* Phase 2/3: Active dialogue panel + voice input */}
      {interaction.isInteracting && (
        <div className="pointer-events-auto absolute top-0 right-0 flex h-full flex-col">
          <AvatarDialoguePanel
            character={
              interaction.selectedCharacter ?? {
                name: interaction.activeSession?.character_name ?? "",
                voice_id: "",
                frame_url: "",
                description: "",
                movie_context: "",
              }
            }
            exchanges={
              interaction.activeSession?.dialogue_exchanges ??
              interaction.freeDialogueExchanges
            }
            isSending={interaction.isSending || voiceWS.isProcessing}
            videoElement={playerRef.current}
            onSendMessage={
              interaction.isFreeDialogueActive
                ? interaction.sendFreeMessage
                : interaction.sendMessage
            }
            onClose={handleEndSession}
            avatarImageUrl={avatarImageUrl ?? ""}
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
      {!interaction.isInteracting && (
        <div className="pointer-events-auto absolute bottom-8 right-8">
          <GlassButton
            variant="floating"
            onClick={interaction.loadCharacters}
            aria-label={t("player.talkToCharacter")}
          >
            <Mic size={18} />
            {t("player.talk")}
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
  );
}
